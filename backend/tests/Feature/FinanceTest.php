<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/** Salaries, expenses and profit (App\Support\Finance). */
function financeOwner(string $plan = 'pro'): array
{
    $owner = makeOwner('Finance');
    DB::table('users')->where('id', $owner['id'])->update(['plan' => $plan, 'subscription_status' => 'ACTIVE', 'subscription_started_at' => now(), 'subscription_ends_at' => null]);

    return $owner;
}

function tablePayment(int $ownerId, float $amount, string $status, string $paidAt): void
{
    $table = makeTable($ownerId);
    $session = DB::table('dining_sessions')->insertGetId(['restaurant_table_id' => $table->id, 'customer_name' => 'Guest', 'status' => 'closed', 'created_at' => now(), 'updated_at' => now()]);
    DB::table('payments')->insert(['dining_session_id' => $session, 'method' => 'cash', 'amount' => $amount, 'status' => $status, 'paid_at' => $paidAt, 'created_at' => now(), 'updated_at' => now()]);
}

it('computes the month: revenue − prorated salaries − expenses', function () {
    $this->travelTo('2026-10-20 12:00:00');
    $owner = financeOwner();
    // Revenue: a verified table payment counts, a rejected one doesn't, a completed delivery counts with its fee.
    tablePayment($owner['id'], 1000, 'verified', '2026-10-05 13:00:00');
    tablePayment($owner['id'], 999, 'rejected', '2026-10-06 13:00:00');
    tablePayment($owner['id'], 500, 'verified', '2026-09-28 13:00:00'); // another month
    $order = DB::table('orders')->insertGetId(['user_id' => $owner['id'], 'channel' => 'delivery', 'status' => 'served', 'fulfillment_status' => 'completed', 'completed_at' => '2026-10-10 20:00:00', 'delivery_fee' => 10, 'created_at' => now(), 'updated_at' => now()]);
    $item = makeItem($owner['id'], 45);
    DB::table('order_items')->insert(['order_id' => $order, 'menu_item_id' => $item, 'quantity' => 2, 'unit_price' => 45, 'created_at' => now(), 'updated_at' => now()]);

    $api = authAs($owner);
    $this->postJson('/api/owner/finance/employees', ['name' => 'Chef Sami', 'job_title' => 'Chef', 'monthly_salary' => 3100], $api)->assertCreated();
    // Starts on the 17th of a 31-day month → 15 days → 15/31 of the salary.
    $this->postJson('/api/owner/finance/employees', ['name' => 'Waiter Lina', 'monthly_salary' => 1550, 'starts_on' => '2026-10-17'], $api)->assertCreated();
    $this->postJson('/api/owner/finance/expenses', ['category' => 'rent', 'title' => 'Rent', 'amount' => 2000, 'spent_on' => '2026-01-01', 'recurring' => true], $api)->assertCreated();
    $this->postJson('/api/owner/finance/expenses', ['category' => 'supplies', 'title' => 'Vegetables', 'amount' => 300, 'spent_on' => '2026-10-03'], $api)->assertCreated();
    $this->postJson('/api/owner/finance/expenses', ['category' => 'maintenance', 'title' => 'Fridge', 'amount' => 700, 'spent_on' => '2026-09-15'], $api)->assertCreated();

    $s = $this->getJson('/api/owner/finance/summary?month=2026-10', $api)->assertOk()->json('data');
    expect($s['revenue'])->toEqual(1100)              // 1000 + 2×45 + 10
        ->and($s['revenue_outside'])->toEqual(100)
        ->and($s['salaries'])->toEqual(3850)          // 3100 + 1550×15/31 = 3100 + 750
        ->and($s['expenses'])->toEqual(2300)          // rent 2000 + vegetables 300
        ->and($s['expenses_by_category']['maintenance'])->toEqual(0)
        ->and($s['profit'])->toEqual(-5050)
        ->and($s['margin'])->toEqual(-459.1)
        ->and(collect($s['series'])->pluck('month')->all())->toBe(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    $sept = collect($s['series'])->firstWhere('month', '2026-09');
    expect($sept)->toMatchArray(['revenue' => 500, 'costs' => 5800, 'profit' => -5300]); // chef 3100 + rent 2000 + fridge 700
});

it('stops a salary after the end date and a monthly expense after it ends', function () {
    $owner = financeOwner();
    $api = authAs($owner);
    $this->postJson('/api/owner/finance/employees', ['name' => 'Left', 'monthly_salary' => 3000, 'starts_on' => '2026-01-01', 'ends_on' => '2026-08-31'], $api)->assertCreated();
    $this->postJson('/api/owner/finance/expenses', ['category' => 'utilities', 'title' => 'Internet', 'amount' => 100, 'spent_on' => '2026-01-01', 'recurring' => true, 'ends_on' => '2026-08-31'], $api)->assertCreated();

    expect($this->getJson('/api/owner/finance/summary?month=2026-08', $api)->json('data'))->toMatchArray(['salaries' => 3000, 'expenses' => 100]);
    expect($this->getJson('/api/owner/finance/summary?month=2026-09', $api)->json('data'))->toMatchArray(['salaries' => 0, 'expenses' => 0]);
});

it('edits and removes employees and expenses, audited, and validates input', function () {
    $owner = financeOwner();
    $api = authAs($owner);
    $e = $this->postJson('/api/owner/finance/employees', ['name' => 'Sami', 'monthly_salary' => 2000], $api)->json('data');
    $this->patchJson("/api/owner/finance/employees/{$e['id']}", ['monthly_salary' => 2500], $api)->assertOk()->assertJsonPath('data.monthly_salary', '2500.00');
    expect(DB::table('audit_logs')->where('action', 'finance.salary_changed')->count())->toBe(1);
    $this->deleteJson("/api/owner/finance/employees/{$e['id']}", [], $api)->assertOk();

    $this->postJson('/api/owner/finance/employees', ['name' => 'X', 'monthly_salary' => -5], $api)->assertStatus(422)->assertJsonValidationErrors('monthly_salary');
    $this->postJson('/api/owner/finance/expenses', ['category' => 'yacht', 'title' => 'X', 'amount' => 1, 'spent_on' => '2026-10-01'], $api)->assertStatus(422)->assertJsonValidationErrors('category');
    $this->postJson('/api/owner/finance/employees', ['name' => 'X', 'monthly_salary' => 1, 'starts_on' => '2026-10-10', 'ends_on' => '2026-10-01'], $api)->assertStatus(422)->assertJsonValidationErrors('ends_on');
});

it('keeps each restaurant to its own data, and links only its own staff accounts', function () {
    $a = financeOwner();
    $b = financeOwner();
    $row = $this->postJson('/api/owner/finance/employees', ['name' => 'A chef', 'monthly_salary' => 1000], authAs($a))->json('data');
    $this->patchJson("/api/owner/finance/employees/{$row['id']}", ['monthly_salary' => 1], authAs($b))->assertNotFound();
    $this->deleteJson("/api/owner/finance/employees/{$row['id']}", [], authAs($b))->assertNotFound();
    expect($this->getJson('/api/owner/finance/employees', authAs($b))->json('data'))->toBe([]);

    $staffOfB = makeStaff($b['id'], 'cashier');
    $this->postJson('/api/owner/finance/employees', ['name' => 'Not mine', 'monthly_salary' => 1, 'staff_id' => $staffOfB['id']], authAs($a))->assertStatus(422)->assertJsonValidationErrors('staff_id');
    $staffOfA = makeStaff($a['id'], 'cashier');
    $this->postJson('/api/owner/finance/employees', ['name' => 'Mine', 'monthly_salary' => 1, 'staff_id' => $staffOfA['id']], authAs($a))->assertCreated();
});

it('is for the owner, or a manager given manage_finance, on a plan with reports', function () {
    $owner = financeOwner();
    $manager = makeStaff($owner['id'], 'manager');
    $this->getJson('/api/owner/finance/summary', authAs($manager))->assertForbidden(); // not in a manager's defaults
    DB::table('staff')->where('account_user_id', $manager['id'])->update(['permissions' => json_encode(['view_dashboard', 'manage_finance'])]);
    $this->getJson('/api/owner/finance/summary', authAs($manager))->assertOk();

    // Salaries stay with management: a cashier is refused even with the permission.
    $cashier = makeStaff($owner['id'], 'cashier');
    DB::table('staff')->where('account_user_id', $cashier['id'])->update(['permissions' => json_encode(['manage_finance'])]);
    $this->getJson('/api/owner/finance/summary', authAs($cashier))->assertForbidden();

    $this->getJson('/api/owner/finance/summary', authAs(financeOwner('basic')))->assertForbidden()->assertJsonPath('code', 'FEATURE_NOT_AVAILABLE');
});
