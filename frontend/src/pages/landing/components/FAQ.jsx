/* FAQ.jsx — the questions a restaurant owner asks before signing up, on the
   cream background. Native <details>, so it opens without JavaScript and
   works with the keyboard and screen readers. */
import { Plus } from "lucide-react";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import { t } from "../../../i18n";

const QUESTIONS = [
  [t("هل أحتاج أجهزة خاصة؟"), t("لا. يعمل على الجوالات واللابتوبات والشاشات الموجودة عندك، ويمكن تثبيته على الشاشة الرئيسية كتطبيق.")],
  [t("هل يحتاج الزبون إلى تنزيل تطبيق؟"), t("لا. يمسح رمز QR على طاولته فيفتح المنيو في المتصفح، ويطلب ويتابع طلبه من هناك.")],
  [t("ماذا يحدث إذا انقطع الإنترنت؟"), t("يكمل المطبخ والكاشير عملهما على آخر بيانات محفوظة، وتُرسل التغييرات وحدها عند عودة الاتصال. أما الطلبات الجديدة من جوالات الزبائن فتنتظر عودة الاتصال.")],
  [t("هل تأخذون عمولة على الطلبات؟"), t("لا. اشتراك شهري ثابت فقط، بلا عمولة على أي طلب، حتى طلبات الاستلام والتوصيل من رابط مطعمك.")],
  [t("كيف تمنعون الطلبات الوهمية؟"), t("لكل جلسة طاولة مفتاح سري، ولا يُقبل الطلب من الطاولة إلا من جوال قريب من المطعم.")],
  [t("هل أستطيع الإلغاء في أي وقت؟"), t("نعم، بلا عقود. وتبدأ بتجربة مجانية 14 يومًا بكل الميزات، دون بطاقة ائتمانية.")],
];

export default function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 border-y border-[#F3EFE5]/8 bg-[#F3EFE5] text-[#172331]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-10 lg:py-20">
        <SectionHeading tone="light" eyebrow={t("الأسئلة الشائعة")} title={t("قبل أن تبدأ.")} className="lg:sticky lg:top-28 lg:self-start">
          {t("أكثر ما يسأله أصحاب المطاعم. سؤالك غير موجود؟ جرّب المطعم التجريبي، وسترى الجواب بنفسك.")}
        </SectionHeading>
        <Reveal className="divide-y divide-[#172331]/10 rounded-2xl border border-[#172331]/10 bg-[#FFFDF9] shadow-[0_1px_2px_rgba(23,35,49,0.05)]">
          {QUESTIONS.map(([q, a]) => (
            <details key={q} className="group px-5 sm:px-6">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-black [&::-webkit-details-marker]:hidden">
                {q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#172331]/[.06] text-[#172331] transition-transform duration-300 group-open:rotate-45 group-open:bg-[#E67E22] group-open:text-[#172331]">
                  <Plus size={16} aria-hidden="true" />
                </span>
              </summary>
              <p className="faq-answer pb-5 text-sm leading-7 text-[#3E4B5B]">{a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
