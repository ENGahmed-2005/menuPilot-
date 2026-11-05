import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpLeft,
  Bike,
  Check,
  ChefHat,
  CircleHelp,
  FileBarChart,
  Menu,
  QrCode,
  Receipt,
  Smartphone,
  Store,
  UsersRound,
  X,
} from "lucide-react";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import { demoGuestTable } from "../../api/demo";
import { useAuth } from "../../context/AuthContext";
import { ADDON_ORDER, MAIN_PLANS, SUBSCRIPTION_ADDONS, SUBSCRIPTION_PLANS } from "../../config/subscriptions";
import { dir, lang, t } from "../../i18n";
import { landingTeam } from "./landing-team-data.js";
import "./landing-editorial.css";

const NAVIGATION = [
  ["#journey", "رحلة الطلب"],
  ["#platform", "المنصة"],
  ["#demo", "جرّب بنفسك"],
  ["#pricing", "الأسعار"],
  ["#team", "الفريق"],
  ["#faq", "الأسئلة الشائعة"],
];

const JOURNEY = [
  {
    number: "01",
    role: "على الطاولة",
    heading: "يمسح الضيف رمز الطاولة.",
    copy: "يفتح المنيو في المتصفح مباشرةً، من دون الحاجة إلى تنزيل تطبيق.",
    image: "menu",
    alt: "منيو menuPilot على الهاتف",
    icon: Smartphone,
  },
  {
    number: "02",
    role: "إرسال الطلب",
    heading: "يختار ويرسل طلبه.",
    copy: "تصل تفاصيل الطلب إلى فريق المطعم، ويتابع المطبخ حالته أثناء التحضير.",
    image: "kitchen",
    alt: "شاشة الطلبات في مطبخ menuPilot",
    icon: QrCode,
  },
  {
    number: "03",
    role: "الفاتورة",
    heading: "تابع الجلسة حتى الفاتورة.",
    copy: "راجع الفاتورة والمدفوعات، وأغلق جلسة الطاولة من شاشة الكاشير.",
    image: "cashier",
    alt: "شاشة الكاشير والفواتير في menuPilot",
    icon: Receipt,
  },
];

const PLATFORM = [
  {
    number: "01",
    category: "المنيو والطلبات",
    heading: "منيو مطعمك، وطلبٌ أسهل.",
    copy: "اعرض المنيو عبر QR للطاولات أو رابط للاستلام والتوصيل. يتوفر تخصيص الشعار والألوان والخلفية والخط بحسب الخطة والإضافات.",
    image: "online",
    alt: "منيو وطلبات المطعم عبر الإنترنت",
    icon: QrCode,
  },
  {
    number: "02",
    category: "الطلبات والمطبخ",
    heading: "كل طلب أمام فريق التحضير.",
    copy: "استقبل الطلبات على شاشة المطبخ، وتابع حالتها ومراحل تحضيرها خلال الخدمة.",
    image: "kitchen",
    alt: "واجهة شاشة المطبخ والطلبات",
    icon: ChefHat,
  },
  {
    number: "03",
    category: "الطاولات والفواتير",
    heading: "الجلسة والحساب في مسار واحد.",
    copy: "تابع الطاولات والجلسات والطلبات، وأدر الفواتير والمدفوعات وإغلاق الجلسات من شاشة الكاشير.",
    image: "cashier",
    alt: "واجهة الطاولات والفواتير",
    icon: Receipt,
  },
  {
    number: "04",
    category: "إدارة المطعم",
    heading: "صورة أوضح لصاحب المطعم.",
    copy: "راجع التقارير وسجل الطلبات، وأدر المنيو والطاولات والفريق من لوحة واحدة. بعض الأدوات تعتمد على الخطة.",
    image: "dashboard",
    alt: "لوحة إدارة المطعم والتقارير",
    icon: FileBarChart,
  },
  {
    number: "05",
    category: "الفريق والصلاحيات",
    heading: "فريقك، حاضر في الصورة.",
    copy: "نظّم حسابات الموظفين وأدوارهم وصلاحياتهم، وتابع سجلات الحضور والغياب.",
    image: "attendance",
    alt: "واجهة الفريق والحضور والصلاحيات",
    icon: UsersRound,
  },
];

const FAQS = [
  ["هل يحتاج الضيف إلى تنزيل تطبيق؟", "لا. يفتح الضيف المنيو مباشرةً من متصفح هاتفه عبر رمز QR للطاولة."],
  ["ماذا تشمل التجربة المجانية؟", "تستمر التجربة 14 يومًا وتشمل جميع الميزات، ولا تحتاج إلى بطاقة ائتمانية."],
  ["هل توجد خطة لمطعم بلا صالة؟", "نعم. خطة التوصيل فقط مخصصة لطلبات الاستلام والتوصيل، من دون إدارة الطاولات."],
  ["ما الفرق بين الخطتين الأساسية والاحترافية؟", "تضيف الاحترافية التقارير وسجل الطلبات والهوية المرئية للمنيو، وتزيل حدود الطاولات والأصناف."],
  ["هل يدعم MenuPilot العربية والإنجليزية؟", "نعم. تتوفر واجهة MenuPilot بالعربية والإنجليزية."],
];

function imagePath(name) {
  return `/landing/${lang}-${name}.webp`;
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`ed-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="ed-header-inner">
        <Link className="ed-logo" to="/" aria-label={t("menuPilot، الصفحة الرئيسية")}>
          <img src="/brand/logo.webp" width="154" height="32" alt="menuPilot" />
        </Link>
        <nav className="ed-nav" aria-label={t("التنقل الرئيسي")}>
          {NAVIGATION.map(([href, label]) => <a href={href} key={href}>{t(label)}</a>)}
        </nav>
        <div className="ed-header-tools">
          <LanguageSwitch className="ed-language" />
          <Link to="/login" className="ed-login">{t("تسجيل الدخول")}</Link>
          <Link to="/register" className="ed-small-cta">{t("ابدأ مجانًا")}</Link>
        </div>
        <button
          className="ed-menu-toggle"
          type="button"
          aria-label={open ? t("إغلاق القائمة") : t("فتح القائمة")}
          aria-expanded={open}
          aria-controls="ed-mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {open && (
        <nav id="ed-mobile-nav" className="ed-mobile-nav" aria-label={t("التنقل الرئيسي")}>
          {NAVIGATION.map(([href, label]) => (
            <a href={href} key={href} onClick={() => setOpen(false)}>{t(label)}</a>
          ))}
          <div className="ed-mobile-actions">
            <LanguageSwitch />
            <Link to="/login" onClick={() => setOpen(false)}>{t("تسجيل الدخول")}</Link>
            <Link to="/register" className="ed-small-cta" onClick={() => setOpen(false)}>{t("ابدأ مجانًا")}</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="ed-hero" aria-labelledby="ed-hero-title">
      <div className="ed-hero-copy">
        <p className="ed-kicker"><span>MENUPILOT / OPERATIONS</span>{t("إدارة المطعم، من أول طلب إلى آخر تفصيلة")}</p>
        <h1 id="ed-hero-title">{t("مطعمك،") }<br /><span>{t("في مسار أوضح.")}</span></h1>
        <div className="ed-hero-lower">
          <p>{t("القائمة الرقمية والطلبات والطاولات والمطبخ والفواتير والفريق؛ تفاصيل يومك في مساحة واحدة، ليبقى فريقك أقرب لضيوفك.")}</p>
          <div className="ed-hero-actions">
            <Link to="/register" className="ed-button ed-button-orange">{t("ابدأ تجربة 14 يومًا مجانًا")}<ArrowUpLeft size={17} aria-hidden="true" /></Link>
            <a href="#demo" className="ed-button ed-button-link">{t("ادخل المطعم التجريبي")}<ArrowDownLeft size={16} aria-hidden="true" /></a>
          </div>
          <div className="ed-hero-assurance">
            <span><Check size={14} aria-hidden="true" />{t("بلا بطاقة ائتمانية")}</span>
            <span><QrCode size={14} aria-hidden="true" />{t("قائمة QR بلا تطبيق")}</span>
          </div>
        </div>
      </div>
      <div className="ed-hero-art" role="group" aria-label={t("لقطات من واجهات MenuPilot")}>
        <div className="ed-art-index"><span>{t("منصة menuPilot")}</span><span>01—05 / PRODUCT</span></div>
        <div className="ed-art-dashboard">
          <div className="ed-art-browser"><span /><span /><span /><i>menupilot.app / {t("لوحة المطعم")}</i></div>
          <img src={imagePath("dashboard")} alt={t("لقطة من لوحة إدارة MenuPilot")} width="1600" height="1000" fetchPriority="high" />
          <span className="ed-art-caption"><Store size={13} aria-hidden="true" />{t("لوحة إدارة المطعم")}</span>
        </div>
        <div className="ed-art-phone">
          <div className="ed-phone-speaker" />
          <img src={imagePath("menu")} alt={t("لقطة من منيو MenuPilot على الهاتف")} width="560" height="1212" fetchPriority="high" />
          <span className="ed-phone-label">01 / {t("قائمة QR")}</span>
        </div>
        <div className="ed-art-kitchen">
          <span className="ed-art-kitchen-label">02 / {t("المطبخ")}</span>
          <img src={imagePath("kitchen")} alt={t("لقطة من شاشة المطبخ في MenuPilot")} width="1600" height="1000" fetchPriority="high" />
        </div>
        <span className="ed-art-axis"><span className="ed-live-dot" />{t("لقطات من واجهات المنتج")}</span>
      </div>
      <div className="ed-hero-foot">
        <span>{t("منيو الضيف · الطلبات · المطبخ · إدارة المطعم")}</span>
        <a href="#journey" aria-label={t("انتقل إلى رحلة الطلب")}><ArrowDownLeft size={17} aria-hidden="true" /></a>
      </div>
    </section>
  );
}

function ValueStrip() {
  return (
    <section className="ed-value-strip" aria-label={t("قيمة menuPilot")}>
      <span>{t("ما يحتاجه فريق مطعمك، في مساحة واحدة")}</span>
      <span><QrCode size={15} aria-hidden="true" />{t("منيو رقمي وطلبات QR")}</span>
      <span><ChefHat size={15} aria-hidden="true" />{t("متابعة مباشرة للمطبخ")}</span>
      <span><Receipt size={15} aria-hidden="true" />{t("طاولات وفواتير مترابطة")}</span>
      <span><UsersRound size={15} aria-hidden="true" />{t("فريق المطعم وصلاحياته")}</span>
    </section>
  );
}

function Journey() {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(Number(entry.target.dataset.journeyIndex));
      });
    }, { rootMargin: "-38% 0px -38% 0px" });
    const steps = section.querySelectorAll("[data-journey-index]");
    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="journey" ref={sectionRef} className="ed-journey">
      <div className="ed-journey-intro">
        <p className="ed-kicker"><span>THE ORDER FLOW</span>{t("من الطاولة إلى الفريق")}</p>
        <h2>{t("الرحلة متصلة.")}<br /><span>{t("والتفاصيل أوضح.")}</span></h2>
        <p>{t("حين تنتقل المعلومة بسلاسة، يعرف كل شخص ما عليه فعله بعد ذلك.")}</p>
      </div>
      <div className="ed-journey-body">
        <div className="ed-journey-steps">
          {JOURNEY.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className={`ed-journey-step${active === index ? " is-active" : ""}`} data-journey-index={index} key={step.number}>
                <span className="ed-journey-number">{step.number}</span>
                <div>
                  <span className="ed-journey-role"><Icon size={15} aria-hidden="true" />{t(step.role)}</span>
                  <h3>{t(step.heading)}</h3>
                  <p>{t(step.copy)}</p>
                </div>
              </article>
            );
          })}
        </div>
        <div className="ed-journey-visual">
          <div className="ed-journey-screen">
            {JOURNEY.map((step, index) => (
              <div key={step.number} className={`ed-journey-frame${active === index ? " is-active" : ""}${step.image === "menu" ? " is-portrait" : ""}`} role="img" aria-label={t(step.role)}>
                <div className="ed-screen-top"><span /><span /><span /><i>menuPilot / {t(step.role)}</i></div>
                <img
                  src={imagePath(step.image)}
                  alt={t(step.alt)}
                  width={step.image === "menu" ? "560" : "1600"}
                  height={step.image === "menu" ? "1212" : "1000"}
                  loading="lazy"
                />
                <span className="ed-screen-caption">{step.number} / {t(step.role)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Platform() {
  return (
    <section id="platform" className="ed-platform">
      <div className="ed-platform-heading">
        <div>
          <p className="ed-kicker ed-kicker-dark"><span>THE PLATFORM</span>{t("أدوات العمل اليومية")}</p>
          <h2>{t("مصدر واحد")},<br /><span>{t("لكل التفاصيل.")}</span></h2>
        </div>
        <p>{t("اجمع عمليات المطعم التي يحتاجها فريقك، واعرف ما يحدث دون التنقل بين أدوات متفرقة.")}</p>
      </div>
      <div className="ed-platform-list">
        {PLATFORM.map((item, index) => {
          const Icon = item.icon;
          const reverse = index % 2 === 1;
          const isPortrait = item.image === "menu" || item.image === "online" || item.image === "tracking";
          return (
            <article className={`ed-platform-row${reverse ? " is-reverse" : ""}`} key={item.number}>
              <div className="ed-platform-copy">
                <span className="ed-platform-meta"><b>{item.number}</b><i />{t(item.category)}</span>
                <h3>{t(item.heading)}</h3>
                <p>{t(item.copy)}</p>
                <span className="ed-platform-icon"><Icon size={18} aria-hidden="true" /></span>
              </div>
              <div className={`ed-platform-image${isPortrait ? " is-portrait" : ""}`}>
                <img
                  src={imagePath(item.image)}
                  alt={t(item.alt)}
                  width={isPortrait ? "560" : "1600"}
                  height={isPortrait ? "1212" : "1000"}
                  loading="lazy"
                />
                <span className="ed-image-mark">MENUPILOT — {item.number}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const DEMO_ROLES = [
  { id: "owner", icon: Store, title: "صاحب المطعم", description: "لوحة الإدارة والتقارير والمبيعات.", path: "/owner/dashboard", image: "dashboard", alt: "لوحة إدارة المطعم" },
  { id: "kitchen", icon: ChefHat, title: "المطبخ", description: "الطلبات الحية ومراحل التحضير.", path: "/kitchen", image: "kitchen", alt: "شاشة المطبخ والطلبات الحية" },
  { id: "cashier", icon: Receipt, title: "الكاشير", description: "الطاولات والفواتير والمدفوعات.", path: "/cashier/tables", image: "cashier", alt: "واجهة الكاشير والطاولات" },
  { id: "guest", icon: Smartphone, title: "الزبون", description: "منيو الطاولة والطلب والمتابعة.", path: null, image: "menu", alt: "منيو المطعم على الهاتف" },
];

function Demo() {
  const { startDemo } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(DEMO_ROLES[3]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function enter(role) {
    setBusy(role.id);
    setError("");
    try {
      if (role.id === "guest") {
        const tableCode = (await demoGuestTable())?.table_code;
        if (!tableCode) throw new Error(t("تعذّر فتح طاولة المطعم التجريبي."));
        navigate(`/t/${tableCode}`);
        return;
      }
      await startDemo(role.id);
      navigate(role.path);
    } catch (err) {
      setError(err?.message || t("تعذّر فتح المطعم التجريبي. حاول مرة أخرى."));
    } finally {
      setBusy("");
    }
  }

  return (
    <section id="demo" className="ed-demo">
      <div className="ed-demo-intro">
        <p className="ed-kicker"><span>OPEN RESTAURANT</span>{t("تجربة عملية، من داخل المنصة")}</p>
        <h2>{t("شاهد سير")}&nbsp;<span>{t("العمل بنفسك.")}</span></h2>
        <p>{t("اختر دورًا في المطعم التجريبي، واستكشف التجربة كما يراها كل فرد من الفريق.")}</p>
        <span className="ed-demo-footnote">{t("البيانات التجريبية تتجدد يوميًا.")}</span>
      </div>
      <div className="ed-demo-console">
        <div className="ed-console-head"><span>DEMO / {t(selectedRole.title).toUpperCase()}</span><span>MENUPILOT ↗</span></div>
        <div className="ed-demo-preview">
          <div className="ed-demo-preview-image">
            <img
              key={selectedRole.id}
              src={imagePath(selectedRole.image)}
              alt={t(selectedRole.alt)}
              width={selectedRole.image === "menu" ? "560" : "1600"}
              height={selectedRole.image === "menu" ? "1212" : "1000"}
              loading="lazy"
            />
          </div>
          <div className="ed-demo-preview-copy" aria-live="polite">
            <span className="ed-demo-index">PREVIEW / 0{DEMO_ROLES.findIndex((role) => role.id === selectedRole.id) + 1}</span>
            <strong>{t(selectedRole.title)}</strong>
            <p>{t(selectedRole.description)}</p>
          </div>
        </div>
        <div className="ed-demo-choices" role="group" aria-label={t("اختر دورًا للمتابعة")}>
          {DEMO_ROLES.map((role, index) => {
            const Icon = role.icon;
            return (
              <button
                type="button"
                className="ed-demo-row"
                key={role.id}
                aria-pressed={selectedRole.id === role.id}
                onClick={() => {
                  setSelectedRole(role);
                  setError("");
                }}
                disabled={Boolean(busy)}
              >
                <span className="ed-demo-index">0{index + 1}</span>
                <Icon size={17} aria-hidden="true" />
                <span>{t(role.title)}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="ed-demo-launch" onClick={() => enter(selectedRole)} disabled={Boolean(busy)}>
          {busy ? t("جارٍ فتح المطعم…") : t("فتح تجربة {0}", { 0: t(selectedRole.title) })}
          <ArrowUpLeft size={17} aria-hidden="true" />
        </button>
        {error && <p className="ed-demo-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const yearlyPrice = (monthlyPrice) => monthlyPrice * 10;
  const displayPrice = (monthlyPrice) => annual ? yearlyPrice(monthlyPrice) : monthlyPrice;
  const duration = annual ? t("سنويًا · دفعة 10 أشهر") : t("شهريًا");
  const planDescription = {
    basic: ["منيو QR وإدارة الطاولات", "المطبخ والكاشير والنادل"],
    pro: ["كل ما في الأساسية", "تقارير وهوية منيو وثيمات"],
    delivery_only: ["منيو رقمي وطلبات خارجية", "الاستلام والتوصيل من رابط المطعم", "للمطعم بلا صالة"],
  };

  return (
    <section id="pricing" className="ed-pricing">
      <div className="ed-pricing-heading">
        <p className="ed-kicker ed-kicker-dark"><span>SUBSCRIPTION / USD</span>{t("خطط الاشتراك")}</p>
        <h2>{t("خطط واضحة.")}<br /><span>{t("لتشغيل مطعمك.")}</span></h2>
        <p>{t("الأسعار الشهرية بالدولار. التفاصيل والحدود المعروضة مبنية على خطط MenuPilot الحالية.")}</p>
        <div className="ed-billing" role="group" aria-label={t("مدة الاشتراك")}>
          <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>{t("شهري")}</button>
          <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>{t("سنوي")}<span>{t("ادفع 10 أشهر")}</span></button>
        </div>
      </div>
      <div className="ed-plan-table">
        {[...MAIN_PLANS, "delivery_only"].map((id, index) => {
          const plan = SUBSCRIPTION_PLANS[id];
          const benefits = planDescription[id].map((item) => t(item));
          if (id === "basic") {
            benefits.push(t("حتى {0} طاولات و{1} صنفًا", {
              0: plan.limits.tables,
              1: plan.limits.menuItems,
            }));
          }
          if (id === "pro") {
            const tableLimit = plan.limits.tables === Infinity ? t("طاولات بلا حدود") : t("حتى {0} طاولات", { 0: plan.limits.tables });
            const itemLimit = plan.limits.menuItems === Infinity ? t("أصناف بلا حدود") : t("حتى {0} صنف", { 0: plan.limits.menuItems });
            benefits.push(`${tableLimit} · ${itemLimit}`);
          }
          return (
            <article className={`ed-plan${id === "pro" ? " is-popular" : ""}`} key={id}>
              <span className="ed-plan-no">0{index + 1}</span>
              <div className="ed-plan-name">
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                {id === "pro" && <span className="ed-popular">{t("الأكثر اختيارًا")}</span>}
              </div>
              <ul>{benefits.map((item) => <li key={item}><Check size={14} aria-hidden="true" />{item}</li>)}</ul>
              <p className="ed-plan-price"><strong>${displayPrice(plan.price)}</strong><span>/{duration}</span></p>
              <Link to={`/register?plan=${id}`} className="ed-plan-cta">{t("اختر الخطة")}<ArrowUpLeft size={16} aria-hidden="true" /></Link>
            </article>
          );
        })}
      </div>
      <div className="ed-addons">
        <div className="ed-addons-label"><span>{t("إضافات اختيارية")}</span><p>{t("أضف ما يحتاجه مطعمك.")}</p></div>
        <div className="ed-addon-items">
          {ADDON_ORDER.map((id) => {
            const addon = SUBSCRIPTION_ADDONS[id];
            const Icon = id === "delivery" ? Bike : Smartphone;
            return (
              <div className="ed-addon" key={id}>
                <Icon size={18} aria-hidden="true" />
                <div><strong>{addon.name}</strong><p>{addon.description}</p><small>{t("متاحة مع")} {addon.plans.map((plan) => SUBSCRIPTION_PLANS[plan].name).join(" · ")}</small></div>
                <span>+${displayPrice(addon.price)}<small>/{duration}</small></span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="ed-pricing-assurance"><Check size={15} aria-hidden="true" />{t("تجربة مجانية لمدة 14 يومًا بكل الميزات، دون بطاقة ائتمانية.")}</p>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="ed-faq">
      <div className="ed-faq-heading">
        <p className="ed-kicker ed-kicker-dark"><span>GOOD TO KNOW</span>{t("إجابات مباشرة")}</p>
        <h2>{t("أسئلة")}&nbsp;<span>{t("مهمة.")}</span></h2>
        <CircleHelp size={30} aria-hidden="true" />
      </div>
      <div className="ed-faq-list">
        {FAQS.map(([question, answer], index) => (
          <details className="ed-faq-item" key={question}>
            <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{t(question)}</strong><i>+</i></summary>
            <p>{t(answer)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Team() {
  return (
    <section id="team" className="ed-team" aria-labelledby="ed-team-title">
      <div className="ed-team-heading">
        <div>
          <p className="ed-kicker ed-kicker-dark"><span>THE PEOPLE BEHIND IT</span>{t("الفريق")}</p>
          <h2 id="ed-team-title">{landingTeam.title}</h2>
        </div>
        <p>{landingTeam.description}</p>
      </div>
      <ol className="ed-team-list">
        {landingTeam.members.map((member, index) => (
          <li className={`ed-team-card${member.head ? " is-lead" : ""}`} key={member.name}>
            <span className="ed-team-index" aria-hidden="true">0{index + 1}</span>
            <span className="ed-team-monogram" aria-hidden="true">{member.initials}</span>
            <span className="ed-team-copy">
              <strong>{member.name}</strong>
              <small>{member.role}</small>
            </span>
            <span className="ed-team-station">{member.station}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ed-footer">
      <div className="ed-footer-brand">
        <Link to="/" aria-label={t("menuPilot، الصفحة الرئيسية")}><img src="/brand/logo-stacked-on-dark.webp" width="132" height="54" loading="lazy" alt="menuPilot" /></Link>
        <p>{t("تشغيل أذكى. ضيافة أفضل.")}</p>
      </div>
      <nav aria-label={t("روابط الصفحة")}>
        <a href="#journey">{t("رحلة الطلب")}</a>
        <a href="#platform">{t("المنصة")}</a>
        <a href="#pricing">{t("الأسعار")}</a>
        <a href="#team">{t("الفريق")}</a>
        <a href="#faq">{t("الأسئلة الشائعة")}</a>
        <Link to="/login">{t("تسجيل الدخول")}</Link>
      </nav>
      <span>© menuPilot · {t("جميع الحقوق محفوظة")}</span>
    </footer>
  );
}

export default function LandingPageEditorial() {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = `${t("إدارة المطعم، من أول طلب إلى آخر تفصيلة")} | MenuPilot`;
    if (description) description.content = t("القائمة الرقمية والطلبات والطاولات والمطبخ والفواتير والفريق؛ إدارة مطعمك في منصة واحدة.");

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) description.content = previousDescription;
    };
  }, []);

  return (
    <main className="landing-editorial" lang={lang} dir={dir}>
      <Header />
      <Hero />
      <ValueStrip />
      <Journey />
      <Platform />
      <Demo />
      <Pricing />
      <Team />
      <FAQ />
      <section className="ed-final">
        <p className="ed-kicker"><span>YOUR RESTAURANT / NEXT SERVICE</span>{t("ابدأ حين تكون مستعدًا")}</p>
        <h2>{t("شغّل مطعمك")}&nbsp;<span>{t("بوضوح أكبر.")}</span></h2>
        <p>{t("ابدأ تجربتك المجانية بكل الميزات. دون بطاقة ائتمانية.")}</p>
        <Link to="/register" className="ed-button ed-button-orange">{t("ابدأ تجربتك المجانية 14 يومًا")}<ArrowUpLeft size={17} aria-hidden="true" /></Link>
      </section>
      <Footer />
    </main>
  );
}
