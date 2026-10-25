import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpLeft,
  Bike,
  Check,
  ChefHat,
  FileBarChart,
  Loader2,
  Menu,
  QrCode,
  Receipt,
  Smartphone,
  Store,
  WifiOff,
  X,
} from "lucide-react";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import { demoGuestTable } from "../../api/demo";
import { useAuth } from "../../context/AuthContext";
import { ADDON_ORDER, MAIN_PLANS, SUBSCRIPTION_ADDONS, SUBSCRIPTION_PLANS } from "../../config/subscriptions";
import { dir, lang, t } from "../../i18n";
import "./landing-special.css";

const NAV_ITEMS = [
  ["#route", "رحلة الطلب"],
  ["#tools", "المنصة"],
  ["#demo", "جرّب بنفسك"],
  ["#pricing", "الأسعار"],
  ["#faq", "الأسئلة الشائعة"],
];

const FLOW = [
  { title: "الضيف", role: "على الطاولة", copy: "يمسح رمز QR، يفتح المنيو في المتصفح، ثم يطلب ويتابع الحالة.", image: "menu", icon: Smartphone, alt: "منيو menuPilot على الهاتف" },
  { title: "المطبخ", role: "شاشة التحضير", copy: "يصل الطلب مباشرةً إلى شاشة المطبخ، ويظهر للفريق مع تقدّم التحضير.", image: "kitchen", icon: ChefHat, alt: "طلبات شاشة المطبخ في menuPilot" },
  { title: "الكاشير", role: "الفاتورة والجلسة", copy: "الفاتورة والمدفوعات وإغلاق الجلسة تبقى ضمن مسار الطاولة.", image: "cashier", icon: Receipt, alt: "واجهة الكاشير والفواتير" },
  { title: "المالك", role: "الصورة الكاملة", copy: "تابع المبيعات والتقارير، وأدر المنيو والطاولات والفريق والصلاحيات.", image: "finance", icon: Store, alt: "تقارير menuPilot المالية" },
];

const TOOLS = [
  { id: "01", title: "كل طاولة، جلسة واضحة.", copy: "مفتاح سري لكل جلسة، ولا يُقبل الطلب إلا من هاتف قريب من المطعم.", icon: QrCode, label: "QR · حماية الجلسات" },
  { id: "02", title: "الطلب يكمل طريقه.", copy: "طلبات أونلاين للاستلام والتوصيل من رابط ورمز QR خاصين بمطعمك، بلا عمولة.", icon: Bike, label: "استلام · توصيل · بلا عمولة" },
  { id: "03", title: "الوردية لا تتوقف.", copy: "يواصل المطبخ والكاشير العمل بآخر بيانات محفوظة عند انقطاع الإنترنت. وثبّت المنصة كتطبيق PWA.", icon: WifiOff, label: "Offline · PWA" },
  { id: "04", title: "المنيو على هوية مطعمك.", copy: "شعارك وألوانك وخلفيتك وخطك، ضمن تجربة المنيو.", icon: FileBarChart, label: "هوية خاصة" },
];

const DEMO_ROLES = [
  { id: "owner", title: "صاحب المطعم", description: "لوحة الإدارة وتقارير المبيعات والمالية.", path: "/owner/dashboard", image: "dashboard", alt: "لوحة إدارة المطعم وتقاريره", icon: Store },
  { id: "kitchen", title: "المطبخ", description: "الطلبات ومراحل التحضير على شاشة المطبخ.", path: "/kitchen", image: "kitchen", alt: "شاشة المطبخ والطلبات", icon: ChefHat },
  { id: "cashier", title: "الكاشير", description: "الطاولات والفواتير والمدفوعات.", path: "/cashier/tables", image: "cashier", alt: "واجهة الكاشير والطاولات", icon: Receipt },
  { id: "guest", title: "الزبون", description: "منيو الطاولة والطلب ومتابعة حالته.", path: null, image: "menu", alt: "منيو المطعم على الهاتف", icon: Smartphone },
];

const FAQS = [
  ["هل يحتاج الزبون إلى تنزيل تطبيق؟", "لا. يمسح رمز QR للطاولة ويفتح المنيو في المتصفح، ثم يطلب ويتابع حالة طلبه."],
  ["هل توجد عمولة على الطلبات؟", "لا توجد عمولة على الطلبات؛ الاشتراك شهري ثابت."],
  ["هل أحتاج إلى أجهزة إضافية؟", "لا. يعمل menuPilot على الأجهزة التي تستخدمها بالفعل، ويمكن تثبيته كتطبيق PWA."],
  ["ماذا يحدث عند انقطاع الإنترنت؟", "يستطيع المطبخ والكاشير متابعة العمل باستخدام آخر البيانات المحفوظة."],
  ["كيف تُحمى جلسات الطاولات؟", "لكل جلسة طاولة مفتاح سري، ولا يُقبل الطلب إلا من هاتف قريب من المطعم."],
  ["هل أستطيع إلغاء الاشتراك؟", "نعم. يمكنك إلغاء الاشتراك في أي وقت، بلا عقود."],
];

function imagePath(name) {
  return `/landing/${lang}-${name}.webp`;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 28);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`sp-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="sp-header-inner">
        <Link to="/" className="sp-logo" aria-label={t("menuPilot، الصفحة الرئيسية")}>
          <img src="/brand/logo-on-dark.webp" width="158" height="42" alt="menuPilot" />
        </Link>
        <nav className="sp-nav" aria-label={t("التنقل الرئيسي")}>
          {NAV_ITEMS.map(([href, label]) => <a href={href} key={href}>{t(label)}</a>)}
        </nav>
        <div className="sp-header-actions">
          <LanguageSwitch tone="dark" />
          <Link to="/login" className="sp-login">{t("تسجيل الدخول")}</Link>
          <Link to="/register" className="sp-header-cta">{t("ابدأ مجانًا")}</Link>
        </div>
        <button className="sp-menu-toggle" type="button" aria-label={open ? t("إغلاق القائمة") : t("فتح القائمة")} aria-expanded={open} aria-controls="sp-mobile-nav" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {open && (
        <nav id="sp-mobile-nav" className="sp-mobile-nav" aria-label={t("التنقل الرئيسي")}>
          {NAV_ITEMS.map(([href, label]) => <a href={href} key={href} onClick={() => setOpen(false)}>{t(label)}</a>)}
          <div className="sp-mobile-actions">
            <LanguageSwitch tone="dark" />
            <Link to="/login" onClick={() => setOpen(false)}>{t("تسجيل الدخول")}</Link>
            <Link to="/register" className="sp-header-cta" onClick={() => setOpen(false)}>{t("ابدأ مجانًا")}</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function FloorPlan() {
  return (
    <div className="sp-floorplan" role="img" aria-label={t("رسم توضيحي لمسار الطلب بين الطاولة والمطبخ والكاشير والمالك")}>
      <span className="sp-plan-stamp">{t("مخطط الخدمة")} <b>01—04</b></span>
      <svg className="sp-plan-lines" viewBox="0 0 620 500" fill="none" aria-hidden="true">
        <path className="sp-plan-room" d="M62 72h250v118h239v247H321V315H62V72Z" />
        <path className="sp-plan-route" d="M151 147h164v103h123v102H270v-69h-94" />
        <path className="sp-plan-dash" d="M151 147h164v103h123v102H270v-69h-94" />
        <path className="sp-plan-wall" d="M312 72v118M62 315h113m95 0v122m165-187v-60m0 181h121" />
        <circle className="sp-plan-point" cx="151" cy="147" r="7" />
        <circle className="sp-plan-point" cx="315" cy="250" r="7" />
        <circle className="sp-plan-point" cx="438" cy="352" r="7" />
        <circle className="sp-plan-point" cx="270" cy="283" r="7" />
      </svg>
      <div className="sp-plan-label sp-plan-table"><span>01 / {t("الطاولة")}</span><b>{t("الضيف")}</b><img src={imagePath("menu")} width="560" height="1212" alt="" fetchPriority="high" /></div>
      <div className="sp-plan-label sp-plan-kitchen"><span>02 / {t("المطبخ")}</span><b>{t("طلب جديد")}</b><img src={imagePath("kitchen")} width="1600" height="1000" alt="" loading="lazy" /></div>
      <div className="sp-plan-label sp-plan-cashier"><span>03 / {t("الكاشير")}</span><b>{t("فاتورة")}</b><img src={imagePath("cashier")} width="1600" height="1000" alt="" loading="lazy" /></div>
      <div className="sp-plan-label sp-plan-owner"><span>04 / {t("المالك")}</span><b>{t("تقارير")}</b><FileBarChart size={18} aria-hidden="true" /></div>
      <span className="sp-plan-foot">{t("رسم توضيحي لمسار الخدمة")}</span>
    </div>
  );
}

function Hero() {
  return (
    <section className="sp-hero">
      <div className="sp-hero-copy">
        <p className="sp-eyebrow"><span />{t("مسار واحد. من الطاولة إلى الحساب.")}</p>
        <h1>{t("خلي الخدمة")}&nbsp;<em>{t("تمشي.")}</em></h1>
        <p className="sp-hero-text">{t("الطلب يعرف طريقه من جوال الضيف إلى شاشة المطبخ، ثم الفاتورة والتقرير. وفريقك يعرف خطوته التالية.")}</p>
        <div className="sp-hero-actions">
          <Link to="/register" className="sp-button-primary">{t("ابدأ 14 يومًا مجانًا")}<ArrowUpLeft size={17} aria-hidden="true" /></Link>
          <a href="#demo" className="sp-button-text">{t("افتح المطعم التجريبي")}<ArrowDownLeft size={16} aria-hidden="true" /></a>
        </div>
        <div className="sp-hero-proof"><span>{t("بلا أجهزة إضافية")}</span><i /><span>{t("بلا عمولة")}</span><i /><span>{t("بلا بطاقة ائتمانية")}</span></div>
      </div>
      <FloorPlan />
      <div className="sp-hero-bottom"><span>MENUPILOT / RESTAURANT OPERATIONS</span><span>{t("ارسم مسارك")} <ArrowDownLeft size={15} aria-hidden="true" /></span></div>
    </section>
  );
}

function RouteSection() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const steps = document.querySelectorAll(".sp-route-step");
    if (!("IntersectionObserver" in window) || !steps.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(Number(entry.target.dataset.index));
      });
    }, { rootMargin: "-40% 0px -40% 0px" });
    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="sp-route" id="route">
      <div className="sp-route-intro">
        <p className="sp-eyebrow"><span />{t("الوردية، بلا تخمين")}</p>
        <h2>{t("أربع محطات.")}<br /><em>{t("ولا طلب يضيع.")}</em></h2>
        <p>{t("كل شخص يشوف ما يحتاجه في الوقت المناسب، من أول مسح إلى إغلاق الجلسة.")}</p>
        <div className="sp-route-progress"><span style={{ "--route-progress": `${(active + 1) * 25}%` }} /></div>
        <span className="sp-route-current">0{active + 1} / 04 · {t(FLOW[active].role)}</span>
      </div>
      <div className="sp-route-list">
        {FLOW.map((step, index) => {
          const Icon = step.icon;
          return (
            <article className={`sp-route-step${active === index ? " is-active" : ""}`} data-index={index} key={step.title}>
              <span className="sp-route-no">0{index + 1}</span>
              <div className="sp-route-content">
                <span className="sp-route-role"><Icon size={15} aria-hidden="true" />{t(step.role)}</span>
                <h3>{t(step.title)}</h3>
                <p>{t(step.copy)}</p>
              </div>
              <div className="sp-route-shot">
                <img src={imagePath(step.image)} alt={t(step.alt)} width={step.image === "menu" ? 560 : 1600} height={step.image === "menu" ? 1212 : 1000} loading="lazy" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ToolsSection() {
  return (
    <section className="sp-tools" id="tools">
      <div className="sp-tools-heading">
        <p className="sp-eyebrow sp-eyebrow-dark"><span />{t("أدوات الوردية")}</p>
        <h2>{t("الخطوط على المخطط،")}&nbsp;<em>{t("تشتغل فعلًا.")}</em></h2>
      </div>
      <div className="sp-tools-list">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <article className="sp-tool" key={tool.id}>
              <span className="sp-tool-id">{tool.id}</span>
              <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
              <div><h3>{t(tool.title)}</h3><p>{t(tool.copy)}</p></div>
              <span className="sp-tool-label">{t(tool.label)}</span>
            </article>
          );
        })}
      </div>
      <div className="sp-tool-note"><span>+</span><p>{t("النادل والطاولات والصلاحيات والمالية والتصدير المحاسبي — ضمن إدارة واحدة.")}</p></div>
    </section>
  );
}

function DemoSection() {
  const { startDemo } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(DEMO_ROLES[3]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function launch() {
    setBusy(selected.id);
    setError("");
    try {
      if (selected.id === "guest") {
        const table = await demoGuestTable();
        if (!table?.table_code) throw new Error(t("تعذّر فتح طاولة المطعم التجريبي."));
        navigate(`/t/${table.table_code}`);
        return;
      }
      await startDemo(selected.id);
      navigate(selected.path);
    } catch (err) {
      setError(err?.message || t("تعذّر فتح المطعم التجريبي. حاول مرة أخرى."));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="sp-demo" id="demo">
      <div className="sp-demo-heading">
        <p className="sp-eyebrow"><span />{t("ادخل وشوف بنفسك")}</p>
        <h2>{t("مو mockup.")}<br /><em>{t("مطعم تجريبي حقيقي.")}</em></h2>
        <p>{t("اختَر مكانك في الوردية، وافتح تجربة menuPilot مباشرةً. أربعة منظورات، ومطعم واحد.")}</p>
        <span className="sp-demo-note">{t("تجربة مجانية 14 يومًا · بلا بطاقة ائتمانية")}</span>
      </div>
      <div className="sp-demo-console">
        <div className="sp-console-bar"><span>LIVE / MENUPILOT DEMO</span><span className="sp-console-dot" />{t("جلسة تجريبية")}</div>
        <div className="sp-console-screen">
          <img key={selected.id} src={imagePath(selected.image)} alt={t(selected.alt)} width={selected.image === "menu" ? 560 : 1600} height={selected.image === "menu" ? 1212 : 1000} loading="lazy" />
          <div className="sp-screen-caption"><span>{t(selected.title)}</span><b>0{DEMO_ROLES.findIndex((role) => role.id === selected.id) + 1} / 04</b></div>
        </div>
        <div className="sp-demo-roles" role="group" aria-label={t("اختر دورًا للمتابعة")}>
          {DEMO_ROLES.map((role, index) => {
            const Icon = role.icon;
            return <button type="button" key={role.id} aria-pressed={selected.id === role.id} disabled={Boolean(busy)} onClick={() => { setSelected(role); setError(""); }}>
              <span>0{index + 1}</span><Icon size={16} aria-hidden="true" />{t(role.title)}
            </button>;
          })}
        </div>
        <p className="sp-demo-description">{t(selected.description)}</p>
        <button type="button" className="sp-demo-launch" onClick={launch} disabled={Boolean(busy)}>
          {busy ? <><Loader2 size={17} className="sp-spinner" aria-hidden="true" />{t("جارٍ فتح المطعم…")}</> : <>{t("ادخل تجربة {0}", { 0: t(selected.title) })}<ArrowUpLeft size={17} aria-hidden="true" /></>}
        </button>
        {error && <p className="sp-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const price = (monthly) => annual ? monthly * 10 : monthly;

  return (
    <section className="sp-pricing" id="pricing">
      <div className="sp-pricing-heading">
        <p className="sp-eyebrow"><span />{t("الحساب، واضح من البداية")}</p>
        <h2>{t("اشتراك ثابت.")}<br /><em>{t("ولا نسبة من طلبك.")}</em></h2>
        <p>{t("جرّب كل الميزات 14 يومًا، دون بطاقة ائتمانية. بعد ذلك اختر الباقة التي تناسب تشغيل مطعمك.")}</p>
        <div className="sp-billing" role="group" aria-label={t("مدة الاشتراك")}>
          <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>{t("شهري")}</button>
          <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>{t("سنوي")}<span>{t("ادفع 10 أشهر")}</span></button>
        </div>
      </div>
      <div className="sp-plan-grid">
        {MAIN_PLANS.map((id) => {
          const plan = SUBSCRIPTION_PLANS[id];
          const pro = id === "pro";
          return <article className={`sp-plan${pro ? " is-pro" : ""}`} key={id}>
            <div className="sp-plan-top"><span>{t(pro ? "للمطاعم المتنامية" : "للبداية المتكاملة")}</span>{pro && <b>{t("الأكثر اختيارًا")}</b>}</div>
            <h3>{plan.name}</h3><p>{plan.description}</p>
            <div className="sp-price"><strong>${price(plan.price)}</strong><span>{annual ? t("دفعة سنوية · 10 أشهر") : t("شهريًا")}</span></div>
            <ul>
              <li><Check size={15} aria-hidden="true" />{t("طلب QR من الطاولة")}</li>
              <li><Check size={15} aria-hidden="true" />{t("المطبخ والكاشير والطاولات")}</li>
              <li><Check size={15} aria-hidden="true" />{t(pro ? "تقارير وهوية منيو خاصة" : "إدارة المنيو والفريق")}</li>
              <li><Check size={15} aria-hidden="true" />{t("بلا عمولة على الطلبات")}</li>
            </ul>
            <Link to={`/register?plan=${id}`} className="sp-plan-cta">{t("ابدأ 14 يومًا مجانًا")}<ArrowUpLeft size={16} aria-hidden="true" /></Link>
          </article>;
        })}
      </div>
      <article className="sp-delivery-plan">
        <Bike size={22} aria-hidden="true" />
        <div><span>{t("للمطاعم بلا صالة")}</span><h3>{SUBSCRIPTION_PLANS.delivery_only.name}</h3><p>{SUBSCRIPTION_PLANS.delivery_only.description}</p></div>
        <strong>${price(SUBSCRIPTION_PLANS.delivery_only.price)}<small>{annual ? t("دفعة سنوية") : t("شهريًا")}</small></strong>
        <Link to="/register?plan=delivery_only" aria-label={t("ابدأ تجربة التوصيل فقط")}>{t("اختَر")}<ArrowUpLeft size={15} aria-hidden="true" /></Link>
      </article>
      <div className="sp-addons">
        <span>{t("إضافات اختيارية")}</span>
        {ADDON_ORDER.map((id) => {
          const addon = SUBSCRIPTION_ADDONS[id];
          return <p key={id}><b>{addon.name}</b><small>{addon.description}</small><strong>+${price(addon.price)}<small>{annual ? t("سنويًا") : t("شهريًا")}</small></strong></p>;
        })}
      </div>
      <p className="sp-pricing-foot">{t("بلا عمولة · بلا عقود · ألغِ متى شئت")}</p>
    </section>
  );
}

function MorningSection() {
  return (
    <section className="sp-morning">
      <div className="sp-morning-copy">
        <p className="sp-eyebrow sp-eyebrow-dark"><span />{t("بعد ما تهدأ الصالة")}</p>
        <h2>{t("اليوم التالي:")}&nbsp;<em>{t("الأرقام.")}</em></h2>
        <div className="sp-morning-questions"><p>{t("كم بعت؟")}</p><p>{t("ما أكثر صنف طُلب؟")}</p><p>{t("كم ربحت فعلًا؟")}</p></div>
        <p className="sp-morning-answer">{t("التقارير والمالية وسجل المبيعات في لوحة واحدة. راجع أداء مطعمك، وصدّر بياناتك للمحاسبة.")}</p>
      </div>
      <figure className="sp-finance">
        <div className="sp-finance-top"><span>MENUPILOT / FINANCE</span><span>{t("تقارير المطعم")}</span></div>
        <img src={imagePath("finance")} alt={t("واجهة التقارير والمالية في menuPilot")} width="1600" height="1000" loading="lazy" />
        <figcaption>{t("لقطة من تقارير menuPilot")}</figcaption>
      </figure>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="sp-faq" id="faq">
      <div><p className="sp-eyebrow sp-eyebrow-dark"><span />{t("إجابات على السريع")}</p><h2>{t("قبل ما")}&nbsp;<em>{t("تبدأ.")}</em></h2></div>
      <div className="sp-faq-list">
        {FAQS.map(([question, answer], index) => <details key={question}>
          <summary><span>0{index + 1}</span><strong>{t(question)}</strong><i>+</i></summary>
          <p>{t(answer)}</p>
        </details>)}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="sp-footer">
      <div className="sp-footer-top">
        <div><Link to="/" aria-label={t("menuPilot، الصفحة الرئيسية")}><img src="/brand/logo-stacked-on-dark.webp" width="132" height="54" alt="menuPilot" loading="lazy" /></Link><p>{t("تشغيل أذكى. ضيافة أفضل.")}</p></div>
        <div className="sp-footer-cta"><p>{t("خلي الوردية الجاية أهدأ.")}</p><Link to="/register">{t("ابدأ 14 يومًا مجانًا")}<ArrowUpLeft size={16} aria-hidden="true" /></Link></div>
      </div>
      <div className="sp-footer-bottom"><span>{t("من الطاولة إلى التقرير — في مسار واحد.")}</span><nav aria-label={t("روابط الصفحة")}><a href="#route">{t("رحلة الطلب")}</a><a href="#pricing">{t("الأسعار")}</a><a href="#faq">{t("الأسئلة الشائعة")}</a><Link to="/login">{t("تسجيل الدخول")}</Link></nav><span>© menuPilot</span></div>
    </footer>
  );
}

export default function LandingPageSpecial() {
  return (
    <main className="special-landing" dir={dir}>
      <a className="sp-skip" href="#main-content">{t("تخطَّ إلى المحتوى")}</a>
      <Header />
      <div id="main-content"><Hero /><RouteSection /><ToolsSection /><DemoSection /><PricingSection /><MorningSection /><FAQSection /></div>
      <Footer />
    </main>
  );
}
