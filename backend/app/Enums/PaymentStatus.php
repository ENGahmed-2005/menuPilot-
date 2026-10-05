<?php

namespace App\Enums;

/**
 * Canonical payment statuses shared across BillingController and PaymentController.
 *
 * Two payment flows exist:
 *   A) Customer self-pay (PaymentController):
 *      pending → verified | rejected
 *
 *   B) Cashier-recorded payment (BillingController):
 *      verified (cash / electronic, immediate)
 *      pending_reconciliation → verified (USSD / offline)
 *
 * SETTLED statuses count toward the outstanding amount on the bill summary.
 */
enum PaymentStatus: string
{
    /** Customer submitted proof; awaiting cashier verification. */
    case Pending = 'pending';

    /** Payment confirmed – money received and verified. */
    case Verified = 'verified';

    /**
     * USSD / offline payment recorded by cashier; connectivity not yet
     * available to confirm. Counts as settled for billing purposes.
     */
    case PendingReconciliation = 'pending_reconciliation';

    /** Cashier rejected the customer's payment proof; order is cancelled. */
    case Rejected = 'rejected';

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Statuses that count as "money received" when calculating outstanding
     * balance or deciding whether a session may be closed.
     */
    public static function settled(): array
    {
        return [self::Verified->value, self::PendingReconciliation->value];
    }

    /** Statuses that still require staff action before the flow can proceed. */
    public static function actionable(): array
    {
        return [self::Pending->value, self::PendingReconciliation->value];
    }

    public function isSettled(): bool
    {
        return in_array($this->value, self::settled(), true);
    }

    public function isActionable(): bool
    {
        return in_array($this->value, self::actionable(), true);
    }
}
