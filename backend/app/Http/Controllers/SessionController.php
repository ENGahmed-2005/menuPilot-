<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SessionController extends Controller
{
    private const TABLE_RADIUS_METERS = 200;

    private function out($data, $status = 200)
    {
        return response()->json(['data' => $data], $status);
    }

    private function restaurantId(Request $request): int
    {
        $user = $request->user();
        if ($user->role === 'owner' || $user->role === 'admin') {
            return (int) $user->id;
        }

        return (int) Staff::where('account_user_id', $user->id)->value('user_id');
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

            $active = DB::table('dining_sessions')->where('restaurant_table_id', $table->id)->whereNull('closed_at')->first();
            if ($active) {
                return response()->json(['message' => 'هذه الطاولة مستخدمة حاليًا. اطلب مساعدة أحد أفراد الطاقم.', 'code' => 'TABLE_ALREADY_OCCUPIED'], 409);
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

    public function assistance($id)
    {
        if (! DB::table('dining_sessions')->find($id)) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        if (DB::table('assistance_requests')->where('dining_session_id', $id)->where('status', 'open')->exists()) {
            return response()->json(['message' => 'Assistance already requested'], 409);
        }
        $rid = DB::table('assistance_requests')->insertGetId(['dining_session_id' => $id, 'status' => 'open', 'created_at' => now(), 'updated_at' => now()]);

        return $this->out(DB::table('assistance_requests')->find($rid), 201);
    }

    public function active(Request $request)
    {
        return $this->out($this->activeQuery($this->restaurantId($request))->get());
    }

    public function stream(Request $request)
    {
        $restaurantId = $this->restaurantId($request);

        return response()->stream(function () use ($restaurantId) {
            $last = null;
            $startedAt = microtime(true);

            while (microtime(true) - $startedAt < 55) {
                $sessions = $this->activeQuery($restaurantId)->get()->map(function ($session) {
                    $session->assistanceRequested = DB::table('assistance_requests')
                        ->where('dining_session_id', $session->id)
                        ->where('status', 'open')
                        ->exists();

                    return $session;
                })->values()->all();

                $fingerprint = md5(json_encode($sessions));
                if ($fingerprint !== $last) {
                    echo 'event: sessions\n';
                    echo 'data: '.json_encode($sessions, JSON_UNESCAPED_UNICODE).'\n\n';
                    $last = $fingerprint;
                }

                echo 'event: ping\n';
                echo 'data: '.json_encode(now()->toIso8601String()).'\n\n';
                if (function_exists('ob_flush')) {
                    @ob_flush();
                }
                flush();
                sleep(1);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function activeQuery($restaurantId)
    {
        return DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $restaurantId)
            ->whereNull('dining_sessions.closed_at')
            ->select('dining_sessions.*', 'restaurant_tables.label as table_label');
    }
}
