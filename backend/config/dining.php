<?php

return [
    // A table session with no order is closed automatically after this many
    // minutes (the customer scanned and left). Sessions with orders or money
    // owed are never auto-closed; staff see them flagged as idle instead.
    'idle_minutes_without_order' => (int) env('SESSION_IDLE_MINUTES', 30),
    // Staff screens flag a session as idle after this many minutes without activity.
    'idle_flag_minutes' => (int) env('SESSION_IDLE_FLAG_MINUTES', 20),
];
