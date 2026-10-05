<?php

use App\Models\User;
use App\Support\SubscriptionPlans;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/** Two plans + add-ons (docs/SUBSCRIPTIONS.md). */
function addonTrialOwner($test): array
{
    $res = $test->postJson('/api/auth/register', ['restaurant_name' => 'مطعم الإضافات', 'email' => 'addon'.uniqid().'@x.test', 'password' => 'Trial#Pass123', 'password_confirmation' => 'Trial#Pass123'])->assertCreated();

    return ['token' => $res->json('data.token'), 'id' => $res->json('data.user.id')];
}

function addonAdmin(): array
{
    $t = 'adm-'.Str::random(20);
    DB::table('users')->insert(['name' => 'Admin', 'email' => uniqid().'@adm.test', 'password' => Hash::make('x'), 'role' => 'admin', 'api_token' => hash('sha256', $t), 'created_at' => now(), 'updated_at' => now()]);

    return ['token' => $t];
}

/** A restaurant on a running paid plan with the given add-ons. */
function addonPaidOwner(string $plan, array $addons = [], ?string $endsAt = null): array
{
    $owner = makeOwner('Addon');
    DB::table('users')->where('id', $owner['id'])->update([
        'plan' => $plan, 'addons' => json_encode($addons), 'subscription_status' => 'ACTIVE',
        'subscription_started_at' => now(), 'subscription_ends_at' => $endsAt,
    ]);

    return $owner;
}

function addonReport($test, array $owner, array $body)
{
    return $test->postJson('/api/subscription/payments', $body + ['payer_name' => 'Ahmed', 'transfer_date' => now()->toDateString()], authAs($owner));
}

it('lists the plans and the add-ons with server prices', function () {
    $data = $this->getJson('/api/subscription', authAs(addonTrialOwner($this)))->assertOk()->json('data');

    expect(collect($data['plans'])->pluck('price', 'id')->all())->toBe(['basic' => 15, 'pro' => 29, 'delivery_only' => 15])
        ->and(collect($data['plans'])->pluck('dine_in', 'id')->all())->toBe(['basic' => true, 'pro' => true, 'delivery_only' => false])
        ->and(collect($data['addons'])->pluck('price', 'id')->all())->toBe(['delivery' => 15, 'brand_plus' => 5])
        ->and(collect($data['addons'])->firstWhere('id', 'brand_plus')['plans'])->toBe(['pro'])
        ->and(collect($data['addons'])->firstWhere('id', 'delivery')['plans'])->toBe(['basic', 'pro']);
});

it('prices plan + add-ons on the server, and lists them on the invoice and in WhatsApp', function () {
    $owner = addonTrialOwner($this);
    $p = addonReport($this, $owner, ['plan' => 'basic', 'addons' => ['delivery'], 'months' => 3, 'amount' => 1])->assertCreated()->json('data');

    expect((float) $p['amount'])->toBe(90.0) // (15 + 15) × 3, client amount ignored
        ->and($p['addons'])->toBe(['delivery'])
        ->and($p['plan_label'])->toBe('الأساسية + التوصيل والطلب أونلاين');
    expect(urldecode(explode('text=', $p['whatsapp_url'])[1]))->toContain('الأساسية + التوصيل والطلب أونلاين');
    expect(User::find($owner['id']))->requested_plan->toBe('basic')->requested_addons->toBe(['delivery']);
});

it('applies the annual discount to the add-ons too', function () {
    $p = addonReport($this, addonTrialOwner($this), ['plan' => 'pro', 'addons' => ['brand_plus', 'delivery'], 'months' => 12])->assertCreated()->json('data');

    expect((float) $p['amount'])->toBe(490.0) // (29 + 15 + 5) × 10
        ->and($p['addons'])->toBe(['delivery', 'brand_plus']); // catalogue order
});

it('refuses an add-on the plan cannot take, and unknown add-ons', function () {
    $owner = addonTrialOwner($this);
    addonReport($this, $owner, ['plan' => 'basic', 'addons' => ['brand_plus']])
        ->assertStatus(422)->assertJsonPath('code', 'ADDON_NOT_AVAILABLE');
    addonReport($this, $owner, ['plan' => 'pro', 'addons' => ['jetpack']])->assertStatus(422);
    $this->patchJson('/api/me/plan', ['plan' => 'basic', 'addons' => ['brand_plus']], authAs($owner))->assertStatus(422);

    expect(DB::table('subscription_payments')->count())->toBe(0);
});

it('maps the retired Premium plan to Pro with both add-ons at the same price', function () {
    $p = addonReport($this, addonTrialOwner($this), ['plan' => 'premium', 'months' => 1])->assertCreated()->json('data');

    expect($p['plan'])->toBe('pro')->and($p['addons'])->toBe(['delivery', 'brand_plus'])->and((float) $p['amount'])->toBe(49.0);
});

it('activates the paid add-ons on verify, for the owner and the staff', function () {
    $owner = addonTrialOwner($this);
    $cashier = makeStaff($owner['id'], 'cashier');
    $this->travel(20)->days(); // trial over
    $p = addonReport($this, $owner, ['plan' => 'basic', 'addons' => ['delivery']])->assertCreated()->json('data');

    $this->postJson("/api/admin/subscription-payments/{$p['id']}/verify", [], authAs(addonAdmin()))->assertOk();

    $sub = $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription');
    expect($sub)->toMatchArray(['status' => 'ACTIVE', 'plan' => 'basic', 'addons' => ['delivery'], 'monthly_price' => 30, 'requested_addons' => []])
        ->and($sub['features'])->toBe(['dine_in', 'kitchen', 'cashier', 'waiter', 'staff', 'online_orders']);
    // Staff get the owner's live features (their own row only copies an old plan name).
    expect($this->getJson('/api/auth/me', authAs($cashier))->json('data.subscription.features'))->toBe($sub['features']);
    expect($this->getJson('/api/online-ordering/settings', authAs($owner))->json('data.plan_allows'))->toBeTrue();
});

it('extends a renewal of the same plan and add-ons, and restarts the period on any change', function () {
    $this->freezeTime();
    $admin = addonAdmin();
    $owner = addonPaidOwner('basic', ['delivery'], now()->addDays(10));

    $same = addonReport($this, $owner, ['plan' => 'basic', 'addons' => ['delivery']])->json('data');
    $this->postJson("/api/admin/subscription-payments/{$same['id']}/verify", [], authAs($admin))->assertOk();
    expect(User::find($owner['id'])->subscription_ends_at->toDateString())->toBe(now()->addDays(10)->addMonthNoOverflow()->toDateString());

    $changed = addonReport($this, $owner, ['plan' => 'basic', 'addons' => []])->json('data');
    $this->postJson("/api/admin/subscription-payments/{$changed['id']}/verify", [], authAs($admin))->assertOk();
    $u = User::find($owner['id']);
    expect($u->subscription_ends_at->toDateString())->toBe(now()->addMonthNoOverflow()->toDateString())
        ->and($u->addons)->toBe([])
        ->and($u->hasFeature('online_orders'))->toBeFalse();
});

it('gates each feature by plan and add-on, and ignores an add-on the plan cannot take', function () {
    $basic = User::find(addonPaidOwner('basic')['id']);
    $basicDelivery = User::find(addonPaidOwner('basic', ['delivery'])['id']);
    $pro = User::find(addonPaidOwner('pro')['id']);
    $proFull = User::find(addonPaidOwner('pro', ['delivery', 'brand_plus'])['id']);
    $basicBrand = User::find(addonPaidOwner('basic', ['brand_plus'])['id']); // invalid row

    expect($basic->features())->toBe(['dine_in', 'kitchen', 'cashier', 'waiter', 'staff'])
        ->and($basicDelivery->hasFeature('online_orders'))->toBeTrue()
        ->and($basic->hasFeature('reports'))->toBeFalse()
        ->and($pro->hasFeature('branding'))->toBeTrue()
        ->and($pro->hasFeature('online_orders'))->toBeFalse()
        ->and($pro->hasFeature('custom-theme'))->toBeFalse()
        ->and($proFull->hasFeature('online_orders'))->toBeTrue()
        ->and($proFull->hasFeature('remove-branding'))->toBeTrue()
        ->and($basicBrand->hasFeature('custom-font'))->toBeFalse();
});

it('gives a trial every feature, and an expired plan no paid extras', function () {
    $owner = addonTrialOwner($this);
    $features = $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription.features');
    expect($features)->toContain('online_orders', 'branding', 'custom-theme', 'remove-branding');

    $ended = User::find(addonPaidOwner('pro', ['delivery'], now()->subDay())['id']);
    // Online ordering and branding stop; operations follow restricted mode.
    expect($ended->features())->not->toContain('online_orders')->not->toContain('branding')
        ->and($ended->features())->toContain('kitchen', 'reports');
});

it('lets the admin set add-ons, keeps compatible ones on a plan change, and refuses invalid ones', function () {
    $admin = addonAdmin();
    $owner = addonPaidOwner('pro', ['delivery', 'brand_plus']);

    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'basic'], authAs($admin))->assertOk();
    expect(User::find($owner['id']))->plan->toBe('basic')->addons->toBe(['delivery']); // brand_plus needs Pro

    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'basic', 'addons' => ['brand_plus']], authAs($admin))
        ->assertStatus(422)->assertJsonPath('code', 'ADDON_NOT_AVAILABLE');
    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'pro', 'addons' => []], authAs($admin))->assertOk();
    expect(User::find($owner['id'])->addons)->toBe([]);
    expect(DB::table('audit_logs')->where('action', 'admin.plan_changed')->count())->toBe(2);

    $created = $this->postJson('/api/admin/restaurants', ['name' => 'N', 'email' => 'new'.uniqid().'@x.test', 'restaurant_name' => 'New', 'plan' => 'premium'], authAs($admin))
        ->assertCreated()->json('data.restaurant');
    expect(User::find($created['id']))->plan->toBe('pro')->addons->toBe(['delivery', 'brand_plus']);
});

it('migrates Premium restaurants to Pro + both add-ons without changing their dates or total', function () {
    $owner = makeOwner('Legacy');
    $staff = makeStaff($owner['id'], 'cashier');
    $ends = now()->addMonths(2)->startOfSecond();
    DB::table('users')->where('id', $owner['id'])->update(['plan' => 'premium', 'addons' => null, 'subscription_status' => 'ACTIVE', 'subscription_ends_at' => $ends]);
    DB::table('users')->where('id', $staff['id'])->update(['plan' => 'premium']);
    $requested = makeOwner('Requested');
    DB::table('users')->where('id', $requested['id'])->update(['requested_plan' => 'premium']);
    DB::table('subscription_payments')->insert(['user_id' => $owner['id'], 'plan' => 'premium', 'months' => 1, 'amount' => 49, 'currency' => 'USD', 'reference_code' => 'MP-1', 'status' => 'verified', 'created_at' => now(), 'updated_at' => now()]);

    (require database_path('migrations/2026_10_01_100000_add_subscription_addons.php'))->up();

    $u = User::find($owner['id']);
    expect($u->plan)->toBe('pro')
        ->and($u->addons)->toBe(['delivery', 'brand_plus'])
        ->and($u->subscription_ends_at->equalTo($ends))->toBeTrue()
        ->and(SubscriptionPlans::monthlyPrice($u->plan, $u->addons))->toBe(49.0)
        ->and($u->hasFeature('online_orders') && $u->hasFeature('custom-font'))->toBeTrue();
    expect(User::find($staff['id'])->plan)->toBe('pro');
    expect(User::find($requested['id']))->requested_plan->toBe('pro')->requested_addons->toBe(['delivery', 'brand_plus']);
    expect(DB::table('subscription_payments')->where('plan', 'premium')->count())->toBe(0);
});

// ── Delivery only: a restaurant without tables takes online ordering alone ──

it('sells delivery alone at 15 and never charges the included delivery add-on again', function () {
    $owner = addonTrialOwner($this);
    $p = addonReport($this, $owner, ['plan' => 'delivery_only', 'addons' => ['delivery'], 'months' => 3])->assertCreated()->json('data');

    expect((float) $p['amount'])->toBe(45.0) // 15 × 3, the add-on is already included
        ->and($p['addons'])->toBe([])
        ->and($p['plan_label'])->toBe('التوصيل فقط');
    addonReport($this, addonTrialOwner($this), ['plan' => 'delivery_only', 'addons' => ['brand_plus']])
        ->assertStatus(422)->assertJsonPath('code', 'ADDON_NOT_AVAILABLE');
});

it('lets a delivery-only restaurant receive online orders', function () {
    $owner = addonPaidOwner('delivery_only');
    $item = makeItem($owner['id'], 20);
    $slug = 'only-'.$owner['id'];
    $this->putJson('/api/online-ordering/settings', ['enabled' => true, 'pickup_enabled' => true, 'delivery_enabled' => false, 'slug' => $slug], authAs($owner))->assertOk();

    $sub = $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription');
    expect($sub)->toMatchArray(['plan' => 'delivery_only', 'features' => ['kitchen', 'staff', 'online_orders'], 'dine_in' => false, 'monthly_price' => 15]);
    expect($this->getJson('/api/online-ordering/settings', authAs($owner))->json('data.plan_allows'))->toBeTrue();
    $this->postJson("/api/public/restaurants/{$slug}/orders", ['type' => 'pickup', 'name' => 'سارة', 'phone' => '0599 123 456', 'payment_method' => 'cash',
        'items' => [['menuItemId' => $item, 'quantity' => 1]]])->assertCreated();
});

it('blocks tables and table sessions on delivery only, but not on Basic or during a trial', function () {
    $only = addonPaidOwner('delivery_only');
    $this->postJson('/api/tables', ['label' => 'T1', 'seats' => 2], authAs($only))->assertForbidden()->assertJsonPath('code', 'FEATURE_NOT_AVAILABLE');
    // A table left from an earlier plan can't start a QR session.
    $old = makeTable($only['id']);
    $this->postJson("/api/public/tables/{$old->table_code}/sessions", ['name' => 'Sara', 'phone' => '0599000000', 'latitude' => 31.5, 'longitude' => 34.46])
        ->assertForbidden()->assertJsonPath('code', 'FEATURE_NOT_AVAILABLE');

    $this->postJson('/api/tables', ['label' => 'T1', 'seats' => 2], authAs(addonPaidOwner('basic')))->assertCreated();
    $this->postJson('/api/tables', ['label' => 'T1', 'seats' => 2], authAs(addonTrialOwner($this)))->assertCreated();
    expect($this->getJson('/api/auth/me', authAs(addonPaidOwner('basic')))->json('data.subscription.dine_in'))->toBeTrue();
});

it('moves between delivery only and a plan with the delivery add-on', function () {
    $admin = addonAdmin();
    $owner = addonPaidOwner('basic', ['delivery']);

    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'delivery_only'], authAs($admin))->assertOk();
    $u = User::find($owner['id']);
    expect($u->plan)->toBe('delivery_only')->and($u->addons)->toBe([])->and($u->hasFeature('online_orders'))->toBeTrue();

    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'basic', 'addons' => ['delivery']], authAs($admin))->assertOk();
    expect(User::find($owner['id']))->addons->toBe(['delivery']);
});
