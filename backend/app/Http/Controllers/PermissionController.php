<?php

namespace App\Http\Controllers;

use App\Support\Permissions;
use Illuminate\Http\Request;

/** GET /api/permissions — what the current user can do + labels/defaults for the staff UI. */
class PermissionController extends Controller
{
    public function catalog(Request $request)
    {
        return response()->json(['data' => [
            'granted' => Permissions::for($request->user()),
            'labels' => Permissions::LABELS,
            'assignable' => Permissions::assignable(),
            'role_defaults' => collect(Permissions::STAFF_ROLES)->mapWithKeys(fn ($role) => [$role => Permissions::defaultsFor($role)]),
        ]]);
    }
}
