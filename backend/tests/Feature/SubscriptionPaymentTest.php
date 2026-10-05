<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function trialOwner($test): array
{
    $res = $test->postJson('/api/auth/register', ['restaurant_name' => 'مطعم الدفع', 'email' => 'pay'.uniqid().'@x.test', 'password' => 'Trial#Pass123', 'password_confirmation' => 'Trial#Pass123'])->assertCreated();

    return ['token' => $res->json('data.token'), 'id' => $res->json('data.user.id')];
}

function platformAdmin(): array
{
    $t = 'adm-'.uniqid();
    DB::table('users')->insert(['name' => 'Admin', 'email' => uniqid().'@adm.test', 'password' => Hash::make('x'), 'role' => 'admin', 'api_token' => hash('sha256', $t), 'created_at' => now(), 'updated_at' => now()]);

    return ['token' => $t];
}

it('shows bank transfer instructions with server prices and the WhatsApp contact', function () {
    config(['subscriptions.bank.account_number' => '123456', 'subscriptions.bank.iban' => 'PS00PALS000000000000123456']);
    $owner = trialOwner($this);

    $data = $this->getJson('/api/subscription', authAs($owner))->assertOk()->json('data');
    expect($data['bank']['name'])->toBe('بنك فلسطين')
        ->and($data['bank_configured'])->toBeTrue()
        ->and($data['whatsapp'])->toBe('+970597401925')
        ->and($data['reference_code'])->toBe('MP-'.$owner['id'])
        ->and(collect($data['plans'])->firstWhere('id', 'pro')['price'])->toBe(29)
        ->and($data['annual_free_months'])->toBe(2);
});

it('records a reported transfer as pending, prices it server-side and prepares the WhatsApp invoice', function () {
    $owner = trialOwner($this);
    $res = $this->postJson('/api/subscription/payments', [
        'plan' => 'pro', 'months' => 3, 'amount' => 1, // client amount is ignored
        'payer_name' => 'أحمد الكحلوت', 'transfer_reference' => 'BOP-778899', 'transfer_date' => now()->toDateString(),
        'proof' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    ], authAs($owner))->assertCreated()->json('data');

    expect($res['status'])->toBe('pending')
        ->and((float) $res['amount'])->toBe(87.0)
        ->and($res['invoice_number'])->toStartWith('MPS-'.now()->format('Y').'-')
        ->and($res['proof_url'])->toContain('/api/media/')
        ->and($res['whatsapp_url'])->toStartWith('https://wa.me/970597401925?text=');
    $text = urldecode(explode('text=', $res['whatsapp_url'])[1]);
    expect($text)->toContain($res['invoice_number'], 'الاحترافية', '87 USD', 'BOP-778899', 'بنك فلسطين', 'MP-'.$owner['id']);

    // Still a trial: nothing is activated by the owner.
    $sub = $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription');
    expect($sub['status'])->toBe('TRIAL')->and($sub['payment_pending'])->toBeTrue()->and($sub['requested_plan'])->toBe('pro');

    // A second report while one is pending is refused.
    $this->postJson('/api/subscription/payments', ['plan' => 'basic', 'payer_name' => 'x', 'transfer_date' => now()->toDateString()], authAs($owner))
        ->assertStatus(409)->assertJsonPath('code', 'PAYMENT_ALREADY_PENDING');
    expect(DB::table('audit_logs')->where('action', 'subscription.subscription_payment_submitted')->exists())->toBeTrue();
});

it('lets an expired (restricted) restaurant pay, and the admin verification restores full access for the paid months', function () {
    $this->freezeTime();
    $owner = trialOwner($this);
    $admin = platformAdmin();
    $this->travel(20)->days();
    $this->postJson('/api/tables', ['label' => 'X', 'seats' => 2], authAs($owner))->assertForbidden();

    $payment = $this->postJson('/api/subscription/payments', ['plan' => 'basic', 'months' => 1, 'payer_name' => 'Ahmed', 'transfer_date' => now()->toDateString()], authAs($owner))->assertCreated()->json('data');

    $pending = $this->getJson('/api/admin/subscription-payments', authAs($admin))->assertOk()->json('data');
    expect($pending)->toHaveCount(1)->and($pending[0]['restaurant_id'])->toBe($owner['id']);

    $this->postJson("/api/admin/subscription-payments/{$payment['id']}/verify", [], authAs($admin))->assertOk()->assertJsonPath('data.status', 'verified');
    $sub = $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription');
    expect($sub)->toMatchArray(['status' => 'ACTIVE', 'plan' => 'basic', 'can_operate' => true, 'payment_pending' => false])
        ->and(substr($sub['subscription_ends_at'], 0, 10))->toBe(now()->addMonthNoOverflow()->toDateString());
    $this->postJson('/api/tables', ['label' => 'Back', 'seats' => 2], authAs($owner))->assertCreated();

    // Verifying twice is refused; the paid month ends → EXPIRED again (data kept).
    $this->postJson("/api/admin/subscription-payments/{$payment['id']}/verify", [], authAs($admin))->assertStatus(409);
    $this->travel(35)->days();
    expect($this->getJson('/api/auth/me', authAs($owner))->json('data.subscription.status'))->toBe('EXPIRED');
    expect(DB::table('audit_logs')->where('action', 'admin.subscription_payment_verified')->exists())->toBeTrue();
});

it('rejects a payment with a reason and lets the owner report again', function () {
    $owner = trialOwner($this);
    $admin = platformAdmin();
    $p = $this->postJson('/api/subscription/payments', ['plan' => 'pro', 'payer_name' => 'A', 'transfer_date' => now()->toDateString()], authAs($owner))->json('data');

    $this->postJson("/api/admin/subscription-payments/{$p['id']}/reject", ['reason' => 'لم يصل المبلغ'], authAs($admin))->assertOk()->assertJsonPath('data.status', 'rejected');
    $mine = $this->getJson('/api/subscription', authAs($owner))->json('data.payments.0');
    expect($mine['status'])->toBe('rejected')->and($mine['rejection_reason'])->toBe('لم يصل المبلغ');
    $this->postJson('/api/subscription/payments', ['plan' => 'pro', 'payer_name' => 'A', 'transfer_date' => now()->toDateString()], authAs($owner))->assertCreated();
});

it('keeps payments private and admin-only where required', function () {
    $a = trialOwner($this);
    $b = trialOwner($this);
    $cashier = makeStaff($a['id'], 'cashier');
    $p = $this->postJson('/api/subscription/payments', ['plan' => 'pro', 'payer_name' => 'A', 'transfer_date' => now()->toDateString()], authAs($a))->json('data');

    expect($this->getJson('/api/subscription', authAs($b))->json('data.payments'))->toBe([]);
    $this->getJson('/api/subscription', authAs($cashier))->assertForbidden();
    $this->postJson('/api/subscription/payments', ['plan' => 'pro', 'payer_name' => 'A', 'transfer_date' => now()->toDateString()], authAs($cashier))->assertForbidden();
    $this->postJson("/api/admin/subscription-payments/{$p['id']}/verify", [], authAs($a))->assertForbidden();
    $this->getJson('/api/admin/subscription-payments', authAs($a))->assertForbidden();
    $this->postJson('/api/subscription/payments', ['plan' => 'pro', 'payer_name' => 'A', 'transfer_date' => now()->addDays(3)->toDateString()], authAs($b))->assertStatus(422);
});

it('prices a 12-month payment at 10 months (2 free)', function () {
    $owner = trialOwner($this);
    $p = $this->postJson('/api/subscription/payments', ['plan' => 'pro', 'months' => 12, 'payer_name' => 'A', 'transfer_date' => now()->toDateString()], authAs($owner))->assertCreated()->json('data');
    expect((float) $p['amount'])->toBe(290.0)->and($p['months'])->toBe(12);
});
