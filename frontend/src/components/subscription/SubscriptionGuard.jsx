/* ==========================================================================
   SubscriptionGuard — wraps purely operational screens (kitchen, waiter).
   Restricted mode shows a calm explanation instead of the screen. Reading
   pages stay open. UX only: the API blocks the same actions (subscription
   middleware).
   ========================================================================== */
import { Link } from "react-router-dom";
import { PauseCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { buttonClasses } from "../ui/Button";
import { getRoleHome } from "../../utils/roleHome";
import { t } from "../../i18n";

export default function SubscriptionGuard({ children }) {
  const { role } = useAuth();
  const { canOperate } = useSubscription();
  if (canOperate) return children;
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-copper/10 text-copper-ink"><PauseCircle size={26} aria-hidden="true" /></span>
        <h1 className="mt-4 text-2xl font-extrabold">{t("هذه الشاشة متوقفة مؤقتًا")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{t("انتهت الفترة التجريبية للمطعم. البيانات محفوظة، وتعود هذه الشاشة للعمل فور تفعيل خطة.")}</p>
        {role === "owner"
          ? <Link to="/owner/subscription/basic" className={`${buttonClasses()} mt-6`}>{t("اختيار خطة")}</Link>
          : <Link to={getRoleHome(role)} className={`${buttonClasses({ variant: "secondary" })} mt-6`}>{t("العودة")}</Link>}
      </div>
    </div>
  );
}
