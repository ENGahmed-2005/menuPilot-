import { Link, Navigate, useLocation } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";
import FormAlert from "../../components/auth/FormAlert";
import { t } from "../../i18n";

export default function JoinInformation() {
  const reference = useLocation().state?.reference;
  if (!reference) return <Navigate to="/join" replace />;
  const title = t("تم استلام طلبك");
  return <AuthLayout title={title}>
    <h1 className="mb-5 font-display text-3xl">{title}</h1>
    <FormAlert tone="success">
      <p>{t("تم استلام طلبك بنجاح. سيقوم فريق MenuPilot بمراجعته والتواصل معك قريباً.")}</p>
      <p className="mt-2">{t("رقم الطلب")} <strong dir="ltr">{reference}</strong></p>
    </FormAlert>
    <Link className="mt-6 inline-block font-bold text-copper-ink" to="/">{t("العودة للرئيسية")}</Link>
  </AuthLayout>;
}
