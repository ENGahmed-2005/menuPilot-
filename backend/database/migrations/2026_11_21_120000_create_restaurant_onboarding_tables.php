<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->boolean('owner_invitation')->default(false);
        });
        Schema::create('restaurant_applications', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number')->unique();
            foreach (['restaurant_name', 'business_type', 'city', 'owner_name', 'owner_position', 'email', 'phone'] as $column) {
                $table->string($column);
            }
            $table->string('active_email')->nullable()->unique();
            $table->string('active_phone')->nullable()->unique();
            $table->string('address')->nullable();
            $table->string('website_url', 2048)->nullable();
            $table->json('requested_services');
            $table->unsignedSmallInteger('estimated_tables')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('consented_at');
            $table->string('status')->default('pending');
            $table->foreignId('restaurant_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->timestamp('converted_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
        Schema::create('contract_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('contract_type');
            $table->unsignedInteger('version');
            $table->text('content');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['contract_type', 'version']);
        });
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->string('contract_number')->unique();
            $table->foreignId('application_id')->constrained('restaurant_applications');
            $table->foreignId('restaurant_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('template_id')->constrained('contract_templates');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('contract_type');
            $table->string('status')->index();
            $table->string('signing_method')->default('paper');
            $table->json('terms');
            $table->date('start_date');
            $table->date('end_date');
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamps();
        });
        foreach (['application_events' => 'restaurant_applications', 'contract_events' => 'contracts'] as $name => $parent) {
            Schema::create($name, function (Blueprint $table) use ($parent) {
                $table->id();
                $table->foreignId('subject_id')->constrained($parent);
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('event_type');
                $table->string('old_status')->nullable();
                $table->string('new_status')->nullable();
                $table->text('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('created_at');
            });
        }
        Schema::create('contract_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_type');
            $table->unsignedInteger('document_version');
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
            $table->string('checksum', 64);
            $table->timestamp('uploaded_at');
            $table->unique(['contract_id', 'document_type', 'document_version'], 'contract_document_versions');
        });
        Schema::create('contract_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained();
            $table->foreignId('document_id')->constrained('contract_documents');
            $table->string('party_type');
            $table->string('signer_name');
            $table->string('signer_title');
            $table->string('signer_email')->nullable();
            $table->date('signed_at');
            $table->string('provider_name')->nullable();
            $table->string('provider_reference')->nullable();
            $table->json('verification_metadata')->nullable();
            $table->unique(['document_id', 'party_type']);
        });
        Schema::create('founding_partner_settings', function (Blueprint $table) {
            $table->string('cohort')->primary();
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('maximum_slots');
            $table->text('default_benefits')->nullable();
        });
        DB::table('founding_partner_settings')->insert(['cohort' => 'Founding cohort', 'maximum_slots' => 5]);
        Schema::create('founding_partners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->unique()->constrained('restaurant_applications');
            $table->foreignId('contract_id')->nullable()->unique()->constrained();
            $table->foreignId('restaurant_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cohort');
            $table->foreign('cohort')->references('cohort')->on('founding_partner_settings');
            $table->string('partnership_status')->default('negotiating');
            $table->string('operating_status')->nullable();
            $table->text('benefits')->nullable();
            $table->text('obligations')->nullable();
            $table->text('internal_notes')->nullable();
            $table->timestamp('owner_consented_at')->nullable();
            $table->timestamp('marketing_consented_at')->nullable();
            $table->timestamp('logo_consented_at')->nullable();
            $table->timestamp('case_study_consented_at')->nullable();
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
            $table->index(['cohort', 'partnership_status']);
        });
    }

    public function down(): void
    {
        Schema::table('password_reset_tokens', fn (Blueprint $table) => $table->dropColumn('owner_invitation'));
        foreach (['founding_partners', 'founding_partner_settings', 'contract_signatures', 'contract_documents', 'contract_events', 'application_events', 'contracts', 'contract_templates', 'restaurant_applications'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
