<?php

namespace App\Http\Controllers;

use App\Support\Accounting\AccountingExporter;
use App\Support\Accounting\ExportProfile;
use App\Support\Audit;
use App\Support\Export\XlsxWriter;
use App\Support\ResolvesRestaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Accounting & Excel export (docs/ACCOUNTING_EXPORT.md).
 * The restaurant always comes from the authenticated user (owner, or the
 * owner of a staff account) — never from the request.
 */
class AccountingController extends Controller
{
    use ResolvesRestaurant;

    public const TYPES = ['invoices', 'sales', 'payments', 'products', 'daily'];

    private const TITLES = ['invoices' => 'تفاصيل الفواتير', 'sales' => 'الفواتير', 'payments' => 'المدفوعات', 'products' => 'مبيعات الأصناف', 'daily' => 'المبيعات اليومية'];

    private const DEFAULTS = ['profile' => 'generic', 'currency' => 'ILS', 'invoice_prefix' => 'INV-', 'tax_rate' => 0, 'prices_include_tax' => true, 'accounts' => [], 'category_accounts' => [], 'column_mapping' => []];

    public static function settingsFor(int $restaurantId): array
    {
        $row = DB::table('accounting_settings')->where('user_id', $restaurantId)->first();
        if (! $row) {
            return self::DEFAULTS;
        }

        return [
            'profile' => $row->profile,
            'currency' => $row->currency,
            'invoice_prefix' => $row->invoice_prefix,
            'tax_rate' => (float) $row->tax_rate,
            'prices_include_tax' => (bool) $row->prices_include_tax,
            'accounts' => json_decode($row->accounts ?? '[]', true) ?: [],
            'category_accounts' => json_decode($row->category_accounts ?? '[]', true) ?: [],
            'column_mapping' => json_decode($row->column_mapping ?? '[]', true) ?: [],
        ];
    }

    /** GET /api/accounting/settings */
    public function settings(Request $request)
    {
        $restaurantId = $this->restaurantId($request);
        $settings = self::settingsFor($restaurantId);

        return response()->json(['data' => [
            'settings' => $settings,
            'profiles' => ExportProfile::all(),
            'account_keys' => config('accounting.account_keys'),
            'exports' => collect(self::TYPES)->mapWithKeys(fn ($t) => [$t => ['title' => self::TITLES[$t], 'columns' => ExportProfile::columns($t, $settings['profile'], $settings['column_mapping'])]]),
            'categories' => DB::table('menu_items')->where('user_id', $restaurantId)->whereNull('deleted_at')->whereNotNull('category')->distinct()->orderBy('category')->pluck('category'),
            'cashiers' => DB::table('staff')->join('users', 'users.id', '=', 'staff.account_user_id')->where('staff.user_id', $restaurantId)->whereIn('staff.role', ['cashier', 'manager'])->select('users.id', 'users.name')->orderBy('users.name')->get(),
        ]]);
    }

    /** PUT /api/accounting/settings (manage_accounting_settings) */
    public function updateSettings(Request $request)
    {
        $fields = array_keys(config('accounting.fields'));
        $v = $request->validate([
            'profile' => ['sometimes', 'string', Rule::in(array_keys(config('accounting.profiles')))],
            'currency' => 'sometimes|string|max:10',
            'invoice_prefix' => 'sometimes|string|max:20',
            'tax_rate' => 'sometimes|numeric|min:0|max:100',
            'prices_include_tax' => 'sometimes|boolean',
            'accounts' => 'sometimes|array',
            'accounts.*' => 'nullable|string|max:32',
            'category_accounts' => 'sometimes|array',
            'category_accounts.*' => 'nullable|string|max:32',
            'column_mapping' => 'sometimes|array',
        ]);
        foreach (array_keys($v['accounts'] ?? []) as $key) {
            if (! in_array($key, config('accounting.account_keys'), true)) {
                return response()->json(['message' => "Unknown account key: {$key}"], 422);
            }
        }
        foreach ($v['column_mapping'] ?? [] as $export => $map) {
            if (! in_array($export, self::TYPES, true) || ! is_array($map)) {
                return response()->json(['message' => "Unknown export in column_mapping: {$export}"], 422);
            }
            foreach ($map as $field => $header) {
                if (! in_array($field, $fields, true) || ! ($header === false || (is_string($header) && mb_strlen($header) <= 64))) {
                    return response()->json(['message' => "Invalid column mapping for {$export}.{$field}"], 422);
                }
            }
        }

        $restaurantId = $this->restaurantId($request);
        $before = self::settingsFor($restaurantId);
        $data = [];
        foreach (['profile', 'currency', 'invoice_prefix', 'tax_rate', 'prices_include_tax'] as $k) {
            if (array_key_exists($k, $v)) {
                $data[$k] = $v[$k];
            }
        }
        foreach (['accounts', 'category_accounts', 'column_mapping'] as $k) {
            if (array_key_exists($k, $v)) {
                $data[$k] = json_encode(array_filter($v[$k], fn ($x) => $x !== null && $x !== ''), JSON_UNESCAPED_UNICODE);
            }
        }
        DB::table('accounting_settings')->updateOrInsert(['user_id' => $restaurantId], $data + ['updated_at' => now(), 'created_at' => now()]);
        $after = self::settingsFor($restaurantId);
        Audit::log($request, 'accounting.settings_updated', 'accounting_settings', $restaurantId, ['before' => $before, 'after' => $after], $restaurantId);

        return response()->json(['data' => $after]);
    }

    /** GET /api/reports/export/{type} — streams a real .xlsx file. */
    public function export(Request $request, string $type)
    {
        if (! in_array($type, self::TYPES, true)) {
            return response()->json(['message' => 'Unknown export type.'], 404);
        }
        $q = $request->validate([
            'format' => 'sometimes|in:xlsx',
            'range' => 'sometimes|in:today,yesterday,this_week,this_month,previous_month,custom',
            'from' => 'sometimes|date',
            'to' => 'sometimes|date|after_or_equal:from',
            'payment_method' => 'sometimes|nullable|string|max:30',
            'payment_status' => 'sometimes|nullable|in:paid,pending,pending_reconciliation,rejected,partial,unpaid,PAID,PENDING,PENDING_RECONCILIATION,REJECTED,PARTIAL,UNPAID',
            'invoice_status' => 'sometimes|nullable|in:paid,pending,cancelled,all',
            'order_status' => 'sometimes|nullable|string|max:30',
            'cashier_id' => 'sometimes|nullable|integer',
            'category' => 'sometimes|nullable|string|max:120',
            'category_id' => 'sometimes|nullable|integer',
            'product_id' => 'sometimes|nullable|integer',
            'branch_id' => 'sometimes|nullable|integer',
            'waiter_id' => 'sometimes|nullable|integer',
            'profile' => ['sometimes', 'string', Rule::in(array_keys(config('accounting.profiles')))],
        ]);

        $restaurantId = $this->restaurantId($request);
        $settings = self::settingsFor($restaurantId);
        [$from, $to] = AccountingExporter::range($q);
        if (! empty($q['category_id'])) { // category ids are resolved inside this restaurant only
            $q['category'] = DB::table('menu_categories')->where('user_id', $restaurantId)->where('id', $q['category_id'])->value('name') ?? '__none__';
        }
        $filters = array_filter($q, fn ($v) => $v !== null && $v !== '') + ['from' => $from, 'to' => $to];
        $profile = $q['profile'] ?? $settings['profile'];

        $exporter = new AccountingExporter($restaurantId, $settings, $filters);
        $writer = new XlsxWriter(self::TITLES[$type], ExportProfile::columns($type, $profile, $settings['column_mapping']), $settings['currency'] === 'ILS' ? '₪' : $settings['currency']);
        foreach ($exporter->rows($type) as $row) {
            $writer->addRow($row);
        }
        $path = $writer->finish('الإجمالي');

        Audit::log($request, 'accounting.export', 'export', null, [
            'type' => $type,
            'format' => 'xlsx',
            'profile' => $profile,
            'rows' => $writer->rowCount(),
            'filters' => collect($filters)->except(['from', 'to'])->all() + ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        ], $restaurantId);

        $name = sprintf('menuPilot-%s-%s_%s.xlsx', $type, $from->toDateString(), $to->toDateString());

        return response()->download($path, $name, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store, private',
            'X-Export-Rows' => (string) $writer->rowCount(),
            'Access-Control-Expose-Headers' => 'Content-Disposition, X-Export-Rows',
        ])->deleteFileAfterSend(true);
    }
}
