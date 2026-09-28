<?php

namespace App\Support\Accounting;

/**
 * Resolves the columns of an export for a restaurant:
 *   field catalogue (type) → export default order → profile headers →
 *   restaurant column_mapping overrides (rename, or false to drop).
 * Adding another accounting program = one more entry in config/accounting.php
 * 'profiles' (plus, optionally, a restaurant mapping); the exporter is unchanged.
 */
class ExportProfile
{
    public const GENERIC = 'generic';

    public const ALASEEL = 'alaseel';

    public static function all(): array
    {
        return collect(config('accounting.profiles'))->map(fn ($p, $key) => ['key' => $key, 'label' => $p['label'], 'verified' => (bool) $p['verified']])->values()->all();
    }

    public static function exists(string $profile): bool
    {
        return array_key_exists($profile, config('accounting.profiles'));
    }

    /** @return array<int, array{key: string, header: string, type: string, sum: bool}> */
    public static function columns(string $export, string $profile = self::GENERIC, array $mapping = []): array
    {
        $fields = config('accounting.fields');
        $headers = config("accounting.profiles.$profile.headers", []);
        $overrides = $mapping[$export] ?? [];
        $sum = config('accounting.sum_fields');

        $columns = [];
        foreach (config("accounting.exports.$export", []) as $key) {
            if (array_key_exists($key, $overrides) && $overrides[$key] === false) {
                continue; // dropped by the restaurant
            }
            [$type, $label] = $fields[$key];
            $columns[] = [
                'key' => $key,
                'header' => (string) ($overrides[$key] ?? $headers[$key] ?? $label),
                'type' => $type,
                'sum' => in_array($key, $sum, true),
            ];
        }

        return $columns;
    }
}
