import { Link } from "react-router-dom";
import { ArrowRight, ChefHat, ClipboardList, Globe, Handshake, QrCode, ReceiptText, ShoppingBag, Truck, Users } from "lucide-react";
import Logo from "../../components/brand/Logo";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import { dir, lang } from "../../i18n";
import { shot } from "./components/shots";

const c = (ar, en) => lang === "en" ? en : ar;
const guide = c("كيف يعمل MenuPilot؟", "How MenuPilot works");
const partners = c("برنامج الشركاء المؤسسين", "Founding partners");
const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const section = "py-12 sm:py-16";
const heading = "text-2xl font-black leading-tight sm:text-4xl";
const copy = "mt-3 max-w-prose leading-7 text-slate-700";
const primary = "inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#ef922f] px-5 py-3 font-bold text-[#172331] hover:bg-[#ffa744]";
const apply = c("قدّم طلب الشراكة", "Apply for partnership");
const start = c("ابدأ طلب الانضمام", "Start your application");

const roles = [
  [QrCode, c("الزبون يرسل الطلب", "The guest places an order"), c("يمسح رمز الطاولة، ويختار الوجبات من المنيو. يصل الطلب إلى المطبخ برقم الطاولة.", "A guest scans the table code and chooses dishes. The kitchen receives the items with the table number.")],
  [ChefHat, c("المطبخ يحضّر الوجبات", "The kitchen prepares the dishes"), c("يرى الطهاة الأصناف والملاحظات في شاشة المطبخ ويحدّثون حالة التحضير ليعرف الفريق ما أصبح جاهزاً.", "Cooks see items and notes on the kitchen display and update preparation status so the team knows what is ready.")],
  [Users, c("النادل يتابع الطاولة", "The waiter coordinates service"), c("يتابع النادل الطلبات الجاهزة وطلبات الخدمة من الطاولات، ويعرف أين يقدّم كل وجبة.", "Waiters follow ready orders and service requests from tables so each dish reaches the right guests.")],
  [ReceiptText, c("الكاشير يسوّي الحساب", "The cashier settles the table"), c("يفتح الكاشير فاتورة الطاولة ويراجع أصنافها ويسجّل الدفع لإغلاق الحساب.", "The cashier opens the table bill, reviews the items and records payment to close the check.")],
  [ClipboardList, c("الإدارة تراجع نتائج الوردية", "Management reviews the shift"), c("تتابع الإدارة حالة الطلبات وتراجع المبيعات المسجّلة في التقارير بعد الدفع.", "Managers monitor orders during service and review recorded sales after payment.")],
];
const channels = [
  [QrCode, c("على الطاولة", "At the table"), c("يربط رمز QR الطلب بطاولة الزبون.", "A QR code links the guest’s order to their table.")],
  [Globe, c("عبر الإنترنت", "Online"), c("يفتح الزبون رابط المطعم ويختار الأصناف وطريقة الاستلام المتاحة.", "Guests open the restaurant link, choose dishes and select an available fulfilment option.")],
  [Truck, c("التوصيل", "Delivery"), c("يتابع الفريق طلب التوصيل وعنوانه حتى تسليمه.", "Staff track delivery orders and their destinations through handoff.")],
  [ShoppingBag, c("الاستلام", "Pickup"), c("عند تفعيل الاستلام، يحضّر الفريق الطلب ليأخذه الزبون من المطعم.", "When pickup is enabled, staff prepare the order for collection at the restaurant.")],
];
const process = [
  c("أرسل بيانات مطعمك واذكر اهتمامك بالشراكة في الملاحظات.", "Submit your restaurant details and mention your interest in partnership in the notes."),
  c("يراجع الفريق الطلب وتوافر مقعد في المجموعة.", "The team reviews your application and cohort availability."),
  c("ناقش ملاءمة البرنامج والخدمات والشروط مع الفريق.", "Discuss fit, services and commercial terms with the team."),
  c("راجع الاتفاقية ووقّع النسخة الورقية.", "Review the agreement and sign the paper copy."),
  c("يرفع الفريق النسخة الموقّعة ويتحقق من المستند.", "The team uploads the signed copy and verifies the document."),
  c("بعد الاعتماد، تفعّل الإدارة حساب المطعم وتصلك دعوة لإعداد كلمة المرور.", "After verification, an administrator activates the restaurant and sends an invitation to set your password."),
];
const questions = [
  [c("من يمكنه التقديم؟", "Who can apply?"), c("يمكن لمسؤول المطعم تقديم طلب الانضمام وتوضيح احتياجات فريقه واهتمامه بالبرنامج.", "A restaurant representative can apply and describe the team’s needs and interest in the program.")],
  [c("هل يضمن الطلب القبول؟", "Does applying guarantee acceptance?"), c("يراجع الفريق كل طلب بحسب ملاءمته وتوافر المقاعد قبل تأكيد المشاركة.", "The team assesses fit and available places before confirming participation.")],
  [c("هل تمنح الشراكة حصة في الشركة؟", "Does partnership confer ownership?"), c("الاتفاقية تشغيلية وتجارية فقط. تبقى ملكية الشركة والشفرة والحقوق الفكرية لأصحابها.", "The agreement covers restaurant operations and commercial terms only. Company equity, source code and intellectual property stay with their owners.")],
  [c("ماذا يحدث بعد قبول الطلب؟", "What happens after approval?"), c("يتواصل الفريق معك لمراجعة شروط مطعمك وإعداد اتفاقية الشراكة.", "The team contacts you to review terms for your restaurant and prepare the agreement.")],
  [c("كيف تُوقّع الاتفاقية؟", "How do we sign?"), process[3] + " " + process[4]],
  [c("متى يُفعّل الحساب؟", "When does the account go live?"), process[5]],
  [c("كيف تُحدّد الشروط التجارية؟", "What are the commercial terms?"), c("تُحدّد الرسوم والمدة والمزايا المتفق عليها في اتفاقية مطعمك قبل التوقيع.", "Your restaurant’s agreement sets out fees, duration and any agreed benefits before you sign.")],
];
function ApplyLink({ children }) {
  return <Link className={primary} to="/join">{children}<ArrowRight size={18} aria-hidden="true" className="rtl:rotate-180" /></Link>;
}
function Timeline({ items }) {
  return <ol className="mt-7">{items.map(([Icon, title, body], index) => <li key={title} className="relative flex gap-4 pb-6 last:pb-0 before:absolute before:start-[19px] before:top-9 before:bottom-0 before:w-px before:bg-[#a25b23] last:before:hidden">
    <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center rounded-full border border-[#c8ad8b] bg-white text-[#844015]">{Icon ? <Icon size={19} /> : index + 1}</span>
    <div className="pt-1.5"><h3 className="font-bold">{title}</h3>{body && <p className="mt-1 max-w-prose leading-7 text-slate-700">{body}</p>}</div>
  </li>)}</ol>;
}
function GuideContent() {
  return <>
    <section className={section}><div className={wrap + " grid items-start gap-9 lg:grid-cols-2"}>
      <div><h2 className={heading}>{c("طلب واحد، خمسة أدوار", "One order, five roles")}</h2><Timeline items={roles} /></div>
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-bold">{c("من أين تأتي الطلبات؟", "Where do orders come from?")}</h2>
        <ul className="mt-3 divide-y divide-slate-200">{channels.map(([Icon,title,body]) => <li key={title} className="flex gap-4 py-5"><Icon className="mt-1 shrink-0 text-[#844015]" aria-hidden="true" /><div><h3 className="font-bold">{title}</h3><p className={copy}>{body}</p></div></li>)}</ul>
      </div></div></section>
    <section className="bg-white"><div className={wrap + " " + section + " grid items-center gap-8 md:grid-cols-2"}>
      <div><h2 className={heading}>{c("صورة الوردية أمام الإدارة", "The manager’s view of a shift")}</h2><p className={copy}>{c("راجع الطلبات المفتوحة أثناء الخدمة. بعد إغلاق الحسابات، قارن المبيعات بالمصروفات المسجّلة، وراجع تقارير المبيعات وحضور الموظفين لتخطيط الوردية التالية.", "Check open orders during service. Once checks close, review sales reports, recorded expenses and employee attendance to plan the next shift.")}</p></div>
      <img loading="lazy" src={shot("finance")} alt={c("شاشة مالية المطعم والمصروفات", "Restaurant finance and expenses screen")} className="w-full rounded-xl border border-slate-200" />
    </div></section></>;
}
function PartnerContent() {
  return <>
    <section className={wrap + " " + section}><h2 className={heading}>{c("شراكة تبدأ من أرض المطعم", "A partnership built during service")}</h2>
      <p className={copy}>{c("جرّب النظام في ورديات حقيقية وشاركنا ما ينجح وما يحتاج إلى تحسين. الاتفاقية تجارية وتشغيلية ولا تمنح حصص ملكية أو حقوقاً في الشفرة أو المنتج.", "Use MenuPilot during real shifts and tell us what helps or slows down your team. The commercial agreement covers operations and grants no equity or rights to the product or its source code.")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">{[
        [Handshake, c("ما يمكنك الاتفاق عليه", "What you can agree together"), c("ناقش احتياجات الإعداد والتدريب والدعم مع الفريق. تسجّل المزايا والخدمات المعتمدة لمطعمك في الاتفاقية. يتطلب التعريف بمطعمك أو عرض شعاره موافقتك الصريحة.", "Discuss setup, training and support needs with the team. Your agreement records the services and benefits approved for your restaurant. Public recognition or use of your logo requires your explicit consent.")],
        [Users, c("دور فريق المطعم", "Your team’s part"), c("عيّن مسؤول تواصل، واستخدم النظام أثناء الخدمة، واجمع ملاحظات محددة من الموظفين وتعاون في اختبار التحسينات. المشاركة في التسويق أو دراسة حالة تتطلب موافقة منفصلة.", "Name a contact, use the system during service, collect specific staff feedback and help test improvements. Marketing and case studies each require separate consent.")],
      ].map(([Icon,title,body]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-6"><Icon className="mb-4 text-[#844015]" aria-hidden="true" /><h3 className="text-xl font-bold">{title}</h3><p className={copy}>{body}</p></article>)}</div>
    </section>
    <section id="partnership-process" className="bg-white"><div className={wrap + " " + section + " grid items-start gap-8 lg:grid-cols-2"}>
      <div><h2 className={heading}>{c("من الطلب إلى التفعيل", "From application to activation")}</h2><Timeline items={process.map(step => [null,step])} /></div>
      <div><h2 className={heading}>{c("أسئلة المطاعم", "Restaurant questions")}</h2><div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{questions.map(([q,a]) => <details key={q}><summary className="cursor-pointer py-4 font-bold">{q}</summary><p className="pb-5 leading-7 text-slate-700">{a}</p></details>)}</div></div>
    </div></section></>;
}
export default function RestaurantGuide({ partnership = false }) {
  const title = partnership ? c("كن من المطاعم المؤسسة لـ MenuPilot", "Become a founding restaurant partner") : c("كل عمليات مطعمك في منظومة واحدة", "Your restaurant operations in one place");
  return <main dir={dir} className="min-h-screen bg-[#f3efe5] font-body text-[#172331]">
    <div className="bg-[#1f2d3d] text-white"><nav className={wrap + " flex flex-wrap items-center justify-between gap-3 py-5"}>
      <Link to="/"><Logo on="dark" height={34} priority /></Link><LanguageSwitch tone="dark" />
    </nav><header className={wrap + " grid items-center gap-8 pb-12 pt-8 sm:pb-16 lg:grid-cols-2 lg:gap-12 lg:pt-12"}>
      <div><p className="mb-3 font-bold text-[#ffb972]">{partnership ? partners : guide}</p><h1 className="text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-prose text-lg leading-8 text-slate-100">{partnership ? c("نبحث عن مجموعة مختارة من المطاعم التي ترغب في المشاركة في تطوير تجربة تشغيل المطاعم الرقمية، وأن تكون من أوائل شركائنا في رحلة إطلاق MenuPilot.", "Join a selected group of early restaurant partners who use MenuPilot during service and help shape how the product works.") : c("من أول طلب يستقبله مطعمك، إلى تحضيره ومتابعته ودفعه. MenuPilot يربط الزبائن والمطبخ والنادل والكاشير والإدارة في مسار تشغيل متكامل.", "From the first order to preparation, service and payment, MenuPilot connects your guests, kitchen, waiters, cashier and managers in one workflow.")}</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2"><ApplyLink>{partnership ? apply : start}</ApplyLink>{partnership ? <a className="py-3 underline underline-offset-4" href="#partnership-process">{c("كيف تعمل الشراكة؟", "How does partnership work?")}</a> : <Link className="py-3 underline underline-offset-4" to="/founding-partners">{c("اكتشف برنامج الشركاء المؤسسين", "Explore founding partnerships")}</Link>}</div>
      </div><figure><img src={shot(partnership ? "dashboard" : "kitchen")} alt={partnership ? c("لوحة إدارة المطعم", "Restaurant management dashboard") : c("شاشة تحضير الطلبات", "Kitchen preparation screen")} className="w-full rounded-xl border border-white/25 shadow-lg" />
        <figcaption className="mt-3 text-sm text-slate-200">{partnership ? c("واجهة إدارة المطعم التي يستخدمها فريقك أثناء التشغيل.", "The management workspace your team uses during service.") : c("تظهر أصناف كل طلب وحالة تحضيرها في شاشة المطبخ.", "The kitchen display shows each order’s items and preparation status.")}</figcaption></figure>
    </header></div>
    {partnership ? <PartnerContent /> : <GuideContent />}
    <footer className="bg-[#1f2d3d] text-white"><div className={wrap + " flex flex-wrap items-center justify-between gap-5 py-12"}><h2 className="max-w-2xl text-2xl font-bold sm:text-3xl">{partnership ? c("ابدأ رحلتك مع MenuPilot كشريك مؤسس", "Start your journey as a founding partner") : c("جاهز لتشغيل مطعمك بطريقة أذكى؟", "Ready to run your restaurant smarter?")}</h2><ApplyLink>{partnership ? apply : c("انضم إلى MenuPilot", "Join MenuPilot")}</ApplyLink></div></footer>
  </main>;
}
