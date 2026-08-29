/* ==========================================================================
   Reveal.jsx — يكشف العنصر بحركة (fade + slide-up) أول ما يدخل الشاشة أثناء
   السكرول، عبر IntersectionObserver. أخف من مكتبة animation كاملة، وكافي
   لإحساس "الصفحة حيّة" بدل ظهور كل حاجة دفعة واحدة.
   ========================================================================== */
import { useEffect, useRef, useState } from "react";

export default function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
