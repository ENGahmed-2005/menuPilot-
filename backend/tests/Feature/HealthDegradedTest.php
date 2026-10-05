<?php

// No RefreshDatabase here: this test deliberately points the default
// connection at a dead MySQL port to prove /health reports it.

it('returns 503 with no connection details when the database is down', function () {
    config(['database.connections.broken' => ['driver' => 'mysql', 'host' => '127.0.0.1', 'port' => 1, 'database' => 'x', 'username' => 'x', 'password' => 'x']]);
    config(['database.default' => 'broken']);

    $res = $this->getJson('/health')->assertStatus(503)->assertJson(['status' => 'degraded', 'database' => 'unavailable']);
    expect($res->getContent())->not->toContain('SQLSTATE')->not->toContain('127.0.0.1')->not->toContain('refused');
});
