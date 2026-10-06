/* ==========================================================================
   build-deck.js — يبني عرض لجنة التحكيم (docs/presentation/menuPilot-pitch.pptx)
   --------------------------------------------------------------------------
   الهوية من الموقع نفسه: كحلي #1F2D3D، برتقالي #E67E22، كريمي #F4EFE6،
   خط Tajawal، وأيقونات Lucide (نفس lucide-react في الواجهة).

   القصة بترتيب ما يتوقع المستمع أن يسمعه:
     خطّاف → المشكلة → الحل → الإنجاز → الفرصة → نموذج الربح → المنافسون
     → الفريق → الختام، ثم شرائح احتياطية للأسئلة فقط.
   كل شريحة: ترويسة صغيرة، عنوان بجملة واحدة، بطاقات، وأحيانًا جملة ربط
   أسفلها تمهّد لعنوان الشريحة التالية. كلام المتحدث في ملاحظات كل شريحة.

   التشغيل:  cd docs/presentation/source && npm install && npm run build
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const JSZip = require("jszip");

const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.resolve(__dirname, "../menuPilot-pitch.pptx");
const BRAND = (f) => path.join(ROOT, "frontend/public/brand", f);
const SHOT = (f) => path.join(ROOT, "docs/presentation", f);
const ICONS = (() => {
  for (const dir of require.resolve.paths("lucide-static") || []) {
    const p = path.join(dir, "lucide-static/icons");
    if (fs.existsSync(p)) return p;
  }
  throw new Error("lucide-static is not installed (npm install).");
})();

const THEME = {
  name: "menuPilot",
  headFontFace: "Tajawal ExtraBold",
  bodyFontFace: "Tajawal",
  colors: {
    dk1: "172331", // ink / navy-deep — النص
    lt1: "FFFDF9", // surface — البطاقات
    dk2: "1F2D3D", // navy — الأسطح الداكنة
    lt2: "F4EFE6", // paper — الخلفية الكريمية
    accent1: "E67E22", // brand orange
    accent2: "1C714B", // herb — حالة نجاح
    accent3: "A15818", // copper-ink — نص برتقالي على فاتح
    accent4: "5A6574", // muted
    accent5: "B94736", // brick — خطر
    accent6: "E3DCCF", // line
    hlink: "33648C",
    folHlink: "5A6574",
  },
};
// Hex for things PowerPoint can't theme (icons are images, shadows are hex-only).
const HEX = { ink: "172331", navy: "1F2D3D", cream: "F4EFE6", orange: "E67E22", orangeInk: "A15818", herb: "1C714B", brick: "B94736", muted: "5A6574" };

const W = 13.333;
const M = 0.6;
const CW = W - 2 * M;
const AR = { rtlMode: true, lang: "ar-SA" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = "فريق menuPilot";
pres.company = "menuPilot";
pres.title = "menuPilot — عرض المشروع";
pres.subject = "عرض لجنة التحكيم";
const C = pres.SchemeColor;
const ROUND = pres.shapes.ROUNDED_RECTANGLE;

/* ── helpers ─────────────────────────────────────────────────────────── */
const iconCache = {};
async function icon(name, hex) {
  const key = `${name}-${hex}`;
  if (!iconCache[key]) {
    const svg = fs
      .readFileSync(path.join(ICONS, `${name}.svg`), "utf8")
      .replace(/<!--[\s\S]*?-->/, "")
      .replace(/currentColor/g, `#${hex}`)
      .replace('width="24"', 'width="256"')
      .replace('height="24"', 'height="256"');
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    iconCache[key] = `image/png;base64,${png.toString("base64")}`;
  }
  return iconCache[key];
}

async function roundedImage(file, radiusPx) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radiusPx}" ry="${radiusPx}"/></svg>`);
  const png = await img.composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return `image/png;base64,${png.toString("base64")}`;
}

function txt(slide, text, o) {
  const opts = { isTextBox: true, ...AR, align: "right", valign: "top", margin: 0, fontSize: 16, color: C.text1, ...o };
  // pptxgenjs writes a paragraph's rtl/align from its first run's own options, so runs carry them.
  const runs = Array.isArray(text) ? text.map((r) => ({ text: r.text, options: { rtlMode: opts.rtlMode, align: opts.align, lang: opts.lang, ...r.options } })) : text;
  slide.addText(runs, opts);
}

// A number on its own reads left-to-right ("+170", "$15", "22%"); the LRM keeps a leading "+" in front.
function num(slide, text, o) {
  slide.addText(`\u200E${text}`, { isTextBox: true, rtlMode: false, align: "right", valign: "middle", margin: 0, bold: true, color: C.accent3, ...o });
}

const shadow = () => ({ type: "outer", color: HEX.ink, opacity: 0.08, blur: 8, offset: 2, angle: 90 });

function card(slide, x, y, w, h, o = {}) {
  const opts = { x, y, w, h, rectRadius: o.r ?? 0.16, fill: { color: o.fill ?? C.background1, transparency: o.fillT ?? 0 }, objectName: o.name };
  if (o.line !== false) opts.line = { color: o.line ?? C.accent6, width: 0.75 };
  if (o.shadow !== false) opts.shadow = shadow();
  slide.addShape(ROUND, opts);
}

const TONES = {
  copper: { fill: C.accent1, t: 85, hex: HEX.orangeInk },
  herb: { fill: C.accent2, t: 88, hex: HEX.herb },
  ink: { fill: C.text1, t: 93, hex: HEX.ink },
  brick: { fill: C.accent5, t: 90, hex: HEX.brick },
  dark: { fill: C.background2, t: 86, hex: HEX.orange },
};
// Icon in a tinted rounded square — the dashboard's StatCard motif, on every slide.
async function tile(slide, x, y, size, tone, name) {
  const t = TONES[tone];
  slide.addShape(ROUND, { x, y, w: size, h: size, rectRadius: size * 0.26, fill: { color: t.fill, transparency: t.t }, objectName: `tile-${name}` });
  const s = size * 0.52;
  slide.addImage({ data: await icon(name, t.hex), x: x + (size - s) / 2, y: y + (size - s) / 2, w: s, h: s, altText: "", objectName: `icon-${name}` });
}

// The closing line of a slide that hands over to the next slide's title.
async function bridge(slide, text, o = {}) {
  const y = o.y ?? 6.02;
  const h = 0.62;
  const dark = !!o.dark;
  slide.addShape(ROUND, { x: M, y, w: CW, h, rectRadius: 0.16, fill: { color: dark ? C.background2 : C.accent1, transparency: dark ? 92 : 87 }, objectName: "bridge" });
  slide.addImage({ data: await icon("arrow-left", dark ? HEX.orange : HEX.orangeInk), x: M + 0.32, y: y + (h - 0.3) / 2, w: 0.3, h: 0.3, altText: "", objectName: "bridge-arrow" });
  txt(slide, text, { x: M + 0.9, y, w: CW - 1.2, h, valign: "middle", fontSize: 19, bold: true, color: dark ? C.background2 : C.text2, objectName: "bridge-text" });
}

function sources(slide, text, dark = false) {
  txt(slide, text, { x: 1.75, y: 6.97, w: 10.3, h: 0.3, valign: "middle", fontSize: 10, color: dark ? C.background2 : C.accent4, transparency: dark ? 35 : 0, objectName: "sources" });
}

// Three equal columns, the first one on the right.
function columns(n, gap = 0.35, x0 = M, width = CW) {
  const w = (width - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ x: x0 + width - w - i * (w + gap), w }));
}

/* ── layouts ─────────────────────────────────────────────────────────── */
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background2 },
  margin: [0.4, M, 0.5, M],
  objects: [
    { image: { x: M, y: 7.0, w: 0.25 * 3.4375, h: 0.25, path: BRAND("logo.png"), altText: "menuPilot" } },
    { placeholder: { options: { name: "eyebrow", type: "body", x: M, y: 0.42, w: CW, h: 0.38, fontSize: 16, bold: true, color: C.accent3, align: "right", valign: "middle", margin: 0, rtlMode: true }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.82, w: CW, h: 0.82, fontSize: 36, color: C.text1, align: "right", valign: "top", margin: 0, rtlMode: true }, text: "" } },
  ],
  slideNumber: { x: 12.23, y: 6.99, w: 0.5, h: 0.26, fontSize: 11, color: C.accent4, align: "right" },
});

pres.defineSlideMaster({
  title: "COVER",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "eyebrow", type: "body", x: 6.0, y: 1.9, w: 6.733, h: 0.45, fontSize: 20, bold: true, color: C.accent1, align: "right", valign: "middle", margin: 0, rtlMode: true }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 6.0, y: 2.45, w: 6.733, h: 2.4, fontSize: 46, color: C.background2, align: "right", valign: "top", margin: 0, rtlMode: true }, text: "" } },
    { placeholder: { options: { name: "subtitle", type: "body", x: 6.0, y: 5.0, w: 6.733, h: 0.9, fontSize: 20, color: C.background2, align: "right", valign: "top", margin: 0, rtlMode: true }, text: "" } },
  ],
});

pres.defineSlideMaster({
  title: "DIVIDER",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "eyebrow", type: "body", x: 6.0, y: 2.7, w: 6.733, h: 0.45, fontSize: 20, bold: true, color: C.accent1, align: "right", valign: "middle", margin: 0, rtlMode: true }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 6.0, y: 3.2, w: 6.733, h: 0.95, fontSize: 46, color: C.background2, align: "right", valign: "top", margin: 0, rtlMode: true }, text: "" } },
  ],
});

pres.defineSlideMaster({
  title: "STATEMENT",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "eyebrow", type: "body", x: M, y: 0.5, w: CW, h: 0.42, fontSize: 18, bold: true, color: C.accent1, align: "right", valign: "middle", margin: 0, rtlMode: true }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.98, w: CW, h: 1.0, fontSize: 38, color: C.background2, align: "right", valign: "top", margin: 0, rtlMode: true }, text: "" } },
  ],
});

function slideWith(master, section, eyebrow, title) {
  const slide = pres.addSlide({ masterName: master, sectionTitle: section });
  if (eyebrow) slide.addText(eyebrow, { placeholder: "eyebrow", ...AR });
  if (title) slide.addText(title, { placeholder: "title", ...AR });
  return slide;
}

/* ── slides ──────────────────────────────────────────────────────────── */
const MAIN = "العرض (5 دقائق)";
const BACKUP = "شرائح احتياطية";

async function build() {
  pres.addSection({ title: MAIN });

  /* 1. الغلاف */
  {
    const s = slideWith("COVER", MAIN, "نظام تشغيل المطاعم", "من الطاولة إلى المطبخ… بدون فوضى");
    s.addText("فريق menuPilot", { placeholder: "subtitle", ...AR, transparency: 25 });
    s.addImage({ path: BRAND("logo-stacked-on-dark.png"), x: 1.0, y: 1.75, w: 4.3, h: 4.3 / 1.197, altText: "شعار menuPilot", objectName: "logo" });
    s.addNotes(
      "⏱ 5 ثوانٍ — الفريق كله على المسرح، واحد بيحكي.\n\n" +
        "«السلام عليكم، إحنا فريق menuPilot.»\n\n" +
        "وانتقل فورًا للسؤال في الشريحة الجاية — لا تشرح المنتج هون، المشكلة لازم تيجي قبل الحل."
    );
  }

  /* 2. الخطّاف */
  {
    const s = slideWith("STATEMENT", MAIN, "سؤال سريع", "آخر مرة رفعت إيدك للنادل… كم دقيقة استنّيت؟");
    const cols = columns(2, 0.5);
    const facts = [
      ["حتى يوصل المشروب", "hourglass"],
      ["حتى توصل الفاتورة", "receipt"],
    ];
    for (let i = 0; i < 2; i++) {
      const { x, w } = cols[i];
      card(s, x, 2.45, w, 3.15, { fill: C.background2, fillT: 93, line: false, shadow: false, name: `wait-${i + 1}` });
      await tile(s, x + w - 0.45 - 0.7, 2.85, 0.7, "dark", facts[i][1]);
      txt(s, [{ text: "10", options: { fontSize: 110, bold: true, color: C.accent1 } }, { text: "  دقائق", options: { fontSize: 32, bold: true, color: C.background2 } }], {
        x: x + 0.45, y: 3.5, w: w - 0.9, h: 1.35, valign: "middle", objectName: `wait-number-${i + 1}`,
      });
      txt(s, facts[i][0], { x: x + 0.45, y: 4.95, w: w - 0.9, h: 0.5, fontSize: 24, color: C.background2, transparency: 20, objectName: `wait-label-${i + 1}` });
    }
    await bridge(s, "والانتظار… أول حلقة بس في السلسلة", { dark: true });
    sources(s, "Union، استطلاع أكثر من 1,000 بالغ في أمريكا (2023): 42% ينتظرون نحو 10 دقائق للمشروب، ومتوسط انتظار الفاتورة 10 دقائق", true);
    s.addNotes(
      "⏱ 25 ثانية — اسأل وانتظر ثانيتين قبل ما تكمل. عينك على اللجنة، مش على الشاشة.\n\n" +
        "«خلّوني أسألكم: آخر مرة كنتوا في مطعم ورفعتوا إيدكم للنادل… كم دقيقة استنيتوا؟»\n" +
        "(وقفة)\n" +
        "«استطلاع على أكثر من ألف زبون لقى إن 42% منهم بيستنّوا حوالي 10 دقائق بس ليوصلهم المشروب… ومتوسط انتظار الفاتورة 10 دقائق كمان. والانتظار هذا أول حلقة بس.»\n\n" +
        "لو انسألتوا: الاستطلاع أمريكي (Union، 2023) — الأرقام المحلية من زياراتكم للمطاعم أقوى، جيبوها إذا عندكم."
    );
  }

  /* 3. المشكلة */
  {
    const s = slideWith("CONTENT", MAIN, "المشكلة", "الطلب يضيع بين الطاولة والمطبخ والكاشير");
    const cols = columns(3);
    const cards = [
      { tone: "copper", icon: "hourglass", head: "الزبون ينتظر… ويمشي", stat: "22%", label: "يغادرون المكان إذا طال الانتظار، و38% يقلّلون البقشيش" },
      { tone: "ink", icon: "notebook-pen", head: "المطبخ على ورقة", stat: "0", label: "تتبّع للطلب: لا الزبون ولا المالك يعرف وين وصل" },
      { tone: "brick", icon: "wifi-off", head: "الشغل يقف مع النت", stat: [{ text: "36", options: {} }, { text: " ساعة", options: { fontSize: 30 } }], label: "انقطاع كامل للاتصالات في غزة، أكتوبر 2023" },
    ];
    for (let i = 0; i < 3; i++) {
      const { x, w } = cols[i];
      const d = cards[i];
      const y = 1.95;
      const pad = 0.32;
      card(s, x, y, w, 3.75, { name: `problem-${i + 1}` });
      await tile(s, x + w - pad - 0.64, y + pad, 0.64, d.tone, d.icon);
      txt(s, d.head, { x: x + pad, y: y + 1.12, w: w - 2 * pad, h: 0.5, fontSize: 22, bold: true, objectName: `problem-head-${i + 1}` });
      if (typeof d.stat === "string") num(s, d.stat, { x: x + pad, y: y + 1.68, w: w - 2 * pad, h: 0.95, fontSize: 54, objectName: `problem-stat-${i + 1}` });
      else txt(s, d.stat, { x: x + pad, y: y + 1.68, w: w - 2 * pad, h: 0.95, fontSize: 54, bold: true, color: C.accent3, valign: "middle", objectName: `problem-stat-${i + 1}` });
      txt(s, d.label, { x: x + pad, y: y + 2.68, w: w - 2 * pad, h: 0.9, fontSize: 16, color: C.accent4, objectName: `problem-label-${i + 1}` });
    }
    await bridge(s, "النتيجة: فوضى… زبون ينتظر، مطبخ يخمّن، ومالك ما بيعرف شو صار");
    sources(s, "Union، استطلاع 1,000+ بالغ أمريكي (2023) · Access Now، «Palestine Unplugged» (2023)");
    s.addNotes(
      "⏱ 40 ثانية — هاي أهم شريحة: بدنا اللجنة تحس بالمعاناة، مش بس تعرف إنها موجودة.\n\n" +
        "«والانتظار مش آخر المشكلة. الزبون اللي بيستنى كثير: 22% بيقوموا وبيطلعوا من المكان، و38% بيقللوا البقشيش.\n" +
        "جوّا المطبخ: الطلب مكتوب بخط اليد على ورقة، أي تعديل بيوصل بالصوت، وما حدا — لا الزبون ولا صاحب المطعم — بيعرف الطلب وين وصل.\n" +
        "وفي غزة تحديدًا: في أكتوبر 2023 انقطعت الاتصالات بشكل كامل 36 ساعة، وأي نظام بيعتمد على النت بيوقف معها.\n" +
        "النتيجة؟ فوضى.»\n\n" +
        "💡 إذا زرتوا مطاعم أو سألتوا أصحابها، هون مكان الجملة الأقوى في العرض كله: «زرنا X مطاعم في غزة، و Y منهم قالوا…». الدليل من أرض الواقع أقوى من أي استطلاع."
    );
  }

  /* 4. الحل */
  {
    const s = slideWith("CONTENT", MAIN, "الحل", "الفوضى صارت نظام — كل طلب بيعرف طريقه");
    const cols = columns(3);
    const cards = [
      { icon: "qr-code", tag: "بدل الانتظار", head: "الزبون يطلب من جواله", body: "يمسح QR الطاولة، يطلب ويتابع طلبه لحظة بلحظة — بلا نادل وبلا تطبيق" },
      { icon: "chef-hat", tag: "بدل الورقة", head: "المطبخ يستلم فورًا", body: "الطلب يظهر على شاشة المطبخ مرتّبًا حسب الوقت، والكل يشوف حالته" },
      { icon: "cloud-off", tag: "بدل التوقف", head: "يكمل والنت مقطوع", body: "المطبخ والكاشير بكمّلوا شغلهم، والتغييرات تتزامن لحالها لما يرجع النت" },
    ];
    for (let i = 0; i < 3; i++) {
      const { x, w } = cols[i];
      const d = cards[i];
      const y = 1.95;
      const pad = 0.32;
      card(s, x, y, w, 3.75, { name: `solution-${i + 1}` });
      await tile(s, x + w - pad - 0.64, y + pad, 0.64, "herb", d.icon);
      s.addShape(ROUND, { x: x + pad, y: y + pad + 0.11, w: 1.55, h: 0.42, rectRadius: 0.21, fill: { color: C.text1, transparency: 93 }, objectName: `solution-tag-bg-${i + 1}` });
      txt(s, d.tag, { x: x + pad, y: y + pad + 0.11, w: 1.55, h: 0.42, align: "center", valign: "middle", fontSize: 14, bold: true, color: C.accent4, objectName: `solution-tag-${i + 1}` });
      txt(s, d.head, { x: x + pad, y: y + 1.12, w: w - 2 * pad, h: 0.5, fontSize: 22, bold: true, objectName: `solution-head-${i + 1}` });
      txt(s, d.body, { x: x + pad, y: y + 1.72, w: w - 2 * pad, h: 1.85, fontSize: 20, color: C.text2, lineSpacingMultiple: 1.1, objectName: `solution-body-${i + 1}` });
    }
    await bridge(s, "وهذا مش كلام على ورق…");
    s.addNotes(
      "⏱ 35 ثانية — كل بطاقة هون بتجاوب على بطاقة من شريحة المشكلة، بنفس الترتيب.\n\n" +
        "«فإحنا حوّلنا الفوضى لنظام.\n" +
        "الزبون بيمسح QR الطاولة وبيطلب من جواله — بدون تطبيق وبدون ما يستنى نادل — وبيتابع طلبه لحظة بلحظة.\n" +
        "الطلب بيوصل مباشرة لشاشة المطبخ، مرتّب حسب الوقت، وكل الفريق بيشوف حالته.\n" +
        "ولو انقطع النت، المطبخ والكاشير بكمّلوا شغلهم، وكل تغيير بيتزامن لحاله أول ما يرجع الاتصال.»"
    );
  }

  /* 5. الإنجاز (الديمو) */
  {
    const s = slideWith("CONTENT", MAIN, "الإنجاز", "النظام شغّال اليوم — مش نموذج على ورق");
    // Kitchen screen with the guest's phone over its corner.
    const dw = 5.9;
    const dh = dw / 1.6;
    card(s, M, 1.95, dw, dh, { r: 0.12, name: "kitchen-frame" });
    s.addImage({ data: await roundedImage(SHOT("deck_kitchen.png"), 44), x: M, y: 1.95, w: dw, h: dh, altText: "شاشة المطبخ في menuPilot: تذاكر الطلبات مرتّبة حسب الوقت", objectName: "kitchen-screen" });
    const ph = 3.3;
    const pw = ph * (780 / 1688);
    const px = M + dw - 0.85;
    const py = 1.95 + dh - ph - 0.07;
    s.addShape(ROUND, { x: px - 0.07, y: py - 0.07, w: pw + 0.14, h: ph + 0.14, rectRadius: 0.22, fill: { color: C.text1 }, shadow: { type: "outer", color: HEX.ink, opacity: 0.25, blur: 14, offset: 4, angle: 90 }, objectName: "phone-frame" });
    s.addImage({ data: await roundedImage(SHOT("deck_menu_phone.png"), 80), x: px, y: py, w: pw, h: ph, altText: "منيو الزبون على الجوال بعد مسح رمز الطاولة", objectName: "phone-menu" });

    const gx = 7.65;
    const gw = M + CW - gx;
    const cells = columns(2, 0.25, gx, gw);
    const stats = [
      ["5", "أدوار بشاشاتها، من الزبون للمالك"],
      ["+170", "اختبارًا آليًا تشتغل مع كل تعديل"],
      ["+110", "نقطة API في الخادم (Laravel)"],
      ["2", "لغتان كاملتان: عربي وإنجليزي"],
    ];
    for (let i = 0; i < 4; i++) {
      const { x, w } = cells[i % 2];
      const y = 1.95 + Math.floor(i / 2) * 1.95;
      card(s, x, y, w, 1.75, { name: `progress-${i + 1}` });
      num(s, stats[i][0], { x: x + 0.28, y: y + 0.2, w: w - 0.56, h: 0.7, fontSize: 40 });
      txt(s, stats[i][1], { x: x + 0.28, y: y + 0.92, w: w - 0.56, h: 0.7, fontSize: 15, color: C.accent4, objectName: `progress-label-${i + 1}` });
    }
    await bridge(s, "طيب… هل في سوق يستاهل؟");
    s.addNotes(
      "⏱ 45 ثانية — الهدف: إثبات إننا أنجزنا فعلًا.\n\n" +
        "«وهذا مش كلام على ورق. هاي شاشة المطبخ الحقيقية، وهاي منيو الزبون على الجوال.\n" +
        "عنا 5 أدوار، كل واحد إله شاشته: الزبون، المطبخ، النادل، الكاشير، والمالك.\n" +
        "الخادم فيه أكثر من 110 نقطة API، ومحمي بأكثر من 170 اختبار آلي بيشتغلوا مع كل تعديل. والنظام كامل بلغتين.»\n\n" +
        "لو في وقت (وما في غالبًا): «وفي مطعم تجريبي حي بتقدروا تجربوه بدون تسجيل.» — وإذا بدكم رمز QR للموقع على الشريحة، ضيفوا الرابط المنشور."
    );
  }

  /* 6. الفرصة السوقية */
  {
    const s = slideWith("CONTENT", MAIN, "الفرصة", "مطاعم غزة بتبدأ من جديد — وهاي أنسب لحظة لنظام");
    const cols = columns(3);
    const cards = [
      { icon: "store", stat: "3,450", label: "منشأة مطاعم ومقاهٍ دُمّرت في غزة… وكل واحدة بتعيد البناء من الصفر" },
      { icon: "badge-dollar-sign", stat: [{ text: "$1.2", options: {} }, { text: " مليون", options: { fontSize: 30 } }], label: "إيراد سنوي ممكن في غزة وحدها: 3,450\u00A0مطعمًا × 29\u00A0دولارًا × 12\u00A0شهرًا" },
      { icon: "trending-up", stat: "19.4%", label: "نمو سنوي لسوق برمجيات إدارة المطاعم عالميًا حتى 2030" },
    ];
    for (let i = 0; i < 3; i++) {
      const { x, w } = cols[i];
      const d = cards[i];
      const y = 1.95;
      const pad = 0.32;
      card(s, x, y, w, 3.75, { name: `market-${i + 1}` });
      await tile(s, x + w - pad - 0.64, y + pad, 0.64, "copper", d.icon);
      if (typeof d.stat === "string") num(s, d.stat, { x: x + pad, y: y + 1.15, w: w - 2 * pad, h: 1.1, fontSize: 60, objectName: `market-stat-${i + 1}` });
      else txt(s, d.stat, { x: x + pad, y: y + 1.15, w: w - 2 * pad, h: 1.1, fontSize: 60, bold: true, color: C.accent3, valign: "middle", objectName: `market-stat-${i + 1}` });
      txt(s, d.label, { x: x + pad, y: y + 2.4, w: w - 2 * pad, h: 1.15, fontSize: 17, color: C.text2, objectName: `market-label-${i + 1}` });
    }
    await bridge(s, "السوق موجود… طيب مين بيدفع، وليش؟");
    sources(s, "الإحصاء الفلسطيني ووزارة السياحة والآثار، بيان يوم السياحة العالمي (2024) · Technavio، سوق برمجيات إدارة المطاعم 2025–2030 · الحساب من أسعارنا");
    s.addNotes(
      "⏱ 35 ثانية — كل رقم هون إله مصدر، واحفظوا المصدر غيب.\n\n" +
        "«طيب هل في سوق؟ حسب الإحصاء الفلسطيني ووزارة السياحة، 3,450 منشأة مطاعم ومقاهي في غزة دُمّرت. وكل مطعم بيرجع يفتح، بيرجع من الصفر — وهاي أنسب لحظة يبدأ بنظام بدل الورقة.\n" +
        "لو اشتركت كل هالمطاعم بالباقة الاحترافية، هذا سوق بحدود 1.2 مليون دولار بالسنة، بغزة وحدها.\n" +
        "وعالميًا، سوق برمجيات إدارة المطاعم بينمو حوالي 19% بالسنة لحد 2030.»\n\n" +
        "انتبهوا: 1.2 مليون هو السقف (كل المطاعم × الاحترافية)، مش توقّع مبيعات. لو انسألتوا عن هدفكم الواقعي، جهّزوا رقمكم (مثلًا أول 1% = 35 مطعمًا)."
    );
  }

  /* 7. نموذج الربح */
  {
    const s = slideWith("CONTENT", MAIN, "نموذج الربح · B2B للمطاعم والمقاهي", "اشتراك ثابت للمطعم — بلا عمولة على أي طلب");

    const cols = columns(3);
    const plans = [
      { name: "الأساسية", price: "$15", body: "منيو وطاولات ورموز QR، مطبخ، نادل، كاشير، وفريق" },
      { name: "الاحترافية", price: "$29", body: "كل الأساسية + تقارير وهوية خاصة، وبلا حدود", popular: true },
      { name: "التوصيل فقط", price: "$15", body: "لمطعم بلا صالة: طلبات استلام وتوصيل" },
    ];
    for (let i = 0; i < 3; i++) {
      const { x, w } = cols[i];
      const p = plans[i];
      const y = 1.95;
      const pad = 0.34;
      const dark = !!p.popular;
      card(s, x, y, w, 2.65, { fill: dark ? C.text2 : C.background1, line: dark ? false : undefined, name: `plan-${i + 1}` });
      if (dark) {
        s.addShape(ROUND, { x: x + pad, y: y + pad, w: 1.75, h: 0.4, rectRadius: 0.2, fill: { color: C.accent1 }, objectName: "plan-popular-bg" });
        txt(s, "الأكثر اختيارًا", { x: x + pad, y: y + pad, w: 1.75, h: 0.4, align: "center", valign: "middle", fontSize: 13, bold: true, color: C.text1, objectName: "plan-popular" });
      }
      txt(s, p.name, { x: x + pad, y: y + pad, w: w - 2 * pad, h: 0.42, valign: "middle", fontSize: 21, bold: true, color: dark ? C.background2 : C.text1, objectName: `plan-name-${i + 1}` });
      txt(s, [{ text: p.price, options: { fontSize: 50, bold: true, color: dark ? C.accent1 : C.accent3 } }, { text: "  شهريًا", options: { fontSize: 18, color: dark ? C.background2 : C.accent4 } }], {
        x: x + pad, y: y + 0.85, w: w - 2 * pad, h: 0.95, valign: "middle", objectName: `plan-price-${i + 1}`,
      });
      txt(s, p.body, { x: x + pad, y: y + 1.85, w: w - 2 * pad, h: 0.75, fontSize: 16, color: dark ? C.background2 : C.text2, transparency: dark ? 10 : 0, objectName: `plan-body-${i + 1}` });
    }
    const chips = [
      // No leading "+" here: inside Arabic text it lands on the wrong side of the price.
      ["bike", [{ text: "$15", options: { bold: true, color: C.accent3 } }, { text: "  إضافة التوصيل أونلاين", options: {} }]],
      ["palette", [{ text: "$5", options: { bold: true, color: C.accent3 } }, { text: "  إضافة الهوية الكاملة", options: {} }]],
      ["gift", [{ text: "14 يومًا", options: { bold: true, color: C.accent3 } }, { text: " تجربة مجانية", options: {} }]],
    ];
    for (let i = 0; i < 3; i++) {
      const { x, w } = cols[i];
      card(s, x, 4.95, w, 0.72, { r: 0.14, shadow: false, name: `addon-${i + 1}` });
      s.addImage({ data: await icon(chips[i][0], HEX.orangeInk), x: x + w - 0.3 - 0.32, y: 4.95 + 0.2, w: 0.32, h: 0.32, altText: "", objectName: `addon-icon-${i + 1}` });
      txt(s, chips[i][1], { x: x + 0.25, y: 4.95, w: w - 0.95, h: 0.72, valign: "middle", fontSize: 16, color: C.text2, objectName: `addon-label-${i + 1}` });
    }
    await bridge(s, "ليش بيدفع؟ $15 بالشهر = 50 سنت باليوم… أقل من ثمن طلب واحد ضاع");
    s.addNotes(
      "⏱ 30 ثانية\n\n" +
        "«نموذجنا B2B: المطعم بيدفع اشتراك شهري ثابت، وما بناخد ولا قرش عمولة على أي طلب.\n" +
        "الأساسية بـ15 دولار، الاحترافية بـ29، وللمطابخ اللي بتشتغل توصيل بس 15.\n" +
        "وفي إضافات: التوصيل والطلب أونلاين بـ15، والهوية الكاملة بـ5. وأول 14 يوم مجانًا.\n" +
        "ليش المطعم رح يدفع؟ لأن 15 دولار بالشهر يعني 50 سنت باليوم — أقل من ثمن طلب واحد ضاع.»\n\n" +
        "السؤال الأهم مش «رح تستعمله؟» — هو «رح تدفع؟». إذا عندكم مطعم قال «بدفع»، احكوها هون."
    );
  }

  /* 8. المنافسون */
  {
    const s = slideWith("CONTENT", MAIN, "المنافسون", "في بدائل كثير… بس ولا واحد بيجمع الثلاثة");
    const y0 = 1.9;
    const headH = 0.82;
    const rowH = 0.62;
    const nameW = 4.85;
    const critW = (CW - nameW) / 3;
    const critX = [M + 2 * critW, M + critW, M];
    const rows = [
      ["الورقة والنادل", "الحل الموجود اليوم", ["no", "yes", "yes"]],
      ["منيو QR للعرض فقط", "رابط أو PDF", ["no", "na", "yes"]],
      ["أنظمة الكاشير POS", "Foodics · Loyverse", ["part", "yes", "part"]],
      ["تطبيقات التوصيل", "طلبات Talabat", ["no", "no", "no"]],
      ["menuPilot", "", ["yes", "yes", "yes"]],
    ];
    const tableH = headH + rows.length * rowH + 0.12;
    card(s, M, y0, CW, tableH, { name: "compare-table" });
    const crit = ["من الطاولة للمطبخ مباشرة", "يكمل والنت مقطوع", "سعر صغير وبلا عمولة"];
    for (let c = 0; c < 3; c++) txt(s, crit[c], { x: critX[c] + 0.1, y: y0 + 0.08, w: critW - 0.2, h: headH - 0.1, align: "center", valign: "middle", fontSize: 17, bold: true, objectName: `compare-head-${c + 1}` });
    txt(s, "البديل", { x: M + CW - nameW + 0.3, y: y0 + 0.08, w: nameW - 0.6, h: headH - 0.1, valign: "middle", fontSize: 15, bold: true, color: C.accent4, objectName: "compare-head-name" });
    const MARK = { yes: ["circle-check", HEX.herb], no: ["circle-x", HEX.brick], part: ["circle-dashed", HEX.orangeInk], na: ["minus", HEX.muted] };
    for (let r = 0; r < rows.length; r++) {
      const y = y0 + headH + r * rowH;
      const [name, sub, marks] = rows[r];
      const ours = name === "menuPilot";
      if (ours) s.addShape(ROUND, { x: M + 0.1, y: y + 0.04, w: CW - 0.2, h: rowH - 0.08, rectRadius: 0.14, fill: { color: C.accent1, transparency: 86 }, objectName: "compare-ours" });
      else s.addShape(pres.shapes.LINE, { x: M + 0.25, y, w: CW - 0.5, h: 0, line: { color: C.accent6, width: 0.75 }, objectName: `compare-rule-${r + 1}` });
      const runs = ours
        ? [{ text: "menuPilot", options: { bold: true, color: C.accent3, fontSize: 20 } }]
        : [{ text: name, options: { bold: true } }, { text: `\u200F  ·  ${sub}`, options: { fontSize: 13, color: C.accent4 } }];
      txt(s, runs, { x: M + CW - nameW + 0.3, y, w: nameW - 0.6, h: rowH, valign: "middle", fontSize: 17, objectName: `compare-name-${r + 1}` });
      for (let c = 0; c < 3; c++) {
        const [ic, hex] = MARK[marks[c]];
        s.addImage({ data: await icon(ic, hex), x: critX[c] + (critW - 0.36) / 2, y: y + (rowH - 0.36) / 2, w: 0.36, h: 0.36, altText: { yes: "نعم", no: "لا", part: "جزئيًا", na: "لا ينطبق" }[marks[c]], objectName: `compare-${r + 1}-${c + 1}` });
      }
    }
    // Legend
    const legend = [["yes", "نعم"], ["part", "جزئيًا أو بإضافة خارجية"], ["no", "لا"], ["na", "لا ينطبق"]];
    let lx = M + CW;
    for (const [k, label] of legend) {
      const [ic, hex] = MARK[k];
      const lw = 0.32 + 0.12 + label.length * 0.1;
      s.addImage({ data: await icon(ic, hex), x: lx - 0.26, y: 6.12, w: 0.26, h: 0.26, altText: "", objectName: `legend-${k}` });
      txt(s, label, { x: lx - lw, y: 6.06, w: lw - 0.36, h: 0.38, valign: "middle", fontSize: 13, color: C.accent4, objectName: `legend-label-${k}` });
      lx -= lw + 0.35;
    }
    sources(s, "Loyverse: الطلب عبر QR بتكاملات خارجية (MENU TIGER) · Foodics: باقات من ~199 درهمًا شهريًا (G2) · عمولة تطبيقات التوصيل 15–30% (أدلة القطاع)");
    s.addNotes(
      "⏱ 35 ثانية — «ما في منافسين» جملة قاتلة. البدائل موجودة، وإحنا دارسينها.\n\n" +
        "«أكيد في بدائل. أولها الورقة والنادل — مجانية وما بتحتاج نت، بس بطيئة.\n" +
        "في منيوهات QR للعرض بس: الزبون بيشوف المنيو وبعدين بينادي النادل.\n" +
        "في أنظمة كاشير زي Foodics وLoyverse — قوية، بس الطلب من الطاولة عندهم إضافة أو تكامل خارجي، والسعر مش دايمًا لمطعم صغير.\n" +
        "وتطبيقات التوصيل بتاخد 15 لـ30% عمولة من كل طلب.\n" +
        "ميزتنا إنا الوحيدين اللي بنجمع الثلاثة: من الطاولة للمطبخ مباشرة، بيكمل والنت مقطوع، وبسعر صغير بلا عمولة.»"
    );
  }

  /* 9. الفريق */
  {
    const s = slideWith("CONTENT", MAIN, "الفريق", "5 مطوّرين بنينا menuPilot من الخادم لشاشة الزبون");
    const team = [
      ["أحمد الكحلوت", "صاحب المشروع · قائد الفريق", "أ ك", true],
      ["علي أبو سويلم", "مطوّر الخادم (Laravel)", "ع س"],
      ["عمار يحيى عمر العرعير", "شريك · مطوّر الخادم (Laravel)", "ع ع"],
      ["سجى ساق الله", "مطوّرة الواجهات (React)", "س س"],
      ["رنين ريان", "مطوّرة الواجهات (React)", "ر ر"],
    ];
    const cols = columns(5, 0.35);
    for (let i = 0; i < 5; i++) {
      const { x, w } = cols[i];
      const [name, role, ini, lead] = team[i];
      const y = 1.95;
      card(s, x, y, w, 3.6, { fill: lead ? C.accent1 : C.background1, fillT: lead ? 90 : 0, line: lead ? C.accent1 : undefined, name: `member-${i + 1}` });
      const d = 1.1;
      s.addShape(pres.shapes.OVAL, { x: x + (w - d) / 2, y: y + 0.42, w: d, h: d, fill: { color: lead ? C.accent1 : C.text2 }, objectName: `member-avatar-${i + 1}` });
      txt(s, ini, { x: x + (w - d) / 2, y: y + 0.42, w: d, h: d, align: "center", valign: "middle", fontSize: 22, bold: true, color: lead ? C.text1 : C.background2, objectName: `member-initials-${i + 1}` });
      txt(s, name, { x: x + 0.15, y: y + 1.75, w: w - 0.3, h: 0.8, align: "center", valign: "middle", fontSize: 19, bold: true, objectName: `member-name-${i + 1}` });
      txt(s, role, { x: x + 0.15, y: y + 2.6, w: w - 0.3, h: 0.75, align: "center", valign: "top", fontSize: 15, color: C.accent4, objectName: `member-role-${i + 1}` });
    }
    await bridge(s, "كل سطر في النظام كتبناه بإيدينا — وكل واحد فينا جاهز يجاوب عن جزئه");
    s.addNotes(
      "⏱ 20 ثانية — قدّم كل واحد بنظرة له، مش للشاشة.\n\n" +
        "«إحنا خمسة: أحمد قائد الفريق، علي وعمار على الخادم، وسجى ورنين على الواجهات.\n" +
        "كل سطر في النظام كتبناه بإيدينا — وكل واحد فينا جاهز يجاوب عن جزئه.»"
    );
  }

  /* 10. الختام */
  {
    const s = slideWith("COVER", MAIN, "شكرًا لكم", "المرة الجاية اللي بترفع فيها إيدك في مطعم… ما رح تضطر تستنى");
    s.addText("فريق menuPilot · جاهزين لأسئلتكم", { placeholder: "subtitle", ...AR, transparency: 25 });
    s.addImage({ path: BRAND("mark-512.png"), x: 1.15, y: 1.6, w: 4.0, h: 4.0, altText: "علامة menuPilot", objectName: "mark" });
    s.addNotes(
      "⏱ 10 ثوانٍ — ارجع لسؤال البداية، وخلّص بابتسامة.\n\n" +
        "«فالمرة الجاية اللي بترفعوا فيها إيدكم في مطعم… إن شاء الله ما رح تضطروا تستنوا. شكرًا إلكم، وبنتشرّف بأسئلتكم.»\n\n" +
        "بعدها: الأسئلة. اللي بيعرف الجواب هو اللي بيرد، وإذا ما حدا بيعرف: «سؤال مهم، منرجعلكم فيه» — ولا تخترعوا جواب."
    );
  }

  /* ── الشرائح الاحتياطية ─────────────────────────────────────────── */
  pres.addSection({ title: BACKUP });

  {
    const s = slideWith("DIVIDER", BACKUP, "ملحق", "شرائح احتياطية");
    txt(s, "للأسئلة فقط — مش جزء من الخمس دقائق", { x: 6.0, y: 4.2, w: 6.733, h: 0.5, fontSize: 20, color: C.background2, transparency: 25, objectName: "divider-note" });
    await tile(s, 2.1, 2.6, 2.3, "dark", "message-circle-question-mark");
    s.addNotes("ما بنعرض هاي الشرائح إلا إذا انسألنا سؤال إلها. افتحوها مباشرة من رقمها (اكتب الرقم + Enter في وضع العرض).");
  }

  /* B1. البنية التقنية */
  {
    const s = slideWith("CONTENT", BACKUP, "احتياطي · التقنية", "بنية بسيطة: واجهة، خادم، وقاعدة بيانات");
    const cols = columns(3, 0.7);
    const boxes = [
      { icon: "monitor-smartphone", head: "الواجهات — React PWA", lines: ["5 شاشات لـ5 أدوار", "على أي جوال أو لابتوب، بلا تثبيت", "طابور محلي يحفظ التغييرات وقت الانقطاع"] },
      { icon: "server", head: "الخادم — Laravel API", lines: ["أكثر من 110 نقطة API", "الصلاحيات والاشتراكات في الخادم فقط", "إشارات لحظية عبر Laravel\u00A0Reverb"] },
      { icon: "database", head: "قاعدة البيانات — MySQL", lines: ["بيانات كل مطعم معزولة", "الصور محفوظة في القاعدة", "كل تغيير مهم في سجل تدقيق"] },
    ];
    for (let i = 0; i < 3; i++) {
      const { x, w } = cols[i];
      const b = boxes[i];
      const y = 1.95;
      card(s, x, y, w, 3.35, { name: `arch-${i + 1}` });
      await tile(s, x + w - 0.3 - 0.6, y + 0.3, 0.6, "ink", b.icon);
      txt(s, b.head, { x: x + 0.3, y: y + 1.02, w: w - 0.6, h: 0.45, fontSize: 19, bold: true, objectName: `arch-head-${i + 1}` });
      txt(s, b.lines.map((t, k) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: k < b.lines.length - 1 } })), {
        x: x + 0.3, y: y + 1.6, w: w - 0.6, h: 1.6, fontSize: 15, color: C.text2, paraSpaceAfter: 6, objectName: `arch-lines-${i + 1}`,
      });
      if (i < 2) s.addImage({ data: await icon("arrow-left-right", HEX.orangeInk), x: x - 0.53, y: y + 1.5, w: 0.36, h: 0.36, altText: "", objectName: `arch-link-${i + 1}` });
    }
    card(s, M, 5.6, CW, 0.75, { r: 0.14, shadow: false, name: "arch-ops" });
    txt(s, "النشر: الواجهة على Vercel والخادم على Render · أكثر من 170 اختبارًا آليًا · فحص إنتاج من 30 نقطة بعد كل نشر (GO / NO-GO)", {
      x: M + 0.35, y: 5.6, w: CW - 0.7, h: 0.75, valign: "middle", fontSize: 16, color: C.text2, objectName: "arch-ops-text",
    });
    s.addNotes(
      "متى: «شو التقنيات؟ كيف بتوصل التحديثات لحظيًا؟ كيف بتختبروا؟»\n\n" +
        "- التحديث اللحظي: بعد أي تغيير ناجح، الخادم بيبعث إشارة صغيرة بلا بيانات («الطلبات تغيّرت») عبر Laravel Reverb، وكل شاشة بتجيب البيانات من الـAPI بصلاحياتها. لو انقطع الاتصال اللحظي، الشاشات بترجع تتحدّث كل كم ثانية.\n" +
        "- الجودة: أكثر من 170 اختبار آلي، وسكربت smoke-test بيفحص الإنتاج بـ30 فحص بعد كل نشر."
    );
  }

  /* B2. بدون إنترنت */
  {
    const s = slideWith("CONTENT", BACKUP, "احتياطي · بدون إنترنت", "انقطاع النت ما بيوقف المطبخ ولا الكاشير");
    const cols = columns(2, 0.35);
    const groups = [
      { tone: "herb", icon: "circle-check", head: "يكمل بدون إنترنت", mark: ["check", HEX.herb], items: ["التطبيق وكل الشاشات تفتح عادي", "آخر نسخة من الطلبات والطاولات والفواتير", "المطبخ يغيّر حالة الطلب", "الكاشير يسجّل دفعة ويغلق جلسة"] },
      { tone: "copper", icon: "hourglass", head: "يستنى رجوع الاتصال", mark: ["clock", HEX.orangeInk], items: ["طلبات جديدة من جوالات الزبائن", "تسجيل الدخول وتعديل المنيو"] },
    ];
    for (let i = 0; i < 2; i++) {
      const { x, w } = cols[i];
      const g = groups[i];
      const y = 1.95;
      card(s, x, y, w, 3.5, { name: `offline-${i + 1}` });
      await tile(s, x + w - 0.32 - 0.6, y + 0.3, 0.6, g.tone, g.icon);
      txt(s, g.head, { x: x + 0.32, y: y + 0.3, w: w - 1.3, h: 0.6, valign: "middle", fontSize: 21, bold: true, objectName: `offline-head-${i + 1}` });
      for (let k = 0; k < g.items.length; k++) {
        const ry = y + 1.15 + k * 0.56;
        s.addImage({ data: await icon(g.mark[0], g.mark[1]), x: x + w - 0.32 - 0.3, y: ry + 0.1, w: 0.3, h: 0.3, altText: "", objectName: `offline-mark-${i + 1}-${k + 1}` });
        txt(s, g.items[k], { x: x + 0.32, y: ry, w: w - 1.1, h: 0.5, valign: "middle", fontSize: 17, color: C.text2, objectName: `offline-item-${i + 1}-${k + 1}` });
      }
    }
    card(s, M, 5.8, CW, 0.75, { r: 0.14, shadow: false, name: "offline-how" });
    txt(s, "كل تغيير بيتحفظ بطابور على الجهاز مع مفتاح Idempotency — فالدفعة ما بتنحسب مرتين حتى لو انبعتت مرتين", {
      x: M + 0.35, y: 5.8, w: CW - 0.7, h: 0.75, valign: "middle", fontSize: 16, color: C.text2, objectName: "offline-how-text",
    });
    s.addNotes(
      "متى: «شو بصير لو انقطع النت؟» — وغالبًا رح ينسأل في غزة.\n\n" +
        "- كونوا صريحين: طلبات الزبائن الجديدة بتستنى رجوع الاتصال، لأن المطبخ ما بيقدر يستلم إشي ما وصل الخادم.\n" +
        "- بس اللي داخل المطعم بيكمل: المطبخ بيغيّر الحالات، والكاشير بيسجّل الدفعات، وكل إشي بيتزامن لحاله.\n" +
        "- مفتاح Idempotency: الخادم بيرجع نفس الجواب لنفس المفتاح بدل ما ينفّذ مرتين."
    );
  }

  /* B3. الأمان */
  {
    const s = slideWith("CONTENT", BACKUP, "احتياطي · الأمان", "كل مطعم معزول، وكل جلسة إلها مفتاح");
    const cols = columns(2, 0.35);
    const items = [
      { icon: "lock", head: "مفتاح سري لكل جلسة زبون", body: "رقم الجلسة وحده ما بيكفي للوصول إليها" },
      { icon: "map-pin", head: "تحقق من الموقع", body: "الطلب من الطاولة بس من داخل 200 متر من المطعم — فما في طلبات وهمية" },
      { icon: "shield-check", head: "صلاحيات لكل دور", body: "كل موظف بيشوف ويعدّل اللي بيخص دوره فقط، والمالك بيتحكم" },
      { icon: "building-2", head: "عزل بين المطاعم", body: "بيانات كل مطعم معزولة، ومغطّاة باختبارات" },
    ];
    for (let i = 0; i < 4; i++) {
      const { x, w } = cols[i % 2];
      const y = 1.95 + Math.floor(i / 2) * 2.2;
      const it = items[i];
      card(s, x, y, w, 1.85, { name: `security-${i + 1}` });
      await tile(s, x + w - 0.32 - 0.64, y + 0.32, 0.64, "ink", it.icon);
      txt(s, it.head, { x: x + 0.32, y: y + 0.3, w: w - 1.35, h: 0.5, valign: "middle", fontSize: 21, bold: true, objectName: `security-head-${i + 1}` });
      txt(s, it.body, { x: x + 0.32, y: y + 0.9, w: w - 1.35, h: 0.8, fontSize: 17, color: C.text2, objectName: `security-body-${i + 1}` });
    }
    s.addNotes(
      "متى: «كيف بتمنعوا الطلبات الوهمية/المزح؟ مين بيشوف شو؟ البيانات آمنة؟»\n\n" +
        "- الطلب من الطاولة محمي بمفتاح جلسة + تحقق إن الجوال داخل 200 متر من المطعم.\n" +
        "- رابط استعادة كلمة المرور بيوصل بالبريد بس، صالح 60 دقيقة.\n" +
        "- الزبون بيعطي اسمه ورقم جواله بس عند إرسال الطلب."
    );
  }

  /* B4. الباقات بالتفصيل */
  {
    const s = slideWith("CONTENT", BACKUP, "احتياطي · الباقات", "الباقات والإضافات بالتفصيل");
    const colsW = [2.75, 1.55, 1.55, 1.55];
    const restW = CW - colsW.reduce((a, b) => a + b, 0);
    const widths = [...colsW, restW];
    const xs = [];
    let cx = M + CW;
    for (const w of widths) { cx -= w; xs.push(cx); }
    const head = ["الباقة", "السعر شهريًا", "الطاولات", "الأصناف", "أبرز ما فيها"];
    const rows = [
      ["الأساسية", "$15", "حتى 10", "حتى 50", "التشغيل كامل: منيو، QR، مطبخ، نادل، كاشير، فريق"],
      ["الاحترافية", "$29", "بلا حدود", "بلا حدود", "+ تقارير، سجل الطلبات، تنبيهات ذكية، هوية المنيو"],
      ["التوصيل فقط", "$15", "—", "حتى 50", "طلب أونلاين (استلام وتوصيل) لمطعم بلا صالة"],
      ["إضافة التوصيل", "$15", "", "", "طلب أونلاين، مع الأساسية أو الاحترافية"],
      ["إضافة الهوية الكاملة", "$5", "", "", "مع الاحترافية: خط وألوان خاصة وإخفاء الشعار"],
    ];
    const y0 = 1.9;
    const rh = 0.66;
    card(s, M, y0, CW, rh * (rows.length + 1) + 0.1, { name: "plans-table" });
    s.addShape(ROUND, { x: M + 0.08, y: y0 + 0.08, w: CW - 0.16, h: rh - 0.08, rectRadius: 0.12, fill: { color: C.background2 }, objectName: "plans-head-bg" });
    for (let c = 0; c < head.length; c++) txt(s, head[c], { x: xs[c] + 0.15, y: y0 + 0.05, w: widths[c] - 0.3, h: rh, valign: "middle", fontSize: 15, bold: true, color: C.accent4, objectName: `plans-head-${c + 1}` });
    for (let r = 0; r < rows.length; r++) {
      const y = y0 + (r + 1) * rh + 0.05;
      if (r > 0) s.addShape(pres.shapes.LINE, { x: M + 0.25, y, w: CW - 0.5, h: 0, line: { color: C.accent6, width: 0.75 }, objectName: `plans-rule-${r + 1}` });
      for (let c = 0; c < head.length; c++) {
        const v = rows[r][c];
        if (!v) continue;
        const isNum = c === 1;
        if (isNum) num(s, v, { x: xs[c] + 0.15, y, w: widths[c] - 0.3, h: rh, fontSize: 18, objectName: `plans-${r + 1}-${c + 1}` });
        else txt(s, v, { x: xs[c] + 0.15, y, w: widths[c] - 0.3, h: rh, valign: "middle", fontSize: c === 0 ? 17 : 15, bold: c === 0, color: c === 0 ? C.text1 : C.text2, objectName: `plans-${r + 1}-${c + 1}` });
      }
    }
    txt(s, "السنوي: ادفع 10 أشهر واحصل على 12 · تجربة مجانية 14 يومًا بلا صفحة دفع · بعدها مهلة 3 أيام، ثم وضع مقيّد تبقى فيه القراءة متاحة", {
      x: M, y: 6.1, w: CW, h: 0.6, valign: "middle", fontSize: 15, color: C.text2, objectName: "plans-note",
    });
    s.addNotes(
      "متى: «كم السعر بالتفصيل؟ شو بصير لما تخلص التجربة؟»\n\n" +
        "- بعد انتهاء التجربة أو الاشتراك: 3 أيام مهلة، بعدها وضع مقيّد — المطعم بيقدر يقرأ بياناته وتقاريره ويصدّرها، بس ما بيفتح جلسات أو طلبات جديدة.\n" +
        "- الأسعار بالدولار وبتنضبط من إعدادات الخادم."
    );
  }

  /* B5. خطة الوصول */
  {
    const s = slideWith("CONTENT", BACKUP, "احتياطي · خطة الوصول", "من التجربة للاشتراك في 3 خطوات");
    const cols = columns(3, 0.7);
    const steps = [
      ["1", "play", "جرّبه بدون تسجيل", "مطعم تجريبي حي لكل دور: مالك، مطبخ، كاشير، نادل، وزبون"],
      ["2", "gift", "14 يومًا مجانًا", "كل الميزات مفتوحة، وبلا صفحة دفع عند التسجيل"],
      ["3", "calendar-check", "الاشتراك", "شهري أو سنوي — والسنوي 12\u00A0شهرًا بسعر\u00A010"],
    ];
    for (let i = 0; i < 3; i++) {
      const { x, w } = cols[i];
      const [n, ic, head, body] = steps[i];
      const y = 1.95;
      card(s, x, y, w, 3.0, { name: `step-${i + 1}` });
      s.addShape(pres.shapes.OVAL, { x: x + w - 0.32 - 0.7, y: y + 0.32, w: 0.7, h: 0.7, fill: { color: C.accent1 }, objectName: `step-num-bg-${i + 1}` });
      num(s, n, { x: x + w - 0.32 - 0.7, y: y + 0.32, w: 0.7, h: 0.7, align: "center", fontSize: 26, color: C.text1, objectName: `step-num-${i + 1}` });
      s.addImage({ data: await icon(ic, HEX.orangeInk), x: x + 0.32, y: y + 0.45, w: 0.44, h: 0.44, altText: "", objectName: `step-icon-${i + 1}` });
      txt(s, head, { x: x + 0.32, y: y + 1.25, w: w - 0.64, h: 0.5, fontSize: 21, bold: true, objectName: `step-head-${i + 1}` });
      txt(s, body, { x: x + 0.32, y: y + 1.85, w: w - 0.64, h: 1.0, fontSize: 17, color: C.text2, objectName: `step-body-${i + 1}` });
      if (i < 2) s.addImage({ data: await icon("arrow-left", HEX.orangeInk), x: x - 0.53, y: y + 1.32, w: 0.36, h: 0.36, altText: "", objectName: `step-link-${i + 1}` });
    }
    await bridge(s, "أول هدف: المطاعم والمقاهي اللي بتعيد افتتاحها في غزة، والمطابخ اللي بتشتغل توصيل فقط", { y: 5.4 });
    s.addNotes(
      "متى: «كيف رح توصلوا لأول عملاء؟ عندكم خطة توسّع؟»\n\n" +
        "- القمع: ديمو بدون تسجيل ← تجربة 14 يوم ← اشتراك.\n" +
        "- عدّلوا «أول هدف» حسب خطتكم الحقيقية (مين أول 5 مطاعم رح تزوروها؟). لو ما في خطة مكتوبة: «منرجعلكم فيها»."
    );
  }

  /* B6. المصادر */
  {
    const s = slideWith("CONTENT", BACKUP, "احتياطي · المصادر", "مصدر كل رقم في العرض");
    const refs = [
      ["Union (2023) — استطلاع الطلب والدفع عبر الجوال، 1,000+ بالغ أمريكي", "10 دقائق انتظار · 22% يغادرون · 38% يقلّلون البقشيش", "prnewswire.com — New Consumer Survey Signals Mobile Ordering and Payment in Bars and Restaurants is Here to Stay"],
      ["Access Now (2023) — Palestine Unplugged", "36 ساعة انقطاع كامل للاتصالات في غزة", "accessnow.org/publication/palestine-unplugged"],
      ["الإحصاء الفلسطيني ووزارة السياحة والآثار (2024) — بيان يوم السياحة العالمي", "3,450 منشأة مطاعم وتقديم مشروبات دُمّرت في غزة", "pcbs.gov.ps — Press_Ar_WorldTourismDay2024A"],
      ["Technavio — Restaurant Management Software Market 2025–2030", "نمو 19.4% سنويًا", "technavio.com/report/restaurant-management-software-market-industry-analysis"],
      ["صفحات المنافسين: MENU TIGER · G2 · Menuviel", "الطلب عبر QR بتكاملات · ~199 درهمًا شهريًا · عمولة 15–30%", "menutiger.com/blog/loyverse-integration · g2.com/products/foodics/pricing · blog.menuviel.com"],
      ["مستودع menuPilot", "أكثر من 170 اختبارًا · أكثر من 110 نقطة API · الأسعار", "backend/tests · backend/routes/api.php · config/subscriptions"],
    ];
    const rh = 0.78;
    card(s, M, 1.9, CW, rh * refs.length + 0.2, { name: "refs" });
    for (let i = 0; i < refs.length; i++) {
      const y = 2.0 + i * rh;
      if (i > 0) s.addShape(pres.shapes.LINE, { x: M + 0.25, y: y - 0.02, w: CW - 0.5, h: 0, line: { color: C.accent6, width: 0.75 }, objectName: `ref-rule-${i + 1}` });
      num(s, String(i + 1), { x: M + CW - 0.65, y, w: 0.35, h: 0.42, align: "center", fontSize: 16, objectName: `ref-num-${i + 1}` });
      txt(s, [{ text: refs[i][0], options: { bold: true, color: C.text1 } }, { text: `\u200F  —  ${refs[i][1]}`, options: { color: C.accent3 } }], { x: M + 0.3, y, w: CW - 1.05, h: 0.42, valign: "middle", fontSize: 14, objectName: `ref-title-${i + 1}` });
      txt(s, refs[i][2], { x: M + 0.3, y: y + 0.38, w: CW - 1.05, h: 0.32, valign: "middle", fontSize: 11, color: C.accent4, rtlMode: false, objectName: `ref-url-${i + 1}` });
    }
    s.addNotes("متى: «من وين هالرقم؟» — افتحوا هاي الشريحة وأشّروا على المصدر. الروابط الكاملة في docs/presentation/PREP.md.");
  }

  await pres.writeFile({ fileName: OUT });
  await finalize(OUT);
  console.log(`✓ ${path.relative(ROOT, OUT)}`);
}

/* Two things pptxgenjs gets wrong for this deck, fixed in the written file:
   1. It writes Office's palette and only the latin theme font. Write the brand
      colours and the Arabic (complex-script) fonts — without them every Arabic
      word falls back to Times New Roman / Arial.
   2. A paragraph with several runs gets a <a:pPr> before every run; only the
      first is allowed (PowerPoint may ask to repair the file). */
async function finalize(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(n))) {
    const xml = await zip.file(name).async("string");
    const fixed = xml.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (whole, inner) => {
      const firstRun = inner.search(/<a:(?:r|br|fld)\b/);
      if (firstRun < 0) return whole;
      const rest = inner.slice(firstRun).replace(/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/g, "");
      return `<a:p>${inner.slice(0, firstRun)}${rest}</a:p>`;
    });
    if (fixed !== xml) zip.file(name, fixed);
  }
  const part = "ppt/theme/theme1.xml";
  const slots = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
  const scheme = `<a:clrScheme name="${THEME.name}">${slots.map((k) => `<a:${k}><a:srgbClr val="${THEME.colors[k]}"/></a:${k}>`).join("")}</a:clrScheme>`;
  const fonts = (block, face) => block.replace(/<a:cs typeface="[^"]*"\/>/, `<a:cs typeface="${face}"/>`).replace(/<a:font script="Arab" typeface="[^"]*"\/>/, `<a:font script="Arab" typeface="${face}"/>`);
  let xml = await zip.file(part).async("string");
  xml = xml
    .replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, head) => `${head}${THEME.name}"`)
    .replace(/<a:majorFont>[\s\S]*?<\/a:majorFont>/, (b) => fonts(b, THEME.headFontFace))
    .replace(/<a:minorFont>[\s\S]*?<\/a:minorFont>/, (b) => fonts(b, THEME.bodyFontFace));
  if (!xml.includes(scheme) || !xml.includes(`<a:cs typeface="${THEME.bodyFontFace}"/>`)) throw new Error("theme1.xml not in the shape pptxgenjs writes; nothing changed.");
  zip.file(part, xml);
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
