<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\CredentialAccount;
use App\Support\RestaurantOnboarding as Onboarding;
use App\Support\SubscriptionAccess;
use App\Support\SubscriptionPlans;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RestaurantContractController extends Controller
{
    private const TYPES = ['subscription', 'founding_partner', 'trial', 'custom', 'addendum'];

    public function index(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => 'nullable|in:draft,awaiting_signature,signed_pending_verification,signed,active,expired,cancelled,terminated'])['status'] ?? null;
        $query = DB::table('contracts')->join('restaurant_applications as a', 'a.id', '=', 'contracts.application_id')
            ->select('contracts.*', 'a.restaurant_name');
        if ($status) {
            $query->where('contracts.status', $status);
        }

        return Onboarding::data($query->latest('contracts.id')->paginate(20));
    }

    public function templates(): JsonResponse
    {
        return Onboarding::data(DB::table('contract_templates')->latest('id')->get());
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'contract_type' => ['required', Rule::in(self::TYPES)],
            'content' => 'required|string|max:30000',
            'version' => ['required', 'integer', 'min:1', Rule::unique('contract_templates')->where('contract_type', $request->input('contract_type'))],
        ]);
        $id = DB::table('contract_templates')->insertGetId($data + [
            'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return Onboarding::data(['id' => $id], 201);
    }

    public function store(Request $request): JsonResponse
    {
        $id = DB::transaction(function () use ($request) {
            $input = $request->validate(['application_id' => 'required|integer']);
            $application = DB::table('restaurant_applications')->lockForUpdate()->find($input['application_id']);
            abort_unless($application, 404);
            abort_unless($application->status === 'approved', 409, 'Application approval is required.');
            abort_if(DB::table('contracts')->where('application_id', $application->id)->whereNotIn('status', ['cancelled', 'expired', 'terminated'])->exists(), 409, 'This application already has an open contract.');
            $data = $this->terms($request, $application);
            $id = DB::table('contracts')->insertGetId($data + [
                'contract_number' => 'MPC-'.Str::upper(Str::random(16)),
                'application_id' => $application->id,
                'status' => 'draft',
                'created_by' => $request->user()->id,
                'created_at' => now(),
            ]);
            Onboarding::event('contract_events', $id, 'created', new: 'draft');

            return $id;
        }, 3);

        return $this->show($id, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        DB::transaction(function () use ($request, $id) {
            $contract = $this->locked($id, ['draft']);
            $application = DB::table('restaurant_applications')->find($contract->application_id);
            DB::table('contracts')->where('id', $id)->update($this->terms($request, $application));
            Onboarding::event('contract_events', $id, 'updated');
        }, 3);

        return $this->show($id);
    }

    private function terms(Request $request, object $application): array
    {
        $data = $request->validate([
            'contract_type' => ['required', Rule::in(self::TYPES)],
            'template_id' => ['required', Rule::exists('contract_templates', 'id')->where('contract_type', $request->input('contract_type'))],
            'plan' => ['required', Rule::in(['trial', ...SubscriptionPlans::plans()])],
            'signing_method' => 'required|in:paper',
            'company_name' => 'required|string|max:255',
            'company_representative' => 'required|string|max:255',
            'company_title' => 'required|string|max:255',
            'restaurant_representative' => 'required|string|max:255',
            'restaurant_title' => 'required|string|max:255',
            'services' => 'required|string|max:5000',
            'special_terms' => 'nullable|string|max:10000',
            'discounts' => 'nullable|string|max:2000',
            'amount' => 'required|decimal:0,2|min:0|max:99999999',
            'currency' => 'required|regex:/^[A-Z]{3}$/',
            'billing_cycle' => 'required|in:monthly,annual,one_time',
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d|after:start_date',
            'trial_days' => 'nullable|integer|min:1|max:365',
        ]);
        $fixed = array_intersect_key($data, array_flip(['template_id', 'contract_type', 'signing_method', 'start_date', 'end_date']));
        $template = DB::table('contract_templates')->find($fixed['template_id']);
        $snapshot = array_diff_key($data, $fixed) + [
            'restaurant_name' => $application->restaurant_name,
            'contact_email' => $application->email,
            'contact_phone' => $application->phone,
            'template_name' => $template->name,
            'template_version' => $template->version,
            'template_content' => $template->content,
        ];

        return $fixed + ['terms' => json_encode($snapshot, JSON_THROW_ON_ERROR), 'updated_at' => now()];
    }

    public function show(int $id, int $status = 200): JsonResponse
    {
        $contract = DB::table('contracts')->find($id);
        abort_unless($contract, 404);
        $contract->terms = json_decode($contract->terms, true);
        $contract->documents = DB::table('contract_documents')->where('contract_id', $id)->latest('id')
            ->get(['id', 'document_type', 'document_version', 'original_filename', 'mime_type', 'file_size', 'checksum', 'uploaded_by', 'uploaded_at']);
        $contract->signatures = DB::table('contract_signatures')->where('contract_id', $id)->get();
        $contract->events = DB::table('contract_events')->where('subject_id', $id)->latest('id')->get();

        return Onboarding::data($contract, $status);
    }

    public function generate(Request $request, int $id): JsonResponse
    {
        $this->writeDocument($request, $id, 'final', ['draft'], 'awaiting_signature',
            fn ($contract) => view('restaurant-contract', ['contract' => $contract, 'terms' => json_decode($contract->terms, true)])->render(),
            'contract.html', 'text/html');

        return $this->show($id);
    }

    public function upload(Request $request, int $id): JsonResponse
    {
        $request->validate(['document' => 'required|file|mimetypes:application/pdf|max:10240']);
        $file = $request->file('document');
        $contents = $file->getContent();
        $hasTrailer = preg_match('/startxref\s+(\d{1,10})\s+%%EOF\s*$/D', substr($contents, -2048), $trailer);
        $index = $hasTrailer ? (int) $trailer[1] : -1;
        $indexHeader = $index >= 0 && $index < strlen($contents) ? substr($contents, $index, 96) : '';
        $hasIndex = str_starts_with($indexHeader, 'xref') || preg_match('/^\d+\s+\d+\s+obj\b/', $indexHeader);
        abort_unless(preg_match('/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/', $contents) && $hasIndex, 422, 'Invalid PDF content.');
        $this->writeDocument($request, $id, 'signed_paper', ['awaiting_signature', 'signed_pending_verification'],
            'signed_pending_verification', fn () => $contents, Str::limit(basename($file->getClientOriginalName()), 200, ''), 'application/pdf');

        return $this->show($id);
    }

    private function writeDocument(Request $request, int $id, string $type, array $states, string $next, callable $contents, string $filename, string $mime): void
    {
        $disk = Storage::disk('contracts');
        $path = $id.'/'.Str::uuid();
        try {
            DB::transaction(function () use ($request, $id, $type, $states, $next, $contents, $filename, $mime, $disk, $path) {
                $contract = $this->locked($id, $states);
                $body = $contents($contract);
                abort_unless($disk->put($path, $body), 503, 'Contract storage unavailable.');
                $version = 1 + (int) DB::table('contract_documents')->where('contract_id', $id)->where('document_type', $type)->max('document_version');
                $documentId = DB::table('contract_documents')->insertGetId([
                    'contract_id' => $id, 'uploaded_by' => $request->user()->id,
                    'document_type' => $type, 'document_version' => $version, 'file_path' => $path,
                    'original_filename' => $filename, 'mime_type' => $mime, 'file_size' => strlen($body),
                    'checksum' => hash('sha256', $body), 'uploaded_at' => now(),
                ]);
                $this->transition($contract, $next, 'document_'.$type, metadata: ['document_id' => $documentId]);
            });
        } catch (\Throwable $error) {
            $disk->delete($path);
            throw $error;
        }
    }

    public function download(int $id, int $document): StreamedResponse
    {
        $row = DB::table('contract_documents')->where('contract_id', $id)->find($document);
        abort_unless($row && Storage::disk('contracts')->exists($row->file_path), 404);

        return Storage::disk('contracts')->download($row->file_path, $row->mime_type === 'application/pdf' ? 'contract.pdf' : 'contract.html', [
            'Content-Type' => $row->mime_type, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function signature(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'party_type' => 'required|in:menupilot,restaurant',
            'signer_name' => 'required|string|max:255',
            'signer_title' => 'required|string|max:255',
            'signer_email' => 'nullable|email|max:255',
            'signed_at' => 'required|date_format:Y-m-d|before_or_equal:today',
        ]);
        DB::transaction(function () use ($id, $data) {
            $this->locked($id, ['signed_pending_verification']);
            $document = $this->signedDocument($id);
            DB::table('contract_signatures')->updateOrInsert(
                ['document_id' => $document->id, 'party_type' => $data['party_type']],
                $data + ['contract_id' => $id],
            );
            Onboarding::event('contract_events', $id, 'signature_recorded', metadata: ['document_id' => $document->id, 'party' => $data['party_type']]);
        }, 3);

        return $this->show($id);
    }

    public function verify(Request $request, int $id): JsonResponse
    {
        $request->validate(['confirmed' => 'accepted']);
        DB::transaction(function () use ($id) {
            $contract = $this->locked($id, ['signed_pending_verification']);
            $document = $this->signedDocument($id);
            abort_unless(DB::table('contract_signatures')->where('document_id', $document->id)->count() === 2, 409, 'Record signatures from both parties first.');
            $this->transition($contract, 'signed', 'signatures_verified', ['signed_at' => now()], ['document_id' => $document->id]);
            $email = DB::table('restaurant_applications')->where('id', $contract->application_id)->value('email');
            Onboarding::notify($email, 'MenuPilot agreement verified', 'Our team has verified the signed paper agreement.', 'contract_events', $id);
        }, 3);

        return $this->show($id);
    }

    public function activate(Request $request, int $id): JsonResponse
    {
        $request->validate(['confirmed' => 'accepted']);
        DB::transaction(function () use ($id) {
            $applicationId = DB::table('contracts')->where('id', $id)->value('application_id');
            abort_unless($applicationId, 404);
            $application = DB::table('restaurant_applications')->lockForUpdate()->find($applicationId);
            $contract = $this->locked($id, ['signed', 'active']);
            if ($contract->status === 'active') {
                return;
            }
            abort_unless($application->status === 'approved' && ! $application->restaurant_id, 409, 'This application cannot be activated.');
            abort_if($contract->start_date > today()->toDateString() || $contract->end_date < today()->toDateString(), 409, 'The activation date must fall within the contract period.');
            $this->signedDocument($id);
            abort_if(User::whereRaw('LOWER(email) = ?', [$application->email])->exists(), 409, 'An account already uses this email.');
            $terms = json_decode($contract->terms, true);
            $partner = null;
            if ($contract->contract_type === 'founding_partner') {
                $partner = DB::table('founding_partners')->where('application_id', $applicationId)->lockForUpdate()->first();
                abort_unless($partner?->owner_consented_at && $partner->partnership_status === 'negotiating', 409, 'Recorded founding partner consent and a reserved seat are required.');
            }
            $owner = User::forceCreate([
                'name' => $application->owner_name, 'restaurant_name' => $application->restaurant_name,
                'email' => $application->email, 'restaurant_phone' => $application->phone,
                'restaurant_type' => $application->business_type, 'role' => 'owner', 'is_active' => true,
                'email_verified' => false, 'password' => Hash::make(Str::random(48)),
                'plan' => $terms['plan'],
            ]);
            CredentialAccount::sync($owner->id, $owner->password);
            $end = Carbon::parse($contract->end_date)->endOfDay();
            $hasTrial = $terms['plan'] === 'trial' || isset($terms['trial_days']);
            if ($hasTrial) {
                SubscriptionAccess::startTrial($owner, $terms['trial_days'] ?? null, $end);
            }
            if ($terms['plan'] !== 'trial') {
                $owner->forceFill([
                    'plan' => $terms['plan'],
                    'subscription_started_at' => $hasTrial ? $owner->trial_ends_at : now(),
                    'subscription_ends_at' => $end,
                    'subscription_status' => $hasTrial ? SubscriptionAccess::TRIAL : SubscriptionAccess::ACTIVE,
                ])->save();
            }
            if ($partner) {
                DB::table('founding_partners')->where('id', $partner->id)->update([
                    'contract_id' => $id, 'restaurant_id' => $owner->id,
                    'partnership_status' => 'active', 'joined_at' => now(), 'updated_at' => now(),
                ]);
            }
            DB::table('restaurant_applications')->where('id', $applicationId)->update([
                'status' => 'converted', 'restaurant_id' => $owner->id, 'converted_at' => now(), 'updated_at' => now(),
            ]);
            Onboarding::event('application_events', $applicationId, 'converted', 'approved', 'converted');
            $this->transition($contract, 'active', 'activated', ['restaurant_id' => $owner->id, 'activated_at' => now()]);
            Onboarding::inviteOwner($owner, $id);
        }, 3);

        return $this->show($id);
    }

    public function resendInvitation(int $id): JsonResponse
    {
        DB::transaction(function () use ($id) {
            $contract = $this->locked($id, ['active']);
            $owner = User::findOrFail($contract->restaurant_id);
            abort_if($owner->email_verified, 409, 'The owner has already verified their email.');
            Onboarding::inviteOwner($owner, $id);
            Onboarding::event('contract_events', $id, 'invitation_requested');
        }, 3);

        return $this->show($id);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:2000', 'status' => 'required|in:cancelled,terminated,expired']);
        DB::transaction(function () use ($id, $data) {
            $states = $data['status'] === 'cancelled' ? ['draft', 'awaiting_signature', 'signed_pending_verification', 'signed'] : ['active'];
            $contract = $this->locked($id, $states);
            abort_if($data['status'] === 'expired' && $contract->end_date >= today()->toDateString(), 409, 'The contract has not reached its end date.');
            $this->transition($contract, $data['status'], $data['status'], metadata: ['reason' => $data['reason']]);
            DB::table('founding_partners')->where('contract_id', $id)->update(['partnership_status' => 'closed', 'updated_at' => now()]);
        }, 3);

        return $this->show($id);
    }

    private function locked(int $id, array $states): object
    {
        $contract = DB::table('contracts')->lockForUpdate()->find($id);
        abort_unless($contract, 404);
        abort_unless(in_array($contract->status, $states, true), 409, 'The contract is not in the required state.');

        return $contract;
    }

    private function signedDocument(int $id): object
    {
        $document = DB::table('contract_documents')->where('contract_id', $id)->where('document_type', 'signed_paper')->latest('id')->first();
        abort_unless($document && Storage::disk('contracts')->exists($document->file_path), 409, 'Upload the signed paper contract first.');

        return $document;
    }

    private function transition(object $contract, string $state, string $event, array $update = [], array $metadata = []): void
    {
        DB::table('contracts')->where('id', $contract->id)->update($update + ['status' => $state, 'updated_at' => now()]);
        Onboarding::event('contract_events', $contract->id, $event, $contract->status, $state, metadata: $metadata);
    }
}
