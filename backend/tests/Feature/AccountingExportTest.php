<?php

use App\Support\Export\XlsxWriter;
use App\Support\SessionLifecycle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

/** Read an exported .xlsx: headers + rows of [type, value, style]. */
function readXlsx($response): array
{
    $path = $response->baseResponse->getFile()->getPathname();
    $zip = new ZipArchive;
    expect($zip->open($path))->toBeTrue();
    $xml = simplexml_load_string($zip->getFromName('xl/worksheets/sheet1.xml'));
    $zip->close();
    $rows = [];
    foreach ($xml->sheetData->row as $row) {
        $cells = [];
        foreach ($row->c as $c) {
            $col = preg_replace('/\d+/', '', (string) $c['r']);
            $isText = (string) $c['t'] === 'inlineStr';
            $cells[$col] = ['type' => $isText ? 'text' : 'number', 'value' => $isText ? (string) $c->is->t : (float) $c->v, 'style' => (int) $c['s']];
        }
        $rows[] = $cells;
    }
    $headers = array_map(fn ($c) => $c['value'], array_shift($rows) ?? []);

    return ['headers' => array_values($headers), 'rows' => $rows, 'freeze' => (string) $xml->sheetViews->sheetView->pane['state'], 'filter' => (string) $xml->autoFilter['ref'], 'rtl' => (string) $xml->sheetViews->sheetView['rightToLeft']];
}

function col(array $sheet, string $header): ?string
{
    $i = array_search($header, $sheet['headers'], true);

    return $i === false ? null : XlsxWriter::letters($i);
}

/** Two paid invoices (cash, bank-verified), one open session, a cancel and a discount. */
function accountingScenario($test): array
{
    $owner = makeOwner('Zaytoona');
    $cashier = makeStaff($owner['id'], 'cashier');
    $burger = DB::table('menu_items')->insertGetId(['user_id' => $owner['id'], 'name' => 'برجر', 'sku' => 'BRG-01', 'price' => 20, 'category' => 'رئيسي', 'is_available' => true, 'created_at' => now(), 'updated_at' => now()]);
    $juice = DB::table('menu_items')->insertGetId(['user_id' => $owner['id'], 'name' => 'عصير', 'price' => 5, 'category' => 'مشروبات', 'is_available' => true, 'created_at' => now(), 'updated_at' => now()]);

    // Invoice 1: 2 burgers + 1 juice (juice discounted 5 → 4), 1 burger cancelled, paid cash.
    $s1 = openSession($test, makeTable($owner['id'], '1'));
    $o1 = $test->postJson("/api/public/sessions/{$s1['id']}/orders", ['items' => [['menuItemId' => $burger, 'quantity' => 2], ['menuItemId' => $juice, 'quantity' => 1]]], customer($s1))->json('data.id');
    $o2 = $test->postJson("/api/public/sessions/{$s1['id']}/orders", ['items' => [['menuItemId' => $burger, 'quantity' => 1]]], customer($s1))->json('data.id');
    $test->postJson('/api/order-items/'.DB::table('order_items')->where('order_id', $o2)->value('id').'/cancel', ['reason' => 'changed mind'], authAs($cashier))->assertOk();
    $juiceLine = DB::table('order_items')->where('order_id', $o1)->where('menu_item_id', $juice)->value('id');
    $test->patchJson("/api/sessions/{$s1['id']}/bill-items/{$juiceLine}", ['new_price' => 4, 'reason' => 'loyalty'], authAs($cashier))->assertOk();
    $test->postJson("/api/sessions/{$s1['id']}/payment", ['method' => 'cash'], authAs($cashier))->assertCreated(); // 44, closes → INV 1

    // Invoice 2: 1 burger, customer bank transfer verified, then closed.
    $s2 = openSession($test, makeTable($owner['id'], '2'));
    $test->postJson("/api/public/sessions/{$s2['id']}/orders", ['items' => [['menuItemId' => $burger, 'quantity' => 1]]], customer($s2))->assertCreated();
    DB::table('payments')->insert(['dining_session_id' => $s2['id'], 'method' => 'bank', 'status' => 'verified', 'amount' => 20, 'provider' => 'Bank of Palestine', 'verified_by' => $cashier['id'], 'created_at' => now(), 'updated_at' => now()]);
    $test->postJson("/api/sessions/{$s2['id']}/close", [], authAs($cashier))->assertOk(); // INV 2

    // Open session (pending invoice) with a pending customer payment.
    $s3 = openSession($test, makeTable($owner['id'], '3'));
    $test->postJson("/api/public/sessions/{$s3['id']}/orders", ['items' => [['menuItemId' => $juice, 'quantity' => 2]]], customer($s3))->assertCreated();
    DB::table('payments')->insert(['dining_session_id' => $s3['id'], 'method' => 'wallet', 'status' => 'pending', 'amount' => 10, 'created_at' => now(), 'updated_at' => now()]);

    return compact('owner', 'cashier', 'burger', 'juice', 's1', 's2', 's3');
}

it('exports detailed invoice lines as a real, typed, formatted xlsx', function () {
    ['owner' => $owner] = accountingScenario($this);

    $res = $this->get('/api/reports/export/invoices', authAs($owner))->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($res->headers->get('Content-Disposition'))->toContain('menuPilot-invoices-')->toContain('.xlsx');
    $x = readXlsx($res);

    expect($x['headers'])->toContain('رقم الفاتورة', 'رمز الصنف', 'اسم الصنف', 'الكمية', 'سعر الوحدة', 'الحسم', 'الإجمالي', 'طريقة الدفع', 'حالة الدفع')
        ->and($x['freeze'])->toBe('frozen')->and($x['filter'])->toStartWith('A1:')->and($x['rtl'])->toBe('1');

    $data = array_slice($x['rows'], 0, -1); // last row = totals
    expect($data)->toHaveCount(3); // 2 burgers line + juice line (inv 1) + burger (inv 2); cancelled excluded
    $qty = col($x, 'الكمية');
    $total = col($x, 'الإجمالي');
    $inv = col($x, 'رقم الفاتورة');
    expect($data[0][$qty]['type'])->toBe('number')
        ->and($data[0][$inv]['value'])->toBe('INV-000001')
        ->and(collect($data)->pluck("$inv.value")->unique()->values()->all())->toBe(['INV-000001', 'INV-000002'])
        ->and(collect($data)->sum(fn ($r) => $r[$total]['value']))->toBe(64.0)
        ->and(end($x['rows'])[$total]['value'])->toBe(64.0) // totals row
        ->and(collect($data)->pluck(col($x, 'رمز الصنف').'.value')->all())->toContain('BRG-01');

    $juice = collect($data)->first(fn ($r) => $r[col($x, 'اسم الصنف')]['value'] === 'عصير');
    expect($juice[col($x, 'الحسم')]['value'])->toBe(1.0)->and($juice[col($x, 'سعر الوحدة')]['value'])->toBe(4.0);
});

it('exports one row per invoice with paid / outstanding and keeps pending invoices separate', function () {
    ['owner' => $owner] = accountingScenario($this);

    $x = readXlsx($this->get('/api/reports/export/sales', authAs($owner))->assertOk());
    $rows = array_slice($x['rows'], 0, -1);
    expect($rows)->toHaveCount(2);
    expect(collect($rows)->pluck(col($x, 'حالة الفاتورة').'.value')->unique()->all())->toBe(['PAID'])
        ->and(collect($rows)->sum(fn ($r) => $r[col($x, 'المدفوع')]['value']))->toBe(64.0);

    $all = readXlsx($this->get('/api/reports/export/sales?invoice_status=all', authAs($owner)));
    $statuses = collect(array_slice($all['rows'], 0, -1))->pluck(col($all, 'حالة الفاتورة').'.value')->all();
    expect($statuses)->toContain('PENDING')->and($statuses)->toHaveCount(3);
});

it('exports payments with their real status and filters by method', function () {
    ['owner' => $owner] = accountingScenario($this);

    $x = readXlsx($this->get('/api/reports/export/payments', authAs($owner))->assertOk());
    $status = collect(array_slice($x['rows'], 0, -1))->pluck(col($x, 'حالة الدفع').'.value')->all();
    expect($status)->toEqualCanonicalizing(['PAID', 'PAID', 'PENDING']);

    $cash = readXlsx($this->get('/api/reports/export/payments?payment_method=cash', authAs($owner)));
    expect(array_slice($cash['rows'], 0, -1))->toHaveCount(1)
        ->and(array_slice($cash['rows'], 0, -1)[0][col($cash, 'المبلغ')]['value'])->toBe(44.0);
});

it('exports product sales and a daily report with correct totals', function () {
    ['owner' => $owner] = accountingScenario($this);

    $p = readXlsx($this->get('/api/reports/export/products', authAs($owner))->assertOk());
    $burger = collect(array_slice($p['rows'], 0, -1))->first(fn ($r) => $r[col($p, 'اسم الصنف')]['value'] === 'برجر');
    expect($burger[col($p, 'الكمية المباعة')]['value'])->toBe(3.0)->and($burger[col($p, 'صافي المبيعات')]['value'])->toBe(60.0);

    $d = readXlsx($this->get('/api/reports/export/daily?range=today', authAs($owner))->assertOk());
    $today = array_slice($d['rows'], 0, -1)[0];
    expect($today[col($d, 'عدد الفواتير')]['value'])->toBe(2.0)
        ->and($today[col($d, 'صافي المبيعات')]['value'])->toBe(64.0)
        ->and($today[col($d, 'الحسم')]['value'])->toBe(1.0)
        ->and($today[col($d, 'مبيعات نقدية')]['value'])->toBe(44.0)
        ->and($today[col($d, 'مبيعات إلكترونية')]['value'])->toBe(20.0)
        ->and($today[col($d, 'مدفوعات معلّقة')]['value'])->toBe(10.0)
        ->and($today[col($d, 'ملغى / مسترد')]['value'])->toBe(20.0);
});

it('applies date filters and produces a valid empty report', function () {
    ['owner' => $owner] = accountingScenario($this);

    $x = readXlsx($this->get('/api/reports/export/invoices?range=previous_month', authAs($owner))->assertOk());
    expect($x['rows'])->toBe([])->and($x['headers'])->not->toBeEmpty();
    $this->getJson('/api/reports/export/invoices?from=2026-01-10&to=2026-01-01', authAs($owner))->assertStatus(422);
});

it('numbers invoices sequentially per restaurant and never changes them', function () {
    ['owner' => $owner, 's1' => $s1, 's2' => $s2, 's3' => $s3] = accountingScenario($this);
    expect(DB::table('dining_sessions')->where('id', $s1['id'])->value('invoice_number'))->toBe(1)
        ->and(DB::table('dining_sessions')->where('id', $s2['id'])->value('invoice_number'))->toBe(2)
        ->and(DB::table('dining_sessions')->where('id', $s3['id'])->value('invoice_number'))->toBeNull();

    // Another restaurant starts its own sequence.
    $other = makeOwner('Other');
    $cashier = makeStaff($other['id'], 'cashier');
    $s = openSession($this, makeTable($other['id']));
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($other['id'], 7), 'quantity' => 1]]], customer($s));
    $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash'], authAs($cashier))->assertCreated();
    expect(DB::table('dining_sessions')->where('id', $s['id'])->value('invoice_number'))->toBe(1);

    // Re-issuing is a no-op.
    SessionLifecycle::issueInvoiceNumber($s1['id'], $owner['id']);
    expect(DB::table('dining_sessions')->where('id', $s1['id'])->value('invoice_number'))->toBe(1);
});

it('enforces export permissions on the backend', function () {
    ['owner' => $owner, 'cashier' => $cashier] = accountingScenario($this);
    $waiter = makeStaff($owner['id'], 'waiter');

    $this->getJson('/api/reports/export/invoices')->assertUnauthorized();
    $this->getJson('/api/reports/export/invoices', authAs($waiter))->assertForbidden();
    $this->getJson('/api/reports/export/payments', authAs($cashier))->assertForbidden(); // not granted by default

    $staffId = DB::table('staff')->where('account_user_id', $cashier['id'])->value('id');
    $this->patchJson("/api/staff/{$staffId}", ['permissions' => ['view_payments', 'export_payments']], authAs($owner))->assertOk();
    DB::table('users')->where('id', $cashier['id'])->update(['api_token' => hash('sha256', 'cashier-2')]);
    $this->get('/api/reports/export/payments', authAs(['token' => 'cashier-2']))->assertOk();
    $this->getJson('/api/reports/export/invoices', authAs(['token' => 'cashier-2']))->assertForbidden();
    $this->putJson('/api/accounting/settings', ['currency' => 'USD'], authAs(['token' => 'cashier-2']))->assertForbidden();

    $token = 'adm-'.uniqid();
    DB::table('users')->insert(['name' => 'Admin', 'email' => 'adm@x.test', 'password' => Hash::make('x'), 'role' => 'admin', 'api_token' => hash('sha256', $token), 'created_at' => now(), 'updated_at' => now()]);
    $this->getJson('/api/reports/export/invoices', authAs(['token' => $token]))->assertForbidden();
});

it('never exports another restaurant\'s data', function () {
    ['burger' => $burger] = accountingScenario($this);
    $other = makeOwner('Other');

    foreach (['invoices', 'sales', 'payments', 'products'] as $type) {
        $x = readXlsx($this->get("/api/reports/export/{$type}?invoice_status=all&product_id={$burger}", authAs($other))->assertOk());
        expect($x['rows'])->toBe([]);
    }
    $daily = readXlsx($this->get('/api/reports/export/daily?range=today', authAs($other)));
    expect(array_slice($daily['rows'], 0, -1)[0][col($daily, 'صافي المبيعات')]['value'] ?? 0)->toEqual(0);
});

it('uses the restaurant mapping and the Al-Aseel profile without code changes', function () {
    ['owner' => $owner] = accountingScenario($this);
    $this->putJson('/api/accounting/settings', [
        'profile' => 'alaseel',
        'invoice_prefix' => 'ZT-',
        'accounts' => ['sales' => '4101', 'cash' => '1101', 'bank' => '1102'],
        'category_accounts' => ['مشروبات' => '4102'],
        'column_mapping' => ['invoices' => ['waiter' => false, 'branch' => false, 'product_code' => 'كود المادة']],
    ], authAs($owner))->assertOk();

    $x = readXlsx($this->get('/api/reports/export/invoices', authAs($owner))->assertOk());
    expect($x['headers'])->toContain('كود المادة', 'اسم المادة', 'الإفرادي', 'رقم الحساب')->not->toContain('النادل', 'الفرع');
    $rows = array_slice($x['rows'], 0, -1);
    expect($rows[0][col($x, 'رقم الفاتورة')]['value'])->toBe('ZT-000001');
    $accounts = collect($rows)->mapWithKeys(fn ($r) => [$r[col($x, 'اسم المادة')]['value'] => $r[col($x, 'رقم الحساب')]['value']]);
    expect($accounts['عصير'])->toBe('4102')->and($accounts['برجر'])->toBe('4101');

    $p = readXlsx($this->get('/api/reports/export/payments?payment_method=cash', authAs($owner)));
    expect(array_slice($p['rows'], 0, -1)[0][col($p, 'رقم الحساب')]['value'])->toBe('1101'); // profile header applies to every export

    $this->putJson('/api/accounting/settings', ['column_mapping' => ['invoices' => ['not_a_field' => 'x']]], authAs($owner))->assertStatus(422);
});

it('writes an audit entry for every export', function () {
    ['owner' => $owner] = accountingScenario($this);
    $this->get('/api/reports/export/payments?payment_method=cash', authAs($owner))->assertOk();

    $log = DB::table('audit_logs')->where('action', 'accounting.export')->first();
    $meta = json_decode($log->metadata, true);
    expect($log->restaurant_id)->toBe($owner['id'])
        ->and($meta['type'])->toBe('payments')->and($meta['rows'])->toBe(1)->and($meta['format'])->toBe('xlsx')
        ->and($meta['filters']['payment_method'])->toBe('cash');
});

it('streams large exports in chunks with a bounded number of queries', function () {
    $owner = makeOwner();
    config(['accounting.chunk' => 100]);
    $table = makeTable($owner['id']);
    $item = makeItem($owner['id'], 3);
    $now = now();
    // 300 closed invoices × 5 lines = 1,500 lines.
    for ($i = 1; $i <= 300; $i++) {
        $sid = DB::table('dining_sessions')->insertGetId(['restaurant_table_id' => $table->id, 'customer_name' => "G$i", 'status' => 'closed', 'opened_at' => $now, 'closed_at' => $now, 'invoiced_at' => $now, 'restaurant_id' => $owner['id'], 'invoice_number' => $i, 'created_at' => $now, 'updated_at' => $now]);
        $oid = DB::table('orders')->insertGetId(['dining_session_id' => $sid, 'user_id' => $owner['id'], 'order_number' => $i, 'status' => 'served', 'submitted_at' => $now, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('order_items')->insert(array_fill(0, 5, ['order_id' => $oid, 'menu_item_id' => $item, 'quantity' => 1, 'unit_price' => 3, 'status' => 'active', 'created_at' => $now, 'updated_at' => $now]));
        DB::table('payments')->insert(['dining_session_id' => $sid, 'method' => 'cash', 'status' => 'verified', 'amount' => 15, 'created_at' => $now, 'updated_at' => $now]);
    }

    DB::flushQueryLog();
    DB::enableQueryLog();
    $res = $this->get('/api/reports/export/invoices', authAs($owner))->assertOk();
    $queries = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($res->headers->get('X-Export-Rows'))->toBe('1500');
    $x = readXlsx($res);
    expect($x['rows'])->toHaveCount(1501)->and(end($x['rows'])[col($x, 'الإجمالي')]['value'])->toBe(4500.0);
    // ~ (sessions chunks + per-chunk figures + line chunks), not one per row.
    expect($queries)->toBeLessThan(60);
});
