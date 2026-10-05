<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Platform admin: owners' "forgot password" requests. The admin creates a
 * one-time reset link (valid 60 minutes, stored hashed) and sends it to the
 * owner on WhatsApp. The link is built by the admin's browser from its own
 * domain, so it never depends on FRONTEND_URL.
 */
class PasswordRequestController extends Controller
{
    public function index()
    {
        $rows = DB::table('password_reset_requests as p')->join('users as u', 'u.id', '=', 'p.user_id')
            ->where(fn ($q) => $q->where('p.status', 'pending')->orWhere('p.updated_at', '>=', now()->subDays(7)))
            ->orderByRaw("CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END")->orderByDesc('p.updated_at')->limit(100)
            ->get(['p.id', 'p.status', 'p.created_at', 'p.updated_at', 'p.handled_at', 'u.id as user_id', 'u.name', 'u.email', 'u.restaurant_name', 'u.restaurant_phone']);

        return response()->json(['data' => $rows]);
    }

    /** POST /admin/password-requests/{id}/link → a fresh one-time token for the owner. */
    public function link(Request $r, $id)
    {
        $req = DB::table('password_reset_requests as p')->join('users as u', 'u.id', '=', 'p.user_id')->where('p.id', $id)
            ->first(['p.id', 'p.user_id', 'u.email', 'u.name', 'u.restaurant_phone', 'u.role']);
        if (! $req || $req->role !== 'owner') {
            return response()->json(['message' => 'Request not found'], 404);
        }
        $token = Str::random(64);
        DB::table('password_reset_tokens')->updateOrInsert(['email' => $req->email], ['token' => hash('sha256', $token), 'created_at' => now()]);
        DB::table('password_reset_requests')->where('id', $id)->update(['status' => 'sent', 'handled_by' => $r->user()->id, 'handled_at' => now(), 'updated_at' => now()]);
        Audit::log($r, 'password_reset.link_created', 'user', (int) $req->user_id, ['request_id' => (int) $id], (int) $req->user_id);

        return response()->json(['data' => ['token' => $token, 'email' => $req->email, 'name' => $req->name, 'phone' => $req->restaurant_phone, 'expires_minutes' => 60]]);
    }

    public function dismiss(Request $r, $id)
    {
        $updated = DB::table('password_reset_requests')->where('id', $id)->update(['status' => 'dismissed', 'handled_by' => $r->user()->id, 'handled_at' => now(), 'updated_at' => now()]);

        return $updated ? response()->json(['data' => ['status' => 'dismissed']]) : response()->json(['message' => 'Request not found'], 404);
    }
}
