<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Support\Audit;
use App\Support\Permissions;
use App\Support\SessionLifecycle;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class TableController extends Controller
{
    /** Statuses an owner can set by hand (besides available). */
    public const MANUAL_STATUSES = ['reserved', 'out_of_service'];

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

    private function query(Request $request)
    {
        return DB::table('restaurant_tables')->where('user_id', $this->restaurantId($request));
    }

    private function qrImageUrl(string $tableCode): string
    {
        $menuUrl = url('/t/'.$tableCode);

        return 'https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=16&data='.rawurlencode($menuUrl);
    }

    private function withQr($table)
    {
        if (! $table) {
            return $table;
        }

        $activeSession = DB::table('dining_sessions')
            ->where('restaurant_table_id', $table->id)
            ->whereNull('closed_at')
            ->latest('id')
            ->first();

        $table->activeSessionId = $activeSession?->id;
        // An active session always means occupied. Otherwise the owner may have
        // set the table aside manually (reserved / out of service).
        $table->status = $activeSession ? 'occupied' : (in_array($table->status, self::MANUAL_STATUSES, true) ? $table->status : 'available');
        $table->qrCodeUrl = '/t/'.$table->table_code;
        $table->qrImageUrl = $table->qr_image_url ?: $this->qrImageUrl($table->table_code);

        return $table;
    }

    private function listWithQr($tables)
    {
        return $tables->map(fn ($table) => $this->withQr($table));
    }

    public function index(Request $request)
    {
        return $this->out($this->listWithQr($this->query($request)->orderBy('id')->get()));
    }

    public function store(Request $request)
    {
        $restaurantId = $this->restaurantId($request);
        $validator = Validator::make($request->all(), [
            'label' => ['required', 'string', 'max:100', function ($attribute, $value, $fail) use ($restaurantId) {
                if (DB::table('restaurant_tables')->where('user_id', $restaurantId)->whereRaw('LOWER(label) = ?', [Str::lower(trim($value))])->exists()) {
                    $fail('اسم الطاولة مستخدم مسبقًا.');
                }
            }],
            'seats' => 'required|integer|min:1|max:100',
        ]);
        $v = $validator->validate();

        // Generate a unique table code. The DB has a UNIQUE constraint on table_code,
        // so we rely on it as the authoritative uniqueness check and retry on the rare
        // collision instead of using a racy check-then-insert loop (TOCTOU).
        $id = null;
        $code = null;
        $attempts = 0;
        while ($id === null) {
            $code = Str::upper(Str::random(10));
            try {
                $qrImageUrl = $this->qrImageUrl($code);
                $id = DB::table('restaurant_tables')->insertGetId([
                    'user_id' => $restaurantId,
                    'label' => trim($v['label']),
                    'seats' => $v['seats'],
                    'table_code' => $code,
                    'qr_image_url' => $qrImageUrl,
                    'status' => 'available',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (QueryException $e) {
                // 23000 = Integrity constraint violation (duplicate unique key).
                if ($e->getCode() !== '23000' || ++$attempts >= 5) {
                    throw $e;
                }
                // Retry with a new code.
            }
        }

        return $this->out($this->withQr(DB::table('restaurant_tables')->find($id)), 201);
    }

    public function update(Request $request, $id)
    {
        $restaurantId = $this->restaurantId($request);
        $table = $this->query($request)->where('id', $id)->first();
        if (! $table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'label' => ['sometimes', 'required', 'string', 'max:100', function ($attribute, $value, $fail) use ($restaurantId, $id) {
                if (DB::table('restaurant_tables')->where('user_id', $restaurantId)->where('id', '!=', $id)->whereRaw('LOWER(label) = ?', [Str::lower(trim($value))])->exists()) {
                    $fail('اسم الطاولة مستخدم مسبقًا.');
                }
            }],
            'seats' => 'sometimes|required|integer|min:1|max:100',
        ]);
        $v = $validator->validate();
        if (isset($v['label'])) {
            $v['label'] = trim($v['label']);
        }

        $this->query($request)->where('id', $id)->update(array_merge($v, ['updated_at' => now()]));

        return $this->out($this->withQr(DB::table('restaurant_tables')->find($id)));
    }

    public function destroy(Request $request, $id)
    {
        if (! $this->query($request)->where('id', $id)->exists()) {
            return response()->json(['message' => 'Table not found'], 404);
        }
        if (DB::table('dining_sessions')->where('restaurant_table_id', $id)->whereNull('closed_at')->exists()) {
            return response()->json(['message' => 'Cannot delete a table with an active dining session.'], 409);
        }
        $deleted = $this->query($request)->where('id', $id)->delete();

        return $deleted ? $this->out(['message' => 'Deleted']) : response()->json(['message' => 'Table not found'], 404);
    }

    public function qr(Request $request, $id)
    {
        $table = $this->query($request)->where('id', $id)->first();
        if (! $table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $qrImageUrl = $table->qr_image_url ?: $this->qrImageUrl($table->table_code);
        if (! $table->qr_image_url) {
            DB::table('restaurant_tables')->where('id', $id)->update(['qr_image_url' => $qrImageUrl, 'updated_at' => now()]);
        }

        return $this->out([
            'table_id' => $table->id,
            'table_code' => $table->table_code,
            'menu_url' => url('/t/'.$table->table_code),
            'qr_image_url' => $qrImageUrl,
        ]);
    }

    /**
     * PATCH tables/{id}/status {status, close_session?, reason?}
     * status: available | reserved | out_of_service  (permission manage_tables)
     *
     * A table with an open dining session is occupied. Changing it means ending
     * that session first, so the request must say so explicitly
     * (close_session=true) and the user also needs close_session:
     *  - nothing owed                 → closed normally
     *  - money still owed             → only with a written reason ("force"),
     *                                    recorded with the amount in the audit log
     *  - customer payment unverified  → refused: verify or reject it first
     * Without close_session the API answers 409 with the session summary, which
     * the UI shows in a confirmation dialog.
     */
    public function updateStatus(Request $request, $id)
    {
        $v = $request->validate([
            'status' => 'required|in:available,'.implode(',', self::MANUAL_STATUSES),
            'close_session' => 'sometimes|boolean',
            'reason' => 'nullable|string|max:255',
        ]);
        $table = $this->query($request)->find($id);
        if (! $table) {
            return response()->json(['message' => 'Table not found'], 404);
        }
        $restaurantId = (int) $table->user_id;

        return DB::transaction(function () use ($request, $v, $id, $table, $restaurantId) {
            $session = DB::table('dining_sessions')->where('restaurant_table_id', $id)->whereNull('closed_at')->lockForUpdate()->first();

            if ($session) {
                $money = SessionLifecycle::summaries([(int) $session->id])[(int) $session->id];
                $summary = ['session_id' => $session->id] + SessionLifecycle::present($session, $money);

                if (! $request->boolean('close_session')) {
                    return response()->json([
                        'message' => 'على هذه الطاولة جلسة نشطة. أنهِ الجلسة لتغيير حالة الطاولة.',
                        'code' => 'TABLE_HAS_ACTIVE_SESSION',
                        'session' => $summary,
                    ], 409);
                }
                if (! Permissions::allows($request->user(), 'close_session')) {
                    return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.', 'code' => 'PERMISSION_DENIED', 'required' => ['close_session']], 403);
                }
                if ($money['has_pending_payment']) {
                    return response()->json(['message' => 'يوجد دفع من الزبون بانتظار التأكيد. أكّده أو ارفضه من شاشة الفواتير أولًا.', 'code' => 'PAYMENT_PENDING_VERIFICATION', 'session' => $summary], 409);
                }
                $forced = $money['outstanding'] > 0;
                if ($forced && mb_strlen(trim((string) ($v['reason'] ?? ''))) < 3) {
                    return response()->json(['message' => 'يوجد مبلغ متبقٍ. اكتب سبب إنهاء الجلسة دون دفع.', 'code' => 'REASON_REQUIRED', 'session' => $summary], 422);
                }

                SessionLifecycle::closeNow($session, $restaurantId);
                Audit::log($request, $forced ? 'session.force_closed' : 'session.closed', 'dining_session', (int) $session->id, [
                    'table' => $table->label,
                    'via' => 'table_status',
                    'total' => $money['total'],
                    'paid' => $money['paid'],
                    'outstanding' => $money['outstanding'],
                    'reason' => $forced ? trim($v['reason']) : null,
                ], $restaurantId);
            }

            $before = $session ? 'occupied' : $table->status;
            DB::table('restaurant_tables')->where('id', $id)->where('user_id', $restaurantId)->update(['status' => $v['status'], 'updated_at' => now()]);
            Audit::log($request, 'table.status_changed', 'restaurant_table', (int) $id, ['from' => $before, 'to' => $v['status']], $restaurantId);

            return $this->out($this->withQr($this->query($request)->find($id)));
        });
    }

    public function status(Request $request, $id)
    {
        $table = $this->query($request)->find($id);
        if (! $table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        return $this->out($this->withQr($table));
    }
}
