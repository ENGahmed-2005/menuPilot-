import { lang } from "../../i18n";

export const c = (ar, en) => lang === "en" ? en : ar;

const initialsFrom = (name) => {
  const words = name.trim().split(/\s+/);
  return `${words[0]?.[0] ?? ""}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
};

const crewMember = (arabicName, englishName, arabicRole, englishRole, station, head = false) => ({
  name: c(arabicName, englishName),
  role: c(arabicRole, englishRole),
  station,
  initials: initialsFrom(englishName),
  head,
});

export const landingCopy = {
  ticket: {
    tableLabel: c("طاولة", "TABLE"),
    orderLabel: c("طلب طاولة", "DINE-IN ORDER"),
    totalLabel: c("الإجمالي", "TOTAL"),
  },
  navigation: [
    { href: "#platform", label: c("المنصة", "Platform") },
    { href: "#benefits", label: c("المزايا", "What you can do") },
    { href: "#journey", label: c("طريقة العمل", "How it works") },
  ],
  hero: {
    eyebrow: c("إدارة المطعم، من مكان واحد", "RESTAURANT OPERATIONS, IN ONE PLACE"),
    title: c("خلّ مطعمك", "Keep service"),
    highlight: c("يمشي بسلاسة.", "running smoothly."),
    description: c(
      "اجمع المنيو والطلبات والطاولات والمطبخ في مساحة واحدة، ليعرف كل فرد في فريقك ما التالي.",
      "Bring your menu, orders, tables, and kitchen into one workspace, so everyone knows what’s next."
    ),
    primary: c("ابدأ الآن", "Get started"),
    secondary: c("شاهد سير العمل", "See the workflow"),
  },
  flow: {
    label: c("سير الطلب", "ORDER FLOW"),
    example: c("مثال توضيحي", "EXAMPLE"),
    contextLabel: c("من الطاولة", "FROM TABLE"),
    context: c("04", "04"),
    status: c("قيد التحضير", "In preparation"),
    imageAlt: c("رسم توضيحي لمسار الطلب من مسح رمز الطاولة إلى شاشة المطبخ", "Illustration of an order moving from a table QR scan to the kitchen screen"),
    steps: [
      { title: c("مسح QR", "Scan QR"), detail: c("قائمة الضيف", "Guest menu") },
      { title: c("إرسال الطلب", "Order sent"), detail: c("يصل للفريق", "Team receives it") },
      { title: c("شاشة المطبخ", "Kitchen screen"), detail: c("متابعة الحالة", "Track its status") },
    ],
    footer: c("الطاولة والطلب والفريق، على المسار نفسه", "Table, order, and team — on the same path"),
  },
  trust: {
    label: c("تشغيل مترابط، من أول طلب إلى إدارة المطعم", "One connected operation, from the first order to the whole restaurant"),
    items: [
      c("الطلبات", "Orders"),
      c("المنيو الرقمي", "Digital menu"),
      c("المطبخ", "Kitchen"),
      c("إدارة المطعم", "Restaurant management"),
    ],
  },
  clarity: {
    eyebrow: c("من التشتت إلى الوضوح", "FROM SCATTERED TO IN SYNC"),
    title: c("كل مهمة لها مكانها. وكل فريق يعرف ما التالي.", "Every task has its place. Every team knows what’s next."),
    description: c(
      "بدل التنقل بين تفاصيل متفرقة، اجمع الطلب والمنيو والمطبخ وإدارة المطعم في مساحة واحدة.",
      "Bring orders, menu, kitchen, and restaurant management into one workspace instead of switching between scattered details."
    ),
    diagramLabel: c("انتقال من أدوات ومهام متفرقة إلى إدارة مترابطة", "A transition from scattered tasks to connected operations"),
    inputs: [
      c("طلبات من قنوات مختلفة", "Orders from different channels"),
      c("تحديثات المنيو", "Menu updates"),
      c("متابعة المطبخ", "Kitchen coordination"),
    ],
    result: c("كل ما يحتاجه الفريق، في مكان واحد", "Everything your team needs, in one place"),
  },
  benefits: {
    eyebrow: c("مصمّم لإيقاع مطعمك", "MADE FOR THE RHYTHM OF YOUR RESTAURANT"),
    title: c("الأدوات اليومية، متصلة ببعضها.", "The everyday tools, working together."),
    items: [
      {
        number: "01",
        title: c("قائمة رقمية عبر QR", "A digital menu by QR"),
        description: c("اعرض قائمتك للضيف، وحدّث الأصناف والأسعار من مكان واحد.", "Share your menu with guests and update items and prices in one place."),
      },
      {
        number: "02",
        title: c("الطاولات والطلبات", "Tables and orders"),
        description: c("تابع الجلسات والطلبات وحالتها، من الاستقبال إلى إغلاق الفاتورة.", "Follow table sessions and order status, from arrival through the bill."),
      },
      {
        number: "03",
        title: c("تنسيق المطبخ", "Kitchen coordination"),
        description: c("تصل تفاصيل الطلب إلى شاشة المطبخ، ويتابع الفريق ما يحتاج إلى تحضير.", "Order details reach the kitchen screen, where the team can follow what needs preparing."),
      },
      {
        number: "04",
        title: c("الفريق والفواتير", "Team and billing"),
        description: c("نظّم صلاحيات الموظفين، وتابع الحسابات والمدفوعات من لوحة المطعم.", "Manage staff access and keep track of bills and payments from the restaurant dashboard."),
      },
    ],
  },
  statement: {
    lead: c("العشاء صاخب.", "Dinner is loud."),
    accent: c("نظامك لا يجب أن يكون كذلك.", "Your system shouldn't be."),
    description: c(
      "وسط حركة الصالة والمطبخ، تصل الطلبات واضحة؛ ويبقى فريقك حاضرًا للضيافة.",
      "In the middle of a full dining room, every order arrives clearly — so your team can stay with the guests."
    ),
    marqueeTable: c("طاولة 04", "TABLE 04"),
    marqueeOrder: c("طلب جديد", "NEW ORDER"),
    marqueeStatus: c("وصل", "RECEIVED"),
  },
  journey: {
    eyebrow: c("بداية واضحة، وخطوات بسيطة", "A clear start, in three simple steps"),
    title: c("من مسح الرمز إلى وصول الطلب للمطبخ.", "From QR scan to kitchen handoff."),
    description: c(
      "مسار مفهوم للضيف والفريق، مع متابعة الحالة في كل خطوة.",
      "A clear path for guests and staff, with order status visible along the way."
    ),
    steps: [
      {
        number: "01",
        label: c("يمسح الضيف الرمز", "Guest scans the QR"),
        description: c("يفتح المنيو الرقمي مباشرة من هاتفه، دون تنزيل تطبيق.", "The digital menu opens on their phone, with no app to install."),
      },
      {
        number: "02",
        label: c("يصل الطلب للفريق", "The order reaches the team"),
        description: c("يظهر الطلب بوضوح مع الطاولة وتفاصيل الأصناف.", "The order appears with its table and item details."),
      },
      {
        number: "03",
        label: c("يتابعه المطبخ", "Kitchen follows through"),
        description: c("تتحدّث حالة الطلب ليعرف الفريق ما أُرسل وما يجري تحضيره.", "Order status updates so the team can see what has arrived and what is being prepared."),
      },
    ],
  },
  showcase: {
    eyebrow: c("المنصة", "THE PLATFORM"),
    title: c("شاهد الأدوات التي يستخدمها فريقك.", "A closer look at the tools your team uses."),
    description: c(
      "تصوّر مبسّط لمساحة العمل: الطاولات، المتابعة المالية، وتحرير المنيو.",
      "A crafted preview of the workspace: tables, financial tracking, and menu editing."
    ),
    tabs: [
      {
        id: "tables",
        image: "cashier",
        label: c("الطاولات والفواتير", "Tables and bills"),
        alt: c("معاينة تصميمية توضح لوحة الطاولات والفواتير في MenuPilot", "A custom illustration of the MenuPilot tables and bills workspace"),
        description: c("راجع جلسات الطاولات والفواتير والمدفوعات من مكان واحد.", "Review table sessions, bills, and payments in one place."),
      },
      {
        id: "finance",
        image: "finance",
        label: c("الأرباح والمصاريف", "Finances"),
        alt: c("معاينة تصميمية توضح متابعة الحسابات المالية في MenuPilot", "A custom illustration of financial tracking in MenuPilot"),
        description: c("تابع الإيرادات والمصاريف والرواتب من أدوات التقارير المالية.", "Review revenue, expenses, and payroll in the financial reports."),
      },
      {
        id: "branding",
        image: "branding",
        label: c("هوية المنيو", "Menu branding"),
        alt: c("معاينة تصميمية توضح إعدادات المنيو الرقمي في MenuPilot", "A custom illustration of the MenuPilot digital menu editor"),
        description: c("خصّص مظهر المنيو الرقمي وشاهد معاينته للضيوف.", "Customize the digital menu and preview it for guests."),
      },
    ],
    capabilities: [
      c("الطلبات", "Orders"),
      c("منيو رقمي وQR", "Digital menu and QR"),
      c("شاشة المطبخ", "Kitchen screen"),
      c("الكاشير والفوترة", "Cashier and billing"),
    ],
    menuRows: [
      { name: c("مارغريتا", "Margherita"), category: c("الأطباق الرئيسية", "Main dishes"), price: "$12", available: true },
      { name: c("ليموناضة", "Lemonade"), category: c("المشروبات", "Drinks"), price: "$6", available: true },
      { name: c("تيراميسو", "Tiramisu"), category: c("الحلويات", "Desserts"), price: "$9", available: false },
    ],
    mockup: {
      preview: c("معاينة توضيحية", "Illustrative preview"),
      workspace: c("مساحة المطعم", "Restaurant workspace"),
      team: c("فريق المطعم", "Restaurant team"),
      overview: c("نظرة على الطاولات", "Table overview"),
      service: c("متابعة الخدمة", "Service overview"),
      inService: c("في الخدمة", "In service"),
      available: c("متاحة", "Available"),
      orderSent: c("أُرسل الطلب", "Order sent"),
      tableRows: [
        { name: c("طاولة 04", "Table 04"), status: c("في الخدمة", "In service"), active: true },
        { name: c("طاولة 06", "Table 06"), status: c("متاحة", "Available"), active: false },
        { name: c("طاولة 08", "Table 08"), status: c("أُرسل الطلب", "Order sent"), active: false },
      ],
      order: c("طلب الطاولة", "Table order"),
      kitchen: c("شاشة المطبخ", "Kitchen screen"),
      orderStatus: c("قيد التحضير", "Preparing"),
      financialOverview: c("ملخص الحسابات", "Financial overview"),
      revenue: c("الإيرادات", "Revenue"),
      expenses: c("المصاريف", "Expenses"),
      payments: c("المدفوعات", "Payments"),
      reportPeriod: c("نظرة عامة", "Overview"),
      menuEditor: c("محرر المنيو", "Menu editor"),
      menuSection: c("أصناف القائمة", "Menu items"),
      menuVisibility: c("حالة الظهور", "Visibility"),
      navLabels: [
        c("الرئيسية", "Overview"),
        c("الطلبات", "Orders"),
        c("الطاولات", "Tables"),
        c("المنيو", "Menu"),
        c("الفريق", "Team"),
      ],
      headerAction: c("عرض القائمة", "View menu"),
    },
    reportLabel: c("المبيعات هذا الأسبوع", "Sales this week"),
    exportLabel: c("تصدير إلى Excel", "Export to Excel"),
    orderColumns: [
      c("جديد", "New"),
      c("قيد التحضير", "Preparing"),
      c("جاهز", "Ready"),
    ],
    menuStatus: c("متاح", "Available"),
    menuSoldOut: c("نفد", "Sold out"),
    menuDescription: c("أصناف قائمة مطعمك", "Your restaurant menu items"),
    addItem: c("أضف صنفًا", "Add item"),
    reportDays: [
      c("س", "M"), c("ح", "T"), c("ن", "W"), c("ث", "T"),
      c("ر", "F"), c("خ", "S"), c("ج", "S"),
    ],
  },
  team: {
    eyebrow: c("فريق MenuPilot", "THE MENUPILOT TEAM"),
    title: c("تعرّف على فريق MenuPilot.", "Meet the people behind MenuPilot."),
    description: c(
      "فريق يجمع قيادة المنتج وتطوير الخادم والواجهات.",
      "Product leadership, backend, and frontend engineering—working together on MenuPilot."
    ),
    members: [
      crewMember("أحمد الكحلوت", "Ahmed Al-Kahlout", "صاحب المشروع وقائد الفريق", "Project Owner and Team Lead", c("القيادة", "LEADERSHIP"), true),
      crewMember("علي أبو سويلم", "Ali Abu Suwailem", "مطوّر الخادم (Laravel)", "Backend Developer, Laravel", c("الخادم", "BACKEND")),
      crewMember("عمار يحيى عمر العرعير", "Ammar Yahya Omar Al-Areer", "شريك ومطوّر الخادم (Laravel)", "Partner and Backend Developer, Laravel", c("الخادم", "BACKEND")),
      crewMember("سجى ساق الله", "Saja Sakallah", "مطوّرة الواجهات (React)", "Frontend Developer, React", c("الواجهات", "FRONTEND")),
      crewMember("رنين ريان", "Raneen Rayyan", "مطوّرة الواجهات (React)", "Frontend Developer, React", c("الواجهات", "FRONTEND")),
    ],
    headStamp: c("رئيس الفريق", "HEAD"),
    teamStamp: c("طاقم menuPilot", "MENUPILOT CREW"),
    stationLabel: c("المحطة", "STATION"),
  },
  pricing: {
    eyebrow: c("باقات بلا مفاجآت", "No-surprise pricing"),
    title: c("أسعار بسيطة. بلا مفاجآت في الفاتورة.", "Simple pricing. No surprises on the bill."),
    description: c("ابدأ بتجربة مجانية لمدة 14 يومًا. لا بطاقة ائتمان ولا رسوم خفية.", "Try menuPilot free for 14 days. No card details, no hidden fees."),
    mostPopular: c("الأكثر طلبًا", "MOST ORDERED"),
    perMonth: c("شهريًا", "month"),
    start: c("اختر هذه الباقة", "Choose this plan"),
    tableLine: c("الطاولات", "Tables"),
    menuLine: c("أصناف القائمة", "Menu items"),
    serviceLine: c("الطلب", "Ordering"),
    supportLine: c("مناسب لـ", "Made for"),
    unlimited: c("بلا حدود", "Unlimited"),
    noTables: c("—", "—"),
    upTo: c("حتى {0}", "Up to {0}"),
    serviceValues: {
      basic: c("الطاولات و QR", "Tables + QR"),
      pro: c("تشغيل متكامل", "Full service"),
      delivery_only: c("التوصيل والاستلام", "Delivery + pickup"),
    },
    supportValues: {
      basic: c("المطاعم الصغيرة", "Small restaurants"),
      pro: c("المطاعم المتنامية", "Growing restaurants"),
      delivery_only: c("المطاعم بلا صالة", "Restaurants without tables"),
    },
    includesLabel: c("يشمل", "Includes"),
    thankYou: c("شكرًا لاختيارك menuPilot", "THANK YOU"),
    included: {
      basic: [c("شاشة المطبخ", "Kitchen display"), c("الكاشير", "Cashier"), c("الويتر", "Waiter"), c("حسابات الفريق", "Staff accounts")],
      pro: [c("التقارير وسجل الطلبات", "Reports and order history"), c("تنبيهات ذكية", "Smart alerts"), c("هوية مخصصة", "Custom branding"), c("كل أدوات التشغيل", "Full operations")],
      delivery_only: [c("طلبات الاستلام والتوصيل", "Pickup and delivery"), c("شاشة المطبخ", "Kitchen display"), c("حسابات الفريق", "Staff accounts"), c("بلا طاولات", "No tables")],
    },
    plans: [{ id: "basic" }, { id: "pro" }, { id: "delivery_only" }],
    addOnsLabel: c("أضف إلى طلبك", "ADD TO YOUR ORDER"),
    addOns: [
      { id: "delivery", name: c("الطلب أونلاين والتوصيل", "Online ordering & delivery") },
      { id: "brand_plus", name: c("الهوية الكاملة", "Full branding") },
    ],
  },
  final: {
    title: c("جاهز لأول طلب؟", "Ready to take the first order?"),
    button: c("ابدأ تجربتك المجانية", "Start your free trial"),
    note: c("14 يومًا مجانًا · لا حاجة لبطاقة ائتمان", "14 days free · no credit card required"),
  },
  footer: {
    copyright: c("جميع الحقوق محفوظة.", "All rights reserved."),
    login: c("تسجيل الدخول", "Log in"),
  },
};
