<?php

namespace App\Support\Accounting;

use Generator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Builds accounting rows for one restaurant. Every query is scoped to the
 * restaurant through restaurant_tables.user_id (never a request value), rows
 * are read in chunks, and per-invoice figures are fetched in batches for each
 * chunk (no N+1). Rows are keyed by the internal field names of
 * config/accounting.php; ExportProfile decides the Excel columns.
 *
 * Financial rules (docs/ACCOUNTING_EXPORT.md):
 *  - an invoice is final when its dining session is closed (invoice number);
 *  - sales = active lines of non-cancelled orders; cancelled lines are never
 *    counted as sales (they appear only when filtering order_status=cancelled);
 *  - "paid" money = verified payments only; pending / reconciliation /
 *    rejected payments keep their own status.
 */
class AccountingExporter
{
    public const PAYMENT_STATUS = ['verified' => 'PAID', 'pending' => 'PENDING', 'pending_reconciliation' => 'PENDING_RECONCILIATION', 'rejected' => 'REJECTED'];

    public const ORDER_STATUS = ['payment_pending' => 'PAYMENT_PENDING', 'pending' => 'NEW', 'preparing' => 'PREPARING', 'ready' => 'READY', 'served' => 'SERVED', 'cancelled' => 'CANCELLED'];

    private const METHOD_LABEL = ['cash' => 'نقدًا', 'bank' => 'تحويل بنكي', 'wallet' => 'محفظة إلكترونية', 'electronic' => 'دفع إلكتروني', 'ussd' => 'USSD'];

    private string $restaurantName;

    private int $chunk;

    public int $rows = 0;

    public function __construct(private int $restaurantId, private array $settings, private array $filters)
    {
        $this->restaurantName = (string) DB::table('users')->where('id', $restaurantId)->value('restaurant_name');
        $this->chunk = (int) config('accounting.chunk', 1000);
    }

    /** from/to from ?range=today|yesterday|this_week|this_month|previous_month|custom (default this_month). */
    public static function range(array $q): array
    {
        $now = now();
        [$from, $to] = match ($q['range'] ?? (isset($q['from']) || isset($q['to']) ? 'custom' : 'this_month')) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'yesterday' => [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()],
            'this_week' => [$now->copy()->startOfWeek(Carbon::SATURDAY), $now->copy()->endOfDay()],
            'previous_month' => [$now->copy()->subMonthNoOverflow()->startOfMonth(), $now->copy()->subMonthNoOverflow()->endOfMonth()],
            'custom' => [Carbon::parse($q['from'] ?? $now->copy()->startOfMonth())->startOfDay(), Carbon::parse($q['to'] ?? $now)->endOfDay()],
            default => [$now->copy()->startOfMonth(), $now->copy()->endOfDay()],
        };

        return [$from, $to];
    }

    public function rows(string $type): Generator
    {
        return match ($type) {
            'invoices' => $this->invoiceLines(),
            'sales' => $this->invoices(),
            'payments' => $this->payments(),
            'products' => $this->products(),
            'daily' => $this->daily(),
        };
    }

    // ── Invoices (sessions) ────────────────────────────────────────────────

    private function sessions()
    {
        [$from, $to] = [$this->filters['from'], $this->filters['to']];
        $status = $this->filters['invoice_status'] ?? 'paid';
        $q = DB::table('dining_sessions as s')
            ->join('restaurant_tables as t', 't.id', '=', 's.restaurant_table_id')
            ->leftJoin('users as cashier', 'cashier.id', '=', 's.closed_by')
            ->where('t.user_id', $this->restaurantId)
            ->select('s.id', 's.invoice_number', 's.invoiced_at', 's.opened_at', 's.closed_at', 's.customer_name', 't.label as table_label', 'cashier.name as cashier_name');

        if ($status === 'pending') {
            $q->whereNull('s.closed_at')->whereBetween('s.opened_at', [$from, $to]);
        } elseif ($status === 'all') {
            $q->where(fn ($w) => $w->whereBetween('s.invoiced_at', [$from, $to])->orWhere(fn ($o) => $o->whereNull('s.closed_at')->whereBetween('s.opened_at', [$from, $to])));
        } else { // paid / cancelled: final invoices
            $q->whereNotNull('s.closed_at')->whereBetween('s.invoiced_at', [$from, $to]);
        }
        if (! empty($this->filters['cashier_id'])) {
            $q->where('s.closed_by', (int) $this->filters['cashier_id']);
        }

        return $q;
    }

    /** Billed lines of a set of sessions, with the original price for discounts. */
    private function lines(array $sessionIds, bool $withCancelled = false)
    {
        $originals = DB::table('bill_adjustments')->select('order_item_id', DB::raw('MAX(old_price) as original_price'))->groupBy('order_item_id');
        $q = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('menu_items as m', 'm.id', '=', 'oi.menu_item_id')
            ->leftJoinSub($originals, 'adj', 'adj.order_item_id', '=', 'oi.id')
            ->whereIn('o.dining_session_id', $sessionIds)
            ->select('oi.id', 'oi.quantity', 'oi.unit_price', 'oi.status as line_status', 'o.id as order_id', 'o.order_number', 'o.status as order_status', 'o.dining_session_id',
                'm.id as product_id', 'm.name as product_name', 'm.category', 'm.sku', DB::raw('COALESCE(adj.original_price, oi.unit_price) as original_price'));

        $orderStatus = $this->filters['order_status'] ?? null;
        if ($orderStatus === 'cancelled') {
            $q->where(fn ($w) => $w->where('oi.status', 'cancelled')->orWhere('o.status', 'cancelled'));
        } elseif (! $withCancelled) {
            $q->where('oi.status', 'active')->where('o.status', '!=', 'cancelled');
            if ($orderStatus) {
                $q->where('o.status', array_search(strtoupper($orderStatus), self::ORDER_STATUS, true) ?: $orderStatus);
            }
        }
        if (! empty($this->filters['product_id'])) {
            $q->where('m.id', (int) $this->filters['product_id']);
        }
        if (! empty($this->filters['category'])) {
            $q->where('m.category', $this->filters['category']);
        }

        return $q;
    }

    /** Per-session money + payment summary for one chunk (3 queries per chunk). */
    private function sessionFigures(array $ids): array
    {
        $out = array_fill_keys($ids, ['net' => 0.0, 'gross' => 0.0, 'count' => 0, 'paid' => 0.0, 'methods' => [], 'statuses' => []]);
        foreach ($this->lines($ids)->get() as $l) {
            $out[$l->dining_session_id]['net'] += $l->quantity * $l->unit_price;
            $out[$l->dining_session_id]['gross'] += $l->quantity * max($l->original_price, $l->unit_price);
            $out[$l->dining_session_id]['count'] += (int) $l->quantity;
        }
        foreach (DB::table('payments')->whereIn('dining_session_id', $ids)->select('dining_session_id', 'method', 'status', 'amount')->get() as $p) {
            if ($p->status === 'verified') {
                $out[$p->dining_session_id]['paid'] += (float) $p->amount;
            }
            $out[$p->dining_session_id]['methods'][$p->method] = true;
            $out[$p->dining_session_id]['statuses'][$p->status] = true;
        }

        return $out;
    }

    private function invoiceMeta(object $s, array $f): array
    {
        [$subtotal, $tax, $total] = $this->tax($f['net']);
        $outstanding = max(0, round($total - $f['paid'], 2));
        $invoiceStatus = ! $s->closed_at ? 'PENDING' : ($f['gross'] == 0 && $f['count'] === 0 ? 'CANCELLED' : ($outstanding > 0 ? 'CLOSED_UNPAID' : 'PAID'));
        $paymentStatus = $f['paid'] > 0 && $outstanding <= 0 ? 'PAID' : (isset($f['statuses']['pending']) || isset($f['statuses']['pending_reconciliation']) ? 'PENDING' : ($f['paid'] > 0 ? 'PARTIAL' : 'UNPAID'));
        $at = $s->invoiced_at ?? $s->opened_at;

        return [
            'invoice_number' => $s->invoice_number ? $this->invoiceNo($s->invoice_number) : 'مسودة-'.$s->id,
            'invoice_date' => $at,
            'invoice_time' => $at,
            'restaurant' => $this->restaurantName,
            'branch' => 'الفرع الرئيسي',
            'table' => $s->table_label,
            'session_id' => (int) $s->id,
            'customer' => $s->customer_name,
            'payment_method' => implode('، ', array_map(fn ($m) => self::METHOD_LABEL[$m] ?? $m, array_keys($f['methods']))) ?: null,
            'payment_status' => $paymentStatus,
            'invoice_status' => $invoiceStatus,
            'cashier' => $s->cashier_name,
            'waiter' => null, // not recorded per order in menuPilot
            '_totals' => compact('subtotal', 'tax', 'total', 'outstanding'),
        ];
    }

    /** A: one row per invoice. */
    private function invoices(): Generator
    {
        $status = $this->filters['invoice_status'] ?? null;
        foreach ($this->sessions()->orderBy('s.id')->lazyById($this->chunk, 's.id', 'id')->chunk($this->chunk) as $chunk) {
            $figures = $this->sessionFigures($chunk->pluck('id')->all());
            foreach ($chunk as $s) {
                $f = $figures[$s->id];
                $meta = $this->invoiceMeta($s, $f);
                if (! $this->matchesPaymentFilters($f, $meta) || ($status === 'cancelled' && $meta['invoice_status'] !== 'CANCELLED')) {
                    continue;
                }
                $t = $meta['_totals'];
                unset($meta['_totals']);
                $this->rows++;
                yield $meta + [
                    'items_count' => $f['count'],
                    'subtotal' => $t['subtotal'],
                    'discount' => round($f['gross'] - $f['net'], 2),
                    'tax' => $t['tax'],
                    'total' => $t['total'],
                    'paid' => round($f['paid'], 2),
                    'outstanding' => $t['outstanding'],
                ];
            }
        }
    }

    /** E: one row per invoice item. */
    private function invoiceLines(): Generator
    {
        foreach ($this->sessions()->orderBy('s.id')->lazyById($this->chunk, 's.id', 'id')->chunk($this->chunk) as $chunk) {
            $sessions = $chunk->keyBy('id')->all(); // plain array: indexed below
            $ids = array_keys($sessions);
            $figures = $this->sessionFigures($ids);
            foreach ($this->lines($ids)->orderBy('oi.id')->lazyById($this->chunk, 'oi.id', 'id') as $l) {
                $s = $sessions[$l->dining_session_id];
                $meta = $this->invoiceMeta($s, $figures[$s->id]);
                if (! $this->matchesPaymentFilters($figures[$s->id], $meta)) {
                    continue;
                }
                unset($meta['_totals'], $meta['customer']);
                $net = $l->quantity * $l->unit_price;
                [$subtotal, $tax, $total] = $this->tax($net);
                $this->rows++;
                yield $meta + [
                    'order_reference' => '#'.($l->order_number ?? $l->order_id),
                    'product_code' => $l->sku ?: 'MP-'.$l->product_id,
                    'product_name' => $l->product_name,
                    'category' => $l->category,
                    'account_code' => $this->salesAccount($l->category),
                    'quantity' => (float) $l->quantity,
                    'unit_price' => (float) $l->unit_price,
                    'discount' => round(max(0, $l->original_price - $l->unit_price) * $l->quantity, 2),
                    'tax' => $tax,
                    'subtotal' => $subtotal,
                    'total' => $total,
                    'order_status' => $l->line_status === 'cancelled' ? 'CANCELLED' : (self::ORDER_STATUS[$l->order_status] ?? strtoupper($l->order_status)),
                ];
            }
        }
    }

    private function matchesPaymentFilters(array $f, array $meta): bool
    {
        $method = $this->filters['payment_method'] ?? null;
        if ($method && ! isset($f['methods'][$method])) {
            return false;
        }
        $status = $this->filters['payment_status'] ?? null;

        return ! $status || strtoupper($status) === $meta['payment_status'];
    }

    // ── B: payments ────────────────────────────────────────────────────────

    private function payments(): Generator
    {
        $q = DB::table('payments as p')
            ->join('dining_sessions as s', 's.id', '=', 'p.dining_session_id')
            ->join('restaurant_tables as t', 't.id', '=', 's.restaurant_table_id')
            ->leftJoin('users as u', 'u.id', '=', DB::raw('COALESCE(p.verified_by, p.recorded_by)'))
            ->where('t.user_id', $this->restaurantId)
            ->whereBetween('p.created_at', [$this->filters['from'], $this->filters['to']])
            ->select('p.id', 'p.method', 'p.status', 'p.amount', 'p.created_at', 'p.provider', 'p.rejection_reason', 'p.reconciliation_status', 's.invoice_number', 's.id as session_id', 'u.name as cashier_name');
        if (! empty($this->filters['payment_method'])) {
            $q->where('p.method', $this->filters['payment_method']);
        }
        if (! empty($this->filters['payment_status'])) {
            $db = array_search(strtoupper($this->filters['payment_status']), self::PAYMENT_STATUS, true);
            $q->where('p.status', $db ?: $this->filters['payment_status']);
        }
        if (! empty($this->filters['cashier_id'])) {
            $q->where(fn ($w) => $w->where('p.verified_by', (int) $this->filters['cashier_id'])->orWhere('p.recorded_by', (int) $this->filters['cashier_id']));
        }

        foreach ($q->orderBy('p.id')->lazyById($this->chunk, 'p.id', 'id') as $p) {
            $this->rows++;
            yield [
                'payment_id' => (int) $p->id,
                'invoice_number' => $p->invoice_number ? $this->invoiceNo($p->invoice_number) : 'مسودة-'.$p->session_id,
                'payment_date' => $p->created_at,
                'payment_time' => $p->created_at,
                'payment_method' => self::METHOD_LABEL[$p->method] ?? $p->method,
                'account_code' => $this->paymentAccount($p->method),
                'amount' => (float) $p->amount,
                'currency' => $this->settings['currency'] ?? 'ILS',
                'payment_status' => self::PAYMENT_STATUS[$p->status] ?? strtoupper((string) $p->status),
                'cashier' => $p->cashier_name,
                'reference_number' => $p->provider,
                'transaction_reference' => 'MP-PAY-'.$p->id,
                'notes' => $p->rejection_reason ?: ($p->reconciliation_status ? 'تسوية: '.$p->reconciliation_status : null),
            ];
        }
    }

    // ── C: products ────────────────────────────────────────────────────────

    private function products(): Generator
    {
        $originals = DB::table('bill_adjustments')->select('order_item_id', DB::raw('MAX(old_price) as original_price'))->groupBy('order_item_id');
        $q = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('dining_sessions as s', 's.id', '=', 'o.dining_session_id')
            ->join('restaurant_tables as t', 't.id', '=', 's.restaurant_table_id')
            ->join('menu_items as m', 'm.id', '=', 'oi.menu_item_id')
            ->leftJoinSub($originals, 'adj', 'adj.order_item_id', '=', 'oi.id')
            ->where('t.user_id', $this->restaurantId)
            ->whereNotNull('s.closed_at')->whereBetween('s.invoiced_at', [$this->filters['from'], $this->filters['to']])
            ->where('oi.status', 'active')->where('o.status', '!=', 'cancelled')
            ->groupBy('m.id', 'm.name', 'm.category', 'm.sku', 'm.price')
            ->orderByDesc(DB::raw('SUM(oi.quantity)'))
            ->select('m.id', 'm.name', 'm.category', 'm.sku', 'm.price',
                DB::raw('SUM(oi.quantity) as qty'),
                DB::raw('SUM(oi.quantity * oi.unit_price) as net'),
                DB::raw('SUM(oi.quantity * CASE WHEN COALESCE(adj.original_price, oi.unit_price) > oi.unit_price THEN adj.original_price ELSE oi.unit_price END) as gross'));
        if (! empty($this->filters['category'])) {
            $q->where('m.category', $this->filters['category']);
        }
        if (! empty($this->filters['product_id'])) {
            $q->where('m.id', (int) $this->filters['product_id']);
        }

        foreach ($q->cursor() as $p) {
            [, $tax] = $this->tax((float) $p->net);
            $this->rows++;
            yield [
                'product_code' => $p->sku ?: 'MP-'.$p->id,
                'product_name' => $p->name,
                'category' => $p->category,
                'account_code' => $this->salesAccount($p->category),
                'quantity_sold' => (float) $p->qty,
                'unit_price' => (float) $p->price,
                'gross_sales' => round((float) $p->gross, 2),
                'discount' => round((float) $p->gross - (float) $p->net, 2),
                'tax' => $tax,
                'net_sales' => round((float) $p->net, 2),
            ];
        }
    }

    // ── D: daily ───────────────────────────────────────────────────────────

    private function daily(): Generator
    {
        [$from, $to] = [$this->filters['from'], $this->filters['to']];
        $R = $this->restaurantId;
        $day = fn (string $col) => DB::raw("DATE($col) as d");
        $scope = fn ($q) => $q->join('restaurant_tables as t', 't.id', '=', 's.restaurant_table_id')->where('t.user_id', $R);

        $originals = DB::table('bill_adjustments')->select('order_item_id', DB::raw('MAX(old_price) as original_price'))->groupBy('order_item_id');
        $sales = $scope(DB::table('order_items as oi')->join('orders as o', 'o.id', '=', 'oi.order_id')->join('dining_sessions as s', 's.id', '=', 'o.dining_session_id'))
            ->leftJoinSub($originals, 'adj', 'adj.order_item_id', '=', 'oi.id')
            ->whereNotNull('s.closed_at')->whereBetween('s.invoiced_at', [$from, $to])
            ->where('oi.status', 'active')->where('o.status', '!=', 'cancelled')
            ->groupBy(DB::raw('DATE(s.invoiced_at)'))
            ->select($day('s.invoiced_at'), DB::raw('SUM(oi.quantity * oi.unit_price) as net'),
                DB::raw('SUM(oi.quantity * CASE WHEN COALESCE(adj.original_price, oi.unit_price) > oi.unit_price THEN adj.original_price ELSE oi.unit_price END) as gross'))
            ->get()->keyBy('d');
        $invoices = $scope(DB::table('dining_sessions as s'))->whereNotNull('s.closed_at')->whereBetween('s.invoiced_at', [$from, $to])
            ->groupBy(DB::raw('DATE(s.invoiced_at)'))->select($day('s.invoiced_at'), DB::raw('COUNT(*) as n'))->pluck('n', 'd');
        $orders = DB::table('orders')->where('user_id', $R)->where('status', '!=', 'cancelled')->whereBetween('submitted_at', [$from, $to])
            ->groupBy(DB::raw('DATE(submitted_at)'))->select($day('submitted_at'), DB::raw('COUNT(*) as n'))->pluck('n', 'd');
        $payments = $scope(DB::table('payments as p')->join('dining_sessions as s', 's.id', '=', 'p.dining_session_id'))->whereBetween('p.created_at', [$from, $to])
            ->groupBy(DB::raw('DATE(p.created_at)'), 'p.method', 'p.status')->select($day('p.created_at'), 'p.method', 'p.status', DB::raw('SUM(p.amount) as amount'))->get();
        $cancelled = $scope(DB::table('order_items as oi')->join('orders as o', 'o.id', '=', 'oi.order_id')->join('dining_sessions as s', 's.id', '=', 'o.dining_session_id'))
            ->where(fn ($w) => $w->where('oi.status', 'cancelled')->orWhere('o.status', 'cancelled'))
            ->whereBetween(DB::raw('COALESCE(oi.cancelled_at, oi.updated_at)'), [$from, $to])
            ->groupBy(DB::raw('DATE(COALESCE(oi.cancelled_at, oi.updated_at))'))
            ->select(DB::raw('DATE(COALESCE(oi.cancelled_at, oi.updated_at)) as d'), DB::raw('SUM(oi.quantity * oi.unit_price) as amount'))->pluck('amount', 'd');

        $money = [];
        foreach ($payments as $p) {
            $bucket = $p->status === 'verified' ? ($p->method === 'cash' ? 'cash' : 'electronic') : (in_array($p->status, ['pending', 'pending_reconciliation'], true) ? 'pending' : null);
            if ($bucket) {
                $money[$p->d][$bucket] = ($money[$p->d][$bucket] ?? 0) + (float) $p->amount;
            }
        }

        for ($d = $from->copy()->startOfDay(); $d->lte($to) && $d->lte(now()); $d->addDay()) {
            $key = $d->toDateString();
            $net = (float) ($sales[$key]->net ?? 0);
            $gross = (float) ($sales[$key]->gross ?? 0);
            [, $tax] = $this->tax($net);
            $this->rows++;
            yield [
                'date' => $key,
                'orders_count' => (int) ($orders[$key] ?? 0),
                'invoices_count' => (int) ($invoices[$key] ?? 0),
                'gross_sales' => round($gross, 2),
                'discount' => round($gross - $net, 2),
                'tax' => $tax,
                'net_sales' => round($net, 2),
                'cash_sales' => round($money[$key]['cash'] ?? 0, 2),
                'electronic_sales' => round($money[$key]['electronic'] ?? 0, 2),
                'pending_payments' => round($money[$key]['pending'] ?? 0, 2),
                'cancelled_amount' => round((float) ($cancelled[$key] ?? 0), 2),
            ];
        }
    }

    // ── helpers ────────────────────────────────────────────────────────────

    /** [subtotal, tax, total] for a net amount, per the restaurant's tax settings. */
    private function tax(float $net): array
    {
        $rate = (float) ($this->settings['tax_rate'] ?? 0) / 100;
        if ($rate <= 0) {
            return [round($net, 2), 0.0, round($net, 2)];
        }
        if ($this->settings['prices_include_tax'] ?? true) {
            $tax = round($net * $rate / (1 + $rate), 2);

            return [round($net - $tax, 2), $tax, round($net, 2)];
        }
        $tax = round($net * $rate, 2);

        return [round($net, 2), $tax, round($net + $tax, 2)];
    }

    private function invoiceNo(int $number): string
    {
        return ($this->settings['invoice_prefix'] ?? 'INV-').str_pad((string) $number, 6, '0', STR_PAD_LEFT);
    }

    private function salesAccount(?string $category): ?string
    {
        return ($category ? ($this->settings['category_accounts'][$category] ?? null) : null) ?: ($this->settings['accounts']['sales'] ?? null);
    }

    private function paymentAccount(string $method): ?string
    {
        $key = $method === 'cash' ? 'cash' : ($method === 'bank' ? 'bank' : 'electronic');

        return $this->settings['accounts'][$key] ?? null;
    }
}
