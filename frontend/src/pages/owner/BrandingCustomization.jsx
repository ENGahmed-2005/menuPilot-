/* ==========================================================================
   BrandingCustomization.jsx — the restaurant's menu identity (/owner/branding).
   Logo and cover, colours, how dishes are laid out, the header, categories
   and type, with a live phone preview that uses the customer menu's own
   card component (components/menu/MenuItemCard), so what the owner sees is
   what guests get. Pro (or a trial) unlocks it; fonts and hiding menuPilot
   need the «الهوية الكاملة» add-on.
   ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { ImageUp, Lock, RotateCcw, Utensils, Wand2 } from 'lucide-react';
import { getBranding, resetBranding, saveBranding } from '../../api/branding';
import { useAuth } from '../../context/AuthContext';
import { SUBSCRIPTION_ADDONS, subscriptionOf, userHasFeature } from '../../config/subscriptions';
import MenuItemCard from '../../components/menu/MenuItemCard';
import { DEFAULT_TAGLINE, MENU_STYLE_DEFAULTS, MENU_STYLE_OPTIONS, cardRadius, logoRadius, resolveMenuStyle } from '../../components/menu/menuStyle';
import { t, dir } from "../../i18n";

const defaults = { primary_color: '#B8793E', secondary_color: '#4B6A8A', text_color: '#172331', button_color: '#1F2D3D', background_color: '#F7F3E9', card_style: 'rounded', font_family: 'system', show_menupilot_branding: true };

// A plain plate drawing so the preview shows where photos go before any are uploaded.
const plate = (tint) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${tint}" fill-opacity=".14"/><circle cx="40" cy="40" r="25" fill="#fff"/><circle cx="40" cy="40" r="17" fill="${tint}" fill-opacity=".28"/></svg>`)}`;
const sample = (tint) => [
  { id: 's1', name: t("مقلوبة دجاج"), description: t("أرز بالبهارات، دجاج، باذنجان مقلي ولوز محمّص"), price: 32, imageUrl: plate(tint) },
  { id: 's2', name: t("فتوش"), description: t("خضار طازجة، خبز محمّص ودبس رمان"), price: 12, imageUrl: plate(tint) },
  { id: 's3', name: t("كنافة نابلسية"), description: t("جبنة نابلسية وقطر"), price: 15, imageUrl: plate(tint) },
];

function Section({ title, hint, children }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-base font-black">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/* A row of choices; each can carry a one-line hint. */
function Choice({ label, options, value, onChange, disabled, wide = false }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-bold">{label}</legend>
      <div className={`grid gap-2 ${wide ? 'sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)} disabled={disabled}
              className={`min-h-11 rounded-xl border px-3 py-2 text-start transition-colors disabled:opacity-50 ${on ? 'border-copper bg-copper/10' : 'border-line hover:border-ink/30'}`}>
              <span className="block text-sm font-bold">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-xs leading-5 text-muted">{o.hint}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ColorField({ label, value, onChange, disabled, allowEmpty, emptyLabel }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <span className="mt-2 flex items-center gap-3 rounded-xl border border-line px-3 py-2">
        <input disabled={disabled} type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="h-9 w-11 cursor-pointer rounded" />
        <code className="text-xs" dir="ltr">{value || emptyLabel}</code>
        {allowEmpty && value && <button type="button" disabled={disabled} onClick={() => onChange(null)} className="ms-auto min-h-9 text-xs font-bold text-muted underline-offset-4 hover:underline">{emptyLabel}</button>}
      </span>
    </label>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={`flex min-h-11 items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span><b className="block text-sm">{label}</b>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
      <input type="checkbox" className="h-5 w-5 accent-[var(--color-copper,#B8793E)]" disabled={disabled} checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Preview({ settings, style, logoSrc, coverSrc }) {
  const brand = { ...settings, background_color: style.background_color || settings.background_color };
  const radius = cardRadius(settings.card_style);
  const items = useMemo(() => sample(settings.primary_color), [settings.primary_color]);
  const minimal = style.header === 'minimal', cover = style.header === 'cover';
  const listClass = { compact: 'grid gap-2', photo: 'grid gap-3', grid: 'grid grid-cols-2 gap-2', text: 'divide-y divide-black/[0.06] overflow-hidden ring-1 ring-black/5' }[style.layout];
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2.2rem] border-[9px] border-ink shadow-xl" aria-label={t("معاينة المنيو كما يراه الزبون")}>
      <div className="h-[600px] overflow-y-auto" dir={dir} style={{ background: brand.background_color, color: brand.text_color, fontFamily: settings.font_family !== 'system' ? settings.font_family : undefined }}>
        <div className={`relative ${minimal ? '' : 'text-white'}`} style={minimal ? undefined : { background: settings.primary_color }}>
          {cover && coverSrc && <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {cover && <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />}
          <div className={`relative flex items-end gap-3 px-4 ${cover ? 'pb-5 pt-16' : 'py-4'}`}>
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden bg-white shadow" style={{ borderRadius: logoRadius(style.logo_shape) }}>
              {logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-cover" /> : <Utensils size={20} style={{ color: settings.primary_color }} />}
            </span>
            <span className="min-w-0">
              <b className="block truncate text-lg">{t("اسم مطعمك")}</b>
              <span className={`block truncate text-xs font-bold ${minimal ? 'opacity-70' : 'text-white/85'}`}>{t("طاولة 4 ·")} {style.tagline || DEFAULT_TAGLINE}</span>
            </span>
          </div>
        </div>
        <div className={`flex border-b border-black/5 px-3 ${style.chips === 'underline' ? 'gap-4 pt-1' : 'gap-1.5 py-2.5'}`}>
          {[t("الكل"), t("الرئيسية"), t("السلطات"), t("الحلويات")].map((c, i) => style.chips === 'underline'
            ? <span key={c} className="whitespace-nowrap border-b-[3px] py-2 text-xs font-bold" style={{ borderColor: i === 0 ? settings.primary_color : 'transparent', color: i === 0 ? settings.primary_color : undefined }}>{c}</span>
            : <span key={c} className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold" style={i === 0 ? { background: settings.primary_color, color: '#fff' } : { background: style.surface_color, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / .08)' }}>{c}</span>)}
        </div>
        <div className="px-3 pb-6 pt-4">
          <b className="mb-2 block text-sm">{t("الأطباق")}</b>
          <ul className={listClass} style={style.layout === 'text' ? { background: style.surface_color, borderRadius: radius } : undefined}>
            {items.map((item) => (
              <li key={item.id}><MenuItemCard item={item} style={style} brand={brand} radius={radius} onOpen={() => {}} onAdd={() => {}} /></li>
            ))}
          </ul>
          {settings.show_menupilot_branding && <p className="mt-6 text-center text-[11px] font-bold opacity-50" dir="ltr">{t("مدعوم من menuPilot")}</p>}
        </div>
      </div>
    </div>
  );
}

export default function BrandingCustomization() {
  const { user } = useAuth();
  const { trial } = subscriptionOf(user);
  const fullAccess = userHasFeature(user, 'branding');
  const hasBrandPlus = userHasFeature(user, 'custom-font') && userHasFeature(user, 'remove-branding');
  const brandPlus = SUBSCRIPTION_ADDONS.brand_plus.name;
  const [settings, setSettings] = useState(defaults);
  const [style, setStyle] = useState(MENU_STYLE_DEFAULTS);
  const [logo, setLogo] = useState(null);
  const [background, setBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { tone, text }

  const load = (data) => { setSettings({ ...defaults, ...(data || {}) }); setStyle(resolveMenuStyle(data)); };
  useEffect(() => { getBranding().then(load).catch(() => {}).finally(() => setLoading(false)); }, []);
  const set = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));
  const setS = (key) => (value) => setStyle((s) => ({ ...s, [key]: value, ...(key === 'layout' && value !== 'text' && s.layout === 'text' ? { show_images: true } : {}) }));

  // Unsaved files show in the preview straight away.
  const logoSrc = useMemo(() => (logo ? URL.createObjectURL(logo) : settings.logo_url), [logo, settings.logo_url]);
  const coverSrc = useMemo(() => (background ? URL.createObjectURL(background) : settings.background_url), [background, settings.background_url]);
  useEffect(() => () => { if (logo) URL.revokeObjectURL(logoSrc); }, [logo, logoSrc]);
  useEffect(() => () => { if (background) URL.revokeObjectURL(coverSrc); }, [background, coverSrc]);

  async function save() {
    setSaving(true); setMessage(null);
    try {
      const updated = await saveBranding({ ...settings, menu_style: style, logo, background, show_menupilot_branding: hasBrandPlus ? settings.show_menupilot_branding : true });
      load(updated); setLogo(null); setBackground(null);
      setMessage({ tone: 'ok', text: t("حُفظت هوية المنيو، ويراها الزبائن الآن.") });
    } catch (e) { setMessage({ tone: 'error', text: e.message || t("تعذّر الحفظ. تحقق من الاتصال وحاول مرة أخرى.") }); }
    finally { setSaving(false); }
  }
  async function reset() {
    setSaving(true); setMessage(null);
    try { load(await resetBranding()); setLogo(null); setBackground(null); setMessage({ tone: 'ok', text: t("عاد المنيو إلى التصميم الافتراضي.") }); }
    catch (e) { setMessage({ tone: 'error', text: e.message }); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-8 text-center" role="status">{t("جارٍ تحميل هوية المنيو…")}</div>;
  const off = !fullAccess;
  const upload = (label, hint, file, onFile) => (
    <label className={`flex min-h-24 flex-col justify-center rounded-xl border border-dashed border-line p-4 ${off ? 'opacity-50' : 'cursor-pointer hover:border-ink/30'}`}>
      <ImageUp size={20} className="text-copper" aria-hidden="true" />
      <b className="mt-2 text-sm">{label}</b>
      <span className="text-xs text-muted">{file ? file.name : hint}</span>
      <input disabled={off} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] || null)} />
    </label>
  );

  return (
    <div dir={dir} className="space-y-6">
      <header>
        <h1 className="text-3xl font-black">{t("هوية المنيو")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">{t("اجعل منيو QR يشبه مطعمك: الشعار والألوان، وطريقة عرض الأطباق، ورأس الصفحة والتصنيفات. المعاينة تتغير مع كل اختيار.")}</p>
      </header>
      {trial && <p className="rounded-2xl border border-copper/25 bg-copper/10 p-4 text-sm"><b>{t("تجربتك المجانية تشمل كل خيارات الهوية.")}</b> {t("احفظ الآن ويبقى التصميم بعد التجربة مع الخطة الاحترافية.")}</p>}
      {off && <p className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm"><Lock size={18} className="mt-0.5 shrink-0 text-copper" aria-hidden="true" /><span><b>{t("تخصيص المنيو ضمن الخطة الاحترافية.")}</b> {t("يمكنك تجربة الخيارات في المعاينة، لكن الحفظ يحتاج الخطة الاحترافية أو تجربة سارية.")}</span></p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Section title={t("الشعار والغلاف")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {upload(t("شعار المطعم"), t("PNG أو JPG أو WEBP، حتى 2MB"), logo, setLogo)}
              {upload(t("صورة الغلاف"), t("تظهر في رأس المنيو، حتى 5MB"), background, setBackground)}
            </div>
          </Section>

          <Section title={t("الألوان")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label={t("لون الهوية")} value={settings.primary_color} onChange={set('primary_color')} disabled={off} />
              <ColorField label={t("لون الأزرار")} value={settings.button_color} onChange={set('button_color')} disabled={off} />
              <ColorField label={t("لون النص")} value={settings.text_color} onChange={set('text_color')} disabled={off} />
              <ColorField label={t("لون ثانوي")} value={settings.secondary_color} onChange={set('secondary_color')} disabled={off} />
              <ColorField label={t("خلفية الصفحة")} value={style.background_color} onChange={setS('background_color')} disabled={off} allowEmpty emptyLabel={t("من الثيم")} />
              <ColorField label={t("لون البطاقات")} value={style.surface_color} onChange={setS('surface_color')} disabled={off} />
            </div>
          </Section>

          <Section title={t("عرض الأطباق")} hint={t("اختر الشكل الذي يناسب أطباقك وصورك.")}>
            <Choice label={t("التخطيط")} options={MENU_STYLE_OPTIONS.layout} value={style.layout} onChange={setS('layout')} disabled={off} wide />
            {style.layout === 'compact' && <Choice label={t("موضع الصورة")} options={MENU_STYLE_OPTIONS.image_side} value={style.image_side} onChange={setS('image_side')} disabled={off} />}
            <Choice label={t("زوايا البطاقات")} options={[{ value: 'rounded', label: t("مستديرة") }, { value: 'soft', label: t("ناعمة") }, { value: 'square', label: t("حادة") }]} value={settings.card_style} onChange={set('card_style')} disabled={off} />
            <Choice label={t("لون السعر")} options={MENU_STYLE_OPTIONS.price_color} value={style.price_color} onChange={setS('price_color')} disabled={off} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label={t("صور الأطباق")} hint={style.layout === 'text' ? t("القائمة النصية بلا صور.") : t("الطبق بلا صورة يظهر بلا مربع فارغ.")} checked={style.show_images} onChange={setS('show_images')} disabled={off || style.layout === 'text'} />
              <Toggle label={t("وصف الأطباق")} hint={t("سطر واحد في البطاقات المدمجة.")} checked={style.show_descriptions} onChange={setS('show_descriptions')} disabled={off} />
            </div>
          </Section>

          <Section title={t("رأس المنيو")}>
            <Choice label={t("الشكل")} options={MENU_STYLE_OPTIONS.header} value={style.header} onChange={setS('header')} disabled={off} wide />
            <Choice label={t("شكل الشعار")} options={MENU_STYLE_OPTIONS.logo_shape} value={style.logo_shape} onChange={setS('logo_shape')} disabled={off} />
            <label className="block text-sm font-bold">
              {t("العبارة تحت الاسم")}
              <input disabled={off} maxLength={80} value={style.tagline || ''} onChange={(e) => setS('tagline')(e.target.value || null)} placeholder={DEFAULT_TAGLINE}
                className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-normal outline-none focus:border-copper" />
              <span className="mt-1 block text-xs font-normal text-muted">{(style.tagline || '').length} {t("/ 80 حرفاً. مثل: «مطبخ غزاوي منذ 1998».")}</span>
            </label>
          </Section>

          <Section title={t("التصنيفات والخط")}>
            <Choice label={t("شكل التصنيفات")} options={MENU_STYLE_OPTIONS.chips} value={style.chips} onChange={setS('chips')} disabled={off} />
            <label className="block text-sm font-bold">
              {t("الخط")}
              {hasBrandPlus
                ? <select value={settings.font_family} onChange={(e) => set('font_family')(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"><option value="system">{t("خط النظام")}</option><option value="Cairo">Cairo</option><option value="Tajawal">Tajawal</option></select>
                : <span className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-normal text-muted"><Lock size={14} aria-hidden="true" /> {t("الخط المخصص ضمن إضافة")} {brandPlus}</span>}
            </label>
            <Toggle label={t("إظهار «مدعوم من menuPilot»")} hint={hasBrandPlus ? t("في أسفل المنيو.") : t("يمكن إخفاؤه مع إضافة {0}.", { 0: brandPlus })} checked={hasBrandPlus ? settings.show_menupilot_branding : true} onChange={set('show_menupilot_branding')} disabled={!hasBrandPlus} />
          </Section>

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-1 py-3">
            <button type="button" disabled={off || saving} onClick={save} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-paper disabled:opacity-50"><Wand2 size={16} aria-hidden="true" />{saving ? t("جارٍ الحفظ…") : t("حفظ وتطبيق")}</button>
            <button type="button" disabled={saving} onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-bold disabled:opacity-50"><RotateCcw size={16} aria-hidden="true" />{t("استعادة الافتراضي")}</button>
            {message && <p role="status" className={`text-sm font-bold ${message.tone === 'ok' ? 'text-herb' : 'text-brick'}`}>{message.text}</p>}
          </div>
        </div>

        <aside className="lg:sticky lg:top-4">
          <Preview settings={settings} style={style} logoSrc={logoSrc} coverSrc={coverSrc} />
          <p className="mt-3 text-center text-xs text-muted">{t("بطاقات المعاينة هي نفسها بطاقات منيو الزبون.")}</p>
        </aside>
      </div>
    </div>
  );
}
