import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Banknote,
  ChefHat,
  ClipboardList,
  Menu,
  QrCode,
  Receipt,
  Table2,
  UsersRound,
  X,
} from "lucide-react";
import { dir, lang, setLang } from "../../i18n";
import { landingTeam } from "./landing-team-data.js";
import "./landing-page.css";

const copy = {
  ar: {
    skip: "تخطَّ إلى المحتوى",
    navLabel: "التنقل الرئيسي",
    nav: [
      { href: "#workflow", label: "رحلة الطلب" },
      { href: "#tools", label: "إدارة المطعم" },
      { href: "#coordination", label: "تنسيق العمل" },
      { href: "#team", label: "أعضاء الفريق" },
    ],
    start: "ابدأ الآن",
    switchLanguage: "Switch to English",
    closeMenu: "إغلاق القائمة",
    openMenu: "فتح القائمة",
    eyebrow: "تشغيل المطعم، بوضوح أكبر",
    headline: "كل تفاصيل الخدمة،",
    headlineAccent: "في مسار واحد.",
    intro: "MenuPilot يجمع القائمة الرقمية والطلبات والطاولات والمطبخ وإدارة الفريق في مساحة واحدة.",
    explore: "اكتشف طريقة العمل",
    visualLabel: "رسم يوضح مسار العمل من قائمة QR إلى فريق المطبخ",
    visualKicker: "من أول تفاعل إلى متابعة الطلب",
    stages: [
      { name: "قائمة QR", note: "الضيف يطّلع ويطلب" },
      { name: "الطاولة", note: "الطلب مرتبط بمكانه" },
      { name: "الطلب", note: "التفاصيل تصل للفريق" },
      { name: "المطبخ", note: "متابعة حالة التحضير" },
    ],
    visualFooter: "مسار واضح للضيف والفريق",
    capabilitiesLabel: "منصة واحدة لإدارة",
    capabilities: ["القائمة عبر QR", "الطاولات والطلبات", "متابعة المطبخ", "فريق المطعم", "الفواتير والمدفوعات"],
    journey: {
      eyebrow: "رحلة الطلب",
      title: "من رمز QR إلى الفاتورة.",
      description: "استعرض كيف ترتبط خطوات الخدمة اليومية، من القائمة حتى متابعة الحساب.",
      selectStage: "اختر مرحلة لاستعراضها",
      stages: [
        { title: "قائمة QR", detail: "يمسح الضيف الرمز لفتح القائمة الرقمية والاطّلاع عليها." },
        { title: "الطاولة", detail: "يبقى الطلب مرتبطًا بالطاولة التي بدأ منها." },
        { title: "الطلب", detail: "تصل تفاصيل الطلب إلى فريق المطعم لمتابعتها." },
        { title: "الفريق والمطبخ", detail: "يتابع فريق الخدمة والمطبخ حالة الطلب أثناء العمل." },
        { title: "الفاتورة", detail: "تُراجع الفاتورة وتُتابع المدفوعات عند إتمام الخدمة." },
      ],
    },
    toolsEyebrow: "مساحة واحدة لعمل المطعم",
    toolsTitle: "الأدوات اليومية، متصلة.",
    tools: [
      { title: "قائمة رقمية عبر QR", text: "اعرض القائمة للضيف، وحدّث الأصناف والأسعار من مساحة المطعم.", label: "للضيف" },
      { title: "الطاولات والطلبات", text: "تابع جلسات الطاولات والطلبات المرتبطة بها خلال الخدمة.", label: "الصالة" },
      { title: "متابعة الطلبات", text: "راجع تفاصيل الطلب وحالته بين فريق الخدمة والمطبخ.", label: "المطبخ" },
      { title: "إدارة الموظفين", text: "نظّم حسابات الموظفين وأدوارهم وصلاحياتهم.", label: "الفريق" },
      { title: "الفواتير والمدفوعات", text: "تابع الفواتير والمدفوعات عند إتمام الخدمة.", label: "الحسابات" },
    ],
    coordination: {
      eyebrow: "تنسيق أوضح في وقت الخدمة",
      title: "كل دور يعرف ما وصل إليه الطلب.",
      description: "تظهر تفاصيل الطلب وحالته للفريق المعني؛ من استقباله في الصالة، إلى متابعته في المطبخ، ثم مراجعة الفاتورة.",
      roles: [
        { title: "فريق الخدمة", note: "استقبال الطلب", icon: "service" },
        { title: "المطبخ", note: "متابعة التحضير", icon: "kitchen" },
        { title: "الكاشير", note: "الفاتورة والمدفوعات", icon: "billing" },
      ],
      visualLabel: "رسم مجرد يربط فريق الخدمة والمطبخ والكاشير حول مسار الطلب",
    },
    closeEyebrow: "ابدأ من هنا",
    closeTitle: "اجمع تشغيل مطعمك في مكان واحد.",
    closeText: "أنشئ مساحة مطعمك وابدأ بتنظيم العمل اليومي مع MenuPilot.",
    wordmarkLabel: "MenuPilot",
    footerLabel: "إدارة المطعم، من مكان واحد.",
    login: "تسجيل الدخول",
    copyright: "جميع الحقوق محفوظة.",
  },
  en: {
    skip: "Skip to content",
    navLabel: "Main navigation",
    nav: [
      { href: "#workflow", label: "Order journey" },
      { href: "#tools", label: "Restaurant tools" },
      { href: "#coordination", label: "Team workflow" },
      { href: "#team", label: "Meet the team" },
    ],
    start: "Get started",
    switchLanguage: "التبديل إلى العربية",
    closeMenu: "Close menu",
    openMenu: "Open menu",
    eyebrow: "Restaurant operations, made clearer",
    headline: "Every part of service,",
    headlineAccent: "in one flow.",
    intro: "MenuPilot brings your digital menu, orders, tables, kitchen, and team operations into one workspace.",
    explore: "Explore the workflow",
    visualLabel: "Illustration of the workflow from a QR menu to the kitchen team",
    visualKicker: "From the first interaction to order follow-through",
    stages: [
      { name: "QR menu", note: "Guest browses and orders" },
      { name: "Table", note: "Order stays in context" },
      { name: "Order", note: "Details reach the team" },
      { name: "Kitchen", note: "Preparation is followed" },
    ],
    visualFooter: "A clear flow for guests and staff",
    capabilitiesLabel: "One workspace for",
    capabilities: ["QR menu", "Tables and orders", "Kitchen follow-up", "Restaurant staff", "Bills and payments"],
    journey: {
      eyebrow: "The order journey",
      title: "From QR code to bill.",
      description: "Explore how the everyday steps of service connect, from the menu to the final bill.",
      selectStage: "Choose a stage to explore",
      stages: [
        { title: "QR menu", detail: "A guest scans the code to open and browse the digital menu." },
        { title: "Table", detail: "The order stays connected to the table where it began." },
        { title: "Order", detail: "Order details reach the restaurant team for follow-up." },
        { title: "Team and kitchen", detail: "Service and kitchen staff follow the order status during service." },
        { title: "Bill", detail: "The bill is reviewed and payments are followed as service wraps up." },
      ],
    },
    toolsEyebrow: "One workspace for restaurant operations",
    toolsTitle: "Everyday tools, connected.",
    tools: [
      { title: "Digital menu by QR", text: "Share your menu with guests and update items and prices in your restaurant workspace.", label: "GUESTS" },
      { title: "Tables and orders", text: "Follow table sessions and their orders throughout service.", label: "FLOOR" },
      { title: "Order follow-up", text: "Review order details and status across service and kitchen teams.", label: "KITCHEN" },
      { title: "Staff management", text: "Organize staff accounts, roles, and permissions.", label: "TEAM" },
      { title: "Bills and payments", text: "Keep track of bills and payments as service wraps up.", label: "BILLING" },
    ],
    coordination: {
      eyebrow: "Clearer coordination during service",
      title: "Every role can follow the order.",
      description: "Order details and status are available to the relevant team: from receiving it on the floor, to following it in the kitchen, to reviewing the bill.",
      roles: [
        { title: "Service team", note: "Receive the order", icon: "service" },
        { title: "Kitchen", note: "Follow preparation", icon: "kitchen" },
        { title: "Cashier", note: "Bill and payments", icon: "billing" },
      ],
      visualLabel: "Abstract illustration connecting service, kitchen, and cashier around an order flow",
    },
    closeEyebrow: "A good place to start",
    closeTitle: "Bring restaurant operations together.",
    closeText: "Set up your restaurant workspace and organize the daily flow with MenuPilot.",
    wordmarkLabel: "MenuPilot",
    footerLabel: "Restaurant operations, in one place.",
    login: "Log in",
    copyright: "All rights reserved.",
  },
};

const stageIcons = [QrCode, Table2, ClipboardList, ChefHat, Receipt];
const toolIcons = [QrCode, Table2, ClipboardList, UsersRound, Banknote];
const capabilityIcons = [QrCode, Table2, ClipboardList, UsersRound, Receipt];
const coordinationIcons = { service: Table2, kitchen: ChefHat, billing: Receipt };

function BrandWordmark({ label }) {
  return (
    <span className="mp-editorial-wordmark" aria-label={label}>
      <span className="mp-editorial-wordmark-mark" aria-hidden="true">M</span>
      <span>Menu<span className="mp-editorial-wordmark-accent">Pilot</span></span>
    </span>
  );
}

function DirectionalArrow({ className, ...props }) {
  const Icon = lang === "ar" ? ArrowLeft : ArrowRight;
  return <Icon className={className} aria-hidden="true" {...props} />;
}

function updateMeta(attribute, name, content) {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  const created = !element;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.append(element);
  }
  const previous = element.getAttribute("content");
  element.setAttribute("content", content);
  return () => {
    if (created) element.remove();
    else if (previous === null) element.removeAttribute("content");
    else element.setAttribute("content", previous);
  };
}

function hideMeta(attribute, name) {
  const element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) return () => {};
  const content = element.getAttribute("content");
  const nextSibling = element.nextSibling;
  element.remove();
  return () => {
    if (content !== null) element.setAttribute("content", content);
    document.head.insertBefore(element, nextSibling?.parentNode === document.head ? nextSibling : null);
  };
}

export default function LandingPageV2() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);
  const [isMobileJourney, setIsMobileJourney] = useState(
    () => window.matchMedia("(max-width: 700px)").matches,
  );
  const journeyTabRefs = useRef([]);
  const text = copy[lang];
  const activeStage = text.journey.stages[activeJourneyStep];
  const journeyProgress = `${(activeJourneyStep / (text.journey.stages.length - 1)) * 100}%`;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${text.eyebrow} | MenuPilot`;
    const cleanups = [
      updateMeta("name", "description", text.intro),
      updateMeta("property", "og:title", `${text.eyebrow} | MenuPilot`),
      updateMeta("property", "og:description", text.intro),
      hideMeta("property", "og:image"),
      hideMeta("name", "twitter:image"),
    ];
    return () => {
      document.title = previousTitle;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [text]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    const sections = text.nav
      .map(({ href }) => document.querySelector(href))
      .filter(Boolean);
    if (!("IntersectionObserver" in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [text.nav]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    const updateLayout = () => setIsMobileJourney(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  function changeLanguage() {
    setLang(lang === "ar" ? "en" : "ar");
  }

  function handleJourneyKeyDown(event, index) {
    const previousKey = isMobileJourney ? "ArrowUp" : dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    const nextKey = isMobileJourney ? "ArrowDown" : dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    let nextIndex = index;

    if (event.key === previousKey) nextIndex = (index - 1 + text.journey.stages.length) % text.journey.stages.length;
    else if (event.key === nextKey) nextIndex = (index + 1) % text.journey.stages.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = text.journey.stages.length - 1;
    else return;

    event.preventDefault();
    setActiveJourneyStep(nextIndex);
    journeyTabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="mp-editorial" lang={lang} dir={dir}>
      <a className="mp-editorial-skip" href="#main">{text.skip}</a>
      <header className="mp-editorial-header">
        <div className="mp-editorial-nav">
          <Link to="/" className="mp-editorial-logo" aria-label={text.wordmarkLabel}>
            <BrandWordmark label={text.wordmarkLabel} />
          </Link>
          <nav className="mp-editorial-links" aria-label={text.navLabel}>
            {text.nav.map((item) => (
              <a
                href={item.href}
                key={item.href}
                className={activeSection === item.href ? "is-active" : ""}
                aria-current={activeSection === item.href ? "location" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mp-editorial-actions">
            <button
              className="mp-editorial-language"
              type="button"
              onClick={changeLanguage}
              aria-label={text.switchLanguage}
            >
              <span className={lang === "ar" ? "is-current" : ""}>AR</span>
              <span aria-hidden="true">/</span>
              <span className={lang === "en" ? "is-current" : ""}>EN</span>
            </button>
            <Link to="/register" className="mp-editorial-nav-cta">
              {text.start}<DirectionalArrow size={16} />
            </Link>
          </div>
          <button
            className="mp-editorial-menu-button"
            type="button"
            aria-label={menuOpen ? text.closeMenu : text.openMenu}
            aria-expanded={menuOpen}
            aria-controls="mp-editorial-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mp-editorial-mobile-menu" id="mp-editorial-mobile-menu" aria-label={text.navLabel}>
            {text.nav.map((item) => (
              <a
                href={item.href}
                key={item.href}
                className={activeSection === item.href ? "is-active" : ""}
                aria-current={activeSection === item.href ? "location" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link to="/register" onClick={() => setMenuOpen(false)}>{text.start}<DirectionalArrow size={16} /></Link>
          </nav>
        )}
      </header>

      <main id="main">
        <section className="mp-editorial-hero" aria-labelledby="mp-editorial-title">
          <div className="mp-editorial-hero-inner">
            <div className="mp-editorial-copy">
              <p className="mp-editorial-eyebrow"><span aria-hidden="true" />{text.eyebrow}</p>
              <h1 id="mp-editorial-title">{text.headline}<span>{text.headlineAccent}</span></h1>
              <p className="mp-editorial-intro">{text.intro}</p>
              <div className="mp-editorial-hero-actions">
                <Link to="/register" className="mp-editorial-primary">{text.start}<DirectionalArrow size={17} /></Link>
                <a className="mp-editorial-secondary" href="#workflow">{text.explore}<ArrowDown size={16} aria-hidden="true" /></a>
              </div>
            </div>
            <div className="mp-flow-art" role="img" aria-label={text.visualLabel}>
              <div className="mp-flow-art-top">
                <span>{text.visualKicker}</span>
                <span className="mp-flow-index" aria-hidden="true">01 — 04</span>
              </div>
              <div className="mp-flow-art-body" aria-hidden="true">
                <svg className="mp-flow-line" viewBox="0 0 760 220" preserveAspectRatio="none">
                  <path d="M56 110 C150 110 147 65 250 65 S355 160 455 145 S570 74 704 110" />
                  <path d="M56 110 C150 110 147 65 250 65 S355 160 455 145 S570 74 704 110" className="mp-flow-line-accent" />
                </svg>
                {text.stages.map((stage, index) => {
                  const Icon = stageIcons[index];
                  return (
                    <div className={`mp-flow-node mp-flow-node-${index + 1}`} key={stage.name}>
                      <span className="mp-flow-node-icon"><Icon size={22} strokeWidth={1.7} /></span>
                      <span className="mp-flow-node-copy">
                        <strong>{stage.name}</strong>
                        <small>{stage.note}</small>
                      </span>
                      <span className="mp-flow-node-number">0{index + 1}</span>
                    </div>
                  );
                })}
                <span className="mp-flow-center">
                  <span className="mp-flow-core-mark">M</span>
                </span>
              </div>
              <div className="mp-flow-art-bottom">
                <span className="mp-flow-live-mark" aria-hidden="true" />
                <span>{text.visualFooter}</span>
                <span className="mp-flow-brand-mark" aria-hidden="true">M</span>
              </div>
            </div>
          </div>
          <div className="mp-editorial-index" aria-hidden="true"><span>01</span><i /> MENUPILOT / OPERATIONS</div>
        </section>

        <section className="mp-capabilities" aria-label={text.capabilitiesLabel}>
          <div className="mp-editorial-container mp-capabilities-inner">
            <span className="mp-capabilities-label">{text.capabilitiesLabel}</span>
            <div className="mp-capabilities-list">
              {text.capabilities.map((capability, index) => {
                const Icon = capabilityIcons[index];
                return (
                  <span className="mp-capability" key={capability}>
                    <Icon size={15} strokeWidth={1.6} aria-hidden="true" />
                    {capability}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mp-editorial-workflow" id="workflow" aria-labelledby="mp-journey-title">
          <div className="mp-editorial-container">
            <div className="mp-section-heading">
              <div>
                <p className="mp-editorial-eyebrow"><span aria-hidden="true" />{text.journey.eyebrow}</p>
                <h2 id="mp-journey-title">{text.journey.title}</h2>
              </div>
              <p>{text.journey.description}</p>
            </div>
            <div
              className="mp-journey"
              style={{ "--mp-journey-progress": journeyProgress }}
            >
              <div
                className="mp-journey-stations"
                role="tablist"
                aria-label={text.journey.selectStage}
                aria-orientation={isMobileJourney ? "vertical" : "horizontal"}
              >
                <div className="mp-journey-track" aria-hidden="true">
                  <span className="mp-journey-progress" />
                  <span className="mp-journey-moving-dot" />
                </div>
                {text.journey.stages.map((stage, index) => {
                  const Icon = stageIcons[index];
                  const selected = index === activeJourneyStep;
                  return (
                    <button
                      className={`mp-journey-stage${selected ? " is-active" : ""}`}
                      id={`mp-journey-tab-${index}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="mp-journey-panel"
                      tabIndex={selected ? 0 : -1}
                      key={stage.title}
                      ref={(element) => { journeyTabRefs.current[index] = element; }}
                      onClick={() => setActiveJourneyStep(index)}
                      onKeyDown={(event) => handleJourneyKeyDown(event, index)}
                    >
                      <span className="mp-journey-stage-icon"><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></span>
                      <span className="mp-journey-stage-title">{stage.title}</span>
                      <span className="mp-journey-stage-number" aria-hidden="true">0{index + 1}</span>
                    </button>
                  );
                })}
              </div>
              <div
                className="mp-journey-panel"
                id="mp-journey-panel"
                role="tabpanel"
                aria-labelledby={`mp-journey-tab-${activeJourneyStep}`}
                tabIndex={0}
                aria-live="polite"
              >
                <span className="mp-journey-panel-number" aria-hidden="true">0{activeJourneyStep + 1}</span>
                <div>
                  <h3>{activeStage.title}</h3>
                  <p>{activeStage.detail}</p>
                </div>
                <span className="mp-journey-panel-icon" aria-hidden="true">
                  {(() => {
                    const Icon = stageIcons[activeJourneyStep];
                    return <Icon size={22} strokeWidth={1.6} />;
                  })()}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mp-editorial-tools" id="tools" aria-labelledby="mp-tools-title">
          <div className="mp-editorial-container">
            <div className="mp-tools-heading">
              <p className="mp-editorial-eyebrow"><span aria-hidden="true" />{text.toolsEyebrow}</p>
              <h2 id="mp-tools-title">{text.toolsTitle}</h2>
            </div>
            <div className="mp-tools-list">
              {text.tools.map((tool, index) => {
                const Icon = toolIcons[index];
                return (
                  <div className={`mp-tool-wrap${index === 0 ? " is-featured" : ""}`} key={tool.title}>
                    <article className="mp-tool-item">
                      <span className="mp-tool-index">0{index + 1}</span>
                      <span className="mp-tool-icon"><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span>
                      <span className="mp-tool-label">{tool.label}</span>
                      <h3>{tool.title}</h3>
                      <p>{tool.text}</p>
                    </article>
                    {index === 0 && (
                      <div className="mp-featured-visual" aria-hidden="true">
                        <div className="mp-featured-qr">
                          <QrCode size={82} strokeWidth={1.15} />
                          <span>QR</span>
                        </div>
                        <span className="mp-featured-orbit mp-featured-orbit-one" />
                        <span className="mp-featured-orbit mp-featured-orbit-two" />
                        <span className="mp-featured-caption">{lang === "ar" ? "قائمتك، أقرب لضيوفك" : "Your menu, closer to guests"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mp-editorial-coordination" id="coordination" aria-labelledby="mp-coordination-title">
          <div className="mp-editorial-container mp-coordination-layout">
            <div className="mp-coordination-copy">
              <p className="mp-editorial-eyebrow"><span aria-hidden="true" />{text.coordination.eyebrow}</p>
              <h2 id="mp-coordination-title">{text.coordination.title}</h2>
              <p>{text.coordination.description}</p>
            </div>
            <div className="mp-coordination-visual" role="img" aria-label={text.coordination.visualLabel}>
              <svg className="mp-coordination-connectors" viewBox="0 0 640 360" preserveAspectRatio="none" aria-hidden="true">
                <path d="M132 84 C230 84 230 180 320 180 S410 84 508 84" />
                <path d="M132 276 C230 276 230 180 320 180 S410 276 508 276" />
              </svg>
              <div className="mp-coordination-node mp-coordination-node-one">
                {(() => { const Icon = coordinationIcons[text.coordination.roles[0].icon]; return <Icon size={21} strokeWidth={1.6} aria-hidden="true" />; })()}
                <span><strong>{text.coordination.roles[0].title}</strong><small>{text.coordination.roles[0].note}</small></span>
              </div>
              <div className="mp-coordination-node mp-coordination-node-two">
                {(() => { const Icon = coordinationIcons[text.coordination.roles[1].icon]; return <Icon size={21} strokeWidth={1.6} aria-hidden="true" />; })()}
                <span><strong>{text.coordination.roles[1].title}</strong><small>{text.coordination.roles[1].note}</small></span>
              </div>
              <div className="mp-coordination-node mp-coordination-node-three">
                {(() => { const Icon = coordinationIcons[text.coordination.roles[2].icon]; return <Icon size={21} strokeWidth={1.6} aria-hidden="true" />; })()}
                <span><strong>{text.coordination.roles[2].title}</strong><small>{text.coordination.roles[2].note}</small></span>
              </div>
              <div className="mp-coordination-hub">
                <span className="mp-coordination-hub-mark"><ClipboardList size={23} strokeWidth={1.5} aria-hidden="true" /></span>
                <strong>{lang === "ar" ? "الطلب" : "The order"}</strong>
                <small>{lang === "ar" ? "مسار متصل" : "One connected flow"}</small>
              </div>
              <span className="mp-coordination-signal mp-coordination-signal-one" aria-hidden="true" />
              <span className="mp-coordination-signal mp-coordination-signal-two" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="mp-editorial-team" id="team" aria-labelledby="mp-team-title">
          <div className="mp-editorial-container">
            <header className="mp-team-heading">
              <div>
                <p className="mp-editorial-eyebrow"><span aria-hidden="true" />{landingTeam.eyebrow}</p>
                <h2 id="mp-team-title">{landingTeam.title}</h2>
              </div>
              <p>{landingTeam.description}</p>
            </header>
            <ol className="mp-team-list">
              {landingTeam.members.map((member, index) => (
                <li className={`mp-team-card${member.head ? " is-lead" : ""}`} key={member.name}>
                  <span className="mp-team-card-index" aria-hidden="true">0{index + 1}</span>
                  <span className="mp-team-monogram" aria-hidden="true">{member.initials}</span>
                  <span className="mp-team-member-copy">
                    <strong>{member.name}</strong>
                    <small>{member.role}</small>
                  </span>
                  <span className="mp-team-station">{member.station}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mp-editorial-close" aria-labelledby="mp-close-title">
          <div className="mp-editorial-container mp-editorial-close-inner">
            <div>
              <p className="mp-editorial-eyebrow"><span aria-hidden="true" />{text.closeEyebrow}</p>
              <h2 id="mp-close-title">{text.closeTitle}</h2>
              <p>{text.closeText}</p>
            </div>
            <Link to="/register" className="mp-editorial-primary">
              {text.start}<ArrowUpLeft className="mp-editorial-directional" size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mp-editorial-footer">
        <div className="mp-editorial-container mp-editorial-footer-inner">
          <div className="mp-editorial-footer-brand">
            <Link to="/" aria-label={text.wordmarkLabel}><BrandWordmark label={text.wordmarkLabel} /></Link>
            <span>{text.footerLabel}</span>
          </div>
          <nav aria-label={text.navLabel}>
            {text.nav.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
            <Link to="/login">{text.login}</Link>
          </nav>
          <p>© {new Date().getFullYear()} MenuPilot · {text.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
