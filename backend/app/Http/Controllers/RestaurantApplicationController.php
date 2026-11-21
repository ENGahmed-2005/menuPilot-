<?php

namespace App\Http\Controllers;

use App\Support\RestaurantOnboarding as Onboarding;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RestaurantApplicationController extends Controller
{
    private const TRANSITIONS = [
        'pending' => ['under_review', 'more_info_required', 'approved', 'rejected'],
        'under_review' => ['more_info_required', 'approved', 'rejected'],
        'more_info_required' => ['under_review', 'approved', 'rejected'],
        'approved' => ['under_review'],
        'rejected' => ['under_review'],
        'converted' => [],
    ];

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'restaurant_name' => 'required|string|max:255',
            'business_type' => 'required|in:restaurant,cafe,fast-food,delivery_only,other',
            'city' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'website_url' => 'nullable|url:http,https|max:2048',
            'owner_name' => 'required|string|max:255',
            'owner_position' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => ['required', 'string', 'max:40', 'regex:/^\+?[0-9 ()-]+$/'],
            'requested_services' => 'required|array|min:1|max:9',
            'requested_services.*' => 'required|distinct|in:qr,management,online,delivery,pickup,tables,kitchen,cashier,reports',
            'estimated_tables' => 'nullable|integer|min:0|max:10000',
            'notes' => 'nullable|string|max:5000',
            'consent' => 'accepted',
        ]);
        unset($validated['consent']);
        $email = Str::lower($validated['email']);
        $phone = preg_replace('/[^0-9]/', '', $validated['phone']);
        abort_unless(strlen($phone) >= 7 && strlen($phone) <= 15, 422, 'Enter a valid phone number.');
        $reference = 'MPA-'.Str::upper(Str::random(16));
        try {
            DB::transaction(function () use ($validated, $email, $phone, $reference) {
                $id = DB::table('restaurant_applications')->insertGetId(array_replace($validated, [
                    'email' => $email, 'active_email' => $email, 'active_phone' => $phone,
                    'reference_number' => $reference, 'consented_at' => now(),
                    'requested_services' => json_encode($validated['requested_services'], JSON_THROW_ON_ERROR),
                    'created_at' => now(), 'updated_at' => now(),
                ]));
                Onboarding::event('application_events', $id, 'submitted', new: 'pending');
                Onboarding::notify($email, 'MenuPilot application received', "Your application was received. Reference: {$reference}", 'application_events', $id);
            });
        } catch (UniqueConstraintViolationException) {
            return response()->json(['message' => 'Unable to submit. Contact MenuPilot if you have already applied.'], 409);
        }

        return Onboarding::data(['reference_number' => $reference], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(array_keys(self::TRANSITIONS))],
            'q' => 'nullable|string|max:100',
            'from' => 'nullable|date_format:Y-m-d',
            'to' => [
                'nullable', 'date_format:Y-m-d', Rule::when($request->filled('from'), 'after_or_equal:from'),
            ],
        ]);
        $query = DB::table('restaurant_applications')
            ->select('id', 'reference_number', 'status', 'restaurant_name', 'owner_name', 'phone', 'city', 'created_at', 'updated_at');
        if (isset($filters['q'])) {
            $pattern = '%'.$filters['q'].'%';
            $query->where(fn ($q) => $q->whereLike('restaurant_name', $pattern)->orWhereLike('owner_name', $pattern));
        }
        foreach (['from' => '>=', 'to' => '<='] as $key => $operator) {
            if (isset($filters[$key])) {
                $query->whereDate('created_at', $operator, $filters[$key]);
            }
        }
        $counts = (clone $query)->select('status', DB::raw('count(*) as total'))->groupBy('status')->pluck('total', 'status');
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return Onboarding::data(['rows' => $query->latest('id')->paginate(20), 'counts' => $counts]);
    }

    public function show(int $id): JsonResponse
    {
        $application = DB::table('restaurant_applications')->find($id);
        abort_unless($application, 404);
        unset($application->active_email, $application->active_phone);
        $application->requested_services = json_decode($application->requested_services, true);
        $application->events = DB::table('application_events')->where('subject_id', $id)->latest('id')->get();
        $application->partner_id = DB::table('founding_partners')->where('application_id', $id)->value('id');
        $application->contracts = DB::table('contracts')->where('application_id', $id)->get(['id', 'contract_number', 'status']);

        return Onboarding::data($application);
    }

    public function status(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:under_review,more_info_required,approved,rejected',
            'reason' => 'required_if:status,rejected,more_info_required|nullable|string|max:2500',
        ]);
        try {
            DB::transaction(function () use ($validated, $id) {
                $application = DB::table('restaurant_applications')->lockForUpdate()->find($id);
                abort_unless($application, 404);
                $status = $validated['status'];
                abort_unless(in_array($status, self::TRANSITIONS[$application->status], true), 409, 'Invalid application transition.');
                if ($application->status === 'approved') {
                    abort_if(DB::table('contracts')->where('application_id', $id)->whereNotIn('status', ['cancelled', 'expired', 'terminated'])->exists(), 409, 'Close the current contract before reopening.');
                }
                DB::table('restaurant_applications')->where('id', $id)->update([
                    'status' => $status, 'updated_at' => now(),
                    'active_email' => $status === 'rejected' ? null : $application->email,
                    'active_phone' => $status === 'rejected' ? null : preg_replace('/[^0-9]/', '', $application->phone),
                ]);
                Onboarding::event('application_events', $id, 'status_changed', $application->status, $status, $validated['reason'] ?? null);
                $message = match ($status) {
                    'approved' => 'Your MenuPilot application was approved. Our team will contact you about the agreement.',
                    'rejected' => 'Your MenuPilot application was declined.',
                    'more_info_required' => "The MenuPilot team needs more information:\n".$validated['reason'],
                    default => null,
                };
                if ($message) {
                    Onboarding::notify($application->email, 'MenuPilot application update', $message, 'application_events', $id);
                }
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'A current application already uses this contact.');
        }

        return $this->show($id);
    }

    public function note(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate(['note' => 'required|string|max:2500']);
        DB::transaction(function () use ($id, $validated) {
            abort_unless(DB::table('restaurant_applications')->find($id), 404);
            Onboarding::event('application_events', $id, 'admin_note', description: $validated['note']);
        });

        return $this->show($id);
    }
}
