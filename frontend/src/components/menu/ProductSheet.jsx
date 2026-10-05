/* ==========================================================================
   ProductSheet.jsx — a dish's details, where the guest sets the quantity,
   picks paid extras («الإضافات») and writes a note for the kitchen.
   A bottom sheet on phones, a centred dialog on wider screens; the photo runs
   edge to edge with a round close button, and the add button stays at the
   bottom showing (dish + extras) × quantity. Used by the table menu and the
   online-ordering page. Colours come from the restaurant's branding.
   ========================================================================== */
import { useId, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Utensils, X } from "lucide-react";
import { useDialog } from "../../hooks/useDialog";
import { money } from "../../utils/format";
import { unitPrice } from "./cartLine";
import { tint } from "./menuStyle";
import { t, dir } from "../../i18n";

const MAX_QUANTITY = 99;

function Photo({ src, alt, color }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="grid aspect-[16/10] w-full place-items-center" style={{ background: tint(color) }} aria-hidden="true">
        <Utensils size={44} style={{ color }} />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className="block aspect-[4/3] w-full object-cover sm:aspect-[16/10]" />;
}

function Stepper({ value, onChange, label }) {
  const box = "grid h-10 w-10 place-items-center rounded-full transition-colors disabled:opacity-35";
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white p-1">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t("إنقاص {0}", { 0: label })} className={`${box} hover:bg-black/5`}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <span className="min-w-7 text-center text-base font-black tabular-nums" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX_QUANTITY} aria-label={t("زيادة {0}", { 0: label })} className={`${box} hover:bg-black/5`}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * @param {{ item: object|null, brand: { primary_color: string, button_color: string }, onAdd: (choice: { quantity: number, note: string, options: object[] }) => void, onClose: () => void }} props
 * Render it with key={item.id} so each dish opens with a fresh choice.
 */
export default function ProductSheet({ item, brand, onAdd, onClose }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const [quantity, setQuantity] = useState(1);
  const [chosen, setChosen] = useState(() => new Set());
  const [note, setNote] = useState("");
  useDialog(Boolean(item), panelRef, onClose);

  const options = useMemo(() => item?.options || [], [item]);
  // In the dish's order, whatever order they were ticked in.
  const picked = useMemo(() => options.filter((o) => chosen.has(o.id)), [options, chosen]);
  if (!item) return null;

  const total = unitPrice(item.price, picked) * quantity;
  const toggle = (id) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4" onMouseDown={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} dir={dir}
        onMouseDown={(event) => event.stopPropagation()}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white text-ink shadow-[var(--shadow-dialog)] outline-none animate-dialog-in sm:max-w-md sm:rounded-[1.75rem]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative">
            <Photo src={item.imageUrl} alt={item.name} color={brand.primary_color} />
            <button type="button" onClick={onClose} aria-label={t("إغلاق")}
              className="absolute end-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-md transition-transform active:scale-95">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-6 px-5 pb-5 pt-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 id={titleId} className="text-xl font-black leading-8">{item.name}</h2>
                <Stepper value={quantity} label={item.name} onChange={(n) => setQuantity(Math.min(MAX_QUANTITY, Math.max(1, n)))} />
              </div>
              {item.description && <p className="mt-2 text-sm leading-7 text-ink-soft">{item.description}</p>}
              <p className="mt-2 text-lg font-black tabular-nums" style={{ color: brand.primary_color }}>{money(item.price)}</p>
            </div>

            {options.length > 0 && (
              <fieldset>
                <legend className="text-base font-black">{t("الإضافات")} <span className="text-sm font-bold text-muted">{t("(اختياري)")}</span></legend>
                <ul className="mt-2 divide-y divide-black/[0.06]">
                  {options.map((option) => {
                    const on = chosen.has(option.id);
                    return (
                      <li key={option.id}>
                        <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1.5">
                          <input type="checkbox" checked={on} onChange={() => toggle(option.id)} className="peer sr-only" />
                          <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2"
                            style={on ? { background: brand.primary_color, borderColor: brand.primary_color, color: "#fff" } : { borderColor: "rgb(0 0 0 / 0.25)" }}>
                            {on && <Check size={15} strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1 text-[15px] font-bold">{option.name}</span>
                          <span className="shrink-0 text-sm font-black tabular-nums text-ink-soft">
                            {Number(option.price) > 0 ? <bdi dir="ltr">+{money(option.price)}</bdi> : t("مجانًا")}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}

            <label className="block">
              <span className="text-base font-black">{t("ملاحظات خاصة")} <span className="text-sm font-bold text-muted">{t("(اختياري)")}</span></span>
              <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("مثل: بدون بصل، الصوص جانبًا")}
                className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-black/30" />
            </label>
          </div>
        </div>

        <div className="border-t border-black/[0.06] bg-white px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3">
          <button type="button" onClick={() => onAdd({ quantity, note: note.trim(), options: picked })}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-black text-white shadow-lg transition-transform active:scale-[0.99]"
            style={{ background: brand.button_color }}>
            <span>{t("أضف إلى الطلب")}</span>
            <span aria-hidden="true">•</span>
            <span className="tabular-nums">{money(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
