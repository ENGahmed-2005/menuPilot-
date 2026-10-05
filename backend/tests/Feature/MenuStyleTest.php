<?php

use App\Support\MenuStyle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/** Menu style: layout, header, logo shape… saved with the branding (App\Support\MenuStyle). */
function styledOwner(string $plan = 'pro'): array
{
    $owner = makeOwner('Styled');
    DB::table('users')->where('id', $owner['id'])->update(['plan' => $plan, 'subscription_status' => 'ACTIVE', 'subscription_started_at' => now(), 'subscription_ends_at' => null]);

    return $owner;
}

function saveStyle($test, array $owner, $style)
{
    // The branding page sends multipart form data, so the style arrives as JSON text.
    return $test->post('/api/me/branding', ['menu_style' => is_string($style) ? $style : json_encode($style)], authAs($owner) + ['Accept' => 'application/json']);
}

it('saves the menu style from a multipart form and merges later changes', function () {
    $owner = styledOwner();
    saveStyle($this, $owner, ['layout' => 'text', 'header' => 'minimal', 'show_images' => false, 'surface_color' => '#FAF7F2', 'tagline' => '<b>منذ 1998</b> في غزة'])
        ->assertOk()->assertJsonPath('data.menu_style.layout', 'text');
    $style = saveStyle($this, $owner, ['logo_shape' => 'circle'])->assertOk()->json('data.menu_style');

    expect($style)->toMatchArray(['layout' => 'text', 'header' => 'minimal', 'show_images' => false, 'surface_color' => '#FAF7F2', 'logo_shape' => 'circle', 'tagline' => 'منذ 1998 في غزة']);
});

it('drops unknown keys and refuses values outside the options, in Arabic', function () {
    $owner = styledOwner();
    $style = saveStyle($this, $owner, ['layout' => 'grid', 'javascript' => 'alert(1)'])->assertOk()->json('data.menu_style');
    expect($style)->toBe(['layout' => 'grid']);

    expect(saveStyle($this, $owner, ['layout' => 'carousel'])->assertStatus(422)->json('errors')['menu_style.layout'][0])->toBe('هذا الخيار غير متاح لشكل المنيو.');
    saveStyle($this, $owner, ['surface_color' => 'red'])->assertStatus(422)->assertJsonValidationErrors('menu_style.surface_color');
    saveStyle($this, $owner, ['tagline' => str_repeat('م', 81)])->assertStatus(422)->assertJsonValidationErrors('menu_style.tagline');
    saveStyle($this, $owner, 'not json')->assertStatus(422)->assertJsonValidationErrors('menu_style');
});

it('reaches the customer menu, and reset clears it', function () {
    $owner = styledOwner();
    $table = makeTable($owner['id']);
    saveStyle($this, $owner, ['layout' => 'photo', 'chips' => 'underline'])->assertOk();

    $this->getJson("/api/public/tables/{$table->table_code}/menu")->assertOk()
        ->assertJsonPath('data.restaurant.branding.menu_style.layout', 'photo')
        ->assertJsonPath('data.restaurant.branding.menu_style.chips', 'underline');

    $this->postJson('/api/me/branding/reset', [], authAs($owner))->assertOk()->assertJsonPath('data.menu_style', null);
});

it('defaults to the two-column grid under a solid header (same as the frontend)', function () {
    expect(MenuStyle::DEFAULTS)->toMatchArray(['layout' => 'grid', 'header' => 'solid']);
});

it('needs the branding feature (Pro or a trial)', function () {
    saveStyle($this, styledOwner('basic'), ['layout' => 'text'])->assertForbidden();
});
