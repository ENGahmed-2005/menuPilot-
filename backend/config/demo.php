<?php

// The «try it» demo restaurants (App\Support\DemoRestaurant). DEMO_ENABLED=false hides them.
return ['enabled' => (bool) env('DEMO_ENABLED', true)];
