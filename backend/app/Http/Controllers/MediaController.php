<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

/** GET /api/media/{uuid} — public, immutable, long-cached image bytes. */
class MediaController extends Controller
{
    public function show(string $uuid)
    {
        $media = DB::table('media')->where('uuid', $uuid)->first();
        if (! $media) {
            abort(404);
        }

        return response(base64_decode($media->data), 200, [
            'Content-Type' => $media->mime,
            'Content-Length' => (string) $media->size,
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
