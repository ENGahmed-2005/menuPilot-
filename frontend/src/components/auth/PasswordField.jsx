/* ==========================================================================
   PasswordField.jsx — FormField مخصّص لكلمة المرور مع زر إظهار/إخفاء
   ========================================================================== */
import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import FormField from "./FormField";
import { t } from "../../i18n";

export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      {...props}
      icon={Lock}
      type={visible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="shrink-0 text-muted transition-colors hover:text-ink"
          aria-label={visible ? t("إخفاء كلمة المرور") : t("إظهار كلمة المرور")}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
    />
  );
}
