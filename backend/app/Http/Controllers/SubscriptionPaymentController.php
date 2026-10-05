<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use App\Support\MediaStore;
use App\Support\SubscriptionAccess;
use App\Support\SubscriptionPlans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Paying for a plan by bank transfer (Bank of Palestine):
 *   owner picks plan + add-ons + months → transfers → reports it here
 *   (pending) → is sent to WhatsApp with the invoice → admin verifies → plan
 *   and add-ons ACTIVE for the paid months. Amounts come from config
 *   (SubscriptionPlans), never from the client.
 */
class SubscriptionPaymentController extends Controller
{
    /** JSON column from a query-builder row (string) or a model (array). */
    private static function addonsOf(object $row, string $column = 'addons'): array
    {
        $value = $row->{$column} ?? null;

        return array_values(is_string($value) ? (json_decode($value, true) ?: []) : (array) $value);
    }

    private function present(object $p): array
    {
        $addons = self::addonsOf($p);

        return [
            'id' => $p->id,
            'invoice_number' => $p->invoice_number,
            'plan' => $p->plan,
            'plan_name' => SubscriptionPlans::planName($p->plan),
            'addons' => $addons,
            'addon_names' => SubscriptionPlans::addonNames($addons),
            'plan_label' => SubscriptionPlans::label($p->plan, $addons),
            'months' => (int) $p->months,
            'amount' => (float) $p->amount,
            'currency' => $p->currency,
            'bank' => $p->bank,
            'reference_code' => $p->reference_code,
            'transfer_reference' => $p->transfer_reference,
            'payer_name' => $p->payer_name,
            'transfer_date' => $p->transfer_date,
            'proof_url' => $p->proof_url,
            'note' => $p->note,
            'status' => $p->status,
            'rejection_reason' => $p->rejection_reason,
            'reviewed_at' => $p->reviewed_at,
            'created_at' => $p->created_at,
        ];
    }

    /** 12 months → pay 10 (annual_free_months); other periods pay every month. */
    public static function payableMonths(int $months): int
    {
        return $months === 12 ? 12 - (int) config('subscriptions.annual_free_months', 0) : $months;
    }

    private static function referenceCode(int $restaurantId): string
    {
        return 'MP-'.$restaurantId;
    }

    /** Pre-filled WhatsApp message with the invoice, for the owner to send. */
    private function whatsappUrl(array $p, User $owner): string
    {
        $lines = [
            'مرحبًا فريق menuPilot 👋',
            'أرسلت تحويلًا بنكيًا لتفعيل الاشتراك، هذه تفاصيله:',
            'الفاتورة: '.$p['invoice_number'],
            'المطعم: '.($owner->restaurant_name ?: $owner->name).' (#'.$owner->id.')',
            'الخطة: '.$p['plan_label'].' — '.$p['months'].($p['months'] === 1 ? ' شهر' : ' أشهر'),
            'المبلغ: '.rtrim(rtrim(number_format($p['amount'], 2, '.', ''), '0'), '.').' '.$p['currency'],
            'البنك: '.$p['bank'],
            'رمز الدفع: '.$p['reference_code'],
        ];
        foreach (['transfer_reference' => 'رقم الحوالة', 'payer_name' => 'اسم المحوِّل', 'transfer_date' => 'تاريخ التحويل'] as $k => $label) {
            if (! empty($p[$k])) {
                $lines[] = $label.': '.$p[$k];
            }
        }
        $lines[] = 'سأرفق صورة إشعار التحويل هنا.';

        return 'https://wa.me/'.preg_replace('/\D/', '', (string) config('subscriptions.whatsapp')).'?text='.rawurlencode(implode("\n", $lines));
    }

    /** GET /api/subscription — state, prices, bank details and my payments. */
    public function show(Request $request)
    {
        $owner = $request->user();
        $payments = DB::table('subscription_payments')->where('user_id', $owner->id)->orderByDesc('id')->limit(20)->get();

        return response()->json(['data' => [
            'subscription' => SubscriptionAccess::for($owner)->sync()->toArray(),
            ...SubscriptionPlans::catalogue(), // plans + addons
            'currency' => config('subscriptions.currency'),
            'periods' => config('subscriptions.periods'),
            'annual_free_months' => (int) config('subscriptions.annual_free_months', 0),
            'ils_rate' => (float) config('subscriptions.display_ils_rate'),
            'bank' => config('subscriptions.bank'),
            'bank_configured' => (bool) (config('subscriptions.bank.account_number') || config('subscriptions.bank.iban')),
            'reference_code' => self::referenceCode($owner->id),
            'whatsapp' => config('subscriptions.whatsapp'),
            'payments' => $payments->map(fn ($p) => $this->present($p)),
        ]]);
    }

    /** POST /api/subscription/payments — "I have transferred" (pending until verified). */
    public function store(Request $request)
    {
        $owner = $request->user();
        $v = $request->validate([
            'plan' => ['required', Rule::in(SubscriptionPlans::acceptedPlans())],
            'addons' => ['sometimes', 'array', 'max:10'],
            'addons.*' => ['string', 'distinct', Rule::in(array_keys(SubscriptionPlans::addons()))],
            'months' => ['sometimes', 'integer', Rule::in(config('subscriptions.periods'))],
            'transfer_reference' => 'nullable|string|max:80',
            'payer_name' => 'required|string|max:120',
            'transfer_date' => 'required|date|before_or_equal:today',
            'note' => 'nullable|string|max:500',
            'proof' => 'nullable|string', // data:image/...;base64,…
        ], [
            'payer_name.required' => 'اكتب اسم صاحب الحساب الذي حوّل المبلغ.',
            'transfer_date.required' => 'حدّد تاريخ التحويل.',
        ]);

        [$plan, $addons] = SubscriptionPlans::normalize($v['plan'], $v['addons'] ?? []);
        if ($conflict = SubscriptionPlans::incompatibility($plan, $addons)) {
            return response()->json(['message' => $conflict, 'errors' => ['addons' => [$conflict]], 'code' => 'ADDON_NOT_AVAILABLE'], 422);
        }

        if (DB::table('subscription_payments')->where('user_id', $owner->id)->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'لديك دفعة قيد التحقق بالفعل. سنراجعها ونفعّل الاشتراك فور التأكد.', 'code' => 'PAYMENT_ALREADY_PENDING'], 409);
        }

        $proofUrl = null;
        if (! empty($v['proof'])) {
            if (! preg_match('#^data:(image/(?:png|jpe?g|webp));base64,(.+)$#', $v['proof'], $m) || ! ($binary = base64_decode($m[2], true)) || strlen($binary) > 5 * 1024 * 1024) {
                return response()->json(['message' => 'صورة الإشعار يجب أن تكون PNG أو JPG أو WebP وبحجم لا يتجاوز 5MB.', 'errors' => ['proof' => ['invalid']]], 422);
            }
            $proofUrl = MediaStore::put($binary, str_replace('jpg', 'jpeg', $m[1]), $owner->id);
        }

        $months = (int) ($v['months'] ?? 1);
        $id = DB::transaction(function () use ($owner, $v, $plan, $addons, $months, $proofUrl) {
            $id = DB::table('subscription_payments')->insertGetId([
                'user_id' => $owner->id,
                'plan' => $plan,
                'addons' => json_encode($addons),
                'months' => $months,
                'amount' => SubscriptionPlans::monthlyPrice($plan, $addons) * self::payableMonths($months), // server price
                'currency' => config('subscriptions.currency'),
                'method' => 'bank_transfer',
                'bank' => config('subscriptions.bank.name'),
                'reference_code' => self::referenceCode($owner->id),
                'transfer_reference' => $v['transfer_reference'] ?? null,
                'payer_name' => $v['payer_name'],
                'transfer_date' => $v['transfer_date'],
                'proof_url' => $proofUrl,
                'note' => $v['note'] ?? null,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            // Stable platform invoice number derived from the row id (never changes).
            DB::table('subscription_payments')->where('id', $id)->update(['invoice_number' => 'MPS-'.now()->format('Y').'-'.str_pad((string) $id, 6, '0', STR_PAD_LEFT)]);
            $owner->forceFill(['requested_plan' => $plan, 'requested_addons' => $addons, 'plan_requested_at' => now()])->save();

            return $id;
        });

        $payment = $this->present(DB::table('subscription_payments')->find($id));
        SubscriptionAccess::event('subscription_payment_submitted', $owner->id, ['payment_id' => $id, 'plan' => $payment['plan'], 'addons' => $addons, 'months' => $months, 'amount' => $payment['amount']]);

        return response()->json(['data' => $payment + ['whatsapp_url' => $this->whatsappUrl($payment, $owner)]], 201);
    }

    // ── Platform admin ───────────────────────────────────────────────────

    /** GET /api/admin/subscription-payments?status=pending */
    public function adminIndex(Request $request)
    {
        $status = $request->query('status', 'pending');
        $q = DB::table('subscription_payments as p')->join('users as u', 'u.id', '=', 'p.user_id')
            ->select('p.*', 'u.restaurant_name', 'u.email', 'u.plan as current_plan', 'u.addons as current_addons')
            ->orderByDesc('p.id')->limit(200);
        if ($status !== 'all') {
            $q->where('p.status', $status);
        }

        return response()->json(['data' => $q->get()->map(fn ($p) => $this->present($p) + ['restaurant_id' => $p->user_id, 'restaurant_name' => $p->restaurant_name, 'email' => $p->email, 'current_plan' => $p->current_plan, 'current_addons' => self::addonsOf($p, 'current_addons')])]);
    }

    /** POST /api/admin/subscription-payments/{id}/verify — activate the plan and add-ons for the paid months. */
    public function verify(Request $request, $id)
    {
        $result = DB::transaction(function () use ($request, $id) {
            $p = DB::table('subscription_payments')->where('id', $id)->lockForUpdate()->first();
            if (! $p) {
                return response()->json(['message' => 'Payment not found'], 404);
            }
            if ($p->status !== 'pending') {
                return response()->json(['message' => 'هذه الدفعة عولجت مسبقًا.', 'code' => 'PAYMENT_ALREADY_REVIEWED'], 409);
            }
            $owner = User::where('role', 'owner')->findOrFail($p->user_id);
            $addons = self::addonsOf($p);
            // Same plan and add-ons: a renewal, extended from the current paid end
            // if it is still running. Any change starts the paid period now.
            $current = array_values($owner->addons ?? []);
            $renewal = $owner->plan === $p->plan && collect($current)->sort()->values()->all() === collect($addons)->sort()->values()->all();
            $base = $renewal && $owner->subscription_ends_at && $owner->subscription_ends_at->isFuture() ? $owner->subscription_ends_at : now();
            $owner->forceFill([
                'plan' => $p->plan,
                'addons' => $addons,
                'subscription_started_at' => $owner->subscription_started_at && $owner->plan === $p->plan ? $owner->subscription_started_at : now(),
                'subscription_ends_at' => $base->copy()->addMonthsNoOverflow((int) $p->months),
                'subscription_cancelled_at' => null,
                'requested_plan' => null,
                'requested_addons' => null,
                'plan_requested_at' => null,
                'subscription_status' => SubscriptionAccess::ACTIVE,
            ])->save();
            DB::table('subscription_payments')->where('id', $id)->update(['status' => 'verified', 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'updated_at' => now()]);
            Audit::log($request, 'admin.subscription_payment_verified', 'subscription_payment', (int) $id, ['plan' => $p->plan, 'addons' => $addons, 'months' => $p->months, 'amount' => $p->amount, 'ends_at' => (string) $owner->subscription_ends_at], $owner->id);
            SubscriptionAccess::event('subscription_activated', $owner->id, ['plan' => $p->plan, 'addons' => $addons, 'payment_id' => (int) $id, 'ends_at' => (string) $owner->subscription_ends_at]);

            return null;
        });

        return $result ?? response()->json(['data' => $this->present(DB::table('subscription_payments')->find($id))]);
    }

    /** POST /api/admin/subscription-payments/{id}/reject {reason} */
    public function reject(Request $request, $id)
    {
        $v = $request->validate(['reason' => 'required|string|min:3|max:255']);
        $updated = DB::table('subscription_payments')->where('id', $id)->where('status', 'pending')
            ->update(['status' => 'rejected', 'rejection_reason' => $v['reason'], 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'updated_at' => now()]);
        if (! $updated) {
            return response()->json(['message' => 'Payment not found or already reviewed.'], 409);
        }
        $p = DB::table('subscription_payments')->find($id);
        User::where('id', $p->user_id)->update(['requested_plan' => null, 'requested_addons' => null, 'plan_requested_at' => null]);
        Audit::log($request, 'admin.subscription_payment_rejected', 'subscription_payment', (int) $id, ['reason' => $v['reason']], $p->user_id);

        return response()->json(['data' => $this->present($p)]);
    }
}
