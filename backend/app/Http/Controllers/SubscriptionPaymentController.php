<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use App\Support\MediaStore;
use App\Support\SubscriptionAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Paying for a plan by bank transfer (Bank of Palestine):
 *   owner picks plan + months → transfers → reports it here (pending) →
 *   is sent to WhatsApp with the invoice → admin verifies → plan ACTIVE
 *   for the paid months. Amounts come from config, never from the client.
 */
class SubscriptionPaymentController extends Controller
{
    private function present(object $p): array
    {
        return [
            'id' => $p->id,
            'invoice_number' => $p->invoice_number,
            'plan' => $p->plan,
            'plan_name' => config("subscriptions.plan_names.{$p->plan}", $p->plan),
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
            'الخطة: '.$p['plan_name'].' — '.$p['months'].($p['months'] === 1 ? ' شهر' : ' أشهر'),
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
            'plans' => collect(config('subscriptions.prices'))->map(fn ($price, $id) => ['id' => $id, 'name' => config("subscriptions.plan_names.$id"), 'price' => $price])->values(),
            'currency' => config('subscriptions.currency'),
            'periods' => config('subscriptions.periods'),
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
            'plan' => ['required', Rule::in(config('subscriptions.paid_plans'))],
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
        $id = DB::transaction(function () use ($owner, $v, $months, $proofUrl) {
            $id = DB::table('subscription_payments')->insertGetId([
                'user_id' => $owner->id,
                'plan' => $v['plan'],
                'months' => $months,
                'amount' => config("subscriptions.prices.{$v['plan']}") * $months, // server price
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
            $owner->forceFill(['requested_plan' => $v['plan'], 'plan_requested_at' => now()])->save();

            return $id;
        });

        $payment = $this->present(DB::table('subscription_payments')->find($id));
        SubscriptionAccess::event('subscription_payment_submitted', $owner->id, ['payment_id' => $id, 'plan' => $payment['plan'], 'months' => $months, 'amount' => $payment['amount']]);

        return response()->json(['data' => $payment + ['whatsapp_url' => $this->whatsappUrl($payment, $owner)]], 201);
    }

    // ── Platform admin ───────────────────────────────────────────────────

    /** GET /api/admin/subscription-payments?status=pending */
    public function adminIndex(Request $request)
    {
        $status = $request->query('status', 'pending');
        $q = DB::table('subscription_payments as p')->join('users as u', 'u.id', '=', 'p.user_id')
            ->select('p.*', 'u.restaurant_name', 'u.email', 'u.plan as current_plan')
            ->orderByDesc('p.id')->limit(200);
        if ($status !== 'all') {
            $q->where('p.status', $status);
        }

        return response()->json(['data' => $q->get()->map(fn ($p) => $this->present($p) + ['restaurant_id' => $p->user_id, 'restaurant_name' => $p->restaurant_name, 'email' => $p->email, 'current_plan' => $p->current_plan])]);
    }

    /** POST /api/admin/subscription-payments/{id}/verify — activate the plan for the paid months. */
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
            // Extend from the current paid end if it is still running, else from now.
            $base = $owner->plan === $p->plan && $owner->subscription_ends_at && $owner->subscription_ends_at->isFuture() ? $owner->subscription_ends_at : now();
            $owner->forceFill([
                'plan' => $p->plan,
                'subscription_started_at' => $owner->subscription_started_at && $owner->plan === $p->plan ? $owner->subscription_started_at : now(),
                'subscription_ends_at' => $base->copy()->addMonthsNoOverflow((int) $p->months),
                'subscription_cancelled_at' => null,
                'requested_plan' => null,
                'plan_requested_at' => null,
                'subscription_status' => SubscriptionAccess::ACTIVE,
            ])->save();
            DB::table('subscription_payments')->where('id', $id)->update(['status' => 'verified', 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'updated_at' => now()]);
            Audit::log($request, 'admin.subscription_payment_verified', 'subscription_payment', (int) $id, ['plan' => $p->plan, 'months' => $p->months, 'amount' => $p->amount, 'ends_at' => (string) $owner->subscription_ends_at], $owner->id);
            SubscriptionAccess::event('subscription_activated', $owner->id, ['plan' => $p->plan, 'payment_id' => (int) $id, 'ends_at' => (string) $owner->subscription_ends_at]);

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
        User::where('id', $p->user_id)->update(['requested_plan' => null, 'plan_requested_at' => null]);
        Audit::log($request, 'admin.subscription_payment_rejected', 'subscription_payment', (int) $id, ['reason' => $v['reason']], $p->user_id);

        return response()->json(['data' => $this->present($p)]);
    }
}
