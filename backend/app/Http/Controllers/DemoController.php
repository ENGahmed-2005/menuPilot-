<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\DemoRestaurant;
use App\Support\Permissions;
use App\Support\SubscriptionAccess;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** «Try it» without signing up (App\Support\DemoRestaurant). */
class DemoController extends Controller
{
    /**
     * POST /api/demo/session {role, lang} → the same {token, user} as a login.
     * Every visitor of a role shares one token for the demo's day, so a new
     * visitor never logs out the previous one; a rebuild changes it.
     */
    public function start(Request $r)
    {
        abort_unless(config('demo.enabled'), 404);
        $v = $r->validate(['role' => ['required', Rule::in(DemoRestaurant::ROLES)], 'lang' => ['sometimes', Rule::in(DemoRestaurant::LANGS)]]);
        $lang = $v['lang'] ?? 'en';
        $owner = DemoRestaurant::fresh($lang);
        $user = $v['role'] === 'owner' ? $owner : User::where('email', DemoRestaurant::email($lang, $v['role']))->firstOrFail();

        $token = hash_hmac('sha256', "demo:{$user->id}:{$owner->created_at->timestamp}", (string) config('app.key'));
        if ($user->api_token !== hash('sha256', $token)) {
            $user->forceFill(['api_token' => hash('sha256', $token)])->save();
        }
        $user->setAttribute('permissions', Permissions::for($user));
        $user->setAttribute('subscription', SubscriptionAccess::for($user)->toArray());

        return response()->json(['data' => ['token' => $token, 'user' => $user]]);
    }

    /** GET /api/demo/guest?lang= → the table a visitor opens as a guest. */
    public function guest(Request $r)
    {
        abort_unless(config('demo.enabled'), 404);
        $lang = in_array($r->query('lang'), DemoRestaurant::LANGS, true) ? $r->query('lang') : 'en';

        return response()->json(['data' => ['table_code' => DemoRestaurant::guestTable(DemoRestaurant::fresh($lang))]]);
    }
}
