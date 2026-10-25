import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  ChefHat,
  Menu,
  Receipt,
  Smartphone,
  Store,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import { SUBSCRIPTION_ADDONS, SUBSCRIPTION_PLANS } from "../../config/subscriptions";
import { demoGuestTable } from "../../api/demo";
import { useAuth } from "../../context/AuthContext";
import { dir, lang, t } from "../../i18n";
import { alternatives, capabilities, faqItems, storyStages, team } from "./components-v2/copy-v2";
import "./landing-v2.css";

const navigation = [
  ["#roles", "الأدوار"],
  ["#features", "المنصة"],
  ["#pricing", "الباقات"],
  ["#demo", "جرّب"],
  ["#faq", "الأسئلة"],
];

const roleIcons = [Smartphone, ChefHat, Users, Receipt, Store];
const roleImages = ["menu", "kitchen", "attendance", "cashier", "dashboard"];
const roleText = [
  "يمسح رمز الطاولة، يفتح المنيو في المتصفح، ويطلب ويتابع طلبه لحظة بلحظة، بلا تطبيق.",
  "طلبات مرتبة في شاشة واضحة؛ جديدة، قيد التحضير، وجاهزة للتقديم.",
  "يتابع الطاولات والجلسات والطلبات في مساحته المخصصة.",
  "يرى الطاولات المشغولة والفواتير والمدفوعات، ويغلق الجلسات.",
  "يدير المبيعات والمنيو والطاولات والفريق والتقارير من لوحة واحدة.",
];

function image(name) {
  return `/landing/${lang}-${name}.webp`;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 36);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  return (
    <>
      <a className="poster-skip" href="#main">{t("تخطَّ إلى المحتوى")}</a>
      <div className="poster-ribbon">
        <span>{t("14 يومًا مجانًا · بلا بطاقة ائتمانية")}</span>
        <LanguageSwitch tone="dark" className="poster-language" />
      </div>
      <header className={`poster-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="poster-header-inner">
          <Link to="/" className="poster-logo" aria-label={t("menuPilot، الصفحة الرئيسية")}>
            <img src="/brand/logo.webp" width="158" height="42" alt="menuPilot" />
          </Link>
          <nav className="poster-nav" aria-label={t("التنقل الرئيسي")}>
            {navigation.map(([href, label]) => <a href={href} key={href}>{t(label)}</a>)}
          </nav>
          <div className="poster-actions">
            <Link to="/login">{t("تسجيل الدخول")}</Link>
            <Link to="/register" className="poster-header-cta">{t("ابدأ مجانًا")}</Link>
          </div>
          <button
            className="poster-menu-toggle"
            type="button"
            aria-label={menuOpen ? t("إغلاق القائمة") : t("فتح القائمة")}
            aria-controls="poster-mobile-nav"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && (
          <nav id="poster-mobile-nav" className="poster-mobile-nav" aria-label={t("التنقل الرئيسي")}>
            {navigation.map(([href, label]) => (
              <a href={href} key={href} onClick={() => setMenuOpen(false)}>{t(label)}</a>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)}>{t("تسجيل الدخول")}</Link>
            <Link to="/register" className="poster-mobile-cta" onClick={() => setMenuOpen(false)}>{t("ابدأ مجانًا")}</Link>
          </nav>
        )}
      </header>
    </>
  );
}

function HeroTicket() {
  const [served, setServed] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setServed(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setServed(true), 1000);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  return (
    <article className={`poster-hero-ticket${served ? " is-served" : ""}`} aria-label={t("تذكرة طلب توضيحية")}>
      <div className="poster-ticket-top"><span>MENUPILOT / 001</span><span>18:42</span></div>
      <h2><span>#1</span>{t("طاولة 1")}</h2>
      <p>{t("سارة")}</p>
      <ul>
        <li>{t("فلافل")} <b>×2</b></li>
        <li>{t("شاورما عربي")} <b>×1</b></li>
      </ul>
      <span className="poster-ticket-stamp">{served ? t("جاهز") : t("جديدة")}</span>
    </article>
  );
}

function Sticker({ children, className = "" }) {
  return <span className={`poster-sticker ${className}`}>{children}</span>;
}

function Hero() {
  return (
    <section className="poster-hero" aria-labelledby="poster-title">
      <div className="poster-container poster-hero-inner">
        <p className="poster-kicker"><span>MENUPILOT</span> · {t("نظام تشغيل المطاعم، من الطاولة إلى المطبخ… بدون فوضى")}</p>
        <h1 id="poster-title">
          <span>{t("كم دقيقة استنّيت؟")}</span>
          <span className="poster-highlight">{t("ما رح تستنى.")}</span>
        </h1>
        <div className="poster-hero-bottom">
          <p>{t("من أول مسح للمنيو إلى آخر فاتورة: طلباتك ومطبخك وفريقك في مكان واحد.")}</p>
          <div className="poster-hero-ctas">
            <Link to="/register" className="poster-button poster-button-navy">{t("ابدأ 14 يومًا مجانًا")}<ArrowUpRight size={18} aria-hidden="true" /></Link>
            <a href="#demo" className="poster-text-link">{t("جرّب بنفسك")}<ArrowDown size={16} aria-hidden="true" /></a>
          </div>
        </div>
        <HeroTicket />
        <Sticker className="sticker-commission">{t("بلا عمولة")}</Sticker>
        <Sticker className="sticker-app">{t("بلا تطبيق")}</Sticker>
        <span className="poster-hero-number" aria-hidden="true">01</span>
      </div>
      <span className="poster-hero-cut" aria-hidden="true" />
    </section>
  );
}

const ticketPainPoints = [
  ["الطلب ضاع بين الطاولة والمطبخ", "ضاع"],
  ["الزبون استنّى ومشي", "ضاع"],
  ["المطبخ على ورقة", "ضاع"],
  ["النت قطع والشغل وقف", "ضاع"],
  ["الطلب وصل للمطبخ", "تم"],
  ["كل حالة واضحة للفريق", "تم"],
  ["الفاتورة انغلقت", "تم"],
];

function TicketRail() {
  const reduced = useReducedMotion();
  const tickets = [...ticketPainPoints, ...ticketPainPoints];
  return (
    <section className="poster-rail" aria-label={t("رحلة الطلب")}>
      <div className="poster-container">
        <h2>{t("الفوضى… صارت نظام.")}</h2>
      </div>
      <div className="poster-rail-window">
        <div className={`poster-rail-track${reduced ? " is-static" : ""}`}>
          {tickets.map(([label, state], index) => (
            <article className="poster-rail-ticket" key={`${index}-${label}`}>
              <span>#{String((index % 7) + 1).padStart(2, "0")}</span>
              <p>{t(label)}</p>
              <b className={state === "ضاع" ? "stamp-lost" : "stamp-done"}>{t(state)}</b>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roles() {
  const [openRole, setOpenRole] = useState(1);
  return (
    <section id="roles" className="poster-roles">
      <div className="poster-container">
        <div className="poster-section-intro">
          <span className="poster-index">01 / {t("الأدوار")}</span>
          <h2>{t("خمسة أدوار.")}<br /><span>{t("وردية واحدة.")}</span></h2>
        </div>
        <div className="poster-role-list">
          {storyStages.map((role, index) => {
            const Icon = roleIcons[index];
            const expanded = openRole === index;
            return (
              <article className={`poster-role${index % 2 ? " role-dark" : " role-orange"}${expanded ? " is-open" : ""}`} key={role.role}>
                <button
                  type="button"
                  className="poster-role-button"
                  aria-expanded={expanded}
                  aria-controls={`poster-role-panel-${index}`}
                  onClick={() => setOpenRole(index)}
                >
                  <span className="poster-role-no">0{index + 1}</span>
                  <Icon size={22} strokeWidth={2} aria-hidden="true" />
                  <span className="poster-role-name">{t(role.role)}</span>
                  <span className="poster-role-plus" aria-hidden="true">{expanded ? "−" : "+"}</span>
                </button>
                {expanded && (
                  <div className="poster-role-panel" id={`poster-role-panel-${index}`}>
                    <p>{t(roleText[index])}</p>
                    <div className={`poster-role-image${roleImages[index] === "menu" ? " is-phone" : ""}`}>
                      <img src={image(roleImages[index])} alt={t(role.alt)} width={roleImages[index] === "menu" ? 560 : 1600} height={roleImages[index] === "menu" ? 1212 : 1000} loading="lazy" decoding="async" />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Commission() {
  return (
    <section className="poster-commission">
      <div className="poster-container poster-commission-inner">
        <p className="poster-index">{t("اشتراك ثابت. نقطة.")}</p>
        <div className="poster-zero-wrap" aria-label={t("صفر بالمئة عمولة")}>
          <span className="poster-zero-outline">0%</span>
          <span className="poster-zero-solid" aria-hidden="true">0%</span>
        </div>
        <div className="poster-commission-copy">
          <h2>{t("عمولة على أي طلب.")}<br /><span>{t("اشتراك ثابت. نقطة.")}</span></h2>
          <Sticker>{t("بلا عقود · ألغِ متى شئت")}</Sticker>
        </div>
        <div className="poster-compare-stickers">
          {alternatives.map(([title, description], index) => (
            <p className={`poster-compare-sticker compare-${index + 1}`} key={title}>
              <b>{t(title)}</b><span>{t(description)}</span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Offline() {
  const [offline, setOffline] = useState(true);
  return (
    <section className="poster-offline">
      <div className="poster-container poster-offline-inner">
        <div className="poster-offline-copy">
          <p className="poster-index">02 / {t("يكمل والنت مقطوع")}</p>
          <h2>{t("النت قطع.")}<br /><span>{t("الشغل ما وقف.")}</span></h2>
          <p>{t("المطبخ والكاشير يكملون شغلهم بآخر بيانات محفوظة، والتغييرات تتزامن لحالها لما يرجع النت.")}</p>
          <p className="poster-gaza-note">{t("مطاعم غزة بتبدأ من جديد… ونظام ما بيوقف مع النت.")}</p>
        </div>
        <div className="poster-offline-console">
          <button className={`poster-physical-switch${offline ? " is-on" : ""}`} type="button" role="switch" aria-checked={offline} onClick={() => setOffline((value) => !value)}>
            <span className="poster-switch-track"><i /></span>
            <span>{t("قطع الإنترنت")}</span>
          </button>
          <div className="poster-console-kitchen">
            <div className="poster-console-title"><ChefHat size={21} aria-hidden="true" /><b>{t("شاشة المطبخ")}</b><span className={offline ? "offline-badge" : "online-badge"}>{offline ? t("غير متصل") : t("متصل")}</span></div>
            <div className="poster-console-order"><span>#1 · {t("طاولة 1")}</span><b>{t("فلافل")} ×2</b><span>{t("قيد التحضير")}</span></div>
          </div>
          <div className="poster-pending-changes"><span>{t("تغييرات بالانتظار")}</span><strong>{offline ? "3" : "0"}</strong>{!offline && <b>{t("تمت المزامنة")}</b>}</div>
          <p className="poster-offline-note">{t("طلبات جوالات الزبائن الجديدة تنتظر عودة الاتصال.")}</p>
          <WifiOff className="poster-wifi-icon" aria-hidden="true" />
          <Wifi className="poster-wifi-on" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function Features() {
  const [active, setActive] = useState(-1);
  const previewImage = active >= 0 ? capabilities[active].image : null;
  return (
    <section id="features" className="poster-features">
      <div className="poster-container poster-features-layout">
        <div className="poster-features-heading">
          <p className="poster-index">{t("المنصة")} / 08</p>
          <h2>{t("قائمة") }<br /><span>{t("الطلب.")}</span></h2>
          <div className="poster-feature-preview" aria-hidden="true">
            {previewImage
              ? <img src={image(previewImage)} alt="" width="560" height="360" loading="lazy" decoding="async" />
              : <span>menuPilot<br />↗</span>}
          </div>
        </div>
        <ol className="poster-feature-list">
          {capabilities.map((feature, index) => (
            <li key={feature.marker} className={active === index ? "is-active" : ""}>
              <button type="button" onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)}>
                <span className="poster-feature-no">{feature.marker}</span>
                <span className="poster-feature-title">{t(feature.title)}</span>
                <span className="poster-feature-dots" aria-hidden="true" />
                <span className="poster-feature-tag">{t(feature.shortTitle)}</span>
                <ArrowLeft size={19} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [addons, setAddons] = useState([]);
  const plans = ["basic", "pro", "delivery_only"];
  const amount = (value) => annual ? value * 10 : value;
  const period = annual ? t("سنويًا · ادفع 10 أشهر") : t("شهريًا");
  const limit = (value, label) => value === Infinity ? t("بلا حدود") : t("حتى {0} {1}", { 0: value, 1: t(label) });

  function toggleAddon(id) {
    setAddons((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section id="pricing" className="poster-pricing">
      <div className="poster-container">
        <div className="poster-pricing-header">
          <div><p className="poster-index">03 / {t("الباقات")}</p><h2>{t("قسيمة") }<br /><span>{t("وردية أهدأ.")}</span></h2></div>
          <div className="poster-billing-control" role="group" aria-label={t("مدة الاشتراك")}>
            <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>{t("شهري")}</button>
            <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>{t("سنوي")}</button>
          </div>
        </div>
        <p className="poster-pricing-trial">{t("14 يومًا مجانًا · بلا بطاقة ائتمانية · بلا عقود")}</p>
        <div className="poster-vouchers">
          {plans.map((id) => {
            const plan = SUBSCRIPTION_PLANS[id];
            const featured = id === "pro";
            return (
              <article className={`poster-voucher${featured ? " voucher-featured" : ""}${id === "delivery_only" ? " voucher-small" : ""}`} key={id}>
                {featured && <Sticker className="voucher-stamp">{t("الأكثر اختيارًا")}</Sticker>}
                <div className="poster-voucher-main">
                  <span className="poster-voucher-label">{plan.name}</span>
                  <p>{plan.description}</p>
                  <div className="poster-voucher-limits">
                    <span>{plan.limits.tables === 0 ? t("بلا صالة") : limit(plan.limits.tables, "طاولات")}</span>
                    <span>{limit(plan.limits.menuItems, "أصناف")}</span>
                  </div>
                  <strong className="poster-price">${amount(plan.price)}<small> / {period}</small></strong>
                  <Link to={`/register?plan=${id}`} className="poster-button poster-button-outline">{t("ابدأ التجربة")}<ArrowUpRight size={16} aria-hidden="true" /></Link>
                </div>
              </article>
            );
          })}
        </div>
        <div className="poster-addons">
          <p>{t("إضافات اختيارية")}</p>
          {["delivery", "brand_plus"].map((id) => {
            const addon = SUBSCRIPTION_ADDONS[id];
            const selected = addons.includes(id);
            return (
              <button type="button" className={`poster-addon${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => toggleAddon(id)} key={id}>
                <span>{selected ? "−" : "+"}{t(addon.name)}</span>
                <b>${amount(addon.price)} <small>/ {period}</small></b>
              </button>
            );
          })}
        </div>
        <p className="poster-price-statement">
          {t("{0} دولار بالشهر = {1} سنت باليوم. أقل من ثمن طلب واحد ضاع.", {
            0: SUBSCRIPTION_PLANS.basic.price,
            1: Math.round(SUBSCRIPTION_PLANS.basic.price / 30 * 100),
          })}
        </p>
      </div>
    </section>
  );
}

const demoRoles = [
  { id: "owner", icon: Store, label: "المالك", description: "لوحة التحكم والتقارير والمبيعات.", path: "/owner/dashboard" },
  { id: "kitchen", icon: ChefHat, label: "المطبخ", description: "طلبات حية وحالات التحضير.", path: "/kitchen" },
  { id: "cashier", icon: Receipt, label: "الكاشير", description: "طاولات وفواتير وإغلاق الجلسات.", path: "/cashier/tables" },
  { id: "guest", icon: Smartphone, label: "الزبون", description: "منيو الطاولة والطلب والمتابعة.", path: null },
];

function TryDemo() {
  const { startDemo } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const guestTable = useRef(null);

  useEffect(() => {
    const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1500));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const id = idle(() => {
      guestTable.current = demoGuestTable().then((data) => data?.table_code ?? null).catch(() => null);
    });
    return () => cancel(id);
  }, []);

  async function openRole(role) {
    setBusy(role.id);
    setError("");
    try {
      if (role.id === "guest") {
        const code = (await guestTable.current) || (await demoGuestTable())?.table_code;
        if (!code) throw new Error(t("تعذّر فتح طاولة المطعم التجريبي."));
        navigate(`/t/${code}`);
      } else {
        await startDemo(role.id);
        navigate(role.path);
      }
    } catch (err) {
      setError(err?.message || t("تعذّر فتح المطعم التجريبي. حاول مرة أخرى."));
    } finally {
      setBusy("");
    }
  }

  return (
    <section id="demo" className="poster-demo">
      <div className="poster-container">
        <div className="poster-demo-header"><p className="poster-index">04 / {t("مطعم تجريبي حي")}</p><h2>{t("النظام شغّال اليوم.")}<br /><span>{t("جرّبه قبل ما تدفع.")}</span></h2></div>
        <div className="poster-demo-buttons">
          {demoRoles.map((role, index) => {
            const Icon = role.icon;
            return (
              <button type="button" disabled={Boolean(busy)} onClick={() => openRole(role)} key={role.id}>
                <span className="poster-demo-index">0{index + 1}</span><Icon size={25} aria-hidden="true" />
                <strong>{busy === role.id ? t("جارٍ فتح المطعم…") : t(role.label)}</strong>
                <small>{t(role.description)}</small><ArrowUpRight size={20} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        {error && <p className="poster-demo-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="poster-faq">
      <div className="poster-container poster-faq-inner">
        <div><p className="poster-index">{t("قبل أن تبدأ")}</p><h2>{t("أسئلة") }<br /><span>{t("مباشرة.")}</span></h2></div>
        <div className="poster-faq-list">
          {faqItems.map(([question, answer], index) => (
            <details key={question}>
              <summary><span>0{index + 1}</span><b>{t(question)}</b><i aria-hidden="true">+</i></summary>
              <p>{t(answer)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team() {
  const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return (
    <section className="poster-team">
      <div className="poster-container">
        <p className="poster-index">{t("الفريق")}</p>
        <div className="poster-team-heading"><h2>{t("خمسة مطوّرين.")}<br /><span>{t("بنينا كل شيء بإيدينا.")}</span></h2><p>{t("تشغيل أذكى. ضيافة أفضل.")}</p></div>
        <div className="poster-name-tags">
          {team.map(([name, role], index) => (
            <article className={`poster-name-tag tag-${index + 1}`} key={name}>
              <span>{initials(name)}</span><div><h3>{t(name)}</h3><p>{t(role)}</p></div>
            </article>
          ))}
        </div>
        <div className="poster-proof-numbers"><span><b>5</b>{t("أدوار")}</span><span><b>+110</b>{t("نقطة API")}</span><span><b>+170</b>{t("اختبار آلي")}</span></div>
      </div>
    </section>
  );
}

function Final() {
  return (
    <section className="poster-final">
      <div className="poster-container">
        <p className="poster-index">00:00 · {t("أُغلق المطعم، والنظام يعمل")}</p>
        <h2>{t("المرة الجاية اللي بترفع فيها إيدك…")}<br /><span>{t("ما رح تضطر تستنى.")}</span></h2>
        <Link to="/register" className="poster-button poster-button-navy">{t("ابدأ 14 يومًا مجانًا")}<ArrowUpRight size={20} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="poster-footer">
      <div className="poster-container poster-footer-inner">
        <Link to="/" aria-label={t("menuPilot، الصفحة الرئيسية")}><img src="/brand/logo-on-dark.webp" width="158" height="42" alt="menuPilot" loading="lazy" /></Link>
        <p>{t("تشغيل أذكى. ضيافة أفضل.")}</p>
        <span>© {new Date().getFullYear()} menuPilot</span>
        <a href="#main">{t("للأعلى")} ↑</a>
      </div>
    </footer>
  );
}

export default function LandingPageV2() {
  return (
    <main id="main" className="landing-poster" lang={lang} dir={dir}>
      <Header />
      <Hero />
      <TicketRail />
      <Roles />
      <Commission />
      <Offline />
      <Features />
      <Pricing />
      <TryDemo />
      <FAQ />
      <Team />
      <Final />
      <Footer />
    </main>
  );
}
