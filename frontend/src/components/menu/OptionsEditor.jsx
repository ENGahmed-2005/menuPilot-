/* ==========================================================================
   OptionsEditor.jsx — the owner edits a dish's extras («الإضافات»): rows of
   name + price that the guest can tick on the dish (e.g. «جبنة إضافية +3 ₪»).
   Controlled: rows/onChange come from the dish form (see menuOptions.js).
   Native constraints block an invalid submit like the rest of the form; the
   inline message under the row says what to fix, and stays linked to the
   field (aria-describedby) for screen readers. Server rejections arrive as a
   serverError flag on the row.
   ========================================================================== */
import { useEffect, useId, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "../ui/Button";
import { fieldClasses } from "../ui/Input";
import { MAX_OPTIONS, MAX_OPTION_NAME, MAX_OPTION_PRICE, newOptionRow, validOptionPrice } from "./menuOptions";
import { t } from "../../i18n";

export default function OptionsEditor({ rows, onChange }) {
  const baseId = useId();
  const listRef = useRef(null);
  const addRef = useRef(null);
  // After adding or removing a row, focus lands on a row's name field (by key) or the add button.
  const focusTarget = useRef(null);
  // Fields ("<key>.name" / "<key>.price") the owner typed in. Leaving one of
  // them, or trying to save, shows its message; leaving a blank new row stays
  // quiet so the layout doesn't jump under the pointer.
  const edited = useRef(new Set());
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    if (target === "add") addRef.current?.focus();
    else listRef.current?.querySelector(`[data-option-name="${target}"]`)?.focus();
  });

  const atLimit = rows.length >= MAX_OPTIONS;
  const touch = (field) => setTouched((s) => (s[field] ? s : { ...s, [field]: true }));
  const leave = (field) => edited.current.has(field) && touch(field);

  function update(key, field, value) {
    edited.current.add(`${key}.${field}`);
    onChange(rows.map((row) => {
      if (row.key !== key) return row;
      const next = { ...row, [field]: value };
      if (row.serverError?.[field]) next.serverError = { ...row.serverError, [field]: false };
      return next;
    }));
  }

  function add() {
    const row = newOptionRow();
    focusTarget.current = row.key;
    onChange([...rows, row]);
  }

  function remove(index) {
    focusTarget.current = rows[index + 1]?.key ?? rows[index - 1]?.key ?? "add";
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="min-w-0 max-w-xl space-y-3">
      <legend className="text-sm font-bold text-ink">
        {t("الإضافات")} <span className="font-medium text-muted">{t("(اختياري)")}</span>
      </legend>
      <p className="text-xs text-muted">
        {t("خيارات يضيفها الزبون إلى الصنف بسعر إضافي، مثل «جبنة إضافية». السعر 0 يعني مجانًا.")}
      </p>

      {rows.length > 0 && (
        <div className="space-y-2">
          <div aria-hidden="true" className="flex gap-2 text-xs font-bold text-muted">
            <span className="flex-1">{t("الاسم")}</span>
            <span className="w-28 shrink-0">{t("السعر (₪)")}</span>
            <span className="w-11 shrink-0" />
          </div>

          <ol ref={listRef} className="space-y-2">
            {rows.map((row, i) => {
              const n = i + 1;
              const nameId = `${baseId}-${row.key}-name`;
              const priceId = `${baseId}-${row.key}-price`;
              const nameError = row.serverError?.name || (touched[`${row.key}.name`] && !row.name.trim()) ? t("اكتب اسمًا للإضافة، حتى 60 حرفًا.") : null;
              const priceError = row.serverError?.price || (touched[`${row.key}.price`] && !validOptionPrice(row.price)) ? t("أدخل سعرًا من 0 إلى 9999.99.") : null;

              return (
                <li key={row.key}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <input
                        id={nameId}
                        data-option-name={row.key}
                        value={row.name}
                        onChange={(e) => update(row.key, "name", e.target.value)}
                        onBlur={() => leave(`${row.key}.name`)}
                        onInvalid={() => touch(`${row.key}.name`)}
                        required
                        pattern=".*\S.*"
                        maxLength={MAX_OPTION_NAME}
                        autoComplete="off"
                        placeholder={t("مثل: جبنة إضافية")}
                        aria-label={t("اسم الإضافة {0}", { 0: n })}
                        aria-invalid={Boolean(nameError) || undefined}
                        aria-describedby={nameError ? `${nameId}-error` : undefined}
                        className={fieldClasses(nameError)}
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <input
                        id={priceId}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max={MAX_OPTION_PRICE}
                        value={row.price}
                        onChange={(e) => update(row.key, "price", e.target.value)}
                        onBlur={() => leave(`${row.key}.price`)}
                        onInvalid={() => touch(`${row.key}.price`)}
                        required
                        placeholder="0.00"
                        aria-label={t("سعر الإضافة {0} (₪)", { 0: n })}
                        aria-invalid={Boolean(priceError) || undefined}
                        aria-describedby={priceError ? `${priceId}-error` : undefined}
                        className={`${fieldClasses(priceError)} num`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={t("حذف الإضافة {0}", { 0: row.name.trim() || n })}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-brick transition-colors hover:bg-brick/10"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                  {nameError && <p id={`${nameId}-error`} className="mt-1 text-xs font-bold text-brick">{nameError}</p>}
                  {priceError && <p id={`${priceId}-error`} className="mt-1 text-xs font-bold text-brick">{priceError}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button ref={addRef} variant="secondary" size="sm" onClick={add} disabled={atLimit}>
          <Plus size={15} aria-hidden="true" />
          {t("إضافة خيار")}
        </Button>
        <span aria-live="polite" className="text-xs">
          {atLimit ? (
            <span className="font-bold text-copper-ink">{t("وصلت للحد الأقصى: {0} إضافة لكل صنف.", { 0: MAX_OPTIONS })}</span>
          ) : (
            rows.length > 0 && <span className="num text-muted">{rows.length}/{MAX_OPTIONS}</span>
          )}
        </span>
      </div>
    </fieldset>
  );
}
