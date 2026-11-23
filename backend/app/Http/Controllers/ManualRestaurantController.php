<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use App\Support\RestaurantOnboarding as Onboarding;
use App\Support\SubscriptionAccess;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ManualRestaurantController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => Str::lower(trim($request->input('email')))]);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'restaurant_name' => 'required|string|max:255',
            'restaurant_phone' => 'required|string|max:40',
            'restaurant_address' => 'required|string|max:255',
            'account_type' => 'required|in:demo_trial,manual_account,founding_partner,contract',
            'plan' => ['required', Rule::in(['trial', ...config('subscriptions.paid_plans')])],
            'trial_days' => 'prohibited_unless:account_type,demo_trial|required_if:account_type,demo_trial|integer|min:1|max:365',
            'reason' => 'required|string|max:500',
            'notes' => 'nullable|string|max:2000',
            'application_id' => 'nullable|integer|min:1|required_if:account_type,founding_partner',
        ]);

        if ($data['account_type'] === 'contract' || $data['account_type'] === 'founding_partner') {
            $field = $data['account_type'] === 'contract' ? 'account_type' : 'application_id';
            throw ValidationException::withMessages([$field => __('Use the contract workflow to activate this account type.')]);
        }
        if ($data['account_type'] === 'manual_account' && $data['plan'] === 'trial') {
            throw ValidationException::withMessages(['plan' => __('Select a subscription plan or create a demo trial.')]);
        }

        try {
            $owner = DB::transaction(fn () => $this->createOwner($request, $data), 3);
        } catch (UniqueConstraintViolationException $exception) {
            if (! User::whereRaw('LOWER(email) = ?', [$data['email']])->exists()) {
                throw $exception;
            }
            abort(409, 'An account already uses this email.');
        }

        return Onboarding::data(['id' => $owner->id], 201);
    }

    private function createOwner(Request $request, array $data): User
    {
        // Use the same application lock as agreement creation and activation.
        $application = DB::table('restaurant_applications')
            ->where('active_email', $data['email'])->lockForUpdate()->first();
        if ($application && (
            DB::table('contracts')->where('application_id', $application->id)->exists()
            || DB::table('founding_partners')->where('application_id', $application->id)->exists()
        )) {
            throw ValidationException::withMessages(['application_id' => __('This restaurant already has an agreement or partner reservation. Use the contract workflow.')]);
        }

        $linkApplication = isset($data['application_id']);
        if ($linkApplication && (! $application || $application->id !== (int) $data['application_id']
            || $application->status !== 'approved' || $application->restaurant_id)) {
            throw ValidationException::withMessages(['application_id' => __('Select an approved application with the same email.')]);
        }
        abort_if(User::whereRaw('LOWER(email) = ?', [$data['email']])->exists(), 409, 'An account already uses this email.');

        $owner = (new User)->forceFill([
            'name' => $data['name'],
            'email' => $data['email'],
            'restaurant_name' => $data['restaurant_name'],
            'restaurant_phone' => $data['restaurant_phone'],
            'restaurant_address' => $data['restaurant_address'],
            'role' => 'owner',
            'is_active' => true,
            'email_verified' => false,
            'plan' => $data['plan'],
        ]);

        // The legacy column is non-null. An empty value creates no credential.
        $owner->setRawAttributes($owner->getAttributes() + ['password' => '']);
        $owner->save();

        if ($data['account_type'] === 'demo_trial') {
            SubscriptionAccess::startTrial($owner, $data['trial_days']);
            if ($data['plan'] !== 'trial') {
                $owner->forceFill([
                    'plan' => $data['plan'],
                    'subscription_started_at' => $owner->trial_ends_at,
                    'subscription_ends_at' => $owner->trial_ends_at,
                ])->save();
            }
        } else {
            $owner->forceFill([
                'subscription_started_at' => now(),
                'subscription_status' => SubscriptionAccess::ACTIVE,
            ])->save();
        }

        if ($linkApplication) {
            DB::table('restaurant_applications')->where('id', $application->id)->update([
                'status' => 'converted', 'restaurant_id' => $owner->id,
                'converted_at' => now(), 'updated_at' => now(),
            ]);
            Onboarding::event('application_events', $application->id, 'converted', 'approved', 'converted');
        }

        Audit::log($request, 'restaurant_created_manually', 'user', $owner->id, [
            'source' => 'admin_manual',
            'account_type' => $data['account_type'],
            'plan' => $data['plan'],
            'reason' => $data['reason'],
            'notes' => $data['notes'] ?? null,
            'application_id' => $linkApplication ? $application->id : null,
        ], $owner->id);
        Onboarding::inviteOwner($owner);

        return $owner;
    }
}
