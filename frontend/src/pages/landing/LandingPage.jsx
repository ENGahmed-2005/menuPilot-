import { useState } from "react";
import { Link } from "react-router-dom";
import { useRef } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  Check,
  QrCode,
  ChefHat,
  ChartNoAxesCombined,
  UtensilsCrossed,
  ReceiptText,
  Users,
  BellRing,
  Menu,
  X,
} from "lucide-react";
import Logo from "../../components/brand/Logo";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import { lang, dir } from "../../i18n";
import TryDemo from "./components/TryDemo";
import Pricing from "./components/Pricing";
import FAQ from "./components/FAQ";
import KitchenExperience from "./components/KitchenExperience";
import useLandingScroll from "./components/useLandingScroll";
import "./landing.css";
const c = (ar, en) => (lang === "en" ? en : ar);
const chapters = [
  ["content", c("البداية", "Welcome")],
  ["kitchen-experience", c("المطبخ", "The kitchen")],
  ["product", c("المنصة", "The platform")],
  ["how-it-works", c("رحلة الطلب", "Order journey")],
  ["demo", c("التجربة", "Try it")],
  ["pricing", c("الباقات", "Plans")],
];
const chapterIds = chapters.map(([id]) => id);
const views = [
  ["dashboard", c("لوحة التحكم", "Dashboard"), ChartNoAxesCombined],
  ["menu", c("إدارة المنيو", "Menu management"), UtensilsCrossed],
  ["kitchen", c("شاشة المطبخ", "Kitchen display"), ChefHat],
];
const features = [
  [
    QrCode,
    "من الطاولة إلى المطبخ.",
    "From table to kitchen.",
    "يمسح ضيفك الرمز، يختار وجبته، ويصل الطلب مباشرة إلى فريقك.",
    "Guests scan, choose a meal, and send their order straight to your team.",
  ],
  [
    ChefHat,
    "كل طلب في مكانه.",
    "Every order in its place.",
    "شاشة واضحة للمطبخ، وحالة محدّثة للطلبات، وفريق يعرف الخطوة التالية.",
    "A clear kitchen display, updated order statuses, and a team that knows what comes next.",
  ],
  [
    ChartNoAxesCombined,
    "الصورة كاملة، أمامك.",
    "The whole picture, at a glance.",
    "تابع المبيعات والطاولات والفواتير من لوحة تحكم تجمع تفاصيل يومك.",
    "Follow sales, tables, and bills from one dashboard that brings your day together.",
  ],
];
export default function LandingPage() {
  const rootRef = useRef(null);
  const activeChapter = useLandingScroll(rootRef, chapterIds);
  const [open, setOpen] = useState(false),
    [view, setView] = useState(0),
    [ready, setReady] = useState(false);
  const links = [
    ["features", c("المميزات", "Features")],
    ["how-it-works", c("كيف يعمل؟", "How it works")],
    ["pricing", c("الباقات", "Pricing")],
    ["faq", c("الأسئلة الشائعة", "FAQ")],
  ];
  return (
    <main className="mp" dir={dir} ref={rootRef}>
      <div className="mp-scroll-progress" aria-hidden="true" />
      <nav
        className="mp-chapters"
        aria-label={c("التنقل بين أقسام الصفحة", "Page chapters")}
      >
        {chapters.map(([id, label], index) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={activeChapter === id ? "step" : undefined}
          >
            <span className="mp-chapter-label">{label}</span>
            <span className="mp-chapter-dot" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
          </a>
        ))}
      </nav>
      <a className="mp-skip" href="#content">
        {c("انتقل للمحتوى", "Skip to content")}
      </a>
      <header className="mp-header mp-wrap">
        <Link to="/" aria-label="menuPilot">
          <Logo height={35} priority />
        </Link>
        <nav
          className={open ? "mp-nav open" : "mp-nav"}
          aria-label={c("التنقل الرئيسي", "Main navigation")}
        >
          {links.map(([id, text]) => (
            <a key={id} href={"#" + id} onClick={() => setOpen(false)}>
              {text}
            </a>
          ))}
          <Link className="mp-mobile-login" to="/login">
            {c("تسجيل الدخول", "Log in")}
          </Link>
        </nav>
        <div className="mp-header-actions">
          <LanguageSwitch />
          <Link className="mp-login" to="/login">
            {c("تسجيل الدخول", "Log in")}
          </Link>
          <Link className="mp-btn mp-small" to="/register">
            {c("ابدأ الآن", "Get started")}
            <ArrowUpLeft size={16} />
          </Link>
          <button
            className="mp-menu"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={c("القائمة", "Navigation")}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <section id="content" className="mp-hero mp-wrap">
        <div className="mp-copy">
          <div className="mp-eyebrow">
            <i />
            {c(
              "تشغيل أذكى. ضيافة أفضل.",
              "SMARTER OPERATIONS. BETTER HOSPITALITY.",
            )}
          </div>
          <h1>
            {c("اهتم بضيوفك،", "Focus on your guests.")}
            <br />
            {c("واترك لنا", "We’ll handle")}
            <br />
            <span>
              {c("تفاصيل مطعمك.", "the details.")}
              <svg
                viewBox="0 0 400 16"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M4 11 Q180 -4 396 8" />
              </svg>
            </span>
          </h1>
          <p>
            {c(
              "من أول مسح للمنيو إلى آخر فاتورة. menuPilot يجمع طلباتك، مطبخك، وفريقك في مكان واحد. لتتفرغ لما تتقنه: تجربة تستحق العودة.",
              "From the first menu scan to the final bill. menuPilot brings your orders, kitchen, and team together, so you can focus on an experience worth returning for.",
            )}
          </p>
          <div className="mp-actions">
            <Link className="mp-btn" to="/register">
              {c("ابدأ رحلة مطعمك", "Get your restaurant started")}
              <ArrowLeft size={18} />
            </Link>
            <a className="mp-secondary" href="#demo">
              <span>▷</span>
              {c("جرّب بنفسك", "Try it yourself")}
            </a>
          </div>
          <div className="mp-checks">
            {[
              c("بدون أجهزة إضافية", "No extra hardware"),
              c("منيو بهوية مطعمك", "Your menu, your brand"),
              c("كل فريقك متصل", "Your whole team, connected"),
            ].map((s) => (
              <span key={s}>
                <Check size={14} />
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="mp-scene">
          <div className="mp-orbit" />
          <span className="mp-note-top">
            THE SECRET INGREDIENT IS A GOOD SYSTEM.
          </span>
          <div className="mp-dashboard">
            <div className="mp-bar">
              <span className="mp-dots">
                <i />
                <i />
                <i />
              </span>
              <span>menuPilot / {c("مطعمك", "Your restaurant")}</span>
              <span className="mp-live">● {c("متصل", "Live")}</span>
            </div>
            <div className="mp-dash-title">
              <div>
                <small>
                  {c("كل شيء تحت السيطرة", "Everything under control")}
                </small>
                <h3>
                  {c("أهلًا، يومك ألذّ معنا", "A good day starts here")}{" "}
                  <em>✦</em>
                </h3>
              </div>
              <ChartNoAxesCombined size={24} />
            </div>
            <div className="mp-stats">
              {[
                ["24", c("طلب اليوم", "Orders today")],
                ["08", c("طاولات نشطة", "Active tables")],
                [ready ? "05" : "06", c("قيد التحضير", "Preparing")],
              ].map(([n, s]) => (
                <div key={s}>
                  <small>{s}</small>
                  <strong>{n}</strong>
                  <span>↗</span>
                </div>
              ))}
            </div>
            <div className="mp-orders-heading">
              <b>{c("الطلبات المباشرة", "Live orders")}</b>
              <span>{c("بيانات توضيحية", "Illustrative data")}</span>
            </div>
            {[
              ["04", c("برجر كلاسيك × 2", "Classic burger × 2")],
              ["12", c("بيتزا مارغريتا", "Margherita pizza")],
              ["07", c("قهوة لاتيه × 2", "Caffè latte × 2")],
            ].map(([n, s], i) => (
              <div className="mp-order" key={n}>
                <span className="mp-table">
                  <UtensilsCrossed size={15} />
                  {n}
                </span>
                <div>
                  <b>{s}</b>
                  <small>{c("طلب داخل المطعم", "Dine-in order")}</small>
                </div>
                <span
                  className={
                    "mp-status " +
                    (i === 1 || (i === 0 && ready) ? "ready" : "")
                  }
                >
                  {i === 1 || (i === 0 && ready)
                    ? c("جاهز للتقديم", "Ready to serve")
                    : c("قيد التحضير", "Preparing")}
                </span>
              </div>
            ))}
            <button className="mp-demo-action" onClick={() => setReady(!ready)}>
              <Check size={14} />
              {ready
                ? c("إعادة المعاينة", "Reset preview")
                : c(
                    "جرّب: حدّث أول طلب إلى جاهز",
                    "Try it: mark the first order ready",
                  )}
            </button>
          </div>
          <div className="mp-qr">
            <QrCode size={64} strokeWidth={1.5} />
            <div>
              <b>{c("امسح. اطلب. استمتع.", "Scan. Order. Enjoy.")}</b>
              <small>
                {c(
                  "رحلة ألذ، من أول لمسة.",
                  "A better experience, from the first tap.",
                )}
              </small>
            </div>
          </div>
          <div className="mp-notification">
            <span>
              <BellRing size={20} />
            </span>
            <div>
              <b>{c("طلب جديد وصل للمطبخ!", "A new order just landed!")}</b>
              <small>{c("طاولة 04 · الآن", "Table 04 · just now")}</small>
            </div>
            <Check size={15} />
          </div>
          <div className="mp-handnote">
            {c("أقل فوضى، أكثر ضيافة", "Less chaos, more hospitality")}{" "}
            <span>↗</span>
          </div>
        </div>
      </section>
      <div className="mp-strip">
        <div className="mp-wrap">
          {[
            [QrCode, c("طلب عبر QR", "QR ordering")],
            [ChefHat, c("مطبخ متصل", "Connected kitchen")],
            [ReceiptText, c("فواتير منظّمة", "Organized billing")],
            [Users, c("فريق متناغم", "A team in sync")],
          ].map(([Icon, s]) => (
            <span key={s}>
              <Icon size={21} />
              {s}
            </span>
          ))}
        </div>
      </div>
      <KitchenExperience />
      <section id="features" className="mp-section mp-wrap" data-mp-reveal>
        <div className="mp-section-heading">
          <div>
            <span className="mp-kicker">
              {c("وصفة تشغيل أفضل", "A RECIPE FOR BETTER OPERATIONS")}
            </span>
            <h2>
              {c("وراء كل تجربة رائعة،", "Behind every great experience,")}
              <br />
              {c("مطعم يعمل بتناغم.", "a restaurant working in harmony.")}
            </h2>
          </div>
          <p>
            {c(
              "أدوات مترابطة تختصر الخطوات اليومية، وتعطي كل شخص في فريقك ما يحتاجه بالضبط.",
              "Connected tools that simplify the daily routine and give everyone on your team exactly what they need.",
            )}
          </p>
        </div>
        <div className="mp-features">
          {features.map(([Icon, ar, en, da, de], i) => (
            <article key={en}>
              <span className="mp-number">0{i + 1}</span>
              <Icon size={29} />
              <h3>{c(ar, en)}</h3>
              <p>{c(da, de)}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="product" className="mp-product mp-section" data-mp-reveal>
        <div className="mp-wrap">
          <div className="mp-centered">
            <span className="mp-kicker">
              {c("مكان واحد. الصورة كاملة.", "ONE PLACE. THE WHOLE PICTURE.")}
            </span>
            <h2>
              {c(
                "قابل مركز قيادة مطعمك.",
                "Meet your restaurant’s command center.",
              )}
            </h2>
            <p>
              {c(
                "منيو، طلبات، ومطبخ. تنقّل بين واجهات menuPilot الحقيقية.",
                "Menu, orders, and kitchen. Explore the real menuPilot interfaces.",
              )}
            </p>
          </div>
          <div
            className="mp-tabs"
            role="tablist"
            aria-label={c("واجهات المنتج", "Product views")}
          >
            {views.map(([, s, Icon], i) => (
              <button
                key={s}
                id={"mp-tab-" + i}
                role="tab"
                aria-selected={view === i}
                aria-controls="mp-preview"
                tabIndex={view === i ? 0 : -1}
                onClick={() => setView(i)}
                onKeyDown={(e) => {
                  if (
                    ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const n =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 2
                          : (view + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                    setView(n);
                    document.getElementById("mp-tab-" + n)?.focus();
                  }
                }}
              >
                <Icon size={17} />
                {s}
              </button>
            ))}
          </div>
          <div
            className={`mp-product-frame${views[view][0] === "menu" ? " mp-product-frame--menu" : ""}`}
            role="tabpanel"
            id="mp-preview"
            aria-labelledby={"mp-tab-" + view}
          >
            <div className="mp-bar">
              <span className="mp-dots">
                <i />
                <i />
                <i />
              </span>
              <span>menuPilot — {views[view][1]}</span>
              <span>↗</span>
            </div>
            <div
              className="mp-product-viewport"
              key={views[view][0]}
              aria-label={c("معاينة الواجهة كاملة", "Full interface preview")}
            >
              <img
                src={"/landing/" + lang + "-" + views[view][0] + ".webp"}
                alt={c("واجهة فعلية: ", "Actual interface: ") + views[view][1]}
                loading="lazy"
                width="1440"
                height="900"
              />
            </div>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="mp-section mp-wrap" data-mp-reveal>
        <div className="mp-centered">
          <span className="mp-kicker">
            {c("من أول مسحة لآخر لقمة", "FROM THE FIRST SCAN TO THE LAST BITE")}
          </span>
          <h2>
            {c(
              "تجربة بسيطة. من البداية للنهاية.",
              "Simple, from start to finish.",
            )}
          </h2>
        </div>
        <div className="mp-steps">
          {[
            [
              QrCode,
              "يمسح ضيفك الرمز",
              "Your guest scans",
              "منيو مطعمك على هاتفه، بدون تنزيل تطبيق.",
              "Your menu on their phone. No app download.",
            ],
            [
              ChefHat,
              "فريقك يستقبل الطلب",
              "Your team gets the order",
              "تفاصيل واضحة تصل مباشرة إلى المطبخ.",
              "Clear order details, straight to the kitchen.",
            ],
            [
              ReceiptText,
              "تكتمل التجربة",
              "Complete the experience",
              "متابعة حالة الطلب وإدارة الفاتورة في مكان واحد.",
              "Order tracking and billing, together in one place.",
            ],
          ].map(([Icon, ar, en, da, de], i) => (
            <article key={en}>
              <span className="mp-step-icon">
                <Icon size={26} />
                <small>{i + 1}</small>
              </span>
              <h3>{c(ar, en)}</h3>
              <p>{c(da, de)}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="mp-dark">
        <TryDemo />
        <Pricing />
      </div>
      <FAQ />
      <section className="mp-final" data-mp-reveal>
        <div className="mp-wrap">
          <span className="mp-kicker">
            {c("الخطوة التالية لمطعمك", "YOUR RESTAURANT’S NEXT CHAPTER")}
          </span>
          <h2>
            {c(
              "مطعمك يستحق يومًا أسهل.",
              "Your restaurant deserves an easier day.",
            )}
          </h2>
          <p>
            {c(
              "دع التفاصيل لـ menuPilot، واصنع لضيوفك تجربة أجمل.",
              "Let menuPilot take care of the details. Make your guests feel at home.",
            )}
          </p>
          <Link to="/register" className="mp-btn">
            {c("لنبدأ معًا", "Let’s get started")}
            <ArrowUpLeft size={18} />
          </Link>
        </div>
      </section>
      <footer className="mp-footer mp-wrap">
        <Logo height={30} />
        <span>
          {c(
            "تشغيل أذكى. ضيافة أفضل.",
            "Smarter operations. Better hospitality.",
          )}
        </span>
        <small>© {new Date().getFullYear()} menuPilot</small>
        <a href="#content">{c("للأعلى ↑", "Back to top ↑")}</a>
      </footer>
    </main>
  );
}
