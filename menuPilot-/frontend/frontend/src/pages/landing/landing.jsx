/* ==========================================================================
   MenuPilotLanding.jsx — صفحة الهبوط الكاملة (عربي/إنجليزي + نوافذ الدخول)
   --------------------------------------------------------------------------
   دليل سريع للمبتدئ في React، هذا الملف يحتوي على:
     • كائن TEXT           → كل النصوص بلغتين في مكان واحد
     • useReveal           → Hook مخصّص (كتبناه بأنفسنا) لإظهار العناصر بالتمرير
     • مكوّنات صغيرة       → Reveal, OrderTicket, StepCard, RoleCard, FeatureCard, AuthModal
     • MenuPilotLanding    → المكوّن الرئيسي الذي يجمع كل ما سبق

   مصطلحات ستتكرر كثيرًا:
     - Component (مكوّن): دالة تُرجع JSX، اسمها يبدأ بحرف كبير.
     - Props: البيانات التي يُرسلها المكوّن الأب إلى الابن (للقراءة فقط).
     - State (حالة): بيانات تتغيّر داخل المكوّن؛ عند تغيّرها يعيد React الرسم.
     - Hook: دالة تبدأ بـ use تمنح المكوّن قدرات إضافية (حالة، تأثيرات...).
   ========================================================================== */

// من مكتبة react نجلب الـ Hooks التي سنستخدمها:
//   useState  → لتخزين قيمة متغيّرة (مثل اللغة الحالية)
//   useEffect → لتنفيذ كود بعد الرسم (مؤقتات، مستمعو أحداث، طلبات API)
//   useRef    → للإشارة إلى عنصر HTML حقيقي أو حفظ قيمة بلا إعادة رسم
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// lucide-react: مكتبة أيقونات جاهزة. كل أيقونة هي مكوّن React،
// نستخدمها هكذا: <QrCode size={20} /> — ولذلك أسماؤها بحرف كبير.
// الأقواس المعقوفة { } تعني استيرادًا مُسمّى (named import) أي أننا
// نختار قطعًا محدّدة من المكتبة، فلا يُحمّل باقيها في نسخة الإنتاج.
import {
  QrCode,
  UtensilsCrossed,
  ChefHat,
  Wallet,
  UserRound,
  Wifi,
  ShieldCheck,
  StickyNote,
  Clock3,
  ArrowRight,
  X,
  Globe,
} from "lucide-react";

/* --------------------------------------------------------------------------
   TEXT — قاموس النصوص (الترجمة)
   --------------------------------------------------------------------------
   بدل كتابة النصوص داخل الـ JSX، جمعناها هنا في كائن واحد له مفتاحان:
   en للإنجليزية و ar للعربية. في المكوّن نكتب:  const t = TEXT[lang]
   فيصبح t.hero.h1a نصًّا بالإنجليزي أو بالعربي حسب اللغة المختارة.

   الفائدة: لتعديل أي كلمة تذهب لمكان واحد فقط، وإضافة لغة ثالثة
   لا تحتاج لمس التصميم إطلاقًا.

   ملاحظة: dir هو اتجاه الكتابة، ltr من اليسار لليمين و rtl بالعكس،
   وسنضعه على العنصر الأب فيتكيّف كل التصميم تلقائيًا.
   (هذا كائن JavaScript عادي، وليس ميزة خاصة بـ React.)
   -------------------------------------------------------------------------- */
const TEXT = {
  en: {
    dir: "ltr",
    nav: { how: "How it works", roles: "For your team", features: "Features", pilot: "Book a pilot", login: "Log in", signup: "Sign up" },
    hero: {
      eyebrow: "QR ordering, table by table",
      h1a: "Scan the table.",
      h1b: "Print the order —",
      h1em: "without the paper.",
      lead: "menuPilot turns a table's QR code into a live thread from phone to kitchen to cashier. No app to install, no handwriting to decode, no order lost between the waiter's notepad and the stove.",
      ctaPrimary: "See how it works",
      ctaSecondary: "Book a pilot walkthrough",
    },
    ticket: {
      table: "TABLE 07",
      session: "SESSION #A182",
      status: "STATUS",
      items: [
        { qty: 1, name: "Grilled Halloumi Plate", note: "extra lemon" },
        { qty: 2, name: "Iced Karkade", note: "no sugar" },
        { qty: 1, name: "Lamb Maqluba", note: "no onions" },
      ],
      flow: ["OPENED", "ORDERING", "PREPARING", "READY", "SERVED", "BILL REQUESTED", "PAID", "CLOSED"],
    },
    how: {
      eyebrow: "The five-minute version",
      h2: "One table, one thread, start to finish",
      p: "Every order follows the same real sequence — from the first scan to the table going free again.",
      steps: [
        { title: "Scan", text: "Customer scans the table's QR code. A dining session opens — just a name and phone number, no account, no app." },
        { title: "Order", text: "They browse the menu, add notes like 'no onions', and send the order straight to the kitchen." },
        { title: "Prepare", text: "The order lands on the kitchen screen in seconds, sorted by prep time — no more squinting at handwriting." },
        { title: "Track", text: "The customer watches it move from Preparing to Ready to Served, live, from their own phone." },
        { title: "Close out", text: "One tap requests the bill. Cashier confirms payment — cash, card, or offline — and the table's free again." },
      ],
    },
    human: {
      eyebrow: "What we heard from owners",
      h2: "The ordering went digital. The waiter didn't.",
      p1: "Every restaurant owner we sat down with said some version of the same thing: going digital shouldn't mean the floor feels colder. So the waiter still walks the food to the table, still greets people, still notices when something's wrong.",
      p2: "menuPilot just clears the clipboard out of their hands.",
      quote: "\u201CWhat might make us say no isn't the cost — it's losing that direct connection between the waiter and the guest.\u201D",
      quoteAttr: "— a pilot restaurant owner, field interview",
    },
    roles: {
      eyebrow: "Built for the whole floor",
      h2: "Everyone gets exactly what they need — nothing more",
      list: [
        { role: "Customer", text: "Scans, orders, tracks status, requests the bill — from their own phone." },
        { role: "Waiter", text: "Opens sessions, watches tables, still delivers every plate in person." },
        { role: "Kitchen", text: "Sees new orders instantly, sorted by prep time, with elapsed-time alerts." },
        { role: "Cashier", text: "Reviews the bill, records payment, closes the session, frees the table." },
        { role: "Owner", text: "Manages the menu and tables, and watches sales trends in one place." },
      ],
    },
    features: {
      eyebrow: "Under the hood",
      h2: "Small details that survive a busy Thursday night",
      list: [
        { title: "One QR per table", text: "Generated automatically the moment a table's added — no design work, no reprints." },
        { title: "Live kitchen dashboard", text: "New orders appear within seconds, with an elapsed-time indicator instead of a sound alert." },
        { title: "Notes that don't get lost", text: "'No onions' travels with the order — not on a napkin that gets misplaced." },
        { title: "Works through a shaky connection", text: "If the internet drops at checkout, the cashier can still record the payment offline." },
        { title: "Every restaurant's own data", text: "Built multi-tenant from day one — your menu and orders are never visible to anyone else." },
        { title: "One session per table", text: "A table can't take a second order until staff close the first — no crossed tickets." },
      ],
    },
    cta: {
      h2: "Bring it to your restaurant for a week.",
      p: "No install, no commitment — just your tables, a stack of QR codes, and a live kitchen screen.",
      btn: "Book a pilot walkthrough",
    },
    footer: {
      left: "menuPilot — an academic SaaS project by taqat-codemap3",
      right: "Built around one QR code per table.",
    },
    auth: {
      loginTitle: "Log in",
      signupTitle: "Create your account",
      subtitle: "Owner access — manage your restaurant's tables, menu, and orders.",
      restaurantName: "Restaurant name",
      email: "Email address",
      password: "Password",
      confirmPassword: "Confirm password",
      loginBtn: "Log in",
      signupBtn: "Create account",
      switchToSignup: "New restaurant? Create an account",
      switchToLogin: "Already have an account? Log in",
      close: "Close",
    },
  },
  ar: {
    dir: "rtl",
    nav: { how: "كيف يعمل", roles: "لفريقك", features: "المزايا", pilot: "احجز تجربة", login: "تسجيل الدخول", signup: "إنشاء حساب" },
    hero: {
      eyebrow: "طلب عبر رمز QR، لكل طاولة",
      h1a: "امسح الطاولة.",
      h1b: "اطبع الطلب —",
      h1em: "بلا ورق.",
      lead: "منيو-بايلوت يحوّل رمز QR الخاص بالطاولة إلى خيط تواصل حي من الهاتف إلى المطبخ إلى الكاشير. بلا تطبيق يُثبَّت، وبلا خط يد يُفكّ رموزه، وبلا طلب يضيع بين دفتر النادل والموقد.",
      ctaPrimary: "شاهد كيف يعمل",
      ctaSecondary: "احجز جولة تجريبية",
    },
    ticket: {
      table: "طاولة ٠٧",
      session: "جلسة #A182",
      status: "الحالة",
      items: [
        { qty: 1, name: "صحن حلوم مشوي", note: "زيادة ليمون" },
        { qty: 2, name: "كركديه مثلج", note: "بدون سكر" },
        { qty: 1, name: "مقلوبة لحمة", note: "بدون بصل" },
      ],
      flow: ["تم الفتح", "قيد الطلب", "قيد التحضير", "جاهز", "تم التقديم", "طُلبت الفاتورة", "تم الدفع", "مغلقة"],
    },
    how: {
      eyebrow: "نسخة الخمس دقائق",
      h2: "طاولة واحدة، خيط واحد، من البداية للنهاية",
      p: "كل طلب يمرّ بنفس التسلسل الحقيقي — من أول مسح للرمز حتى تُصبح الطاولة فارغة من جديد.",
      steps: [
        { title: "مسح الرمز", text: "يمسح الزبون رمز QR الخاص بالطاولة. تُفتح جلسة طعام — فقط بالاسم ورقم الهاتف، بلا حساب وبلا تطبيق." },
        { title: "الطلب", text: "يتصفّح القائمة، يضيف ملاحظات مثل «بدون بصل»، ويرسل الطلب مباشرة إلى المطبخ." },
        { title: "التحضير", text: "يصل الطلب إلى شاشة المطبخ خلال ثوانٍ، مرتّبًا حسب وقت التحضير — بلا حاجة لفكّ خط يد." },
        { title: "المتابعة", text: "يشاهد الزبون الطلب ينتقل من قيد التحضير إلى جاهز إلى تم التقديم، مباشرة، من هاتفه." },
        { title: "الإغلاق", text: "لمسة واحدة لطلب الفاتورة. يؤكد الكاشير الدفع — نقدًا أو بطاقة أو دون اتصال — وتعود الطاولة فارغة." },
      ],
    },
    human: {
      eyebrow: "ما سمعناه من أصحاب المطاعم",
      h2: "الطلب أصبح رقميًا. النادل لم يتغيّر.",
      p1: "كل صاحب مطعم جلسنا معه قال نسخة من نفس الفكرة: التحوّل الرقمي لا يجب أن يجعل الصالة أكثر برودًا. لذلك ما زال النادل يوصل الطعام بنفسه، يستقبل الزبائن، ويلاحظ إن كان هناك خطأ ما.",
      p2: "منيو-بايلوت فقط يُزيح اللوحة الورقية من يديه.",
      quote: "«ما قد يجعلنا نرفض ليس التكلفة — بل فقدان ذلك التواصل المباشر بين النادل والضيف.»",
      quoteAttr: "— صاحب مطعم شارك في التجربة، مقابلة ميدانية",
    },
    roles: {
      eyebrow: "مصمم لكل أفراد الصالة",
      h2: "كل شخص يحصل على ما يحتاجه بالضبط — لا أكثر",
      list: [
        { role: "الزبون", text: "يمسح الرمز، يطلب، يتابع الحالة، يطلب الفاتورة — كل ذلك من هاتفه." },
        { role: "النادل", text: "يفتح الجلسات، يراقب الطاولات، وما زال يوصل كل طبق شخصيًا." },
        { role: "المطبخ", text: "يرى الطلبات الجديدة فورًا، مرتّبة حسب وقت التحضير، مع تنبيهات الوقت المنقضي." },
        { role: "الكاشير", text: "يراجع الفاتورة، يسجّل الدفع، يُغلق الجلسة، ويُحرّر الطاولة." },
        { role: "المالك", text: "يدير القائمة والطاولات، ويتابع اتجاهات المبيعات في مكان واحد." },
      ],
    },
    features: {
      eyebrow: "خلف الكواليس",
      h2: "تفاصيل صغيرة تصمد في ليلة خميس مزدحمة",
      list: [
        { title: "رمز QR واحد لكل طاولة", text: "يُنشأ تلقائيًا لحظة إضافة الطاولة — بلا تصميم يدوي وبلا إعادة طباعة." },
        { title: "لوحة مطبخ حيّة", text: "تظهر الطلبات الجديدة خلال ثوانٍ، مع مؤشر للوقت المنقضي بدل التنبيه الصوتي." },
        { title: "ملاحظات لا تضيع", text: "«بدون بصل» ترافق الطلب — لا تبقى على منديل يُفقد." },
        { title: "يعمل رغم ضعف الاتصال", text: "إن انقطع الإنترنت عند الدفع، يستطيع الكاشير تسجيل الدفعة دون اتصال." },
        { title: "بيانات كل مطعم خاصة به", text: "مبني على بنية متعددة المستأجرين من اليوم الأول — قائمتك وطلباتك لا تظهر لأي طرف آخر." },
        { title: "جلسة واحدة لكل طاولة", text: "لا يمكن لطاولة استقبال طلب ثانٍ حتى يُغلق الطاقم الأول — بلا طلبات متداخلة." },
      ],
    },
    cta: {
      h2: "جرّبه في مطعمك لمدة أسبوع.",
      p: "بلا تثبيت وبلا التزام — فقط طاولاتك، مجموعة رموز QR، وشاشة مطبخ حيّة.",
      btn: "احجز جولة تجريبية",
    },
    footer: {
      left: "منيو-بايلوت — مشروع SaaS أكاديمي من فريق taqat-codemap3",
      right: "مبني حول رمز QR واحد لكل طاولة.",
    },
    auth: {
      loginTitle: "تسجيل الدخول",
      signupTitle: "أنشئ حسابك",
      subtitle: "دخول أصحاب المطاعم — لإدارة الطاولات والقائمة والطلبات.",
      restaurantName: "اسم المطعم",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      loginBtn: "تسجيل الدخول",
      signupBtn: "إنشاء الحساب",
      switchToSignup: "مطعم جديد؟ أنشئ حسابًا",
      switchToLogin: "لديك حساب بالفعل؟ سجّل الدخول",
      close: "إغلاق",
    },
  },
};

/* --------------------------------------------------------------------------
   useReveal — Hook مخصّص (Custom Hook)
   --------------------------------------------------------------------------
   Hook مخصّص = دالة عادية اسمها يبدأ بـ "use" وتستخدم داخلها Hooks أخرى.
   فائدته: نكتب المنطق مرة واحدة ونعيد استخدامه في عدة مكوّنات.

   وظيفته هنا: يخبرنا هل العنصر ظهر في الشاشة أثناء التمرير أم لا،
   لنشغّل حركة الظهور التدريجي (fade in).
   -------------------------------------------------------------------------- */
function useReveal() {
  // useRef: صندوق نحفظ فيه إشارة إلى عنصر HTML حقيقي.
  // القيمة الحقيقية تُقرأ دائمًا من ref.current، وتبدأ null
  // لأن العنصر لم يُرسم بعد لحظة تنفيذ هذا السطر.
  const ref = useRef(null);

  // useState: يُرجع مصفوفة من عنصرين نفكّكها هكذا:
  //   visible    → القيمة الحالية (تبدأ false = مخفي)
  //   setVisible → الدالة الوحيدة المسموح بها لتغيير القيمة
  // مهم: لا تقل visible = true مباشرة، بل setVisible(true)،
  // لأن setVisible هي التي تُخبر React بإعادة الرسم.
  const [visible, setVisible] = useState(false);

  // useEffect: كود يُنفَّذ بعد أن يرسم React العنصر على الشاشة.
  // نستخدمه للتعامل مع أشياء خارج React (المتصفح، المؤقتات، الشبكة).
  useEffect(() => {
    const el = ref.current; // الآن العنصر موجود فعلًا في الصفحة
    if (!el) return; // حماية: لو لم يوجد، نخرج بهدوء

    // IntersectionObserver: أداة من المتصفح تراقب "هل العنصر ظهر في الشاشة؟"
    // (أفضل بكثير من مراقبة حدث scroll لأنها لا تُثقل المتصفح)
    const io = new IntersectionObserver(
      ([entry]) => {
        // [entry] تفكيك للمصفوفة: خُذ أول عنصر منها فقط
        if (entry.isIntersecting) {
          setVisible(true); // ظهر → شغّل الحركة
          io.disconnect(); // أوقف المراقبة، فالحركة تُشغّل مرة واحدة
        }
      },
      { threshold: 0.2 } // 0.2 = يكفي ظهور 20% من العنصر
    );

    io.observe(el); // ابدأ المراقبة

    // دالة التنظيف (cleanup): تُنفَّذ عند إزالة المكوّن من الشاشة.
    // نسيانها سبب شائع جدًّا لتسريب الذاكرة (memory leak).
    return () => io.disconnect();

    // [] = مصفوفة الاعتماديات فارغة → نفّذ هذا التأثير مرة واحدة فقط.
    // لو وضعنا [x] فسيُعاد التنفيذ كلما تغيّرت x.
    // ولو حذفناها تمامًا فسيُنفَّذ بعد كل إعادة رسم (غالبًا خطأ).
  }, []);

  // نُرجع مصفوفة ليستخدمها المكوّن كما نستخدم useState تمامًا.
  return [ref, visible];
}

/* --------------------------------------------------------------------------
   Reveal — مكوّن غلاف (Wrapper) يظهر تدريجيًا عند التمرير
   --------------------------------------------------------------------------
   الاستخدام:  <Reveal delay={100}><h2>عنوان</h2></Reveal>
   -------------------------------------------------------------------------- */
// ما بين الأقواس المعقوفة هو تفكيك الـ props:
//   children  → prop خاص يحتوي كل ما كتبته بين وسم الفتح والإغلاق
//   className = ""  → قيمة افتراضية إن لم يُرسل الـ prop
//   delay = 0       → تأخير الحركة بالمللي ثانية (لظهور متتابع للبطاقات)
function Reveal({ children, className = "", delay = 0 }) {
  const [ref, visible] = useReveal(); // نستفيد من الـ Hook أعلاه

  return (
    <div
      // ref={ref} يربط الصندوق الذي أنشأناه بهذا العنصر الحقيقي،
      // فيصبح ref.current = عنصر div هذا.
      ref={ref}
      // في JSX نكتب className وليس class، لأن class كلمة محجوزة في JavaScript.
      className={className}
      // style في JSX يستقبل كائن JavaScript لا نصًّا:
      // الأقواس الأولى { } تعني "ابدأ كود JS"، والثانية { } هي الكائن نفسه.
      // وأسماء الخصائص بصيغة camelCase: backgroundColor لا background-color.
      style={{
        // شرط ثلاثي (ternary): الشرط ? قيمة إذا صح : قيمة إذا خطأ
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(14px)",
        // النص بين علامتي ` ` يسمّى template literal ويسمح بدمج المتغيّرات
        // عبر ${...} — هكذا حوّلنا قيمة delay إلى نص CSS.
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {/* هنا يُرسم كل ما وُضع داخل <Reveal> ... </Reveal> */}
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   OrderTicket — تذكرة المطبخ المتحرّكة (العنصر المميّز في الصفحة)
   --------------------------------------------------------------------------
   تعمل على مرحلتين:
     1) تُطبع أصناف الطلب سطرًا بعد سطر (كأن الطابعة تعمل).
     2) بعد انتهاء الأسطر تبدأ الحالة بالتغيّر في حلقة لا نهائية:
        فُتحت ← قيد الطلب ← قيد التحضير ← جاهز ... حسب مصفوفة flow.
   -------------------------------------------------------------------------- */
// { lang } هو prop واحد اسمه lang، يُرسل من الأب هكذا: <OrderTicket lang={lang} />
function OrderTicket({ lang }) {
  // t = القسم الخاص بالتذكرة فقط من قاموس النصوص، لتقصير الكتابة لاحقًا.
  const t = TEXT[lang].ticket;

  // statusIdx = رقم الحالة الحالية داخل مصفوفة t.flow (0, 1, 2 ...)
  const [statusIdx, setStatusIdx] = useState(0);

  // lineCount = كم سطرًا من الطلب طُبع حتى الآن
  const [lineCount, setLineCount] = useState(0);

  // تأثير أول: عند تغيير اللغة أعِد التذكرة إلى بدايتها،
  // لأن النصوص تغيّرت فلا معنى لإكمال الحركة من منتصفها.
  // [lang] تعني: نفّذ هذا الكود فقط عندما تتغيّر قيمة lang.
  useEffect(() => {
    setStatusIdx(0);
    setLineCount(0);
  }, [lang]);

  // تأثير ثانٍ: هو محرّك الحركة كله.
  useEffect(() => {
    // ما زالت هناك أسطر لم تُطبع؟ اطبع سطرًا واحدًا بعد 550 مللي ثانية.
    if (lineCount < t.items.length) {
      // setTimeout = نفّذ مرة واحدة بعد مدة
      const tm = setTimeout(() => setLineCount((c) => c + 1), 550);

      // مهم جدًّا: نستخدم (c) => c + 1 وليس setLineCount(lineCount + 1).
      // هذا الشكل يعني "خُذ آخر قيمة فعلية وزِد عليها 1"، وهو الآمن
      // داخل المؤقتات لأن lineCount في هذه اللحظة قد يكون قيمة قديمة.

      // التنظيف: نُلغي المؤقّت قبل تنفيذ التأثير من جديد أو عند إزالة المكوّن،
      // وإلا تتراكم عدة مؤقتات تعمل معًا وتُسرّع الحركة بشكل عشوائي.
      return () => clearTimeout(tm);
    }

    // انتهت الأسطر → ندخل حلقة تغيير الحالة.
    // setInterval = كرّر التنفيذ كل 1400 مللي ثانية.
    const tm = setInterval(() => {
      // % (باقي القسمة) يجعل العدّاد يعود إلى 0 بعد آخر حالة → حلقة لا نهائية
      setStatusIdx((i) => (i + 1) % t.flow.length);
    }, 1400);
    return () => clearInterval(tm);

    // مصفوفة الاعتماديات: أي قيمة يستخدمها التأثير ويمكن أن تتغيّر تُكتب هنا.
  }, [lineCount, t.items.length, t.flow.length]);

  // متغيّرات محسوبة (derived values): تُحسب من الحالة في كل إعادة رسم.
  // لا نضعها في useState لأنها ليست بيانات مستقلّة، بل نتيجة لبيانات موجودة.
  const statusWord = t.flow[statusIdx]; // كلمة الحالة الحالية

  // === مقارنة صارمة (تتحقق من القيمة والنوع معًا).
  // flow[3] = "جاهز" و flow[6] = "تم الدفع" → حالتان إيجابيتان (أخضر)
  const isGood = statusWord === t.flow[3] || statusWord === t.flow[6];
  const isClosed = statusWord === t.flow[7]; // "مغلقة" → رمادي
  // شرط ثلاثي متسلسل: إن كانت جيدة أخضر، وإلا إن كانت مغلقة رمادي، وإلا أحمر.
  // var(--herb) هي متغيّرات CSS معرّفة في وسم <style> بأسفل الملف.
  const statusColor = isGood ? "var(--herb)" : isClosed ? "var(--ink-soft)" : "var(--brick)";

  return (
    <div className="ticket-wrap">
      <div className="ticket">
        {/* aria-hidden="true" يُخبر قارئ الشاشة أن يتجاهل هذا العنصر
            لأنه زخرفة فقط (حافة التذكرة المسنّنة) ولا يحمل معنى.
            ولاحظ أن العنصر الفارغ في JSX يجب أن يُغلق بنفسه: <div /> */}
        <div className="ticket-zig ticket-zig-top" aria-hidden="true" />

        <div className="ticket-body">
          <div className="ticket-head">
            {/* أيقونة من lucide-react. الأقواس المعقوفة حول 22 ضرورية
                لأنها رقم (قيمة JS)، أما النصوص فتُكتب بعلامتي تنصيص. */}
            <QrCode size={22} strokeWidth={1.6} />
            <span>MENUPILOT</span>
          </div>

          {/* { } داخل JSX تعني: اعرض قيمة متغيّر JavaScript هنا.
              و &nbsp; مسافة لا تُقسم، و · نقطة فاصلة زخرفية. */}
          <div className="ticket-sub">{t.table} &nbsp;·&nbsp; {t.session}</div>

          <div className="ticket-rule" />

          {/* عرض قائمة من البيانات:
              slice(0, lineCount) → خُذ الأصناف المطبوعة فقط حتى الآن
              map(...)            → حوّل كل صنف إلى عنصر JSX
              key={i}             → مفتاح فريد لكل عنصر، يحتاجه React
                                    ليعرف أي عنصر تغيّر بدل إعادة رسم القائمة.
              الأفضل استخدام معرّف حقيقي مثل key={it.id} إن توفّر من الـ API. */}
          {t.items.slice(0, lineCount).map((it, i) => (
            <div className="ticket-line" key={i}>
              <span>
                {it.qty}× {it.name}
              </span>

              {/* عرض شرطي بالمعامل && :
                  إن كانت it.note موجودة يُرسم ما بعد && ، وإن كانت
                  فارغة لا يُرسم شيء. طريقة مختصرة شائعة جدًّا في React. */}
              {it.note && <span className="ticket-note">— {it.note}</span>}
            </div>
          ))}

          {/* مؤشّر الكتابة الوامض: يظهر فقط أثناء "الطباعة" ويختفي بعدها. */}
          {lineCount < t.items.length && (
            <div className="ticket-line ticket-caret">
              <span className="caret">▌</span>
            </div>
          )}

          <div className="ticket-rule" />

          <div className="ticket-status-row">
            <span>{t.status}</span>
            {/* ستايل مضمّن (inline) لأن اللون يتغيّر مع الحالة،
                فلا يمكن تثبيته في ملف CSS. */}
            <span className="ticket-status" style={{ color: statusColor }}>
              {statusWord}
            </span>
          </div>
        </div>

        <div className="ticket-zig ticket-zig-bottom" aria-hidden="true" />
      </div>
    </div>
  );
}

/* Custom line-art illustration: a table set for two, in the copper/paper palette. */
function TableIllustration() {
  return (
    <svg viewBox="0 0 420 300" className="illus" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table setting illustration">
      <ellipse cx="210" cy="230" rx="170" ry="26" fill="var(--copper)" opacity="0.08" />
      <circle cx="150" cy="150" r="66" fill="none" stroke="var(--copper)" strokeWidth="2" />
      <circle cx="150" cy="150" r="46" fill="none" stroke="var(--copper)" strokeWidth="1.4" opacity="0.6" />
      <path d="M150 104 q26 20 0 40 q-26 20 0 40" fill="none" stroke="var(--herb)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M64 90 q-4 30 0 60" fill="none" stroke="var(--ink-soft)" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 90 v34 M64 90 v34 M72 90 v34" fill="none" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M254 90 q10 30 0 60" fill="none" stroke="var(--ink-soft)" strokeWidth="3" strokeLinecap="round" />
      <rect x="300" y="128" width="70" height="46" rx="6" fill="var(--paper-2)" stroke="var(--copper-deep)" strokeWidth="2" />
      <rect x="310" y="138" width="10" height="10" fill="var(--ink)" />
      <rect x="326" y="138" width="10" height="10" fill="var(--ink)" />
      <rect x="342" y="138" width="10" height="10" fill="var(--ink)" />
      <rect x="310" y="154" width="10" height="10" fill="var(--ink)" />
      <rect x="342" y="154" width="10" height="10" fill="var(--ink)" />
      <path d="M150 96 q-3 -16 4 -24" fill="none" stroke="var(--copper)" strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
        <animate attributeName="d" dur="3s" repeatCount="indefinite"
          values="M150 96 q-3 -16 4 -24;M150 96 q3 -18 -2 -26;M150 96 q-3 -16 4 -24" />
      </path>
      <path d="M168 96 q3 -14 -2 -22" fill="none" stroke="var(--copper)" strokeWidth="1.6" strokeLinecap="round" opacity="0.4">
        <animate attributeName="d" dur="3.4s" repeatCount="indefinite"
          values="M168 96 q3 -14 -2 -22;M168 96 q-3 -16 4 -24;M168 96 q3 -14 -2 -22" />
      </path>
    </svg>
  );
}

/* Custom line-art illustration: a phone scanning a table QR code. */
function ScanIllustration() {
  return (
    <svg viewBox="0 0 260 300" className="illus illus-scan" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Phone scanning QR illustration">
      <rect x="70" y="30" width="120" height="220" rx="18" fill="var(--paper-2)" stroke="var(--copper-deep)" strokeWidth="2.5" />
      <rect x="86" y="56" width="88" height="150" rx="4" fill="var(--ink)" opacity="0.06" />
      <rect x="98" y="70" width="64" height="64" fill="none" stroke="var(--copper)" strokeWidth="2" />
      <rect x="108" y="80" width="14" height="14" fill="var(--copper)" />
      <rect x="138" y="80" width="14" height="14" fill="var(--copper)" />
      <rect x="108" y="110" width="14" height="14" fill="var(--copper)" />
      <rect x="130" y="104" width="8" height="8" fill="var(--copper)" />
      <circle cx="130" cy="216" r="10" fill="none" stroke="var(--copper-deep)" strokeWidth="2" />
      <g opacity="0.7">
        <path d="M30 70 q-14 60 0 120" fill="none" stroke="var(--herb)" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 90 q-8 40 0 80" fill="none" stroke="var(--herb)" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

function StepCard({ n, title, text }) {
  return (
    <Reveal className="step-card" delay={n * 60}>
      <div className="step-n">{String(n).padStart(2, "0")}</div>
      <h3 className="step-title">{title}</h3>
      <p className="step-text">{text}</p>
    </Reveal>
  );
}

function RoleCard({ icon: Icon, role, text }) {
  return (
    <Reveal className="role-card">
      <div className="role-icon">
        <Icon size={20} strokeWidth={1.6} />
      </div>
      <div className="role-name">{role}</div>
      <p className="role-text">{text}</p>
    </Reveal>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <Reveal className="feature-card">
      <Icon size={18} strokeWidth={1.6} />
      <div>
        <div className="feature-title">{title}</div>
        <p className="feature-text">{text}</p>
      </div>
    </Reveal>
  );
}

/* Login / Sign-up modal — matches Sprint 1 fields (FR-01, FR-02): owner
   registration collects restaurant name, email, password, confirm password;
   login collects email + password. Wire the submit handlers to
   POST /api/auth/register and POST /api/auth/login. */


export default function MenuPilotLanding() {
  const [lang, setLang] = useState("en");

  const navigate = useNavigate();

  const t = TEXT[lang];
  const dir = t.dir;

  return (
    <div className={`mp-root ${lang === "ar" ? "mp-ar" : ""}`} dir={dir} lang={lang}>
      <style>{`
        /* Google Fonts are preloaded in index.html <head> — an @import inside an
           injected <style> tag blocks rendering and is ignored by some browsers. */
        .mp-root {
          --ink: #1F2420;
          --ink-soft: #4B5147;
          --paper: #EDE6D6;
          --paper-2: #F7F3E9;
          --copper: #B8793E;
          --copper-deep: #8F5D2C;
          --herb: #5B7A52;
          --brick: #B33F32;
          background: var(--ink);
          color: var(--paper);
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .mp-root * { box-sizing: border-box; }
        .mp-root h1, .mp-root h2, .mp-root h3 {
          font-family: 'Instrument Serif', serif;
          font-weight: 400;
          letter-spacing: -0.01em;
        }
        .mp-root a, .mp-root button, .mp-root input { font-family: inherit; }
        .mp-root :focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-root * { transition: none !important; animation: none !important; }
        }

        /* Arabic type treatment: Cairo for body/UI, Aref Ruqaa for display headings */
        .mp-ar { font-family: 'Cairo', sans-serif; }
        .mp-ar h1, .mp-ar h2, .mp-ar h3 { font-family: 'Aref Ruqaa', serif; letter-spacing: 0; }
        .mp-ar .eyebrow, .mp-ar .ticket-head, .mp-ar .ticket-sub, .mp-ar .ticket-line,
        .mp-ar .ticket-status-row, .mp-ar .step-n { font-family: 'Cairo', sans-serif; }

        .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }

        /* NAV */
        .nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 0; gap: 16px; flex-wrap: wrap;
        }
        .brand { display: flex; align-items: center; gap: 9px; font-size: 19px; letter-spacing: 0.02em; }
        .brand-mark {
          width: 30px; height: 30px; border-radius: 7px;
          background: var(--copper); display: flex; align-items: center; justify-content: center;
          color: var(--ink);
        }
        .nav-links { display: none; gap: 28px; font-size: 14px; color: var(--paper); opacity: 0.8; }
        .nav-links a { color: inherit; text-decoration: none; }
        .nav-links a:hover { opacity: 0.6; }
        @media (min-width: 760px) { .nav-links { display: flex; } }
        .nav-cta {
          font-size: 13.5px; padding: 9px 16px; border-radius: 999px;
          background: var(--paper); color: var(--ink); text-decoration: none;
          font-weight: 600; white-space: nowrap;
        }
        .nav-right { display: flex; align-items: center; gap: 10px; margin-inline-start: auto; }
        .lang-toggle {
          display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600;
          padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(237,230,214,0.3);
          background: transparent; color: var(--paper); cursor: pointer; letter-spacing: 0.03em;
        }
        .lang-toggle:hover { border-color: rgba(237,230,214,0.6); }
        .nav-auth-login {
          font-size: 13.5px; font-weight: 600; color: var(--paper); opacity: 0.85;
          background: none; border: none; cursor: pointer; padding: 8px 4px;
        }
        .nav-auth-login:hover { opacity: 1; }
        .nav-auth-signup {
          font-size: 13.5px; font-weight: 600; padding: 9px 16px; border-radius: 999px;
          background: var(--copper); color: var(--ink); border: none; cursor: pointer; white-space: nowrap;
        }
        .nav-auth-signup:hover { background: #c98849; }

        /* HERO */
        .hero { padding: 56px 0 84px; }
        .hero-grid { display: grid; grid-template-columns: 1fr; gap: 48px; align-items: center; }
        @media (min-width: 900px) { .hero-grid { grid-template-columns: 1.05fr 0.95fr; gap: 40px; } }
        .eyebrow {
          font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.14em;
          color: var(--copper); text-transform: uppercase; margin-bottom: 18px; display: block;
        }
        .hero h1 {
          font-size: clamp(36px, 5.4vw, 58px); line-height: 1.05; margin: 0 0 22px;
        }
        .hero h1 em { color: var(--copper); font-style: normal; }
        .hero p.lead {
          font-size: 17px; line-height: 1.65; color: var(--paper); opacity: 0.82; max-width: 46ch; margin: 0 0 30px;
        }
        .hero-ctas { display: flex; flex-wrap: wrap; gap: 14px; }
        .btn-primary, .btn-secondary {
          font-size: 14.5px; font-weight: 600; padding: 13px 22px; border-radius: 999px;
          text-decoration: none; display: inline-flex; align-items: center; gap: 8px; border: 1px solid transparent;
        }
        .btn-primary { background: var(--copper); color: var(--ink); }
        .btn-primary:hover { background: #c98849; }
        .btn-secondary { border-color: rgba(237,230,214,0.35); color: var(--paper); }
        .btn-secondary:hover { border-color: rgba(237,230,214,0.7); }
        [dir="rtl"] .icon-flip { transform: scaleX(-1); }

        /* TICKET */
        .ticket-wrap { display: flex; justify-content: center; }
        .ticket {
          width: min(300px, 100%);
          filter: drop-shadow(0 22px 36px rgba(0,0,0,0.35));
        }
        .ticket-body {
          background: var(--paper-2); color: var(--ink);
          padding: 26px 22px 22px;
        }
        .ticket-zig {
          height: 12px;
          background:
            linear-gradient(135deg, var(--paper-2) 25%, transparent 25.5%) 0 0/16px 16px,
            linear-gradient(-135deg, var(--paper-2) 25%, transparent 25.5%) 0 0/16px 16px;
          background-color: transparent;
        }
        .ticket-zig-top { transform: rotate(180deg); }
        .ticket-head {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Space Mono', monospace; font-weight: 700; font-size: 14px; letter-spacing: 0.06em;
        }
        .ticket-sub {
          font-family: 'Space Mono', monospace; font-size: 11px; margin-top: 6px; opacity: 0.65;
        }
        .ticket-rule {
          border-top: 1px dashed rgba(31,36,32,0.3); margin: 14px 0;
        }
        .ticket-line {
          font-family: 'Space Mono', monospace; font-size: 12.5px; display: flex;
          flex-direction: column; gap: 1px; margin-bottom: 9px; min-height: 17px;
        }
        .mp-ar .ticket-line { font-family: 'Cairo', sans-serif; }
        .ticket-note { opacity: 0.6; font-size: 11px; }
        .ticket-caret { margin-bottom: 9px; }
        .caret { animation: blink 1s step-start infinite; color: var(--copper-deep); }
        @keyframes blink { 50% { opacity: 0; } }
        .ticket-status-row {
          display: flex; justify-content: space-between; align-items: center;
          font-family: 'Space Mono', monospace; font-size: 11.5px; letter-spacing: 0.05em; margin-top: 4px;
        }
        .ticket-status { font-weight: 700; }

        /* SECTION HEADERS */
        .section { padding: 78px 0; border-top: 1px solid rgba(237,230,214,0.1); }
        .section-head { max-width: 620px; margin-bottom: 44px; }
        .section-head .eyebrow { margin-bottom: 12px; }
        .section-head h2 { font-size: clamp(26px, 3.4vw, 36px); margin: 0 0 12px; }
        .section-head p { color: var(--paper); opacity: 0.78; line-height: 1.6; font-size: 15.5px; margin: 0; }

        /* STEPS */
        .steps-grid { display: grid; grid-template-columns: 1fr; gap: 1px; background: rgba(237,230,214,0.12); border-radius: 14px; overflow: hidden; }
        @media (min-width: 800px) { .steps-grid { grid-template-columns: repeat(5, 1fr); } }
        .step-card { background: var(--ink); padding: 26px 22px; }
        .step-n { font-family: 'Space Mono', monospace; color: var(--copper); font-size: 13px; margin-bottom: 14px; }
        .step-title { font-size: 19px; margin: 0 0 8px; }
        .step-text { font-size: 13.5px; line-height: 1.55; opacity: 0.75; margin: 0; }

        /* HUMAN SECTION */
        .human {
          background: var(--paper); color: var(--ink); border-radius: 20px; padding: 48px 34px;
          display: grid; grid-template-columns: 1fr; gap: 28px;
        }
        @media (min-width: 860px) { .human { grid-template-columns: 0.7fr 0.75fr 0.85fr; padding: 56px 40px; align-items: center; } }
        .human .eyebrow { color: var(--copper-deep); }
        .human h2 { font-size: clamp(26px, 3.2vw, 34px); margin: 0 0 14px; }
        .human p { font-size: 15.5px; line-height: 1.7; opacity: 0.88; margin: 0 0 12px; }
        .human-illus { display: flex; justify-content: center; }
        .illus { width: 100%; max-width: 220px; height: auto; }
        .human-quote {
          border-inline-start: 3px solid var(--copper); padding-inline-start: 18px; font-size: 15px;
          font-style: italic; opacity: 0.85; align-self: center;
        }
        .mp-ar .human-quote { font-style: normal; }

        /* ROLES */
        .roles-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        @media (min-width: 760px) { .roles-grid { grid-template-columns: repeat(5, 1fr); } }
        .role-card {
          background: rgba(237,230,214,0.05); border: 1px solid rgba(237,230,214,0.12);
          border-radius: 14px; padding: 20px 16px;
        }
        .role-icon {
          width: 34px; height: 34px; border-radius: 9px; background: rgba(184,121,62,0.18);
          color: var(--copper); display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
        }
        .role-name { font-weight: 600; font-size: 14.5px; margin-bottom: 6px; }
        .role-text { font-size: 12.5px; line-height: 1.5; opacity: 0.7; margin: 0; }

        /* FEATURES */
        .features-grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
        @media (min-width: 700px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1000px) { .features-grid { grid-template-columns: repeat(3, 1fr); } }
        .feature-card {
          display: flex; gap: 14px; padding: 4px 0; color: var(--copper);
        }
        .feature-title { color: var(--paper); font-weight: 600; font-size: 14.5px; margin-bottom: 5px; }
        .feature-text { color: var(--paper); opacity: 0.68; font-size: 13px; line-height: 1.55; margin: 0; }

        /* CTA */
        .cta {
          text-align: center; padding: 30px 24px 10px;
        }
        .cta h2 { font-size: clamp(28px, 4vw, 42px); margin: 0 0 16px; }
        .cta p { opacity: 0.75; font-size: 15px; max-width: 46ch; margin: 0 auto 30px; }

        /* FOOTER */
        .footer {
          border-top: 1px solid rgba(237,230,214,0.1); padding: 30px 0 44px;
          display: flex; flex-direction: column; gap: 10px; font-size: 12.5px; opacity: 0.55;
        }
        @media (min-width: 700px) { .footer { flex-direction: row; justify-content: space-between; align-items: center; } }

        /* AUTH MODAL */
        .auth-overlay {
          position: fixed; inset: 0; background: rgba(15,18,15,0.72); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 100;
        }
        .auth-modal {
          position: relative; width: min(400px, 100%); background: var(--paper-2); color: var(--ink);
          border-radius: 18px; padding: 34px 30px 28px; box-shadow: 0 30px 60px rgba(0,0,0,0.4);
        }
        .auth-close {
          position: absolute; top: 16px; inset-inline-end: 16px; background: none; border: none;
          color: var(--ink-soft); cursor: pointer; padding: 4px; display: flex;
        }
        .auth-tabs { display: flex; gap: 6px; background: rgba(31,36,32,0.06); border-radius: 999px; padding: 4px; margin-bottom: 18px; }
        .auth-tab {
          flex: 1; border: none; background: none; padding: 9px 12px; border-radius: 999px;
          font-size: 13.5px; font-weight: 600; color: var(--ink-soft); cursor: pointer;
        }
        .auth-tab-active { background: var(--copper); color: var(--ink); }
        .auth-subtitle { font-size: 13px; line-height: 1.5; opacity: 0.7; margin: 0 0 20px; }
        .auth-form { display: flex; flex-direction: column; gap: 14px; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; opacity: 0.85; }
        .auth-field input {
          font-size: 14px; padding: 11px 13px; border-radius: 9px; border: 1px solid rgba(31,36,32,0.18);
          background: var(--paper); color: var(--ink); font-weight: 400;
        }
        .auth-field input:focus { outline: 2px solid var(--copper); outline-offset: 1px; border-color: transparent; }
        .auth-submit { justify-content: center; width: 100%; margin-top: 4px; border: none; cursor: pointer; }
        .auth-switch {
          display: block; width: 100%; text-align: center; background: none; border: none; cursor: pointer;
          font-size: 12.5px; color: var(--copper-deep); font-weight: 600; margin-top: 16px;
        }
        .auth-switch:hover { text-decoration: underline; }
      `}</style>

      {/* NAV */}
      <div className="wrap">
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark"><QrCode size={17} strokeWidth={2} /></span>
            menuPilot
          </div>
          <div className="nav-links">
            <a href="#how">{t.nav.how}</a>
            <a href="#roles">{t.nav.roles}</a>
            <a href="#features">{t.nav.features}</a>
          </div>
          <div className="nav-right">
            <button className="lang-toggle" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Globe size={14} strokeWidth={1.8} />
              {lang === "en" ? "العربية" : "English"}
            </button>
<button
  className="nav-auth-login"
  onClick={() => navigate("/login")}
>
  {t.nav.login}
</button>
<button
  className="nav-auth-signup"
  onClick={() => navigate("/register")}
>
  {t.nav.signup}
</button>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1>
              {t.hero.h1a}<br />{t.hero.h1b}<br /><em>{t.hero.h1em}</em>
            </h1>
            <p className="lead">{t.hero.lead}</p>
            <div className="hero-ctas">
              <a className="btn-primary" href="#how">{t.hero.ctaPrimary} <ArrowRight size={16} className="icon-flip" /></a>
              <a className="btn-secondary" href="#pilot">{t.hero.ctaSecondary}</a>
            </div>
          </div>
          <OrderTicket lang={lang} />
        </div>
      </header>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">{t.how.eyebrow}</span>
            <h2>{t.how.h2}</h2>
            <p>{t.how.p}</p>
          </Reveal>
          <div className="steps-grid">
            {t.how.steps.map((s, i) => (
              <StepCard key={i} n={i + 1} title={s.title} text={s.text} />
            ))}
          </div>
        </div>
      </section>

      {/* HUMAN TOUCH */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <div className="human">
              <div>
                <span className="eyebrow">{t.human.eyebrow}</span>
                <h2>{t.human.h2}</h2>
                <p>{t.human.p1}</p>
                <p>{t.human.p2}</p>
              </div>
              <div className="human-illus">
                <TableIllustration />
              </div>
              <div className="human-quote">
                {t.human.quote}
                <br /><br />{t.human.quoteAttr}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ROLES */}
      <section className="section" id="roles">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">{t.roles.eyebrow}</span>
            <h2>{t.roles.h2}</h2>
          </Reveal>
          <div className="roles-grid">
            {[UserRound, UtensilsCrossed, ChefHat, Wallet, ShieldCheck].map((Icon, i) => (
              <RoleCard key={i} icon={Icon} role={t.roles.list[i].role} text={t.roles.list[i].text} />
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">{t.features.eyebrow}</span>
            <h2>{t.features.h2}</h2>
          </Reveal>
          <div className="features-grid">
            {[QrCode, Clock3, StickyNote, Wifi, ShieldCheck, UtensilsCrossed].map((Icon, i) => (
              <FeatureCard key={i} icon={Icon} title={t.features.list[i].title} text={t.features.list[i].text} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta" id="pilot">
        <div className="wrap">
          <Reveal>
            <div className="human-illus" style={{ marginBottom: 18 }}>
              <ScanIllustration />
            </div>
            <h2>{t.cta.h2}</h2>
            <p>{t.cta.p}</p>
            <a className="btn-primary" href="mailto:hello@menupilot.app">
              {t.cta.btn} <ArrowRight size={16} className="icon-flip" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <div className="wrap">
        <footer className="footer">
          <span>{t.footer.left}</span>
          <span>{t.footer.right}</span>
        </footer>
      </div>


    </div>
  );
}
