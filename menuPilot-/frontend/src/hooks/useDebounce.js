/* ==========================================================================
   useDebounce.js — تأخير تحديث قيمة حتى يتوقف المستخدم عن الكتابة
   استخدام شائع: البحث في القائمة (owner/MenuManagement) بدون طلب API
   مع كل ضغطة زر.
   ========================================================================== */
import { useEffect, useState } from "react";

/**
 * @param {*} value - القيمة المتغيّرة بسرعة (مثلاً نص حقل بحث)
 * @param {number} delayMs - مدة الانتظار قبل اعتماد القيمة الجديدة
 */
export function useDebounce(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
