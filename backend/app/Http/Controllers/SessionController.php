<?php

namespace App\Http\Controllers;

use App\Support\ResolvesRestaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SessionController extends Controller
{
    use ResolvesRestaurant;

    private const TABLE_RADIUS_METERS = 200;

    private function out($data, $status = 200)
    {
        return response()->json(['data' => $data], $status);
    }

    private function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $earthRadius * asin(min(1, sqrt($a)));
    }

    public function open(Request $request, $code)
    {
        $v = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'phone' => 'required|string|min:7|max:50',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $result = DB::transaction(function () use ($v, $code) {
            $table = DB::table('restaurant_tables')->where('table_code', $code)->lockForUpdate()->first();
            if (! $table) {
                return response()->json(['message' => 'رمز الطاولة غير صالح.'], 404);
            }

            $restaurant = DB::table('users')->where('id', $table->user_id)->first();
            if (! $restaurant || $restaurant->latitude === null || $restaurant->longitude === null) {
                return response()->json(['message' => 'لم يضبط المطعم موقعه الجغرافي بعد. يجب على صاحب المطعم تحديد موقع المطعم من الإعدادات.', 'code' => 'RESTAURANT_LOCATION_NOT_CONFIGURED'], 503);
            }

            $distance = $this->distanceMeters((float) $v['latitude'], (float) $v['longitude'], (float) $restaurant->latitude, (float) $restaurant->longitude);
            if ($distance > self::TABLE_RADIUS_METERS) {
                return response()->json(['message' => 'أنت خارج نطاق المطعم. يجب أن تكون ضمن 200 متر من المطعم لفتح الطاولة.', 'code' => 'TABLE_LOCATION_REQUIRED'], 403);
            }

            // US-08: one active session per table. A second diner scanning the same
            // table joins the existing session instead of creating a duplicate.
            $active = DB::table('dining_sessions')->where('restaurant_table_id', $table->id)->whereNull('closed_at')->first();
            if ($active) {
                $active->resumed = true;

                return $this->out($active, 200);
            }

            $now = now();
            $id = DB::table('dining_sessions')->insertGetId([
                'restaurant_table_id' => $table->id,
                'customer_name' => trim($v['name']),
                'customer_phone' => trim($v['phone']),
                'status' => 'opened',
                'opened_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('restaurant_tables')->where('id', $table->id)->update(['status' => 'occupied', 'updated_at' => $now]);

            return $this->out(DB::table('dining_sessions')->find($id), 201);
        });

        return $result;
    }

    public function show($id)
    {
        $s = DB::table('dining_sessions')->find($id);

        return $s ? $this->out($s) : response()->json(['message' => 'Session not found'], 404);
    }

    public function updateCustomer(Request $request, $id)
    {
        $v = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'phone' => 'required|string|min:7|max:50',
        ]);

        $updated = DB::table('dining_sessions')->where('id', $id)->whereNull('closed_at')->update([
            'customer_name' => trim($v['name']),
            'customer_phone' => trim($v['phone']),
            'updated_at' => now(),
        ]);

        return $updated ? $this->out(DB::table('dining_sessions')->find($id)) : response()->json(['message' => 'Session not found'], 404);
    }

    /**
     * US-11 / FR-41: "Call Waiter". One tap, optional note. A repeat tap while a
     * request is still pending returns the existing request (no duplicate alert).
     */
    public function assistance(Request $request, $id)
    {
        $v = $request->validate(['note' => 'nullable|string|max:255']);
        $session = DB::table('dining_sessions')->find($id);
        if (! $session) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        if ($session->closed_at) {
            return response()->json(['message' => 'Dining session is closed.'], 409);
        }

        $existing = DB::table('assistance_requests')->where('dining_session_id', $id)->where('status', 'open')->first();
        if ($existing) {
            $existing->duplicate = true;

            return $this->out($existing, 200);
        }

        $rid = DB::table('assistance_requests')->insertGetId([
            'dining_session_id' => $id,
            'status' => 'open',
            'note' => isset($v['note']) ? trim($v['note']) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->out(DB::table('assistance_requests')->find($rid), 201);
    }

    /** Staff mark a waiter call as handled (tenant-scoped). */
    public function resolveAssistance(Request $request, $id)
    {
        $req = DB::table('assistance_requests')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'assistance_requests.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('assistance_requests.id', $id)
            ->where('restaurant_tables.user_id', $this->restaurantId($request))
            ->select('assistance_requests.*')
            ->first();
        if (! $req) {
            return response()->json(['message' => 'Request not found'], 404);
        }

        DB::table('assistance_requests')->where('id', $id)->where('status', 'open')->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolved_by' => $request->user()->id,
            'updated_at' => now(),
        ]);

        return $this->out(DB::table('assistance_requests')->find($id));
    }

    /** Resolve every open waiter call of a session (used by the waiter card "Done"). */
    public function resolveSessionAssistance(Request $request, $id)
    {
        $belongs = DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('dining_sessions.id', $id)
            ->where('restaurant_tables.user_id', $this->restaurantId($request))
            ->exists();
        if (! $belongs) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        $count = DB::table('assistance_requests')->where('dining_session_id', $id)->where('status', 'open')->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolved_by' => $request->user()->id,
            'updated_at' => now(),
        ]);

        return $this->out(['resolved' => $count]);
    }

    public function active(Request $request)
    {
        return $this->out($this->decoratedSessions($this->restaurantId($request)));
    }

    public function stream(Request $request)
    {
        $restaurantId = $this->restaurantId($request);

        return response()->stream(function () use ($restaurantId) {
            $last = null;
            $startedAt = microtime(true);

            while (microtime(true) - $startedAt < 55) {
                $sessions = $this->decoratedSessions($restaurantId);
                $payload = json_encode($sessions, JSON_UNESCAPED_UNICODE);
                $fingerprint = md5($payload);
                if ($fingerprint !== $last) {
                    // Double quotes are required: "\n" must be a real newline for SSE framing.
                    echo "event: sessions\n";
                    echo 'data: '.$payload."\n\n";
                    $last = $fingerprint;
                }

                echo "event: ping\n";
                echo 'data: '.json_encode(now()->toIso8601String())."\n\n";
                if (function_exists('ob_flush')) {
                    @ob_flush();
                }
                flush();
                if (connection_aborted()) {
                    break;
                }
                sleep(1);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Active sessions with the staff-facing flags used by the waiter/cashier
     * views: pending waiter call (US-11) and bill request (US-16).
     */
    private function decoratedSessions(int $restaurantId): array
    {
        $sessions = DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $restaurantId)
            ->whereNull('dining_sessions.closed_at')
            ->select('dining_sessions.*', 'restaurant_tables.label as table_label')
            ->orderBy('restaurant_tables.label')
            ->get();

        $open = DB::table('assistance_requests')
            ->whereIn('dining_session_id', $sessions->pluck('id'))
            ->where('status', 'open')
            ->get()
            ->keyBy('dining_session_id');

        return $sessions->map(function ($s) use ($open) {
            $req = $open->get($s->id);
            $s->tableLabel = $s->table_label;
            $s->customerName = $s->customer_name;
            $s->assistanceRequested = (bool) $req;
            $s->assistanceRequest = $req ? ['id' => $req->id, 'note' => $req->note ?? null, 'created_at' => $req->created_at] : null;
            $s->billRequested = $s->status === 'bill_requested';

            return $s;
        })->values()->all();
    }
}
