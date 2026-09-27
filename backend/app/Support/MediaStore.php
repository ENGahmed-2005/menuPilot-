<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Stores uploaded images in the database and serves them from
 * GET /api/media/{uuid}. Render's container disk is ephemeral, so files in
 * storage/app/public disappear on every deploy; the database persists.
 */
class MediaStore
{
    public const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    public static function put(string $binary, string $mime, ?int $userId = null): string
    {
        $uuid = (string) Str::uuid();
        DB::table('media')->insert([
            'uuid' => $uuid,
            'user_id' => $userId,
            'mime' => $mime,
            'size' => strlen($binary),
            'data' => base64_encode($binary),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return url('/api/media/'.$uuid);
    }

    /** Delete a previously stored image when it is replaced (ignores other URLs). */
    public static function forget(?string $url): void
    {
        if ($url && preg_match('#/api/media/([0-9a-f-]{36})#i', $url, $m)) {
            DB::table('media')->where('uuid', $m[1])->delete();
        }
    }
}
