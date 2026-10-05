<?php

namespace App\Support;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * A live demo restaurant, one in Arabic and one in English, so a visitor can
 * try menuPilot as the owner, the kitchen, the cashier, the waiter or a
 * guest without signing up. It is rebuilt when it is more than a day old,
 * on the next visit (no scheduler needed). Demo accounts can't change
 * accounts, plans or payments (ApiAuth), and their tables skip the location
 * check, since visitors aren't inside the restaurant.
 */
class DemoRestaurant
{
    public const LANGS = ['ar', 'en'];

    public const ROLES = ['owner', 'kitchen', 'cashier', 'waiter'];

    private const FRESH_HOURS = 24;

    private const DATA = [
        'ar' => [
            'name' => 'مطعم الزيتونة', 'slug' => 'demo-zaytoona', 'zone' => 'الرمال', 'address' => 'الرمال، شارع عمر المختار، بجانب الصيدلية',
            'guests' => ['سارة', 'محمد', 'ليان', 'يوسف', 'هبة', 'خالد'],
            'staff' => ['kitchen' => 'فريق المطبخ', 'cashier' => 'ريم (الكاشير)', 'waiter' => 'علي (النادل)'],
            // [name, price, category, description, extras [name, price]]
            'menu' => [
                ['مقلوبة دجاج', 32, 'الأطباق الرئيسية', 'أرز بالبهارات ودجاج وباذنجان مقلي ولوز محمّص', [['صحن لبن', 3], ['سلطة عربية', 4]]],
                ['مسخّن', 28, 'الأطباق الرئيسية', 'خبز طابون وبصل وسماق ودجاج', [['صحن لبن', 3]]],
                ['شاورما عربي', 18, 'الأطباق الرئيسية', 'مع ثومية ومخلل وبطاطا', [['جبنة إضافية', 3], ['بطاطا إضافية', 4], ['ثومية إضافية', 2]]],
                ['فتوش', 12, 'السلطات', 'خضار طازجة وخبز محمّص ودبس رمان', []],
                ['حمص بيروتي', 10, 'المقبلات', 'حمص بالطحينة وزيت زيتون', [['لحمة مفرومة', 6], ['صنوبر محمّص', 4]]],
                ['فلافل', 8, 'المقبلات', 'ستة أقراص مع طحينة', [['ثلاثة أقراص إضافية', 4]]],
                ['كنافة نابلسية', 15, 'الحلويات', 'جبنة نابلسية وقطر', [['بوظة', 4], ['فستق حلبي', 3]]],
                ['ليمون بالنعناع', 7, 'المشروبات', 'ليمون طازج ونعناع', []],
                ['قهوة عربية', 6, 'المشروبات', 'بالهيل', []],
            ],
            'employees' => [['سامي', 'شيف', 'monthly', 3200, 180], ['لينا', 'نادلة', 'monthly', 1800, 120], ['أحمد', 'مساعد مطبخ', 'weekly', 450, 90], ['أبو محمود', 'عامل نظافة', 'daily', 60, 60]],
            'expenses' => [['rent', 'إيجار المحل', 2500, true], ['utilities', 'كهرباء وماء', 650, true], ['supplies', 'خضار ولحوم الأسبوع', 1400, false], ['marketing', 'إعلانات إنستغرام', 300, false]],
            'supplies' => 'مشتريات الشهر', 'note' => 'بدون بصل',
        ],
        'en' => [
            'name' => 'The Olive Kitchen', 'slug' => 'demo-olive-kitchen', 'zone' => 'Downtown', 'address' => 'Downtown, Omar Al-Mukhtar St, next to the pharmacy',
            'guests' => ['Sarah', 'Mark', 'Lina', 'Joseph', 'Emma', 'Omar'],
            'staff' => ['kitchen' => 'Kitchen team', 'cashier' => 'Reem (cashier)', 'waiter' => 'Ali (waiter)'],
            'menu' => [
                ['Chicken maqluba', 32, 'Mains', 'Spiced rice, chicken, fried aubergine and toasted almonds', [['Yogurt bowl', 3], ['Arabic salad', 4]]],
                ['Musakhan', 28, 'Mains', 'Taboon bread, onions, sumac and chicken', [['Yogurt bowl', 3]]],
                ['Shawarma plate', 18, 'Mains', 'With garlic sauce, pickles and fries', [['Extra cheese', 3], ['Extra fries', 4], ['Extra garlic sauce', 2]]],
                ['Fattoush', 12, 'Salads', 'Fresh vegetables, toasted bread and pomegranate molasses', []],
                ['Hummus', 10, 'Starters', 'Tahini, olive oil and warm bread', [['Minced meat', 6], ['Toasted pine nuts', 4]]],
                ['Falafel', 8, 'Starters', 'Six pieces with tahini', [['Three more pieces', 4]]],
                ['Knafeh', 15, 'Desserts', 'Nabulsi cheese and syrup', [['Ice cream', 4], ['Pistachios', 3]]],
                ['Mint lemonade', 7, 'Drinks', 'Fresh lemon and mint', []],
                ['Arabic coffee', 6, 'Drinks', 'With cardamom', []],
            ],
            'employees' => [['Sami', 'Chef', 'monthly', 3200, 180], ['Lina', 'Waitress', 'monthly', 1800, 120], ['Adam', 'Kitchen helper', 'weekly', 450, 90], ['Yusuf', 'Cleaner', 'daily', 60, 60]],
            'expenses' => [['rent', 'Shop rent', 2500, true], ['utilities', 'Electricity and water', 650, true], ['supplies', 'Weekly vegetables and meat', 1400, false], ['marketing', 'Instagram ads', 300, false]],
            'supplies' => 'Monthly supplies', 'note' => 'No onions',
        ],
    ];

    public static function email(string $lang, string $role): string
    {
        return "demo-{$lang}-{$role}@menupilot.app";
    }

    public static function owner(string $lang): ?User
    {
        return User::where('email', self::email($lang, 'owner'))->first();
    }

    /** The demo restaurant, rebuilt first if it is missing or more than a day old. */
    public static function fresh(string $lang): User
    {
        $owner = self::owner($lang);
        if ($owner && $owner->created_at->gt(now()->subHours(self::FRESH_HOURS))) {
            return $owner;
        }

        // One rebuild at a time; a visitor arriving meanwhile waits for it.
        return Cache::lock("demo-rebuild-{$lang}", 120)->block(60, function () use ($lang) {
            $owner = self::owner($lang);

            return $owner && $owner->created_at->gt(now()->subHours(self::FRESH_HOURS)) ? $owner : self::rebuild($lang);
        });
    }

    /** The table guests open in the demo. */
    public static function guestTable(User $owner): ?string
    {
        return DB::table('restaurant_tables')->where('user_id', $owner->id)->where('label', '5')->value('table_code');
    }

    public static function rebuild(string $lang): User
    {
        $d = self::DATA[$lang];

        return DB::transaction(function () use ($lang, $d) {
            // Everything that belongs to the old demo goes with its accounts (foreign keys cascade).
            User::where('email', 'like', "demo-{$lang}-%@menupilot.app")->delete();

            $now = CarbonImmutable::now();
            $today = $now->startOfDay();
            $owner = User::create([
                'name' => $d['name'], 'email' => self::email($lang, 'owner'), 'password' => Hash::make(Str::random(40)), 'role' => 'owner',
            ]);
            DB::table('users')->where('id', $owner->id)->update([
                'is_demo' => true, 'restaurant_name' => $d['name'], 'restaurant_phone' => '0599000000',
                'plan' => 'pro', 'addons' => json_encode(['delivery', 'brand_plus']), 'subscription_status' => 'ACTIVE',
                'subscription_started_at' => $now->subDays(200), 'subscription_ends_at' => $now->addYears(5), 'trial_ends_at' => null,
                'latitude' => 31.5017, 'longitude' => 34.4668, 'payment_timing' => 'after',
            ]);
            $id = $owner->id;

            foreach ($d['staff'] as $role => $name) {
                $account = User::create(['name' => $name, 'email' => self::email($lang, $role), 'password' => Hash::make(Str::random(40)), 'role' => $role]);
                DB::table('users')->where('id', $account->id)->update(['is_demo' => true, 'plan' => 'pro']);
                DB::table('staff')->insert(['user_id' => $id, 'account_user_id' => $account->id, 'name' => $name, 'email' => $account->email, 'role' => $role, 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
            }

            $items = [];
            $extras = [];
            foreach ($d['menu'] as [$name, $price, $category, $description, $options]) {
                $options = MenuOptions::normalize(array_map(fn ($o) => ['name' => $o[0], 'price' => $o[1]], $options));
                $item = DB::table('menu_items')->insertGetId(['user_id' => $id, 'name' => $name, 'price' => $price, 'category' => $category, 'description' => $description, 'options' => MenuOptions::encode($options), 'is_available' => true, 'created_at' => $now, 'updated_at' => $now]);
                $items[] = $item;
                $extras[$item] = $options;
            }
            $price = array_combine($items, array_column($d['menu'], 1));
            // A live order line of $item with its first $count extras, priced like a real order.
            $priced = fn (int $item, int $count) => ['menu_item_id' => $item, 'unit_price' => $price[$item] + MenuOptions::sum(array_slice($extras[$item], 0, $count)), 'options' => MenuOptions::encode(array_slice($extras[$item], 0, $count))];

            $tables = [];
            foreach (range(1, 8) as $n) {
                $tables[$n] = DB::table('restaurant_tables')->insertGetId(['user_id' => $id, 'label' => (string) $n, 'table_code' => strtoupper("demo{$lang}").Str::upper(Str::random(6)), 'seats' => 4, 'status' => 'available', 'created_at' => $now, 'updated_at' => $now]);
            }

            // Six months of visits, oldest first: each one an order of real dishes and
            // its payment, so reports, charts, best sellers and profit all agree.
            mt_srand(crc32($lang.$today->toDateString()));
            $number = 0;
            $lines = [];
            $payments = [];
            for ($back = 181; $back >= 0; $back--) {
                $day = $today->subDays($back);
                $sid = DB::table('dining_sessions')->insertGetId(['restaurant_table_id' => $tables[8], 'customer_name' => '—', 'status' => 'closed', 'opened_at' => $day->setTime(12, 0), 'closed_at' => $day->setTime(22, 0), 'created_at' => $day, 'updated_at' => $day]);
                $visits = $back < 7 ? mt_rand(5, 9) : mt_rand(4, 7);
                $rows = [];
                foreach (range(1, $visits) as $v) {
                    $at = $back === 0 ? $now->subMinutes(30 + 25 * $v) : $day->setTime(12, 0)->addMinutes(intdiv(600 * $v, $visits + 1));
                    $rows[] = ['dining_session_id' => $sid, 'user_id' => $id, 'order_number' => ++$number, 'status' => 'served', 'submitted_at' => $at, 'created_at' => $at, 'updated_at' => $at];
                }
                DB::table('orders')->insert($rows);
                foreach (DB::table('orders')->where('dining_session_id', $sid)->orderBy('id')->get(['id', 'created_at']) as $order) {
                    $total = 0;
                    foreach ((array) array_rand(array_flip($items), mt_rand(2, 4)) as $item) {
                        $qty = mt_rand(1, 2);
                        $total += $qty * $price[$item];
                        $lines[] = ['order_id' => $order->id, 'menu_item_id' => $item, 'quantity' => $qty, 'unit_price' => $price[$item], 'status' => 'active', 'created_at' => $order->created_at, 'updated_at' => $order->created_at];
                    }
                    $payments[] = ['dining_session_id' => $sid, 'method' => mt_rand(1, 4) === 1 ? 'transfer' : 'cash', 'amount' => $total, 'status' => 'verified', 'paid_at' => $order->created_at, 'created_at' => $order->created_at, 'updated_at' => $order->created_at];
                }
            }
            foreach (array_chunk($lines, 500) as $chunk) {
                DB::table('order_items')->insert($chunk);
            }
            foreach (array_chunk($payments, 500) as $chunk) {
                DB::table('payments')->insert($chunk);
            }

            // Tables in service: orders at every stage, and a guest asking for the waiter.
            foreach ([1 => 'pending', 2 => 'preparing', 3 => 'ready', 4 => 'ready'] as $n => $status) {
                $sid = DB::table('dining_sessions')->insertGetId(['restaurant_table_id' => $tables[$n], 'customer_name' => $d['guests'][$n - 1], 'customer_phone' => '05991234'.$n.'0', 'status' => 'opened', 'access_token' => Str::random(48), 'opened_at' => $now->subMinutes(6 + 5 * $n), 'created_at' => $now, 'updated_at' => $now]);
                DB::table('restaurant_tables')->where('id', $tables[$n])->update(['status' => 'occupied']);
                $order = OrderWorkflow::createOrder($sid, $id, $status);
                DB::table('orders')->where('id', $order)->update(['submitted_at' => $now->subMinutes(3 + 5 * $n)]);
                foreach (array_slice($items, ($n - 1) * 2, 3) as $k => $item) {
                    DB::table('order_items')->insert($priced($item, $k === 0 ? 2 : 0) + ['order_id' => $order, 'quantity' => $k === 0 ? 2 : 1, 'note' => $n === 2 && $k === 0 ? $d['note'] : null, 'status' => 'active', 'created_at' => $now, 'updated_at' => $now]);
                }
                if ($n === 2) {
                    DB::table('assistance_requests')->insert(['dining_session_id' => $sid, 'status' => 'open', 'created_at' => $now, 'updated_at' => $now]);
                }
            }

            // Online ordering, with two orders waiting for the owner.
            DB::table('online_ordering_settings')->insert(['user_id' => $id, 'slug' => $d['slug'], 'enabled' => true, 'pickup_enabled' => true, 'delivery_enabled' => true, 'prep_minutes' => 20, 'created_at' => $now, 'updated_at' => $now]);
            $zone = DB::table('delivery_zones')->insertGetId(['user_id' => $id, 'name' => $d['zone'], 'fee' => 5, 'min_order' => 20, 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
            foreach ([['delivery', 4], ['pickup', 5]] as [$channel, $guest]) {
                $order = DB::table('orders')->insertGetId(['dining_session_id' => null, 'user_id' => $id, 'order_number' => OrderWorkflow::nextNumber($id), 'status' => 'on_hold', 'channel' => $channel, 'fulfillment_status' => 'awaiting_acceptance', 'delivery_fee' => $channel === 'delivery' ? 5 : 0, 'payment_method' => 'cash', 'payment_status' => 'unpaid', 'public_token' => Str::random(40), 'submitted_at' => $now->subMinutes(2 + $guest), 'created_at' => $now, 'updated_at' => $now]);
                foreach (array_slice($items, 0, 2) as $k => $item) {
                    DB::table('order_items')->insert($priced($item, $k === 0 ? 1 : 0) + ['order_id' => $order, 'quantity' => 2, 'status' => 'active', 'created_at' => $now, 'updated_at' => $now]);
                }
                DB::table('outside_order_contacts')->insert(['order_id' => $order, 'name' => $d['guests'][$guest], 'phone' => '059955500'.$guest, 'address' => $channel === 'delivery' ? $d['address'] : null, 'zone_id' => $channel === 'delivery' ? $zone : null, 'zone_name' => $channel === 'delivery' ? $d['zone'] : null, 'created_at' => $now, 'updated_at' => $now]);
            }

            // Payroll, attendance and expenses.
            $employees = [];
            foreach ($d['employees'] as [$name, $job, $type, $rate, $since]) {
                $monthly = match ($type) {
                    'weekly' => $rate * 52 / 12, 'daily' => $rate * 26, default => $rate
                };
                $employees[] = DB::table('restaurant_employees')->insertGetId(['user_id' => $id, 'name' => $name, 'job_title' => $job, 'pay_type' => $type, 'pay_rate' => $rate, 'monthly_salary' => round($monthly, 2), 'starts_on' => $today->subDays($since)->toDateString(), 'created_at' => $now, 'updated_at' => $now]);
            }
            $marks = [];
            for ($back = 0; $back < 14; $back++) {
                foreach ($employees as $k => $employee) {
                    $marks[] = ['employee_id' => $employee, 'day' => $today->subDays($back)->toDateString(), 'status' => $k === 2 && $back === 3 ? 'absent' : ($k === 3 && $back === 5 ? 'half' : 'present'), 'created_at' => $now, 'updated_at' => $now];
                }
            }
            DB::table('employee_attendance')->insert($marks);
            foreach ($d['expenses'] as [$category, $title, $amount, $recurring]) {
                DB::table('restaurant_expenses')->insert(['user_id' => $id, 'category' => $category, 'title' => $title, 'amount' => $amount, 'spent_on' => ($recurring ? $today->subDays(170) : $today->subDays(2))->toDateString(), 'recurring' => $recurring, 'created_at' => $now, 'updated_at' => $now]);
            }
            foreach (range(1, 5) as $back) {
                DB::table('restaurant_expenses')->insert(['user_id' => $id, 'category' => 'supplies', 'title' => $d['supplies'], 'amount' => mt_rand(1500, 2300), 'spent_on' => $today->startOfMonth()->subMonthsNoOverflow($back)->addDays(9)->toDateString(), 'recurring' => false, 'created_at' => $now, 'updated_at' => $now]);
            }

            return $owner->fresh();
        });
    }
}
