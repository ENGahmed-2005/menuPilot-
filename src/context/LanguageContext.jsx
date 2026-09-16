/* ==========================================================================
   LanguageContext.jsx — حالة اللغة (en/ar) على مستوى التطبيق كله
   --------------------------------------------------------------------------
   قبل التقسيم كانت اللغة useState محلي داخل landing.jsx فقط. أصبحت هنا
   Context عشان أي صفحة جديدة (مثلاً صفحة الزبون customer/Menu.jsx) تقدر
   تستخدم نفس اللغة المختارة دون تكرار المنطق.
   ========================================================================== */
import { createContext, useContext, useState } from "react";

const LanguageContext = createContext(null);

export function LanguageProvider({ children, defaultLang = "ar" }) {
  const [lang, setLang] = useState(defaultLang);

  function toggleLang() {
    setLang((prev) => (prev === "en" ? "ar" : "en"));
  }

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** الاستخدام: const { lang, toggleLang, dir } = useLanguage(); */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
