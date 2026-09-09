<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('menupilot:health', function () {
    $this->info('menuPilot backend is healthy.');
})->purpose('Check menuPilot backend health');
