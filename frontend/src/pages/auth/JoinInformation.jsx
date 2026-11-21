import { Link, Navigate, useLocation } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";
import FormAlert from "../../components/auth/FormAlert";
import { t } from "../../i18n";

const steps = [
  t("قدّم بيانات المطعم والخدمات المطلوبة."),
  t("يراجع الفريق الطلب ويتواصل معك بشأن القرار."),
  t("راجع الاتفاقية ووقّع النسخة الورقية."),
  t("بعد اعتماد التوقيع، تتسلّم دعوة لتعيين كلمة المرور."),
];

export default function JoinInformation({ mode }) {
  const reference = useLocation().state?.reference;
  if (mode === "received" && !reference) return <Navigate to="/join" replace />;
  const titles = {
    guide: t("كيف تنضم إلى MenuPilot؟"),
    partners: t("برنامج المطاعم الشريكة المؤسسة"),
    received: t("تم استلام طلبك"),
  };
  return <AuthLayout title={titles[mode]}>
    <h1 className="mb-5 font-display text-3xl">{titles[mode]}</h1>
    {mode === "received" && <FormAlert tone="success">
      <p>{t("تم استلام طلبك بنجاح. سيقوم فريق MenuPilot بمراجعته والتواصل معك قريباً.")}</p>
      <p className="mt-2">{t("رقم الطلب")} <strong dir="ltr">{reference}</strong></p>
    </FormAlert>}
    {mode === "guide" && <ol className="list-decimal space-y-3 ps-5">{steps.map(step => <li key={step}>{step}</li>)}</ol>}
    {mode === "partners" && <div className="space-y-4">
      <p>{t("يدعو البرنامج مجموعة من المطاعم لتشغيل MenuPilot والمشاركة في اختبار الميزات وتقديم الملاحظات. تُحدَّد الخدمات والمزايا والالتزامات في اتفاقية كل مطعم.")}</p>
      <p>{t("الشراكة تجارية وتشغيلية. أي ملكية في MenuPilot تتطلب اتفاقية استثمار مستقلة. نشر الاسم أو الشعار يتطلب موافقة صريحة.")}</p>
    </div>}
    <Link className="mt-6 inline-block font-bold text-copper-ink" to={mode === "received" ? "/" : "/join"}>
      {mode === "received" ? t("العودة للرئيسية") : t("قدّم طلب انضمام")}
    </Link>
  </AuthLayout>;
}
