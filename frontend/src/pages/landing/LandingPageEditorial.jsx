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
  LockKeyhole,
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
import "./landing-editorial.css";

const NAVIGATION = [
  ["#journey", "رحلة الطلب"],
  ["#platform", "المنصة"],
  ["#demo", "جرّب بنفسك"],
  ["#pricing", "الأسعار"],
];

const JOURNEY = [
  {
    number: "01",
    role: "على الطاولة",
    heading: "يمسح الضيف رمز الطاولة.",
    copy: "يفتح المنيو في المتصفح مباشرةً، من دون الحاجة إلى تنزيل تطبيق.",
    image: "menu",
    alt: "منيو menuPilot الرقمي على الهاتف",
    icon: Smartphone,
  },
  {
    number: "02",
    role: "إرسال الطلب",
    heading: "يختار ويرسل طلبه.",
    copy: "ينتقل الطلب من المنيو إلى فريق المطعم، وتبقى حالته قابلة للمتابعة.",
    image: "tracking",
    alt: "واجهة متابعة حالة الطلب على الهاتف",
    icon: QrCode,
  },
  {
    number: "03",
    role: "المطبخ",
    heading: "يظهر الطلب لدى المطبخ.",
    copy: "تصل الطلبات إلى شاشة المطبخ، وتتحدث حالتها مع تقدّم التحضير.",
    image: "kitchen",
    alt: "واجهة الطلبات الحية في شاشة المطبخ",
    icon: ChefHat,
  },
  {
    number: "04",
    role: "الفاتورة",
    heading: "تُتابَع الجلسة حتى الحساب.",
    copy: "يتابع الكاشير الفواتير والمدفوعات، ثم يغلق الجلسة عند اكتمالها.",
    image: "cashier",
    alt: "واجهة الكاشير والفواتير",
    icon: Receipt,
  },
];

const PLATFORM = [
  {
    number: "01",
    category: "المنيو والطلبات",
    heading: "منيو مطعمك، وطلبٌ أسهل.",
    copy: "خصّص الشعار والألوان والخلفية والخط، واعرض المنيو عبر QR للطاولات أو رابط المطعم للاستلام والتوصيل، بلا عمولة على الطلبات.",
    image: "online",
    alt: "واجهة المنيو والطلبات الخارجية على الهاتف",
    icon: QrCode,
  },
  {
    number: "02",
    category: "الطلبات والمطبخ",
    heading: "كل طلب أمام فريق التحضير.",
    copy: "استقبل الطلبات على شاشة المطبخ، وحدّث مراحلها، أو اعرضها في وضع شاشة الحائط. ويمكن للمطبخ متابعة العمل بآخر البيانات المحفوظة عند انقطاع الإنترنت.",
    image: "kitchen",
    alt: "شاشة المطبخ تعرض الطلبات",
    icon: ChefHat,
  },
  {
    number: "03",
    category: "الطاولات والفواتير",
    heading: "الجلسة والحساب في مسار واحد.",
    copy: "تابع الطاولات والجلسات والطلبات، وأدر الفواتير والمدفوعات وإغلاق الجلسات من شاشة الكاشير.",
    image: "cashier",
    alt: "إدارة الطاولات والفواتير والمدفوعات",
    icon: Receipt,
  },
  {
    number: "04",
    category: "إدارة المطعم",
    heading: "صورة أوضح لصاحب المطعم.",
    copy: "راجع تقارير المبيعات والمالية، وأدر المنيو والطاولات والفريق وصلاحياته من لوحة واحدة.",
    image: "dashboard",
    alt: "لوحة إدارة وتقارير المطعم",
    icon: FileBarChart,
  },
];

const ROLES = [
  { id: "owner", title: "صاحب المطعم", copy: "لوحة الإدارة وتقارير المبيعات والمالية وإدارة الفريق.", icon: Store, image: "dashboard", alt: "لوحة إدارة المطعم وتقاريره" },
  { id: "kitchen", title: "فريق المطبخ", copy: "الطلبات الواردة ومراحل التحضير على شاشة المطبخ.", icon: ChefHat, image: "kitchen", alt: "شاشة المطبخ والطلبات الواردة" },
  { id: "cashier", title: "الكاشير", copy: "الطاولات والفواتير والمدفوعات وإغلاق الجلسات.", icon: Receipt, image: "cashier", alt: "واجهة الكاشير والفواتير" },
];

const FAQS = [
  ["هل يحتاج الزبون إلى تنزيل تطبيق؟", "لا. يمسح الزبون رمز QR للطاولة ويفتح المنيو في المتصفح، ثم يطلب ويتابع حالة طلبه."],
  ["هل توجد عمولة على الطلبات؟", "لا توجد عمولة على الطلبات؛ الاشتراك شهري ثابت."],
  ["هل أحتاج إلى أجهزة إضافية؟", "لا. يعمل menuPilot على الأجهزة التي تستخدمها بالفعل، ويمكن تثبيته كتطبيق PWA."],
  ["ماذا يحدث إذا انقطع الإنترنت؟", "يستطيع المطبخ والكاشير متابعة العمل باستخدام آخر البيانات المحفوظة."],
  ["كيف تُحمى جلسات الطاولات؟", "لكل جلسة طاولة مفتاح سري، ولا يُقبل الطلب إلا من هاتف قريب من المطعم."],
  ["هل أستطيع إلغاء الاشتراك؟", "نعم، يمكنك إلغاء الاشتراك في أي وقت."],
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
          <img src="/brand/logo-stacked.webp" width="114" height="48" alt="menuPilot" />
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
    <section className="ed-hero">
      <div className="ed-hero-copy">
        <p className="ed-kicker"><span>MENUPILOT / 01</span>{t("تشغيل المطعم، بصورة أوضح")}</p>
        <h1>{t("كل طلب")},<br /><span>{t("في مكانه.")}</span></h1>
        <div className="ed-hero-lower">
          <p>{t("منيو الطاولات، الطلبات، المطبخ، والفواتير — مترابطة في منصة واحدة لفريق المطعم.")}</p>
          <div className="ed-hero-actions">
            <Link to="/register" className="ed-button ed-button-orange">{t("ابدأ تجربتك المجانية")}<ArrowUpLeft size={17} aria-hidden="true" /></Link>
            <a href="#demo" className="ed-button ed-button-link">{t("جرّب المنصة")}<ArrowDownLeft size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
      <div className="ed-hero-art" aria-label={t("لقطات حقيقية من menuPilot")}>
        <div className="ed-art-index"><span>PRODUCT / MENUPILOT</span><span>01—04</span></div>
        <div className="ed-art-dashboard">
          <div className="ed-art-browser"><span /><span /><span /><i>menupilot.app / dashboard</i></div>
          <img src={imagePath("dashboard")} alt={t("لوحة إدارة المطعم")} width="1600" height="1000" fetchPriority="high" />
          <span className="ed-art-caption">{t("الإدارة · لوحة المطعم")}</span>
        </div>
        <div className="ed-art-phone">
          <div className="ed-phone-speaker" />
          <img src={imagePath("menu")} alt={t("منيو المطعم على الهاتف")} width="560" height="1212" fetchPriority="high" />
          <span className="ed-phone-label">01 / MENU</span>
        </div>
        <div className="ed-art-kitchen">
          <span className="ed-art-kitchen-label">02 / KITCHEN</span>
          <img src={imagePath("kitchen")} alt={t("واجهة شاشة المطبخ")} width="1600" height="1000" fetchPriority="high" />
        </div>
        <span className="ed-art-axis" aria-hidden="true">01&nbsp; — &nbsp;02&nbsp; — &nbsp;03</span>
      </div>
      <div className="ed-hero-foot">
        <span>{t("نظام واحد. من أول مسح إلى آخر فاتورة.")}</span>
        <a href="#journey" aria-label={t("انتقل إلى رحلة الطلب")}><ArrowDownLeft size={17} aria-hidden="true" /></a>
      </div>
    </section>
  );
}

function ValueStrip() {
  return (
    <section className="ed-value-strip" aria-label={t("قيمة menuPilot")}>
      <span>{t("من أول مسح، تبدأ الرحلة")}</span>
      <span><QrCode size={15} aria-hidden="true" />{t("منيو رقمي وطلبات QR")}</span>
      <span><ChefHat size={15} aria-hidden="true" />{t("متابعة مباشرة للمطبخ")}</span>
      <span><Receipt size={15} aria-hidden="true" />{t("طاولات وفواتير مترابطة")}</span>
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
              <div key={step.number} className={`ed-journey-frame${active === index ? " is-active" : ""}${step.image === "menu" || step.image === "tracking" ? " is-portrait" : ""}`}>
                <div className="ed-screen-top"><span /><span /><span /><i>menuPilot / {t(step.role)}</i></div>
                <img
                  src={imagePath(step.image)}
                  alt={t(step.alt)}
                  width={step.image === "menu" || step.image === "tracking" ? 560 : 1600}
                  height={step.image === "menu" || step.image === "tracking" ? 1212 : 1000}
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
                  width={isPortrait ? 560 : 1600}
                  height={isPortrait ? 1212 : 1000}
                  loading="lazy"
                />
                <span className="ed-image-mark">MENUPILOT — {item.number}</span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="ed-platform-note">
        <span><WifiOff size={16} aria-hidden="true" />{t("المطبخ والكاشير يعملان بآخر البيانات المحفوظة عند انقطاع الإنترنت.")}</span>
        <span><LockKeyhole size={16} aria-hidden="true" />{t("مفتاح خاص لكل جلسة طاولة، والطلب من هاتف قريب من المطعم.")}</span>
      </div>
    </section>
  );
}

function Roles() {
  const [activeRole, setActiveRole] = useState(ROLES[0]);

  return (
    <section className="ed-roles">
      <div className="ed-roles-heading">
        <p className="ed-kicker"><span>ONE TEAM / CLEAR ROLES</span>{t("لكل شخص، مساحة عمله")}</p>
        <h2>{t("فريق يعرف")}&nbsp;<span>{t("خطوته التالية.")}</span></h2>
      </div>
      <div className="ed-role-stage">
        <div className="ed-role-tabs" role="group" aria-label={t("اختر مساحة العمل")}>
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <button
                type="button"
                className="ed-role-tab"
                key={role.id}
                aria-pressed={activeRole.id === role.id}
                onClick={() => setActiveRole(role)}
              >
                <Icon size={16} aria-hidden="true" />
                {t(role.title)}
              </button>
            );
          })}
        </div>
        <article className="ed-role-preview" aria-live="polite">
          <div className="ed-role-preview-image">
            <img
              key={activeRole.id}
              src={imagePath(activeRole.image)}
              alt={t(activeRole.alt)}
              width="1600"
              height="1000"
              loading="lazy"
            />
            <span className="ed-image-mark">MENUPILOT — {t(activeRole.title)}</span>
          </div>
          <div className="ed-role-preview-copy">
            <span className="ed-role-preview-index">{t("مساحة العمل")} / 0{ROLES.findIndex((role) => role.id === activeRole.id) + 1}</span>
            <h3>{t(activeRole.title)}</h3>
            <p>{t(activeRole.copy)}</p>
          </div>
        </article>
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
              width={selectedRole.image === "menu" ? 560 : 1600}
              height={selectedRole.image === "menu" ? 1212 : 1000}
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
        <h2>{t("بلا عمولة.")}<br /><span>{t("بسعر شهري واضح.")}</span></h2>
        <p>{t("اختر ما يناسب طريقة عمل مطعمك. كل خطة باشتراك شهري ثابت.")}</p>
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
      <p className="ed-pricing-assurance"><Check size={15} aria-hidden="true" />{t("تجربة مجانية 14 يومًا، دون بطاقة ائتمانية، والإلغاء في أي وقت.")}</p>
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
        <a href="#faq">{t("الأسئلة الشائعة")}</a>
        <Link to="/login">{t("تسجيل الدخول")}</Link>
      </nav>
      <span>© menuPilot · {t("جميع الحقوق محفوظة")}</span>
    </footer>
  );
}

export default function LandingPageEditorial() {
  return (
    <main className="landing-editorial" lang={lang} dir={dir}>
      <Header />
      <Hero />
      <ValueStrip />
      <Journey />
      <Platform />
      <Roles />
      <Demo />
      <Pricing />
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
