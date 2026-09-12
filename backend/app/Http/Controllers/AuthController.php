<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private function out($data, $status = 200) { return response()->json(['data' => $data], $status); }

    public function register(Request $r)
    {
        $v = $r->validate([
            'restaurant_name'=>'required|string|max:255',
            'email'=>'required|email|unique:users,email',
            'password'=>'required|min:6|confirmed',
        ]);
        $token = Str::random(60);
        $now = now();
        $u = User::create([
            'name'=>$v['restaurant_name'],
            'restaurant_name'=>$v['restaurant_name'],
            'email'=>$v['email'],
            'password'=>Hash::make($v['password']),
            'plan'=>'trial',
            'trial_started_at'=>$now,
            'trial_ends_at'=>$now->copy()->addDays(14),
            'role'=>'owner',
            'api_token'=>hash('sha256',$token),
        ]);
        return $this->out(['token'=>$token,'user'=>$u], 201);
    }

    public function login(Request $r)
    {
        $v = $r->validate(['email'=>'required|email','password'=>'required']);
        $u = User::where('email', $v['email'])->first();
        if (!$u || !Hash::check($v['password'], $u->password)) return response()->json(['message'=>'Invalid credentials.'], 422);
        if ($u->role !== 'owner' && $u->role !== 'admin') {
            $staff = Staff::where('account_user_id', $u->id)->first();
            if ($staff && !$staff->active) return response()->json(['message'=>'This staff account is disabled.'], 403);
        }
        $u->refreshSubscriptionStatus();
        $token = Str::random(60);
        $u->update(['api_token'=>hash('sha256',$token)]);
        return $this->out(['token'=>$token,'user'=>$u]);
    }

    public function logout(Request $r) { $r->user()->update(['api_token'=>null]); return $this->out(['message'=>'Logged out']); }
    public function me(Request $r) { $u=$r->user(); $u->refreshSubscriptionStatus(); return $this->out($u->load('restaurantSetting')); }

    public function forgotPassword(Request $r)
    {
        $v=$r->validate(['email'=>'required|email']); $token=Str::random(64);
        DB::table('password_reset_tokens')->updateOrInsert(['email'=>$v['email']],['token'=>hash('sha256',$token),'created_at'=>now()]);
        return $this->out(['message'=>'Reset token created','reset_token'=>$token]);
    }

    public function resetPassword(Request $r)
    {
        $v=$r->validate(['token'=>'required','email'=>'required|email','password'=>'required|min:6|confirmed']);
        $row=DB::table('password_reset_tokens')->where('email',$v['email'])->first();
        if(!$row||!hash_equals($row->token,hash('sha256',$v['token'])))return response()->json(['message'=>'Invalid reset token.'],422);
        User::where('email',$v['email'])->update(['password'=>Hash::make($v['password'])]);
        DB::table('password_reset_tokens')->where('email',$v['email'])->delete();
        return $this->out(['message'=>'Password reset successfully']);
    }
}
