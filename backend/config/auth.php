<?php
return [
 'defaults'=>['guard'=>'web','passwords'=>'users'],
 'guards'=>['web'=>['driver'=>'session','provider'=>'owners']],
 'providers'=>['owners'=>['driver'=>'eloquent','model'=>App\Models\Owner::class]],
 'passwords'=>['users'=>['provider'=>'owners','table'=>'password_reset_tokens','expire'=>60,'throttle'=>60]],
 'password_timeout'=>10800,
];
