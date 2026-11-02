import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpLeft, BellRing, ChefHat,
  Check, CircleHelp, ClipboardList, CreditCard,
  Globe2, LayoutDashboard, Menu as MenuIcon, QrCode, ShieldCheck,
  Smartphone, Sparkles, Users, WalletCards, X, Zap,
} from "lucide-react";
import BrandLogo from "../../components/brand/Logo";
import { lang, setLang } from "../../i18n";
import "./MacLandingPage.css";

const copy = {
  ar: {
    nav: [["#platform","المنصة"],["#workflow","كيف تعمل"],["#roles","لكل فريق"],["#pricing","الأسعار"]],
    login: "تسجيل الدخول", start: "ابدأ مجانًا", eyebrow: "نظام تشغيل مطعمك، في مكان واحد",
    headline: ["خدمة أسرع.", "فوضى أقل."], intro: "من أول مسح لرمز QR إلى آخر فاتورة في اليوم. menuPilot يربط الطلبات والمطبخ والطاولات والكاشير في مسار واحد واضح.",
    primary: "ابدأ تجربتك المجانية", secondary: "اكتشف طريقة العمل", proof: ["منيو QR","متابعة مباشرة","واجهة عربية وإنجليزية"],
    window: "نظرة عامة على المطعم", today: "ملخص اليوم", sales: "مبيعات اليوم", orders: "الطلبات", tables: "الطاولات النشطة", prep: "متوسط التحضير",
    orderTitle: "آخر الطلبات", all: "عرض الكل", preparing: "قيد التحضير", received: "تم الاستلام", ready: "جاهز",
    ordersList: [["طاولة 04","برجر كلاسيك × 2","قيد التحضير"],["طاولة 09","لاتيه مثلج × 1","تم الاستلام"],["طاولة 12","بيتزا مارغريتا × 1","جاهز"]],
    sectionKicker: "مصمم حول سير العمل الحقيقي", platformTitle: "كل الأقسام. شاشة واحدة متصلة.", platformIntro: "ودّع الرسائل المتفرقة والورق وتكرار إدخال الطلب. كل شخص يعرف ما عليه فعله، ومتى.",
    features: [
      ["01","الطلب عبر QR","الضيف يتصفح المنيو ويطلب من هاتفه، بلا انتظار المنيو الورقي."],
      ["02","المطبخ في الصورة","الطلبات تصل بوضوح، وتتغير حالتها أمام الفريق لحظة بلحظة."],
      ["03","الطاولات والجلسات","اعرف حالة كل طاولة، والطلبات المرتبطة بها، ووقت طلب الفاتورة."],
      ["04","فواتير أوضح","تابع المدفوعات والأرصدة وإغلاق الجلسات من نقطة واحدة."],
      ["05","تقارير مفهومة","حوّل حركة اليوم إلى أرقام تساعدك على اتخاذ قرار أفضل."],
      ["06","مصمم لفريقك","صلاحيات منفصلة للمالك والمدير والنادل والمطبخ والكاشير."],
    ],
    workflowKicker: "من المسح إلى التقديم", workflowTitle: "الطلب يمشي. والمعلومة معه.", workflowIntro: "بدون ما يضيع الطلب بين الطاولة والمطبخ والكاشير.",
    steps: [["امسح","الضيف يمسح رمز QR الخاص بالطاولة."],["اطلب","يختار الأصناف ويرسل الطلب مباشرة."],["حضّر","المطبخ يستقبل الطلب ويحدّث حالته."],["قدّم وأغلق","الفريق يتابع التقديم والفاتورة حتى إغلاق الجلسة."]],
    rolesKicker: "كل شخص له واجهته", rolesTitle: "تجربة واحدة. أدوار واضحة.",
    roles: [["المالك والإدارة","صورة أوضح عن التشغيل والأداء.",LayoutDashboard],["المطبخ","قائمة مرتبة حسب حالة التحضير.",ChefHat],["الكاشير","الفواتير والمدفوعات وإغلاق الجلسات.",WalletCards],["النادل","متابعة الطاولات والطلبات.",Users]],
    pricingKicker: "ابدأ بدون تعقيد", pricingTitle: "جرّب menuPilot على أرض الواقع.", pricingIntro: "ابدأ بتجربة مجانية لمدة 14 يومًا، واختبر سير العمل مع فريقك قبل اتخاذ القرار.",
    priceBadge: "تجربة مجانية", priceBig: "14 يومًا", priceSub: "لتجربة النظام مع فريقك", pricePoints: ["إعداد المنيو والطاولات","تجربة مسار الطلب حتى الدفع","لوحات منفصلة حسب الدور","لا حاجة لبطاقة دفع للبدء"], priceCTA: "أنشئ حسابك", fineprint: "التفاصيل والأسعار النهائية تُعرض عند التواصل مع فريق menuPilot.",
    closing: "خلّي فريقك يركّز على الضيافة.", closingSub: "ودع menuPilot يرتّب سير الطلب من البداية للنهاية.", closingCTA: "ابدأ الآن", footer: "تشغيل أذكى. خدمة أهدأ.", top: "العودة للأعلى", menu: "فتح القائمة"
  },
  en: {
    nav: [["#platform","Platform"],["#workflow","How it works"],["#roles","For every role"],["#pricing","Pricing"]],
    login: "Log in", start: "Get started", eyebrow: "Your restaurant, running in one place",
    headline: ["Faster service.", "Less chaos."], intro: "From the first QR scan to the last bill of the day, menuPilot connects orders, kitchen, tables and checkout in one clear workflow.",
    primary: "Start your free trial", secondary: "See how it works", proof: ["QR menu","Live order flow","Arabic & English"],
    window: "Restaurant overview", today: "Today at a glance", sales: "Today's sales", orders: "Orders", tables: "Active tables", prep: "Avg. prep time",
    orderTitle: "Recent orders", all: "View all", preparing: "Preparing", received: "Received", ready: "Ready",
    ordersList: [["Table 04","Classic burger × 2","Preparing"],["Table 09","Iced latte × 1","Received"],["Table 12","Margherita pizza × 1","Ready"]],
    sectionKicker: "Designed around real service", platformTitle: "Every team. One connected flow.", platformIntro: "Replace scattered messages, paper menus and duplicate entry. Everyone knows what to do next, and when.",
    features: [
      ["01","QR ordering","Guests browse the menu and order from their phones, without waiting for a printed menu."],
      ["02","Kitchen in sync","Orders arrive clearly and their status updates for the whole team."],
      ["03","Tables & sessions","See each table's state, linked orders and bill requests at a glance."],
      ["04","Clearer checkout","Track payments, balances and session closing from one place."],
      ["05","Useful reports","Turn daily activity into numbers that support better decisions."],
      ["06","Built for your team","Separate access for owners, managers, waiters, kitchen and cashiers."],
    ],
    workflowKicker: "From scan to service", workflowTitle: "The order moves. Context moves with it.", workflowIntro: "No more orders getting lost between the table, kitchen and cashier.",
    steps: [["Scan","Guests scan the QR code assigned to their table."],["Order","They choose items and send the order directly."],["Prepare","The kitchen receives it and updates its status."],["Serve & close","The team tracks service and billing through session close."]],
    rolesKicker: "A clear screen for every person", rolesTitle: "One experience. Clear responsibilities.",
    roles: [["Owner & management","A clearer view of operations and performance.",LayoutDashboard],["Kitchen","A focused queue organized by preparation status.",ChefHat],["Cashier","Bills, payments and session closing.",WalletCards],["Waiter","Table, session and order follow-up.",Users]],
    pricingKicker: "Start without the hassle", pricingTitle: "Try menuPilot in your own restaurant.", pricingIntro: "Start with a 14-day free trial and test the workflow with your team before deciding.",
    priceBadge: "Free trial", priceBig: "14 days", priceSub: "To explore the system with your team", pricePoints: ["Set up your menu and tables","Test ordering through payment","Role-specific workspaces","No payment card required to start"], priceCTA: "Create your account", fineprint: "Final plan details and pricing are shared by the menuPilot team.",
    closing: "Let your team focus on hospitality.", closingSub: "menuPilot keeps the order moving from start to finish.", closingCTA: "Get started", footer: "Smarter operations. Calmer service.", top: "Back to top", menu: "Open menu"
  }
};

const IconTile = ({ icon: Icon, className = "" }) => <span className={`mp-icon-tile ${className}`}><Icon size={20} strokeWidth={1.8} /></span>;

function MacWindow({ c, english }) {
  return <div className="mp-window" dir="ltr">
    <div className="mp-window-bar">
      <div className="mp-window-dots"><i /><i /><i /></div>
      <div className="mp-window-title"><span className="mp-window-mark">m.</span> {c.window}</div>
      <div className="mp-window-tools"><span /><span /><span /></div>
    </div>
    <div className="mp-window-content">
      <aside className="mp-window-sidebar">
        <div className="mp-mini-brand">m<span>.</span></div>
        {[LayoutDashboard, ClipboardList, QrCode, WalletCards].map((Icon, i) => <span key={i} className={i === 0 ? "active" : ""}><Icon size={16} /></span>)}
        <div className="mp-sidebar-bottom"><CircleHelp size={16} /></div>
      </aside>
      <div className="mp-dashboard">
        <div className="mp-dash-head">
          <div><span className="mp-overline">{c.today}</span><h3>{english ? "Good morning, Ahmed" : "صباح الخير، أحمد"}</h3></div>
          <span className="mp-live"><i /> {english ? "Live" : "مباشر"}</span>
        </div>
        <div className="mp-stat-grid">
          <div className="mp-stat-card"><span>{c.sales}</span><strong>{english ? "₪ 2,840" : "٢٬٨٤٠ ₪"}</strong><small className="positive">↗ 12.8%</small><div className="mp-sparkline"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
          <div className="mp-stat-card"><span>{c.orders}</span><strong>48</strong><small>{english ? "Today" : "اليوم"}</small><div className="mp-bars"><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
          <div className="mp-stat-card"><span>{c.tables}</span><strong>18<span className="mp-stat-muted"> / 24</span></strong><small>{english ? "75% occupied" : "إشغال 75٪"}</small><div className="mp-mini-progress"><i/></div></div>
        </div>
        <div className="mp-orders-card">
          <div className="mp-orders-head"><strong>{c.orderTitle}</strong><span>{c.all} <ArrowUpLeft size={12}/></span></div>
          {c.ordersList.map((order, i) => <div className="mp-order-row" key={order[0]}><div className={`mp-order-num n${i}`}>{["04","09","12"][i]}</div><div className="mp-order-copy"><b>{order[0]}</b><small>{order[1]}</small></div><span className={`mp-order-status s${i}`}>{order[2]}</span></div>)}
        </div>
      </div>
    </div>
    <div className="mp-window-foot"><span><i/> {english ? "All systems operational" : "جميع الأنظمة تعمل"}</span><span>menuPilot OS · v1.0</span></div>
  </div>;
}

export default function MacLandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const english = lang === "en";
  const c = copy[english ? "en" : "ar"];
  const go = (path) => { setMobileOpen(false); navigate(path); };
  const Arrow = english ? ArrowRight : ArrowLeft;

  return <main className={`mp-landing ${english ? "mp-en" : "mp-ar"}`} dir={english ? "ltr" : "rtl"}>
    <div className="mp-system-bar" dir="ltr"><div className="mp-system-brand"><span className="mp-system-symbol">m.</span><span>menuPilot</span></div><div className="mp-system-menu"><span>{english ? "Platform" : "المنصة"}</span><span>{english ? "Product" : "المنتج"}</span><span>{english ? "Restaurant OS" : "نظام المطعم"}</span></div><div className="mp-system-right"><span className="mp-system-live"><i/> {english ? "All systems ready" : "جاهز للتشغيل"}</span><span className="mp-system-version">v1.0</span></div></div>
    <header className="mp-nav-wrap">
      <div className="mp-nav">
        <button className="mp-brand" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} aria-label="menuPilot"><BrandLogo on="light" height={34} /></button>
        <nav className="mp-nav-links">{c.nav.map(([href,label]) => <a href={href} key={href}>{label}</a>)}</nav>
        <div className="mp-nav-actions">
          <button className="mp-language" onClick={() => setLang(english ? "ar" : "en")}><Globe2 size={15}/>{english ? "عربي" : "English"}</button>
          <button className="mp-login" onClick={() => go("/login")}>{c.login}</button>
          <button className="mp-nav-cta" onClick={() => go("/register")}>{c.start}<Arrow size={15}/></button>
        </div>
        <button className="mp-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label={c.menu}>{mobileOpen ? <X/> : <MenuIcon/>}</button>
      </div>
      {mobileOpen && <div className="mp-mobile-menu">{c.nav.map(([href,label])=><a key={href} href={href} onClick={()=>setMobileOpen(false)}>{label}</a>)}<button onClick={()=>setLang(english?"ar":"en")}><Globe2 size={16}/>{english?"عربي":"English"}</button><button onClick={()=>go("/login")}>{c.login}</button><button className="mp-mobile-cta" onClick={()=>go("/register")}>{c.start}</button></div>}
    </header>

    <section className="mp-hero">
      <div className="mp-hero-grid" aria-hidden="true"/>
      <div className="mp-hero-inner">
        <div className="mp-hero-copy">
          <div className="mp-eyebrow"><span className="mp-eyebrow-mark"><Sparkles size={13}/></span>{c.eyebrow}</div>
          <h1>{c.headline[0]}<br/><em>{c.headline[1]}</em></h1>
          <p className="mp-hero-intro">{c.intro}</p>
          <div className="mp-hero-actions">
            <button className="mp-button-primary" onClick={() => go("/register")}>{c.primary}<Arrow size={17}/></button>
            <a className="mp-button-ghost" href="#workflow">{c.secondary}<ArrowDownLeft size={16}/></a>
          </div>
          <div className="mp-proof">{c.proof.map((item,i)=><span key={item}><Check size={14}/>{item}{i<c.proof.length-1&&<i className="mp-proof-dot"/>}</span>)}</div>
        </div>
        <div className="mp-hero-visual">
          <div className="mp-visual-orb orb-one"/><div className="mp-visual-orb orb-two"/>
          <div className="mp-float-note mp-note-top"><span className="mp-note-icon"><BellRing size={15}/></span><span><b>{english?"New order received":"طلب جديد وصل"}</b><small>{english?"Table 04 · just now":"طاولة 04 · الآن"}</small></span><span className="mp-note-pulse"/></div>
          <MacWindow c={c} english={english}/>
          <div className="mp-float-note mp-note-bottom"><span className="mp-note-check"><Check size={16}/></span><span><b>{english?"Order sent to kitchen":"تم إرسال الطلب للمطبخ"}</b><small>{english?"No extra calls needed":"بدون مكالمات إضافية"}</small></span></div>
          <div className="mp-visual-caption"><span><span className="mp-caption-dot"/> {english?"A single source of truth":"كل شيء في مكانه"}</span><span>{english?"Designed for real service":"مصمم للتشغيل الفعلي"}</span></div>
        </div>
      </div>
      <div className="mp-hero-bottom"><span>01 / 04</span><div><i/></div><span>{english?"THE RESTAURANT WORKFLOW":"مسار العمل داخل المطعم"}</span></div>
    </section>

    <section className="mp-platform mp-section" id="platform">
      <div className="mp-section-heading"><div><span className="mp-kicker"><span/> {c.sectionKicker}</span><h2>{c.platformTitle}</h2></div><p>{c.platformIntro}</p></div>
      <div className="mp-feature-grid">{c.features.map(([num,title,desc],i)=><article className={`mp-feature-card f${i+1}`} key={num}><div className="mp-feature-top"><span>{num}</span><span className="mp-feature-arrow"><ArrowUpLeft size={17}/></span></div><h3>{title}</h3><p>{desc}</p><div className="mp-feature-line"><i/></div></article>)}</div>
    </section>

    <section className="mp-workflow mp-section" id="workflow">
      <div className="mp-workflow-intro"><span className="mp-kicker"><span/>{c.workflowKicker}</span><h2>{c.workflowTitle}</h2><p>{c.workflowIntro}</p><div className="mp-workflow-tag"><Zap size={14}/>{english?"One connected flow":"مسار واحد مترابط"}</div></div>
      <div className="mp-steps">{c.steps.map(([title,desc],i)=><article className="mp-step" key={title}><div className="mp-step-number"><span>0{i+1}</span><div className="mp-step-icon">{[QrCode,Smartphone,ChefHat,CreditCard].map((Icon,j)=>i===j?<Icon key={j} size={22}/>:null)}</div></div><h3>{title}</h3><p>{desc}</p>{i<3&&<div className="mp-step-connector"><i/></div>}</article>)}</div>
    </section>

    <section className="mp-roles mp-section" id="roles">
      <div className="mp-roles-head"><span className="mp-kicker"><span/>{c.rolesKicker}</span><h2>{c.rolesTitle}</h2></div>
      <div className="mp-role-grid">{c.roles.map(([title,desc,Icon],i)=><article className="mp-role-card" key={title}><div className={`mp-role-icon role-${i}`}><Icon size={22}/></div><div><h3>{title}</h3><p>{desc}</p></div><ArrowUpLeft className="mp-role-arrow" size={17}/></article>)}</div>
    </section>

    <section className="mp-pricing mp-section" id="pricing">
      <div className="mp-pricing-card"><div className="mp-pricing-copy"><span className="mp-kicker"><span/>{c.pricingKicker}</span><h2>{c.pricingTitle}</h2><p>{c.pricingIntro}</p><div className="mp-price-points">{c.pricePoints.map(item=><span key={item}><Check size={15}/>{item}</span>)}</div></div><div className="mp-price-panel"><span className="mp-price-badge"><Sparkles size={13}/>{c.priceBadge}</span><div className="mp-price-number">{c.priceBig}</div><p>{c.priceSub}</p><button onClick={()=>go("/register")}>{c.priceCTA}<Arrow size={16}/></button><small><ShieldCheck size={13}/>{c.fineprint}</small></div></div>
    </section>

    <section className="mp-closing"><div className="mp-closing-decoration">m.</div><div className="mp-closing-content"><span className="mp-kicker"><span/>{english?"MENUPILOT · RESTAURANT OPERATIONS":"MENUPILOT · إدارة المطاعم"}</span><h2>{c.closing}</h2><p>{c.closingSub}</p><button className="mp-button-primary" onClick={()=>go("/register")}>{c.closingCTA}<Arrow size={17}/></button></div><div className="mp-closing-stamp"><span>MP</span><i/><small>{english?"ORDER · SERVE · GROW":"اطلب · قدّم · تطوّر"}</small></div></section>

    <footer className="mp-footer"><button className="mp-footer-brand" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}><BrandLogo on="dark" height={29}/></button><span>{c.footer}</span><div><a href="#platform">{english?"Platform":"المنصة"}</a><a href="#workflow">{english?"How it works":"كيف تعمل"}</a><button onClick={()=>go("/login")}>{c.login}</button><button className="mp-top-link" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>{c.top}<ArrowUpLeft size={14}/></button></div><small>© {new Date().getFullYear()} menuPilot</small></footer>
  </main>;
}
