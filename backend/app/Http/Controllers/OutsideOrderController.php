<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use App\Support\MediaStore;
use App\Support\OrderWorkflow;
use App\Support\Permissions;
use App\Support\Realtime;
use App\Support\ResolvesRestaurant;
use App\Support\SubscriptionAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Ordering from outside the restaurant — pickup and delivery (the `delivery`
 * add-on, on any plan; feature key `online_orders`).
 *
 *   customer: /r/{slug} → cart → checkout (cash on pickup/delivery, or bank
 *             transfer with receipt) → tracking link (order token)
 *   staff:    inbox → accept (prep time) / reject (reason) → kitchen →
 *             out for delivery → completed (cash collected)
 * Prices, delivery fee and minimum order are computed here, never trusted
 * from the client. Every staff query is scoped to the authenticated
 * restaurant; the public side only reaches a restaurant through its slug.
 */
class OutsideOrderController extends Controller
{
    use ResolvesRestaurant;

    private const OPEN_STATES = ['awaiting_acceptance', 'accepted', 'out_for_delivery'];

    // ── helpers ────────────────────────────────────────────────────────────

    private function settingsFor(int $restaurantId): object
    {
        $row = DB::table('online_ordering_settings')->where('user_id', $restaurantId)->first();
        if ($row) {
            return $row;
        }
        $owner = User::find($restaurantId);
        $base = Str::slug($owner?->restaurant_name ?: 'restaurant') ?: 'restaurant';
        $slug = DB::table('online_ordering_settings')->where('slug', $base)->exists() ? $base.'-'.$restaurantId : $base;
        DB::table('online_ordering_settings')->insert(['user_id' => $restaurantId, 'slug' => $slug, 'created_at' => now(), 'updated_at' => now()]);

        return DB::table('online_ordering_settings')->where('user_id', $restaurantId)->first();
    }

    /** Delivery add-on (or trial) and not in restricted mode. */
    private function planAllows(User $owner): bool
    {
        return SubscriptionAccess::forOwner($owner)->canOperate() && $owner->hasFeature('online_orders');
    }

    private function isOpenNow(object $s): bool
    {
        if (! $s->enabled || $s->paused) {
            return false;
        }
        if (! $s->opens_at || ! $s->closes_at) {
            return true;
        }
        $now = now()->setTimezone(config('app.timezone'))->format('H:i');

        return $s->opens_at <= $s->closes_at
            ? $now >= $s->opens_at && $now < $s->closes_at
            : $now >= $s->opens_at || $now < $s->closes_at; // overnight (e.g. 18:00–02:00)
    }

    private function present(object $o, bool $staff = false): array
    {
        $items = DB::table('order_items')->join('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('order_items.order_id', $o->id)->where('order_items.status', 'active')
            ->select('order_items.id', 'menu_items.name', 'order_items.quantity', 'order_items.unit_price', 'order_items.note')->get();
        $subtotal = round($items->sum(fn ($i) => $i->quantity * $i->unit_price), 2);
        $c = DB::table('outside_order_contacts')->where('order_id', $o->id)->first();

        return array_filter([
            'id' => $o->id,
            'order_number' => $o->order_number,
            'channel' => $o->channel,
            'fulfillment_status' => $o->fulfillment_status,
            'kitchen_status' => $o->status,
            'payment_method' => $o->payment_method,
            'payment_status' => $o->payment_status,
            'payment_proof_url' => $staff ? $o->payment_proof_url : null,
            'prep_minutes' => $o->prep_minutes,
            'rejection_reason' => $o->rejection_reason,
            'submitted_at' => $o->submitted_at,
            'accepted_at' => $o->accepted_at,
            'ready_at' => $o->ready_at,
            'dispatched_at' => $o->dispatched_at,
            'completed_at' => $o->completed_at,
            'driver' => $staff && $o->assigned_driver_id ? ['id' => (int) $o->assigned_driver_id, 'name' => DB::table('staff')->where('account_user_id', $o->assigned_driver_id)->value('name')] : null,
            'items' => $items->map(fn ($i) => ['id' => $i->id, 'name' => $i->name, 'quantity' => (int) $i->quantity, 'unit_price' => (float) $i->unit_price, 'note' => $i->note])->values(),
            'subtotal' => $subtotal,
            'delivery_fee' => (float) $o->delivery_fee,
            'total' => round($subtotal + (float) $o->delivery_fee, 2),
            'customer' => $c ? array_filter([
                'name' => $c->name, 'phone' => $c->phone, 'address' => $c->address, 'zone' => $c->zone_name, 'notes' => $c->notes,
                // GPS location is staff-only (never on the public tracking page).
                'location' => $staff && $c->latitude !== null ? ['lat' => (float) $c->latitude, 'lng' => (float) $c->longitude, 'accuracy' => $c->location_accuracy !== null ? (int) $c->location_accuracy : null] : null,
            ], fn ($v) => $v !== null) : null,
        ], fn ($v) => $v !== null);
    }

    /** A driver holds deliver_orders but not the general order permissions. */
    private function isDriverOnly(Request $r): bool
    {
        $perms = Permissions::for($r->user());

        return in_array('deliver_orders', $perms, true) && ! array_intersect(['view_orders', 'manage_orders', 'view_payments', 'dispatch_deliveries'], $perms);
    }

    private function orderFor(Request $r, $id): ?object
    {
        return DB::table('orders')->where('id', $id)->where('user_id', $this->restaurantId($r))->whereIn('channel', ['pickup', 'delivery'])->first();
    }

    // ── public ─────────────────────────────────────────────────────────────

    /** GET /public/restaurants/{slug} — menu, open status, zones. */
    public function restaurant(string $slug)
    {
        $s = DB::table('online_ordering_settings')->where('slug', $slug)->first();
        $owner = $s ? User::where('role', 'owner')->find($s->user_id) : null;
        if (! $s || ! $owner || ! $s->enabled) {
            return response()->json(['message' => 'هذا المطعم لا يستقبل طلبات أونلاين حاليًا.', 'code' => 'ONLINE_ORDERING_UNAVAILABLE'], 404);
        }
        $available = $this->planAllows($owner);
        $branding = DB::table('restaurant_settings')->where('user_id', $owner->id)->first();

        return response()->json(['data' => [
            'restaurant' => ['name' => $owner->restaurant_name, 'phone' => $owner->restaurant_phone, 'whatsapp' => $s->whatsapp, 'logo_url' => $branding->logo_url ?? null, 'primary_color' => $branding->primary_color ?? null],
            'open' => $available && $this->isOpenNow($s),
            'paused' => (bool) $s->paused,
            'hours' => $s->opens_at && $s->closes_at ? ['opens_at' => $s->opens_at, 'closes_at' => $s->closes_at] : null,
            'pickup' => (bool) $s->pickup_enabled,
            'delivery' => (bool) $s->delivery_enabled,
            'prep_minutes' => (int) $s->prep_minutes,
            'zones' => $s->delivery_enabled ? DB::table('delivery_zones')->where('user_id', $owner->id)->where('active', true)->orderBy('name')->get(['id', 'name', 'fee', 'min_order']) : [],
            'items' => DB::table('menu_items')->where('user_id', $owner->id)->where('is_available', true)->whereNull('deleted_at')
                ->orderBy('category')->orderBy('name')->get(['id', 'name', 'description', 'price', 'category', 'image_url'])
                ->map(fn ($i) => ['id' => $i->id, 'name' => $i->name, 'description' => $i->description, 'price' => (float) $i->price, 'category' => $i->category, 'imageUrl' => $i->image_url]),
        ]]);
    }

    /** POST /public/restaurants/{slug}/orders */
    public function place(Request $r, string $slug)
    {
        $s = DB::table('online_ordering_settings')->where('slug', $slug)->first();
        $owner = $s ? User::where('role', 'owner')->find($s->user_id) : null;
        if (! $s || ! $owner || ! $this->planAllows($owner) || ! $this->isOpenNow($s)) {
            return response()->json(['message' => 'المطعم لا يستقبل طلبات أونلاين الآن. جرّب لاحقًا أو اتصل بالمطعم.', 'code' => 'ONLINE_ORDERING_CLOSED'], 409);
        }

        $v = $r->validate([
            'type' => ['required', Rule::in(array_values(array_filter([$s->pickup_enabled ? 'pickup' : null, $s->delivery_enabled ? 'delivery' : null])))],
            'name' => 'required|string|max:120',
            'phone' => ['required', 'string', 'regex:/^\+?[0-9 ]{7,20}$/'],
            'address' => 'required_if:type,delivery|nullable|string|max:500',
            'zone_id' => 'required_if:type,delivery|nullable|integer',
            'notes' => 'nullable|string|max:500',
            // Optional GPS location shared by the customer (delivery only).
            'latitude' => 'nullable|required_with:longitude|numeric|between:-90,90',
            'longitude' => 'nullable|required_with:latitude|numeric|between:-180,180',
            'location_accuracy' => 'nullable|integer|min:0|max:100000',
            'payment_method' => 'required|in:cash,transfer',
            'proof' => 'required_if:payment_method,transfer|nullable|string',
            'items' => 'required|array|min:1|max:50',
            'items.*.menuItemId' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:50',
            'items.*.note' => 'nullable|string|max:300',
        ], ['type.in' => 'نوع الطلب غير متاح في هذا المطعم.', 'address.required_if' => 'اكتب عنوان التوصيل.', 'zone_id.required_if' => 'اختر منطقة التوصيل.', 'phone.regex' => 'رقم الهاتف غير صحيح.', 'proof.required_if' => 'أرفق صورة إشعار التحويل.']);

        $phone = preg_replace('/\s+/', '', $v['phone']);
        $waiting = DB::table('orders')->join('outside_order_contacts', 'outside_order_contacts.order_id', '=', 'orders.id')
            ->where('orders.user_id', $owner->id)->where('outside_order_contacts.phone', $phone)->where('orders.fulfillment_status', 'awaiting_acceptance')->count();
        if ($waiting >= 3) {
            return response()->json(['message' => 'لديك طلبات بانتظار موافقة المطعم. انتظر قبولها قبل إرسال طلب جديد.', 'code' => 'TOO_MANY_PENDING'], 429);
        }

        $prices = DB::table('menu_items')->where('user_id', $owner->id)->where('is_available', true)->whereNull('deleted_at')
            ->whereIn('id', collect($v['items'])->pluck('menuItemId'))->pluck('price', 'id');
        foreach ($v['items'] as $line) {
            if (! isset($prices[$line['menuItemId']])) {
                return response()->json(['message' => 'أحد الأصناف لم يعد متاحًا. حدّث المنيو وحاول مجددًا.', 'code' => 'ITEM_UNAVAILABLE'], 422);
            }
        }
        $subtotal = collect($v['items'])->sum(fn ($l) => $prices[$l['menuItemId']] * $l['quantity']);

        $zone = null;
        if ($v['type'] === 'delivery') {
            $zone = DB::table('delivery_zones')->where('user_id', $owner->id)->where('active', true)->find($v['zone_id']);
            if (! $zone) {
                return response()->json(['message' => 'منطقة التوصيل غير متاحة.', 'errors' => ['zone_id' => ['invalid']]], 422);
            }
            if ($subtotal < (float) $zone->min_order) {
                $min = rtrim(rtrim(number_format((float) $zone->min_order, 2, '.', ''), '0'), '.');

                return response()->json(['message' => "الحد الأدنى للتوصيل إلى {$zone->name} هو {$min} ₪ (دون رسوم التوصيل). أضف أصنافًا لتصل إليه.", 'code' => 'BELOW_MIN_ORDER', 'min_order' => (float) $zone->min_order], 422);
            }
        }

        $proofUrl = null;
        if ($v['payment_method'] === 'transfer') {
            if (! preg_match('#^data:(image/(?:png|jpe?g|webp));base64,(.+)$#', (string) $v['proof'], $m) || ! ($bin = base64_decode($m[2], true)) || strlen($bin) > 5 * 1024 * 1024) {
                return response()->json(['message' => 'صورة الإشعار يجب أن تكون PNG أو JPG أو WebP بحجم لا يتجاوز 5MB.', 'errors' => ['proof' => ['invalid']]], 422);
            }
            $proofUrl = MediaStore::put($bin, str_replace('jpg', 'jpeg', $m[1]), $owner->id);
        }

        $token = Str::random(40);
        $orderId = DB::transaction(function () use ($owner, $v, $prices, $zone, $proofUrl, $token, $phone) {
            $now = now();
            $id = DB::table('orders')->insertGetId([
                'dining_session_id' => null,
                'user_id' => $owner->id,
                'order_number' => OrderWorkflow::nextNumber($owner->id),
                'status' => 'on_hold', // hidden from the kitchen until accepted
                'channel' => $v['type'],
                'fulfillment_status' => 'awaiting_acceptance',
                'delivery_fee' => $zone ? (float) $zone->fee : 0,
                'payment_method' => $v['payment_method'],
                'payment_status' => $v['payment_method'] === 'transfer' ? 'pending_verification' : 'unpaid',
                'payment_proof_url' => $proofUrl,
                'public_token' => $token,
                'submitted_at' => $now, 'created_at' => $now, 'updated_at' => $now,
            ]);
            foreach ($v['items'] as $line) {
                DB::table('order_items')->insert(['order_id' => $id, 'menu_item_id' => $line['menuItemId'], 'quantity' => $line['quantity'], 'unit_price' => $prices[$line['menuItemId']], 'note' => $line['note'] ?? null, 'status' => 'active', 'created_at' => $now, 'updated_at' => $now]);
            }
            DB::table('outside_order_contacts')->insert(['order_id' => $id, 'name' => trim($v['name']), 'phone' => $phone, 'address' => $v['address'] ?? null, 'zone_id' => $zone->id ?? null, 'zone_name' => $zone->name ?? null, 'notes' => $v['notes'] ?? null,
                'latitude' => $v['type'] === 'delivery' ? ($v['latitude'] ?? null) : null,
                'longitude' => $v['type'] === 'delivery' ? ($v['longitude'] ?? null) : null,
                'location_accuracy' => $v['type'] === 'delivery' && isset($v['latitude']) ? ($v['location_accuracy'] ?? null) : null, 'created_at' => $now, 'updated_at' => $now]);

            return $id;
        });

        return response()->json(['data' => $this->present(DB::table('orders')->find($orderId)) + ['token' => $token, 'tracking_url' => rtrim(config('app.frontend_url'), '/')."/o/{$orderId}?token={$token}"]], 201);
    }

    /** GET /public/outside-orders/{id}?token= — customer tracking. */
    public function track(Request $r, $id)
    {
        $o = DB::table('orders')->where('id', $id)->whereIn('channel', ['pickup', 'delivery'])->first();
        if (! $o || ! hash_equals((string) $o->public_token, (string) $r->query('token', $r->header('X-Order-Token', '')))) {
            return response()->json(['message' => 'رابط التتبع غير صالح.', 'code' => 'ORDER_TOKEN_INVALID'], 403);
        }
        $restaurant = DB::table('users')->where('id', $o->user_id)->select('restaurant_name', 'restaurant_phone')->first();
        $whatsapp = DB::table('online_ordering_settings')->where('user_id', $o->user_id)->value('whatsapp');
        // Expected ready time: accepted + prep minutes (server clock).
        $eta = $o->accepted_at && $o->prep_minutes ? Carbon::parse($o->accepted_at)->addMinutes((int) $o->prep_minutes)->toIso8601String() : null;

        return response()->json(['data' => $this->present($o) + [
            'eta_at' => $eta,
            'realtime_channel' => Realtime::outsideChannel((int) $o->id),
            'restaurant' => ['name' => $restaurant->restaurant_name, 'phone' => $restaurant->restaurant_phone, 'whatsapp' => $whatsapp],
        ]]);
    }

    // ── staff ──────────────────────────────────────────────────────────────

    /** GET /outside-orders?status=active|awaiting|done */
    public function index(Request $r)
    {
        $q = DB::table('orders')->where('user_id', $this->restaurantId($r))->whereIn('channel', ['pickup', 'delivery']);
        // Drivers only ever see the delivery board.
        $driverOnly = $this->isDriverOnly($r);
        $dispatcher = ! $driverOnly && in_array('dispatch_deliveries', Permissions::for($r->user()), true)
            && ! array_intersect(['view_orders', 'manage_orders', 'view_payments'], Permissions::for($r->user()));
        if ($driverOnly) {
            $q->where('assigned_driver_id', $r->user()->id); // a driver only sees orders assigned to them
        }
        match ($driverOnly || $dispatcher ? 'delivery' : $r->query('status', 'active')) {
            'awaiting' => $q->where('fulfillment_status', 'awaiting_acceptance'),
            // Delivery board: accepted delivery orders not yet completed.
            // Strict sequence: the delivery team sees an order only once the
            // kitchen has marked it ready (or it is already on the road).
            'delivery' => $q->where('channel', 'delivery')->where(fn ($w) => $w->where('fulfillment_status', 'out_for_delivery')
                ->orWhere(fn ($x) => $x->where('fulfillment_status', 'accepted')->whereIn('status', ['ready', 'served']))),
            'done' => $q->whereIn('fulfillment_status', ['completed', 'rejected'])->where('updated_at', '>=', now()->subDays(2)),
            default => $q->whereIn('fulfillment_status', self::OPEN_STATES),
        };

        return response()->json(['data' => $q->orderByRaw("CASE WHEN fulfillment_status = 'awaiting_acceptance' THEN 0 ELSE 1 END")->orderBy('submitted_at')->limit(200)->get()->map(fn ($o) => $this->present($o, true))]);
    }

    /** POST /outside-orders/{id}/accept {prep_minutes} → kitchen. */
    public function accept(Request $r, $id)
    {
        $v = $r->validate(['prep_minutes' => 'nullable|integer|min:5|max:240']);
        $o = $this->orderFor($r, $id);
        if (! $o) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        $updated = DB::table('orders')->where('id', $id)->where('fulfillment_status', 'awaiting_acceptance')->update([
            'fulfillment_status' => 'accepted', 'status' => 'pending', 'accepted_at' => now(),
            'prep_minutes' => $v['prep_minutes'] ?? $this->settingsFor((int) $o->user_id)->prep_minutes, 'updated_at' => now(),
        ]);
        if (! $updated) {
            return response()->json(['message' => 'عولج هذا الطلب مسبقًا.', 'code' => 'ORDER_ALREADY_HANDLED'], 409);
        }
        OrderWorkflow::logStatus((int) $id, 'on_hold', 'pending', $r->user()->id);
        Audit::log($r, 'outside_order.accepted', 'order', (int) $id, ['prep_minutes' => $v['prep_minutes'] ?? null], (int) $o->user_id);

        return response()->json(['data' => $this->present(DB::table('orders')->find($id), true)]);
    }

    /** POST /outside-orders/{id}/reject {reason} */
    public function reject(Request $r, $id)
    {
        $v = $r->validate(['reason' => 'required|string|min:2|max:255']);
        $o = $this->orderFor($r, $id);
        if (! $o) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        $updated = DB::table('orders')->where('id', $id)->where('fulfillment_status', 'awaiting_acceptance')
            ->update(['fulfillment_status' => 'rejected', 'status' => 'cancelled', 'rejection_reason' => $v['reason'], 'updated_at' => now()]);
        if (! $updated) {
            return response()->json(['message' => 'عولج هذا الطلب مسبقًا.', 'code' => 'ORDER_ALREADY_HANDLED'], 409);
        }
        Audit::log($r, 'outside_order.rejected', 'order', (int) $id, ['reason' => $v['reason']], (int) $o->user_id);

        return response()->json(['data' => $this->present(DB::table('orders')->find($id), true)]);
    }

    /** Active drivers of this restaurant with their current load. */
    public function drivers(Request $r)
    {
        $rid = $this->restaurantId($r);
        $load = DB::table('orders')->where('user_id', $rid)->whereIn('fulfillment_status', ['accepted', 'out_for_delivery'])
            ->whereNotNull('assigned_driver_id')->groupBy('assigned_driver_id')->select('assigned_driver_id', DB::raw('COUNT(*) as n'))->pluck('n', 'assigned_driver_id');

        return response()->json(['data' => DB::table('staff')->where('user_id', $rid)->where('role', 'delivery')->where('active', true)->whereNotNull('account_user_id')
            ->orderBy('name')->get(['account_user_id as id', 'name'])->map(fn ($d) => ['id' => (int) $d->id, 'name' => $d->name, 'active_orders' => (int) ($load[$d->id] ?? 0)])]);
    }

    /** POST /outside-orders/{id}/assign {driver_id|null} — assign / unassign a driver. */
    public function assign(Request $r, $id)
    {
        $v = $r->validate(['driver_id' => 'nullable|integer']);
        $o = $this->orderFor($r, $id);
        if (! $o || $o->channel !== 'delivery') {
            return response()->json(['message' => 'Order not found'], 404);
        }
        if (! in_array($o->fulfillment_status, ['accepted', 'out_for_delivery'], true)) {
            return response()->json(['message' => 'يمكن تعيين سائق للطلبات المقبولة فقط.', 'code' => 'INVALID_TRANSITION'], 409);
        }
        if ($o->fulfillment_status === 'accepted' && ! in_array($o->status, ['ready', 'served'], true)) {
            return response()->json(['message' => 'الطلب لم يجهز بعد في المطبخ.', 'code' => 'NOT_READY'], 409);
        }
        $driverId = $v['driver_id'] ?? null;
        if ($driverId && ! DB::table('staff')->where('user_id', $o->user_id)->where('role', 'delivery')->where('active', true)->where('account_user_id', $driverId)->exists()) {
            return response()->json(['message' => 'السائق غير موجود في فريق هذا المطعم أو غير مفعّل.', 'errors' => ['driver_id' => ['invalid']]], 422);
        }
        DB::table('orders')->where('id', $id)->update(['assigned_driver_id' => $driverId, 'assigned_at' => $driverId ? now() : null, 'updated_at' => now()]);
        Audit::log($r, 'outside_order.driver_assigned', 'order', (int) $id, ['from' => $o->assigned_driver_id, 'to' => $driverId], (int) $o->user_id);

        return response()->json(['data' => $this->present(DB::table('orders')->find($id), true)]);
    }

    /**
     * POST /outside-orders/{id}/status {status, reason?} — restaurant OWNER
     * override: move an accepted delivery order to any active state (forward
     * or back), bypassing the hand-over sequence, or cancel it with a reason
     * the customer sees. Money stays protected: a transfer must be verified
     * before completion, and completed/rejected orders are final.
     */
    public function overrideStatus(Request $r, $id)
    {
        if ($r->user()->role !== 'owner') {
            return response()->json(['message' => 'هذا الإجراء متاح لصاحب المطعم فقط.', 'code' => 'PERMISSION_DENIED'], 403);
        }
        $v = $r->validate([
            'status' => 'required|in:preparing,ready,out_for_delivery,completed,cancelled',
            'reason' => 'required_if:status,cancelled|nullable|string|min:2|max:255',
        ], ['reason.required_if' => 'اكتب سبب الإلغاء، سيظهر للزبون.']);
        $o = $this->orderFor($r, $id);
        if (! $o || $o->channel !== 'delivery') {
            return response()->json(['message' => 'Order not found'], 404);
        }
        if (! in_array($o->fulfillment_status, ['accepted', 'out_for_delivery'], true)) {
            return response()->json(['message' => 'لا يمكن تعديل طلب مكتمل أو مرفوض أو لم يُقبل بعد.', 'code' => 'INVALID_TRANSITION'], 409);
        }
        $now = now();
        $set = match ($v['status']) {
            'preparing' => ['fulfillment_status' => 'accepted', 'status' => 'preparing', 'dispatched_at' => null],
            'ready' => ['fulfillment_status' => 'accepted', 'status' => 'ready', 'ready_at' => $o->ready_at ?? $now, 'dispatched_at' => null],
            'out_for_delivery' => ['fulfillment_status' => 'out_for_delivery', 'status' => 'ready', 'ready_at' => $o->ready_at ?? $now, 'dispatched_at' => $o->dispatched_at ?? $now],
            'completed' => ['fulfillment_status' => 'completed', 'status' => 'served', 'served_at' => $now, 'completed_at' => $now, 'payment_status' => 'paid'],
            'cancelled' => ['fulfillment_status' => 'rejected', 'status' => 'cancelled', 'rejection_reason' => $v['reason']],
        };
        if ($v['status'] === 'completed' && $o->payment_method === 'transfer' && $o->payment_status !== 'paid') {
            return response()->json(['message' => 'أكّد وصول التحويل قبل تسجيل الطلب كمُسلَّم.', 'code' => 'PAYMENT_NOT_VERIFIED'], 409);
        }
        DB::table('orders')->where('id', $id)->update($set + ['updated_at' => $now]);
        if (($set['status'] ?? $o->status) !== $o->status) {
            OrderWorkflow::logStatus((int) $id, $o->status, $set['status'], $r->user()->id);
        }
        Audit::log($r, 'outside_order.status_overridden', 'order', (int) $id, [
            'from' => ['fulfillment' => $o->fulfillment_status, 'kitchen' => $o->status], 'to' => $v['status'], 'reason' => $v['reason'] ?? null,
        ], (int) $o->user_id);

        return response()->json(['data' => $this->present(DB::table('orders')->find($id), true)]);
    }

    /** POST /outside-orders/{id}/dispatch — delivery left the restaurant. */
    public function dispatch(Request $r, $id)
    {
        $o = $this->orderFor($r, $id);
        if (! $o || $o->channel !== 'delivery') {
            return response()->json(['message' => 'Order not found'], 404);
        }
        if ($this->isDriverOnly($r) && (int) $o->assigned_driver_id !== (int) $r->user()->id) {
            return response()->json(['message' => 'هذا الطلب غير معيّن لك.', 'code' => 'PERMISSION_DENIED'], 403);
        }
        if ($o->fulfillment_status !== 'accepted') {
            return response()->json(['message' => 'اقبل الطلب أولًا.', 'code' => 'INVALID_TRANSITION'], 409);
        }
        if (! in_array($o->status, ['ready', 'served'], true)) {
            return response()->json(['message' => 'الطلب لم يجهز بعد في المطبخ.', 'code' => 'NOT_READY'], 409);
        }
        // With drivers on the team, a driver must be assigned first (restaurants
        // without drivers can still dispatch directly).
        $hasDrivers = DB::table('staff')->where('user_id', $o->user_id)->where('role', 'delivery')->where('active', true)->exists();
        if ($hasDrivers && ! $o->assigned_driver_id) {
            return response()->json(['message' => 'عيّن سائقًا للطلب أولًا.', 'code' => 'DRIVER_REQUIRED'], 409);
        }
        DB::table('orders')->where('id', $id)->update(['fulfillment_status' => 'out_for_delivery', 'dispatched_at' => now(), 'updated_at' => now()]);
        Audit::log($r, 'outside_order.dispatched', 'order', (int) $id, [], (int) $o->user_id);

        return response()->json(['data' => $this->present(DB::table('orders')->find($id), true)]);
    }

    /** POST /outside-orders/{id}/complete — picked up / delivered; cash collected. */
    public function complete(Request $r, $id)
    {
        $o = $this->orderFor($r, $id);
        if (! $o) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        if ($this->isDriverOnly($r) && ($o->channel !== 'delivery' || (int) $o->assigned_driver_id !== (int) $r->user()->id)) {
            return response()->json(['message' => 'You do not have permission for this action.', 'code' => 'PERMISSION_DENIED'], 403);
        }
        if (! in_array($o->fulfillment_status, ['accepted', 'out_for_delivery'], true)) {
            return response()->json(['message' => 'لا يمكن إنهاء هذا الطلب في حالته الحالية.', 'code' => 'INVALID_TRANSITION'], 409);
        }
        if ($o->channel === 'delivery' && $o->fulfillment_status !== 'out_for_delivery') {
            return response()->json(['message' => 'اضغط «خرج للتوصيل» أولًا.', 'code' => 'INVALID_TRANSITION'], 409);
        }
        if ($o->payment_method === 'transfer' && $o->payment_status !== 'paid') {
            return response()->json(['message' => 'أكّد وصول التحويل قبل تسليم الطلب.', 'code' => 'PAYMENT_NOT_VERIFIED'], 409);
        }
        DB::table('orders')->where('id', $id)->update(['fulfillment_status' => 'completed', 'completed_at' => now(), 'status' => 'served', 'served_at' => now(), 'payment_status' => 'paid', 'updated_at' => now()]);
        Audit::log($r, 'outside_order.completed', 'order', (int) $id, ['payment_method' => $o->payment_method], (int) $o->user_id);

        return response()->json(['data' => $this->present(DB::table('orders')->find($id), true)]);
    }

    /** POST /outside-orders/{id}/verify-payment — transfer received. */
    public function verifyPayment(Request $r, $id)
    {
        $o = $this->orderFor($r, $id);
        if (! $o || $o->payment_method !== 'transfer') {
            return response()->json(['message' => 'Order not found'], 404);
        }
        DB::table('orders')->where('id', $id)->update(['payment_status' => 'paid', 'updated_at' => now()]);
        Audit::log($r, 'outside_order.payment_verified', 'order', (int) $id, [], (int) $o->user_id);

        return response()->json(['data' => $this->present(DB::table('orders')->find($id), true)]);
    }

    // ── settings ───────────────────────────────────────────────────────────

    public function settings(Request $r)
    {
        $rid = $this->restaurantId($r);
        $s = $this->settingsFor($rid);
        $owner = User::find($rid);

        return response()->json(['data' => [
            'settings' => $s,
            'zones' => DB::table('delivery_zones')->where('user_id', $rid)->orderBy('name')->get(),
            'plan_allows' => $owner ? $this->planAllows($owner) : false,
            'whatsapp' => $s->whatsapp,
            'public_url' => rtrim(config('app.frontend_url'), '/').'/r/'.$s->slug,
        ]]);
    }

    public function updateSettings(Request $r)
    {
        $rid = $this->restaurantId($r);
        $s = $this->settingsFor($rid);
        $v = $r->validate([
            'enabled' => 'sometimes|boolean', 'paused' => 'sometimes|boolean',
            'pickup_enabled' => 'sometimes|boolean', 'delivery_enabled' => 'sometimes|boolean',
            'prep_minutes' => 'sometimes|integer|min:5|max:240',
            // International format with country code, e.g. +970599123456.
            'whatsapp' => ['sometimes', 'nullable', 'regex:/^\+[1-9]\d{7,14}$/'],
            'opens_at' => ['sometimes', 'nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'closes_at' => ['sometimes', 'nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'slug' => ['sometimes', 'string', 'min:3', 'max:60', 'regex:/^[a-z0-9-]+$/', Rule::unique('online_ordering_settings', 'slug')->ignore($s->id)],
            'zones' => 'sometimes|array|max:50',
            'zones.*.name' => 'required|string|max:120',
            'zones.*.fee' => 'required|numeric|min:0|max:1000',
            'zones.*.min_order' => 'nullable|numeric|min:0|max:10000',
            'zones.*.active' => 'nullable|boolean',
        ]);
        DB::transaction(function () use ($v, $rid, $s) {
            $fields = collect($v)->except('zones')->all();
            if ($fields) {
                DB::table('online_ordering_settings')->where('id', $s->id)->update($fields + ['updated_at' => now()]);
            }
            if (array_key_exists('zones', $v)) {
                DB::table('delivery_zones')->where('user_id', $rid)->delete();
                foreach ($v['zones'] as $z) {
                    DB::table('delivery_zones')->insert(['user_id' => $rid, 'name' => $z['name'], 'fee' => $z['fee'], 'min_order' => $z['min_order'] ?? 0, 'active' => $z['active'] ?? true, 'created_at' => now(), 'updated_at' => now()]);
                }
            }
        });
        Audit::log($r, 'online_ordering.settings_updated', 'online_ordering_settings', (int) $s->id, collect($v)->except('zones')->all() + ['zones' => count($v['zones'] ?? [])], $rid);

        return $this->settings($r);
    }
}
