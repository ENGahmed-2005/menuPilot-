/* ==========================================================================
   ThemeCustomization.jsx — تخصيص هوية لوحة تحكم المطعم حسب باقة الاشتراك
   --------------------------------------------------------------------------
   الفرق عن النسخة السابقة: اختيار ثيم (جاهز أو مخصّص) هنا بقى فعليًا بيُحفظ
   عبر PATCH /me/theme (mockServer.js)، وبيتطبّق فورًا على DashboardShell
   بالكامل (Sidebar، الأزرار، البادجات...) عن طريق resolveThemeVars — مش
   مجرد state محلي بيتنسى لو غيّرت الصفحة.
   ========================================================================== */
import { useState } from "react";
import { Check, Loader2, Lock, Palette, RotateCcw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan, hasPlanFeature } from "../../config/subscriptions";
import { THEME_PRESETS } from "../../config/themes";
import { saveTheme } from "../../api/theme";

export default function ThemeCustomization() {
  const { user, updateUser } = useAuth();
  const planId = user?.plan || "basic";
  const plan = getSubscriptionPlan(planId);
  const canPresets = hasPlanFeature(planId, "theme-presets");
  const canCustom = hasPlanFeature(planId, "custom-theme");

  const savedTheme = user?.theme || null;
  const [selectedPreset, setSelectedPreset] = useState(savedTheme?.preset && savedTheme.preset !== "custom" ? savedTheme.preset : "menuPilot");
  const [custom, setCustom] = useState(
    savedTheme?.preset === "custom" && savedTheme.colors
      ? savedTheme.colors
      : { primary: "#B8793E", secondary: "#5B7A52", background: "#F7F3E9" }
  );
  const [saving, setSaving] = useState(null); // "preset" | "custom" | null أثناء الحفظ
  const [savedFlash, setSavedFlash] = useState(false);

  const activePreset = savedTheme?.preset && savedTheme.preset !== "custom" ? savedTheme.preset : "menuPilot";
  const isCustomActive = savedTheme?.preset === "custom";

  async function applyPreset(id) {
    setSelectedPreset(id);
    setSaving("preset");
    try {
      const updated = await saveTheme({ preset: id });
      updateUser(updated);
      flashSaved();
    } finally {
      setSaving(null);
    }
  }

  async function applyCustom() {
    setSaving("custom");
    try {
      const updated = await saveTheme({ preset: "custom", colors: custom });
      updateUser(updated);
      flashSaved();
    } finally {
      setSaving(null);
    }
  }

  async function resetToDefault() {
    setSaving("preset");
    try {
      const updated = await saveTheme(null);
      updateUser(updated);
      setSelectedPreset("menuPilot");
      flashSaved();
    } finally {
      setSaving(null);
    }
  }

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  }

  return (
    <div dir="rtl" className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-copper">
            <Palette size={18} />
            <span className="text-sm font-black">هوية المطعم</span>
          </div>
          <h1 className="mt-2 text-3xl font-black">تخصيص الثيم</h1>
          <p className="mt-2 text-sm leading-7 text-ink-soft/60">
            تحكم في ألوان لوحة تحكم مطعمك حسب إمكانيات باقتك — يتطبّق فورًا على الشريط الجانبي وكل الأزرار.
          </p>
        </div>
        {savedTheme && (
          <button
            type="button"
            onClick={resetToDefault}
            disabled={saving !== null}
            className="flex items-center gap-2 rounded-full border border-ink/12 px-4 py-2.5 text-xs font-bold text-ink-soft transition hover:bg-ink/5 disabled:opacity-50"
          >
            <RotateCcw size={14} /> الرجوع للهوية الافتراضية
          </button>
        )}
      </header>

      {savedFlash && (
        <div className="flex items-center gap-2 rounded-2xl border border-herb/25 bg-herb/10 px-4 py-3 text-sm font-bold text-herb">
          <Check size={16} /> تم حفظ الثيم وتطبيقه على لوحتك.
        </div>
      )}

      {!canPresets && (
        <div className="rounded-3xl border border-ink/8 bg-paper p-6">
          <div className="flex items-center gap-3">
            <Lock className="text-copper" />
            <div>
              <h2 className="font-black">تخصيص الثيم متاح من باقة الاحترافية</h2>
              <p className="mt-1 text-sm text-ink-soft/60">باقتك الحالية: {plan.name}. رقّي حسابك من صفحة الاشتراك للحصول على الثيمات الجاهزة.</p>
            </div>
          </div>
        </div>
      )}

      {canPresets && (
        <section>
          <h2 className="mb-4 text-xl font-black">الثيمات الجاهزة</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {THEME_PRESETS.map((item) => {
              const isActive = !isCustomActive && activePreset === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => applyPreset(item.id)}
                  disabled={saving !== null}
                  className={`rounded-3xl border bg-paper p-4 text-right transition hover:-translate-y-1 disabled:cursor-wait disabled:opacity-70 ${
                    isActive ? "border-copper ring-2 ring-copper/20" : "border-ink/8"
                  }`}
                >
                  <div className="h-24 rounded-2xl" style={{ background: item.background }}>
                    <div className="flex gap-2 p-3">
                      <span className="h-8 w-8 rounded-full" style={{ background: item.primary }} />
                      <span className="h-8 w-8 rounded-full" style={{ background: item.secondary }} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between font-black">
                    <span>{item.name}</span>
                    {saving === "preset" && selectedPreset === item.id ? (
                      <Loader2 size={17} className="animate-spin text-copper" />
                    ) : (
                      isActive && <Check size={17} className="text-copper" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className={`rounded-3xl border bg-paper p-6 ${canCustom ? "border-ink/8" : "border-dashed border-ink/15 opacity-70"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">ألوان مخصّصة</h2>
            <p className="mt-1 text-sm text-ink-soft/60">ميزة حصرية لباقة Premium.</p>
          </div>
          {canCustom ? (
            isCustomActive ? (
              <span className="flex items-center gap-1 rounded-full bg-herb/10 px-3 py-1 text-xs font-black text-herb"><Check size={13} /> مفعّلة الآن</span>
            ) : (
              <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-black text-ink-soft">متاحة</span>
            )
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs font-black"><Lock size={13} /> Premium</span>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[["primary", "اللون الأساسي"], ["secondary", "اللون الثانوي"], ["background", "الخلفية"]].map(([key, label]) => (
            <label key={key} className="block text-sm font-bold">
              {label}
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-ink/10 p-2">
                <input
                  disabled={!canCustom}
                  type="color"
                  value={custom[key]}
                  onChange={(e) => setCustom({ ...custom, [key]: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded-xl border-0 bg-transparent disabled:cursor-not-allowed"
                />
                <code className="text-xs">{custom[key]}</code>
              </div>
            </label>
          ))}
        </div>

        {canCustom && (
          <button
            type="button"
            onClick={applyCustom}
            disabled={saving !== null}
            className="mt-6 flex items-center gap-2 rounded-full bg-copper px-5 py-3 text-sm font-black text-ink transition hover:bg-copper-deep disabled:cursor-wait disabled:opacity-60"
          >
            {saving === "custom" ? <Loader2 size={16} className="animate-spin" /> : <Palette size={16} />}
            {saving === "custom" ? "جارٍ التطبيق..." : "تطبيق الألوان المخصّصة"}
          </button>
        )}
      </section>
    </div>
  );
}
