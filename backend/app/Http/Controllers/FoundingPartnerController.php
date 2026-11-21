<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use App\Support\RestaurantOnboarding as Onboarding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FoundingPartnerController extends Controller
{
    public function index(): JsonResponse
    {
        return Onboarding::data(DB::table('founding_partners as p')
            ->join('restaurant_applications as a', 'a.id', '=', 'p.application_id')
            ->select('p.*', 'a.restaurant_name', 'a.owner_name')
            ->selectSub(DB::table('contracts as c')->select('c.status')
                ->whereColumn('c.application_id', 'p.application_id')->where('c.contract_type', 'founding_partner')
                ->latest('c.id')->limit(1), 'contract_status')
            ->latest('p.id')->paginate(20));
    }

    public function show(int $id): JsonResponse
    {
        $partner = DB::table('founding_partners')->find($id);
        abort_unless($partner, 404);

        return Onboarding::data($partner);
    }

    public function settings(): JsonResponse
    {
        return Onboarding::data(DB::table('founding_partner_settings as s')->select('s.*')
            ->selectSub(DB::table('founding_partners as p')->selectRaw('count(*)')->whereColumn('p.cohort', 's.cohort')->where('p.partnership_status', '!=', 'closed'), 'used_slots')->get());
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cohort' => 'required|string|max:100',
            'maximum_slots' => 'required|integer|min:1|max:10000',
            'enabled' => 'required|boolean',
            'default_benefits' => 'nullable|string|max:5000',
        ]);
        DB::transaction(function () use ($data, $request) {
            DB::table('founding_partner_settings')->insertOrIgnore($data);
            DB::table('founding_partner_settings')->where('cohort', $data['cohort'])->lockForUpdate()->first();
            $used = DB::table('founding_partners')->where('cohort', $data['cohort'])->where('partnership_status', '!=', 'closed')->count();
            abort_if($data['maximum_slots'] < $used, 409, 'The limit cannot be smaller than the number of reserved seats.');
            DB::table('founding_partner_settings')->where('cohort', $data['cohort'])->update($data);
            Audit::log($request, 'admin.founding_partner_settings_updated', 'founding_partner_settings', null, ['cohort' => $data['cohort']]);
        }, 3);

        return $this->settings();
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'application_id' => 'required|integer',
            'cohort' => 'required|string|max:100',
        ]);
        $id = DB::transaction(function () use ($data, $request) {
            $application = DB::table('restaurant_applications')->lockForUpdate()->find($data['application_id']);
            abort_unless($application, 404);
            abort_unless($application->status === 'approved', 409, 'An approved application is required.');
            abort_if(DB::table('founding_partners')->where('application_id', $application->id)->exists(), 409, 'The application already has a partner record.');
            $settings = DB::table('founding_partner_settings')->where('cohort', $data['cohort'])->lockForUpdate()->first();
            abort_unless($settings?->enabled, 409, 'This cohort is closed.');
            $used = DB::table('founding_partners')->where('cohort', $data['cohort'])->where('partnership_status', '!=', 'closed')->count();
            abort_if($used >= $settings->maximum_slots, 409, 'This cohort has no seats available.');
            $id = DB::table('founding_partners')->insertGetId($data + [
                'benefits' => $settings->default_benefits, 'created_by' => $request->user()->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            Onboarding::event('application_events', $application->id, 'partner_nominated', metadata: ['partner_id' => $id]);

            return $id;
        }, 3);

        return $this->show($id);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'benefits' => 'sometimes|nullable|string|max:5000',
            'obligations' => 'sometimes|nullable|string|max:5000',
            'internal_notes' => 'sometimes|nullable|string|max:5000',
            'operating_status' => 'sometimes|nullable|in:planning,onboarding,live,paused',
            'owner_consent' => 'sometimes|boolean',
            'marketing_consent' => 'sometimes|boolean',
            'logo_consent' => 'sometimes|boolean',
            'case_study_consent' => 'sometimes|boolean',
            'close' => 'sometimes|accepted',
        ]);
        DB::transaction(function () use ($id, $data) {
            $partner = DB::table('founding_partners')->lockForUpdate()->find($id);
            abort_unless($partner, 404);
            $update = array_intersect_key($data, array_flip(['benefits', 'obligations', 'internal_notes', 'operating_status']));
            foreach (['owner', 'marketing', 'logo', 'case_study'] as $permission) {
                if (array_key_exists($permission.'_consent', $data)) {
                    $column = $permission.'_consented_at';
                    $update[$column] = $data[$permission.'_consent'] ? ($partner->$column ?? now()) : null;
                }
            }
            if (! empty($data['close'])) {
                $update['partnership_status'] = 'closed';
            }
            DB::table('founding_partners')->where('id', $id)->update($update + ['updated_at' => now()]);
            Onboarding::event('application_events', $partner->application_id, 'partner_updated', metadata: ['fields' => array_keys($update)]);
        }, 3);

        return $this->show($id);
    }
}
