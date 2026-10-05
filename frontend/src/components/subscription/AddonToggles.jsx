/* ==========================================================================
   AddonToggles.jsx — platform admin: switch a restaurant's add-ons on/off
   (PATCH /admin/restaurants/{id}/plan with { plan, addons }). An add-on the
   plan can't take is shown disabled; the API refuses it too.
   ========================================================================== */
import { Check, Plus } from "lucide-react";
import { ADDON_ORDER, SUBSCRIPTION_ADDONS, SUBSCRIPTION_PLANS, addonFits, addonIncluded } from "../../config/subscriptions";
import { t } from "../../i18n";

export default function AddonToggles({ row, disabled = false, onChange }) {
  const active = row.addons || [];
  if (row.plan === "trial") return <span style={{ fontSize: 10, color: "#8a90b3" }}>{t("كلها ضمن التجربة")}</span>;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {ADDON_ORDER.map((id) => {
        const addon = SUBSCRIPTION_ADDONS[id];
        const included = addonIncluded(id, row.plan);
        const on = included || active.includes(id);
        const fits = addonFits(id, row.plan) && !included;
        const next = on ? active.filter((x) => x !== id) : ADDON_ORDER.filter((x) => x === id || active.includes(x));
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            disabled={disabled || !fits}
            title={included ? t("مشمولة في «{0}»", { 0: SUBSCRIPTION_PLANS[row.plan].name }) : fits ? (on ? t("إيقاف {0}", { 0: addon.name }) : t("تفعيل {0}", { 0: addon.name })) : t("تحتاج الخطة {0}", { 0: addon.plans.map((p) => SUBSCRIPTION_PLANS[p].name).join(" أو ") })}
            onClick={() => onChange(next)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, padding: "4px 9px", fontSize: 10, fontWeight: 700,
              border: on ? "1px solid #EEA122" : "1px dashed #c9cde3", background: on ? "#fff4df" : "transparent",
              color: on ? "#8a5a00" : "#6571a4", opacity: fits || included ? 1 : 0.45, cursor: disabled || !fits ? "not-allowed" : "pointer",
            }}
          >
            {on ? <Check size={11} aria-hidden="true" /> : <Plus size={11} aria-hidden="true" />}
            {addon.name}
          </button>
        );
      })}
    </div>
  );
}
