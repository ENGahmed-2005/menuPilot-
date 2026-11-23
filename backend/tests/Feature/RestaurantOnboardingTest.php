<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function onboardingAdmin(): array
{
    $admin = User::forceCreate(['name' => 'Platform admin', 'role' => 'admin', 'email' => fake()->unique()->safeEmail(), 'password' => Hash::make('Test#Pass123')]);

    return authAs(['token' => authSession($admin->id)]);
}

function onboardingApplication(array $overrides = []): array
{
    return array_replace([
        'restaurant_name' => 'Olive', 'business_type' => 'cafe', 'city' => 'Haifa',
        'owner_name' => 'Olive Contact', 'owner_position' => 'Owner',
        'phone' => '+972 512345678', 'email' => 'olive@example.test',
        'requested_services' => ['qr', 'cashier'], 'consent' => true,
    ], $overrides);
}

it('records applications without accounts, prevents duplicate contact and blocks the legacy routes', function () {
    $application = onboardingApplication();
    $this->postJson('/api/applications', $application + ['role' => 'admin'])->assertCreated()->assertJsonStructure(['data' => ['reference_number']]);
    $this->postJson('/api/applications', onboardingApplication(['email' => 'other@example.test', 'phone' => '+972512345678']))->assertConflict();
    $this->postJson('/api/applications', onboardingApplication(['email' => 'OLIVE@example.test', 'phone' => '0500000000']))->assertConflict();
    $this->postJson('/api/applications', onboardingApplication(['consent' => false]))->assertUnprocessable();
    $this->assertDatabaseCount('restaurant_applications', 1);
    $this->assertDatabaseCount('users', 0);
    foreach (['auth', 'account'] as $prefix) {
        $this->postJson("/api/{$prefix}/register", $application)->assertGone();
        $this->postJson("/api/{$prefix}/register/google", $application)->assertGone();
    }
    $this->getJson('/api/admin/applications')->assertUnauthorized();
    $this->getJson('/api/admin/applications', authAs(makeOwner()))->assertForbidden();
    $this->postJson('/api/admin/restaurants', [], onboardingAdmin())->assertGone();
});

it('releases a rejected contact for reapplication and tracks the rejection', function () {
    $admin = onboardingAdmin();
    $this->postJson('/api/applications', onboardingApplication())->assertCreated();
    $id = DB::table('restaurant_applications')->value('id');
    $this->patchJson("/api/admin/applications/{$id}/status", ['status' => 'rejected'], $admin)->assertUnprocessable();
    $this->patchJson("/api/admin/applications/{$id}/status", ['status' => 'rejected', 'reason' => 'Outside coverage'], $admin)->assertOk();
    $this->assertDatabaseHas('application_events', ['subject_id' => $id, 'new_status' => 'rejected', 'description' => 'Outside coverage']);
    $this->postJson('/api/applications', onboardingApplication())->assertCreated();
    $this->patchJson("/api/admin/applications/{$id}/status", ['status' => 'under_review'], $admin)->assertConflict();
});

it('activates a signed paper contract once with a reserved partner seat and a contracted trial', function () {
    Storage::fake('contracts');
    $admin = onboardingAdmin();
    $owner = authAs(makeOwner());
    $this->postJson('/api/applications', onboardingApplication())->assertCreated();
    $application = DB::table('restaurant_applications')->value('id');
    $this->patchJson("/api/admin/applications/{$application}/status", ['status' => 'approved'], $admin)->assertOk();
    $this->assertDatabaseMissing('users', ['email' => 'olive@example.test']);
    $template = $this->postJson('/api/admin/contract-templates', [
        'name' => 'Founding agreement', 'contract_type' => 'founding_partner', 'version' => 1, 'content' => 'Test agreement',
    ], $admin)->assertCreated()->json('data.id');
    $partner = $this->postJson('/api/admin/founding-partners', ['application_id' => $application, 'cohort' => 'Founding cohort'], $admin)->assertOk()->json('data.id');
    $data = [
        'application_id' => $application, 'template_id' => $template,
        'contract_type' => 'founding_partner', 'signing_method' => 'paper', 'plan' => 'trial',
        'company_name' => 'MenuPilot', 'company_representative' => 'Team Lead', 'company_title' => 'Director',
        'restaurant_representative' => 'Olive Contact', 'restaurant_title' => 'Owner',
        'services' => 'QR', 'amount' => '0.00', 'currency' => 'ILS', 'billing_cycle' => 'one_time',
        'start_date' => today()->toDateString(), 'end_date' => today()->addMonth()->toDateString(), 'trial_days' => 10,
    ];
    $contract = $this->postJson('/api/admin/contracts', $data, $admin)->assertCreated()->json('data.id');
    $base = "/api/admin/contracts/{$contract}";
    $this->postJson($base.'/activate', ['confirmed' => true], $admin)->assertConflict();
    $this->postJson($base.'/generate-document', [], $admin)->assertOk();
    $this->getJson($base, $owner)->assertForbidden();
    $this->withHeaders($admin)->post($base.'/upload-document', [
        'document' => UploadedFile::fake()->createWithContent('invalid.pdf', 'Invalid document'),
    ], ['Accept' => 'application/json'])->assertUnprocessable();
    $pdf = "%PDF-1.4\n";
    $offsets = [];
    foreach (['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 96 96] >>'] as $object) {
        $offsets[] = strlen($pdf);
        $pdf .= count($offsets)." 0 obj\n".$object."\nendobj\n";
    }
    $index = strlen($pdf);
    $pdf .= "xref\n0 4\n0000000000 65535 f \n";
    foreach ($offsets as $offset) {
        $pdf .= sprintf("%010d 00000 n \n", $offset);
    }
    $pdf .= "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n".$index."\n%%EOF\n";
    $document = $this->withHeaders($admin)->post($base.'/upload-document', [
        'document' => UploadedFile::fake()->createWithContent('signed.pdf', $pdf),
    ], ['Accept' => 'application/json'])->assertOk()->json('data.documents.0.id');
    $this->getJson($base."/documents/{$document}", $admin)->assertOk()->assertDownload('contract.pdf');
    $this->getJson($base.'/documents/99999', $admin)->assertNotFound();
    $this->postJson($base.'/verify-signatures', ['confirmed' => true], $admin)->assertConflict();
    foreach (['menupilot', 'restaurant'] as $party) {
        $this->postJson($base.'/record-signature', [
            'party_type' => $party, 'signer_name' => 'Representative', 'signer_title' => 'Director',
            'signed_at' => today()->toDateString(),
        ], $admin)->assertOk();
    }
    $this->postJson($base.'/verify-signatures', ['confirmed' => true], $admin)->assertOk();
    $this->postJson($base.'/activate', ['confirmed' => true], $admin)->assertConflict();
    $this->patchJson("/api/admin/founding-partners/{$partner}", ['owner_consent' => true, 'logo_consent' => true], $admin)->assertOk();
    $restaurant = $this->postJson($base.'/activate', ['confirmed' => true], $admin)->assertOk()->assertJsonPath('data.status', 'active')->json('data.restaurant_id');
    $this->postJson($base.'/activate', ['confirmed' => true], $admin)->assertOk()->assertJsonPath('data.restaurant_id', $restaurant);
    $this->assertDatabaseHas('restaurant_applications', ['id' => $application, 'status' => 'converted', 'restaurant_id' => $restaurant]);
    $this->assertDatabaseHas('founding_partners', ['id' => $partner, 'partnership_status' => 'active', 'restaurant_id' => $restaurant]);
    $this->assertDatabaseHas('auth_accounts', ['provider_id' => 'credential', 'user_id' => $restaurant]);
    $this->assertDatabaseHas('password_reset_tokens', ['email' => 'olive@example.test', 'owner_invitation' => true]);
    expect(User::find($restaurant)->trial_ends_at->toDateString())->toBe(today()->addDays(10)->toDateString());
    expect(User::where('email', 'olive@example.test')->count())->toBe(1);
    $ownerHeaders = authAs(['token' => authSession($restaurant)]);
    $this->getJson('/api/subscription', $ownerHeaders)->assertOk()->assertJsonPath('data.contract_billing.currency', 'ILS');
    $this->postJson('/api/subscription/payments', [], $ownerHeaders)->assertConflict()->assertJsonPath('code', 'CONTRACT_BILLING');
    $this->postJson($base.'/resend-invitation', [], $admin)->assertOk();

    DB::table('contracts')->where('id', $contract)->update(['end_date' => today()->subDay()->toDateString()]);
    $this->artisan('onboarding:contract-expiry')->assertSuccessful();
    $this->assertDatabaseHas('contracts', ['id' => $contract, 'status' => 'expired']);
    $this->assertDatabaseHas('founding_partners', ['id' => $partner, 'partnership_status' => 'closed']);
    $this->assertDatabaseHas('users', ['id' => $restaurant, 'role' => 'owner']);
});


function manualRestaurant(array $overrides = []): array
{
    return array_replace([
        'name' => 'Owner', 'email' => 'NEW@example.test',
        'restaurant_name' => 'Olive Kitchen', 'restaurant_phone' => '+972 512345678',
        'restaurant_address' => 'Main street', 'account_type' => 'demo_trial',
        'plan' => 'pro', 'trial_days' => 7, 'reason' => 'Restaurant demo',
    ], $overrides);
}

it('creates an expiring owner trial with an invitation and an audit entry', function () {
    $this->freezeSecond();
    config(['mail.default' => 'array']);
    $token = null;
    \Illuminate\Support\Facades\Event::listen(\Illuminate\Mail\Events\MessageSent::class, function ($event) use (&$token) {
        if (preg_match('/[?&]token=([A-Za-z0-9]+)/', $event->message->getTextBody(), $match)) {
            $token = $match[1];
        }
    });

    $headers = onboardingAdmin();
    $payload = manualRestaurant(['role' => 'admin', 'password' => 'ignored']);
    $endpoint = '/api/admin/restaurants/manual';
    $this->postJson($endpoint, $payload)->assertUnauthorized();
    $this->postJson($endpoint, $payload, authAs(makeOwner()))->assertForbidden();
    $id = $this->postJson($endpoint, $payload, $headers)->assertCreated()->json('data.id');
    $owner = User::findOrFail($id);
    expect($owner->role)->toBe('owner')->and($owner->password)->toBe('')
        ->and($owner->plan)->toBe('pro')->and($owner->trial_ends_at->equalTo(now()->addDays(7)))->toBeTrue();
    $this->assertDatabaseMissing('auth_accounts', ['user_id' => $id]);
    $this->assertDatabaseHas('audit_logs', ['action' => 'restaurant_created_manually', 'restaurant_id' => $id, 'user_id' => User::where('role', 'admin')->value('id')]);
    $this->assertDatabaseCount('contracts', 0);
    $this->postJson($endpoint, $payload, $headers)->assertConflict();

    expect($token)->toBeString();
    $this->assertDatabaseHas('password_reset_tokens', ['email' => $owner->email, 'token' => hash('sha256', $token), 'owner_invitation' => true]);
    $reset = ['token' => $token, 'email' => $owner->email, 'password' => 'New#Pass123', 'password_confirmation' => 'New#Pass123'];
    $this->postJson('/api/account/reset-password', $reset)->assertOk();
    $this->assertDatabaseHas('auth_accounts', ['user_id' => $id, 'provider_id' => 'credential']);
    $this->postJson('/api/account/reset-password', $reset)->assertUnprocessable();
});

it('requires agreement activation for partner and contract accounts and validates trial inputs', function () {
    $headers = onboardingAdmin();
    $endpoint = '/api/admin/restaurants/manual';
    $this->postJson($endpoint, manualRestaurant(['trial_days' => 0]), $headers)->assertJsonValidationErrors('trial_days');
    $payload = manualRestaurant();
    unset($payload['trial_days']);
    $this->postJson($endpoint, array_replace($payload, ['account_type' => 'contract']), $headers)->assertUnprocessable();
    $this->postJson($endpoint, array_replace($payload, ['account_type' => 'founding_partner', 'application_id' => 1]), $headers)->assertUnprocessable();
    $this->assertDatabaseMissing('users', ['email' => 'new@example.test']);
});

it('links only an eligible application and rolls back failed owner creation', function () {
    $this->postJson('/api/applications', onboardingApplication())->assertCreated();
    $application = DB::table('restaurant_applications')->first();
    DB::table('restaurant_applications')->where('id', $application->id)->update(['status' => 'approved']);
    $headers = onboardingAdmin();
    $payload = manualRestaurant(['application_id' => $application->id]);
    $endpoint = '/api/admin/restaurants/manual';
    $this->postJson($endpoint, $payload, $headers)->assertJsonValidationErrors('application_id');
    $payload['email'] = $application->email;
    $modelEvent = 'eloquent.created: '.User::class;
    \Illuminate\Support\Facades\Event::listen($modelEvent, fn () => throw new RuntimeException('Simulated persistence failure'));
    try {
        $this->postJson($endpoint, $payload, $headers)->assertInternalServerError();
    } finally {
        \Illuminate\Support\Facades\Event::forget($modelEvent);
    }
    $this->assertDatabaseMissing('users', ['email' => $application->email]);
    $this->assertDatabaseMissing('password_reset_tokens', ['email' => $application->email]);
    $this->assertDatabaseHas('restaurant_applications', ['id' => $application->id, 'status' => 'approved', 'restaurant_id' => null]);
    $id = $this->postJson($endpoint, $payload, $headers)->assertCreated()->json('data.id');
    $this->assertDatabaseHas('restaurant_applications', ['id' => $application->id, 'status' => 'converted', 'restaurant_id' => $id]);
});
