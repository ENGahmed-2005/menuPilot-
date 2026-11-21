<?php

use App\Support\RestaurantOnboarding;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('onboarding:contract-expiry', function () {
    DB::table('contracts')->where('status', 'active')->where('end_date', '<=', today()->addDays(7)->toDateString())
        ->select('id')->chunkById(100, function ($contracts) {
            foreach ($contracts as $candidate) {
                DB::transaction(function () use ($candidate) {
                    $contract = DB::table('contracts')->lockForUpdate()->find($candidate->id);
                    if (! $contract || $contract->status !== 'active') {
                        return;
                    }
                    if ($contract->end_date < today()->toDateString()) {
                        DB::table('contracts')->where('id', $contract->id)->update(['status' => 'expired', 'updated_at' => now()]);
                        DB::table('founding_partners')->where('contract_id', $contract->id)->update(['partnership_status' => 'closed', 'updated_at' => now()]);
                        RestaurantOnboarding::event('contract_events', $contract->id, 'expired', 'active', 'expired');

                        return;
                    }
                    $previousReminder = DB::table('contract_events')->where('subject_id', $contract->id)->where('event_type', 'expiry_reminder')->exists();
                    if (! $previousReminder) {
                        $email = DB::table('restaurant_applications')->where('id', $contract->application_id)->value('email');
                        RestaurantOnboarding::event('contract_events', $contract->id, 'expiry_reminder');
                        RestaurantOnboarding::notify($email, 'MenuPilot contract expiry', "Your MenuPilot contract ends on {$contract->end_date}. Contact the team to discuss renewal.", 'contract_events', $contract->id);
                    }
                }, 3);
            }
        });
})->purpose('Expire ended contracts and notify restaurants about upcoming expirations');

Schedule::command('onboarding:contract-expiry')->daily();
