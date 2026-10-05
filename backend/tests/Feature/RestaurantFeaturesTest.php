<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/** Restaurant permissions: the platform admin grants/revokes features on top of the plan. */
function featuresAdmin(): array
{
    $t = 'adm-'.Str::random(20);
    DB::table('users')->insert(['name' => 'Admin', 'email' => uniqid().'@adm.test', 'password' => Hash::make('x'), 'role' => 'admin', 'api_token' => hash('sha256', $t), 'created_at' => now(), 'updated_at' => now()]);

    return ['token' => $t];
}

function featuresOwner(string $plan = 'basic', array $addons = []): array
{
    $owner = makeOwner('Features');
    DB::table('users')->where('id', $owner['id'])->update(['plan' => $plan, 'addons' => json_encode($addons), 'subscription_status' => 'ACTIVE', 'subscription_started_at' => now()]);

    return $owner;
}

function setFeatures($test, array $admin, array $owner, ?array $features)
{
    return $test->putJson("/api/admin/restaurants/{$owner['id']}/features", ['features' => $features], authAs($admin));
}

function sheetItem(array $sheet, string $key): array
{
    return collect($sheet['groups'])->flatMap(fn ($g) => $g['items'])->firstWhere('key', $key);
}

it('shows the admin each feature with its plan default and state', function () {
    $sheet = $this->getJson('/api/admin/restaurants/'.featuresOwner('basic')['id'].'/features', authAs(featuresAdmin()))->assertOk()->json('data');

    expect($sheet['plan_label'])->toBe('الأساسية')
        ->and(collect($sheet['groups'])->pluck('title')->all())->toBe(['التشغيل', 'التوصيل', 'التقارير', 'الهوية والتصميم'])
        ->and(sheetItem($sheet, 'kitchen'))->toMatchArray(['enabled' => true, 'from_plan' => true, 'override' => null])
        ->and(sheetItem($sheet, 'reports'))->toMatchArray(['enabled' => false, 'from_plan' => false, 'override' => null]);
});

it('grants a feature the plan lacks, and the API honours it', function () {
    $admin = featuresAdmin();
    $owner = featuresOwner('basic');
    $defaults = ['dine_in', 'kitchen', 'cashier', 'waiter', 'staff'];

    $sheet = setFeatures($this, $admin, $owner, [...$defaults, 'online_orders', 'reports'])->assertOk()->json('data');
    expect($sheet['overrides'])->toBe(['grant' => ['online_orders', 'reports'], 'revoke' => []])
        ->and(sheetItem($sheet, 'reports'))->toMatchArray(['enabled' => true, 'from_plan' => false, 'override' => 'grant']);

    expect($this->getJson('/api/auth/me', authAs($owner))->json('data.subscription.features'))->toContain('online_orders', 'reports');
    expect($this->getJson('/api/online-ordering/settings', authAs($owner))->json('data.plan_allows'))->toBeTrue();
    $this->getJson('/api/owner/reports/sales-trend', authAs($owner))->assertOk();
});

it('revokes a feature the plan has, for the owner and the staff', function () {
    $admin = featuresAdmin();
    $owner = featuresOwner('pro');
    $kitchen = makeStaff($owner['id'], 'kitchen');
    $this->getJson('/api/kitchen/orders', authAs($kitchen))->assertOk();

    $all = collect(setFeatures($this, $admin, $owner, null)->json('data.groups'))->flatMap(fn ($g) => $g['items'])->where('enabled', true)->pluck('key')->all();
    setFeatures($this, $admin, $owner, array_values(array_diff($all, ['kitchen', 'dine_in', 'reports'])))->assertOk()
        ->assertJsonPath('data.overrides.revoke', ['dine_in', 'kitchen', 'reports']);

    $this->getJson('/api/kitchen/orders', authAs($kitchen))->assertForbidden()->assertJsonPath('code', 'FEATURE_NOT_AVAILABLE')->assertJsonPath('feature', 'kitchen');
    $this->postJson('/api/tables', ['label' => 'T1', 'seats' => 2], authAs($owner))->assertForbidden()->assertJsonPath('feature', 'dine_in');
    $table = makeTable($owner['id']);
    $this->postJson("/api/public/tables/{$table->table_code}/sessions", ['name' => 'Sara', 'phone' => '0599000000', 'latitude' => 31.5, 'longitude' => 34.46])->assertForbidden();
    $this->getJson('/api/owner/reports/sales-trend', authAs($owner))->assertForbidden();
    expect($this->getJson('/api/auth/me', authAs($kitchen))->json('data.subscription'))
        ->features->not->toContain('kitchen')
        ->dine_in->toBeFalse();
});

it('restores the plan defaults on reset, and audits every change', function () {
    $admin = featuresAdmin();
    $owner = featuresOwner('basic');
    setFeatures($this, $admin, $owner, ['dine_in', 'online_orders'])->assertOk();

    $sheet = setFeatures($this, $admin, $owner, null)->assertOk()->json('data');
    expect($sheet['overrides'])->toBe(['grant' => [], 'revoke' => []])
        ->and(User::find($owner['id'])->feature_overrides)->toBeNull()
        ->and(User::find($owner['id'])->hasFeature('kitchen'))->toBeTrue();
    expect(DB::table('audit_logs')->where('action', 'admin.restaurant_features_changed')->count())->toBe(2);
});

it('keeps the admin decisions when the plan changes', function () {
    $admin = featuresAdmin();
    $owner = featuresOwner('basic');
    setFeatures($this, $admin, $owner, ['dine_in', 'cashier', 'waiter', 'staff', 'reports'])->assertOk(); // grant reports, revoke kitchen

    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'pro'], authAs($admin))->assertOk();
    $u = User::find($owner['id']);
    expect($u->hasFeature('kitchen'))->toBeFalse() // still revoked
        ->and($u->hasFeature('branding'))->toBeTrue(); // new from Pro

    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'basic'], authAs($admin))->assertOk();
    expect(User::find($owner['id'])->hasFeature('reports'))->toBeTrue(); // still granted
});

it('applies revokes during a trial, but a grant never outlives the paid period', function () {
    $admin = featuresAdmin();
    $res = $this->postJson('/api/auth/register', ['restaurant_name' => 'T', 'email' => 'ft'.uniqid().'@x.test', 'password' => 'Trial#Pass123', 'password_confirmation' => 'Trial#Pass123'])->assertCreated();
    $trial = ['token' => $res->json('data.token'), 'id' => $res->json('data.user.id')];
    $all = collect($this->getJson("/api/admin/restaurants/{$trial['id']}/features", authAs($admin))->json('data.groups'))->flatMap(fn ($g) => $g['items'])->pluck('key')->all();
    setFeatures($this, $admin, $trial, array_values(array_diff($all, ['online_orders'])))->assertOk();
    expect(User::find($trial['id'])->hasFeature('online_orders'))->toBeFalse();

    $ended = featuresOwner('basic');
    DB::table('users')->where('id', $ended['id'])->update(['subscription_ends_at' => now()->subDay()]);
    setFeatures($this, $admin, $ended, ['dine_in', 'kitchen', 'cashier', 'waiter', 'staff', 'online_orders'])->assertOk();
    expect(User::find($ended['id'])->hasFeature('online_orders'))->toBeFalse();
});

it('is for the platform admin only and validates feature names', function () {
    $owner = featuresOwner('basic');
    $this->getJson("/api/admin/restaurants/{$owner['id']}/features", authAs($owner))->assertForbidden();
    setFeatures($this, $owner, $owner, ['reports'])->assertForbidden();
    setFeatures($this, featuresAdmin(), $owner, ['jetpack'])->assertStatus(422);
    $this->putJson("/api/admin/restaurants/{$owner['id']}/features", [], authAs(featuresAdmin()))->assertStatus(422); // features is required (null = reset)
});
