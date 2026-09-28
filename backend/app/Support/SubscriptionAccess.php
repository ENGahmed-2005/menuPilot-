<?php

namespace App\Support;

use App\Events\SubscriptionLifecycleEvent;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * The one place that decides a restaurant's subscription state and what it
 * may do. Computed from the owner's dates on every call (no reliance on a
 * scheduled job); sync() persists the status and fires each lifecycle event
 * once (audit + event), lazily, whenever the state is read.
 *
 *   TRIAL      now < trial_ends_at                      → full access
 *   EXPIRED    trial (or paid period) ended             → grace, then restricted
 *   ACTIVE     paid plan, not ended                     → full access
 *   CANCELLED  cancelled and its end has passed         → restricted
 *
 * Restricted mode: data stays readable/exportable, billing stays open,
 * operational actions (new orders/sessions, menu, tables, QR, new staff) stop.
 */
class SubscriptionAccess
{
    public const TRIAL = 'TRIAL';

    public const ACTIVE = 'ACTIVE';

    public const EXPIRED = 'EXPIRED';

    public const CANCELLED = 'CANCELLED';

    private function __construct(private ?User $owner) {}

    /** State of the restaurant the user belongs to (owner, or a staff member's owner). */
    public static function for(?User $user): self
    {
        if (! $user || $user->role === 'admin') {
            return new self(null);
        }
        if ($user->role === 'owner') {
            return new self($user);
        }
        $ownerId = Staff::where('account_user_id', $user->id)->value('user_id');

        return new self($ownerId ? User::find($ownerId) : null);
    }

    /** For an owner row already loaded (e.g. admin lists): no role lookup, no extra query. */
    public static function forOwner(User $owner): self
    {
        return new self($owner);
    }

    public static function forRestaurant(int $restaurantId): self
    {
        return new self(User::where('role', 'owner')->find($restaurantId));
    }

    public function owner(): ?User
    {
        return $this->owner;
    }

    public function status(): string
    {
        $o = $this->owner;
        if (! $o) {
            return self::ACTIVE; // platform admin / no restaurant: not subscription-gated
        }
        $now = now();
        if ($o->subscription_cancelled_at && (! $o->subscription_ends_at || $now->gte($o->subscription_ends_at))) {
            return self::CANCELLED;
        }
        if (in_array($o->plan, config('subscriptions.paid_plans'), true)) {
            return (! $o->subscription_ends_at || $now->lt($o->subscription_ends_at)) ? self::ACTIVE : self::EXPIRED;
        }

        return ($o->trial_ends_at && $now->lt($o->trial_ends_at)) ? self::TRIAL : self::EXPIRED;
    }

    public function isTrial(): bool
    {
        return $this->status() === self::TRIAL;
    }

    public function isActive(): bool
    {
        return $this->status() === self::ACTIVE;
    }

    public function isExpired(): bool
    {
        return $this->status() === self::EXPIRED;
    }

    public function isCancelled(): bool
    {
        return $this->status() === self::CANCELLED;
    }

    /** End of the period that just ran out (trial end, or paid end). */
    private function endedAt(): ?Carbon
    {
        $o = $this->owner;

        return in_array($o?->plan, config('subscriptions.paid_plans'), true) ? $o?->subscription_ends_at : $o?->trial_ends_at;
    }

    public function graceEndsAt(): ?Carbon
    {
        return $this->isExpired() && $this->endedAt() ? $this->endedAt()->copy()->addDays((int) config('subscriptions.grace_days', 0)) : null;
    }

    public function inGrace(): bool
    {
        return ($g = $this->graceEndsAt()) !== null && now()->lt($g);
    }

    public function isRestricted(): bool
    {
        return ($this->isExpired() && ! $this->inGrace()) || $this->isCancelled();
    }

    public function canOperate(): bool
    {
        return ! $this->isRestricted();
    }

    public function canManageBilling(): bool
    {
        return true;
    }

    public function canViewData(): bool
    {
        return true;
    }

    public function canCreateOrder(): bool
    {
        return $this->canOperate();
    }

    public function canManageMenu(): bool
    {
        return $this->canOperate();
    }

    public function canManageStaff(): bool
    {
        return $this->canOperate();
    }

    /** Whole days left in the trial, counting today (14 … 1), 0 once ended. */
    public function remainingDays(): int
    {
        $end = $this->owner?->trial_ends_at;
        if (! $this->isTrial() || ! $end) {
            return 0;
        }

        return max(1, (int) ceil(now()->diffInSeconds($end, false) / 86400));
    }

    /** For banners: normal | week | urgent | last_day | grace | expired | active | cancelled */
    public function phase(): string
    {
        return match (true) {
            $this->isActive() => 'active',
            $this->isCancelled() => 'cancelled',
            $this->inGrace() => 'grace',
            $this->isExpired() => 'expired',
            $this->remainingDays() <= 1 => 'last_day',
            $this->remainingDays() <= 3 => 'urgent',
            $this->remainingDays() <= 7 => 'week',
            default => 'normal',
        };
    }

    public function toArray(): array
    {
        $o = $this->owner;
        $trialDays = $o?->trial_started_at && $o?->trial_ends_at ? max(1, (int) round($o->trial_started_at->diffInDays($o->trial_ends_at))) : (int) config('subscriptions.trial.days');

        return [
            'status' => $this->status(),
            'phase' => $this->phase(),
            'plan' => $o?->plan,
            'requested_plan' => $o?->requested_plan,
            'trial_started_at' => $o?->trial_started_at?->toIso8601String(),
            'trial_ends_at' => $o?->trial_ends_at?->toIso8601String(),
            'trial_days' => $trialDays,
            'remaining_days' => $this->remainingDays(),
            'subscription_started_at' => $o?->subscription_started_at?->toIso8601String(),
            'subscription_ends_at' => $o?->subscription_ends_at?->toIso8601String(),
            'in_grace' => $this->inGrace(),
            'grace_ends_at' => $this->graceEndsAt()?->toIso8601String(),
            'restricted' => $this->isRestricted(),
            'can_operate' => $this->canOperate(),
            'server_time' => now()->toIso8601String(),
        ];
    }

    /** Persist the computed status and fire each lifecycle event once. */
    public function sync(): self
    {
        $o = $this->owner;
        if (! $o) {
            return $this;
        }
        $status = $this->status();
        $notices = is_array($o->subscription_notices) ? $o->subscription_notices : (json_decode((string) $o->subscription_notices, true) ?: []);
        $fire = [];

        if ($status === self::TRIAL) {
            foreach (config('subscriptions.notify_days') as $d) {
                $key = $d === 1 ? 'trial_1_day_remaining' : "trial_{$d}_days_remaining";
                if ($this->remainingDays() <= $d && ! isset($notices[$key]) && $this->remainingDays() < (int) config('subscriptions.trial.days')) {
                    $fire[] = $key;
                }
            }
        }
        if ($status === self::EXPIRED && $o->plan === 'trial' && ! isset($notices['trial_expired'])) {
            $fire[] = 'trial_expired';
        }
        if ($this->isRestricted() && ! isset($notices['subscription_restricted:'.$o->trial_ends_at.$o->subscription_ends_at])) {
            $fire[] = 'subscription_restricted';
            $notices['subscription_restricted:'.$o->trial_ends_at.$o->subscription_ends_at] = now()->toIso8601String();
        }

        foreach ($fire as $name) {
            $notices[$name] = now()->toIso8601String();
            self::event($name, $o->id, ['status' => $status, 'trial_ends_at' => (string) $o->trial_ends_at]);
        }
        if ($fire || $o->subscription_status !== $status) {
            $o->forceFill(['subscription_status' => $status, 'subscription_notices' => $notices])->saveQuietly();
        }

        return $this;
    }

    /** Dispatch the event and write the audit entry. */
    public static function event(string $name, int $restaurantId, array $data = []): void
    {
        SubscriptionLifecycleEvent::dispatch($name, $restaurantId, $data);
        Audit::log(request(), 'subscription.'.$name, 'subscription', $restaurantId, $data, $restaurantId);
    }

    /** Start the free trial on a brand-new owner (dates decided here, never by the client). */
    public static function startTrial(User $owner): void
    {
        $now = now();
        $owner->forceFill([
            'plan' => 'trial',
            'trial_started_at' => $now,
            'trial_ends_at' => $now->copy()->addDays((int) config('subscriptions.trial.days')),
            'subscription_status' => self::TRIAL,
            'subscription_notices' => ['trial_started' => $now->toIso8601String()],
        ])->save();
        self::event('trial_started', $owner->id, ['trial_ends_at' => (string) $owner->trial_ends_at, 'days' => (int) config('subscriptions.trial.days')]);
    }
}
