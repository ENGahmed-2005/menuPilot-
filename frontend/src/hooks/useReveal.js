/* ==========================================================================
   useReveal.js — Hook مخصّص (Custom Hook)
   --------------------------------------------------------------------------
   منقول كما هو من landing.jsx القديم بدون أي تغيير بالمنطق — فقط انتقل
   لملفه الخاص عشان يصير قابل لإعادة الاستخدام خارج صفحة الهبوط أيضًا.

   وظيفته: يخبرنا هل العنصر ظهر في الشاشة أثناء التمرير أم لا،
   لنشغّل حركة الظهور التدريجي (fade in).
   ========================================================================== */
import { useEffect, useRef, useState } from "react";

export function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}
