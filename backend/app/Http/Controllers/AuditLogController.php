<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Read-only audit trail: owners see their restaurant, the admin sees everything. */
class AuditLogController extends Controller
{
    private function listing(Request $request, ?int $restaurantId)
    {
        $q = DB::table('audit_logs')
            ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
            ->select('audit_logs.*', 'users.name as user_name', 'users.email as user_email', 'users.role as user_role')
            ->orderByDesc('audit_logs.id');
        if ($restaurantId !== null) {
            $q->where('audit_logs.restaurant_id', $restaurantId);
        }
        if ($request->query('action')) {
            $q->where('audit_logs.action', $request->query('action'));
        }

        return response()->json(['data' => $q->limit(min(200, max(1, (int) $request->query('limit', 100))))->get()->map(function ($row) {
            $row->metadata = $row->metadata ? json_decode($row->metadata, true) : null;

            return $row;
        })]);
    }

    public function owner(Request $request)
    {
        return $this->listing($request, (int) $request->user()->id);
    }

    public function admin(Request $request)
    {
        return $this->listing($request, $request->query('restaurant_id') ? (int) $request->query('restaurant_id') : null);
    }
}
