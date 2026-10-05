<?php

namespace App\Support;

use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Dish extras («الإضافات»): paid add-ons the owner lists on a dish
 * (menu_items.options) and the guest ticks when ordering. Both columns hold
 * JSON [{id, name, price}] in the owner's order. An order line is priced here
 * from the dish's CURRENT extras, never from the client, and keeps a snapshot
 * (order_items.options) so later menu edits never change a past order. Every
 * total (bills, payments, reports, exports) already includes the extras
 * through order_items.unit_price.
 */
class MenuOptions
{
    public const MAX = 20;

    public const UNAVAILABLE = 'بعض الإضافات لم تعد متاحة. حدّث المنيو وحاول مجددًا.';

    private const ID_PATTERN = '/^[a-z0-9]{4,16}$/';

    /** Rules for the owner's list (errors at options.N.name / options.N.price). */
    public static function rules(): array
    {
        return [
            'options' => ['sometimes', 'nullable', 'array', 'max:'.self::MAX],
            'options.*' => ['array'],
            'options.*.id' => ['nullable'], // kept when valid, replaced otherwise (normalize)
            'options.*.name' => ['required', 'string', 'max:60'],
            'options.*.price' => ['required', 'numeric', 'min:0', 'max:9999.99'],
        ];
    }

    /** Rules for the extras a guest chose on each cart line (items.N.options: ids). */
    public static function orderRules(): array
    {
        return [
            'items.*.options' => ['nullable', 'array', 'max:'.self::MAX],
            'items.*.options.*' => ['string'],
        ];
    }

    /**
     * The owner's list, ready to store: names trimmed, prices rounded, valid
     * ids kept, a new id for each option without one, and an id sent twice
     * kept once (the first wins).
     *
     * @param  array<int, array{id?: mixed, name: string, price: numeric}>|null  $options
     * @return list<array{id: string, name: string, price: float}>
     */
    public static function normalize(?array $options): array
    {
        $options ??= [];
        ksort($options); // validated() rebuilds the list out of order when an option has no id
        $options = array_values($options);
        $isValid = fn ($id) => is_string($id) && preg_match(self::ID_PATTERN, $id) === 1;
        $taken = array_values(array_filter(array_column($options, 'id'), $isValid));
        $out = [];
        foreach ($options as $option) {
            $id = $option['id'] ?? null;
            if (! $isValid($id)) {
                do {
                    $id = Str::lower(Str::random(8));
                } while (in_array($id, $taken, true));
                $taken[] = $id;
            } elseif (isset($out[$id])) {
                continue;
            }
            $out[$id] = ['id' => $id, 'name' => trim((string) $option['name']), 'price' => round((float) $option['price'], 2)];
        }

        return array_values($out);
    }

    /** JSON for storage; null when there are none. */
    public static function encode(array $options): ?string
    {
        return $options ? json_encode(array_values($options), JSON_UNESCAPED_UNICODE) : null;
    }

    /**
     * A stored list (JSON text or already decoded) as an array, [] when empty.
     *
     * @return list<array{id: string, name: string, price: float}>
     */
    public static function decode(mixed $stored): array
    {
        $list = is_string($stored) ? json_decode($stored, true) : $stored;
        $options = array_filter(is_array($list) ? $list : [], fn ($o) => is_array($o) && isset($o['id'], $o['name'], $o['price']));

        return array_values(array_map(fn ($o) => ['id' => (string) $o['id'], 'name' => (string) $o['name'], 'price' => (float) $o['price']], $options));
    }

    /**
     * The extras of $menuItem the guest chose, as the snapshot an order line
     * keeps (dish order, current names and prices). An id the dish no longer
     * has refuses the order, so the guest never pays for something else.
     *
     * @param  list<string>  $ids
     * @return list<array{id: string, name: string, price: float}>
     *
     * @throws ValidationException
     */
    public static function choose(object $menuItem, array $ids, string $attribute = 'options'): array
    {
        $ids = array_unique(array_map('strval', $ids));
        $chosen = array_values(array_filter(self::decode($menuItem->options ?? null), fn ($o) => in_array($o['id'], $ids, true)));
        if (count($chosen) !== count($ids)) {
            throw ValidationException::withMessages([$attribute => self::UNAVAILABLE]);
        }

        return $chosen;
    }

    public static function sum(array $options): float
    {
        return round(array_sum(array_column($options, 'price')), 2);
    }

    /**
     * The order_items columns for a line of $menuItem with the chosen extras:
     * unit price = dish price + extras, and their snapshot.
     *
     * @return array{unit_price: float, options: string|null}
     *
     * @throws ValidationException
     */
    public static function orderLine(object $menuItem, array $ids, string $attribute): array
    {
        $chosen = self::choose($menuItem, $ids, $attribute);

        return ['unit_price' => round((float) $menuItem->price + self::sum($chosen), 2), 'options' => self::encode($chosen)];
    }

    /** «برجر (+ جبنة إضافية، بطاطا)» for text outputs; the name alone without extras. */
    public static function label(string $name, mixed $options): string
    {
        $names = array_column(self::decode($options), 'name');

        return $names ? $name.' (+ '.implode('، ', $names).')' : $name;
    }
}
