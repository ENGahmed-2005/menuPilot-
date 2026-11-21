<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires an approved onboarding application even when a Google registration cookie is supplied', function () {
    $this->postJson('/api/account/register/google', [
        'restaurant_name' => 'Olive', 'restaurant_type' => 'cafe',
    ], ['Cookie' => 'menupilot.google_registration=old', 'X-Google-Registration' => 'old'])
        ->assertGone()->assertJsonPath('code', 'APPLICATION_REQUIRED');
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('auth_accounts', 0);
});
