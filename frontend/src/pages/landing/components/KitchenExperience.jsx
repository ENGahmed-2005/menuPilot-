import { useEffect, useRef, useState } from "react";
import { ChefHat, MoveUpRight } from "lucide-react";
import { lang } from "../../../i18n";

export default function KitchenExperience() {
  const hostRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const ar = lang === "ar";
  useEffect(() => {
    const host = hostRef.current;
    let disposed = false,
      scene,
      loading = false,
      visible = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        visible = entry.isIntersecting;
        scene?.setVisible(visible);
        if (!visible || scene || loading) return;
        loading = true;
        try {
          const { createKitchenScene } =
            await import("./backgrounds/kitchenScene");
          if (disposed) return;
          scene = createKitchenScene(host);
          scene.setVisible(visible);
          setStatus("ready");
        } catch {
          if (!disposed) setStatus("fallback");
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(host);
    return () => {
      disposed = true;
      observer.disconnect();
      scene?.dispose();
    };
  }, []);
  return (
    <section
      id="kitchen-experience"
      className="mp-kitchen mp-wrap"
      data-mp-reveal
    >
      <div className="mp-kitchen-copy">
        <span className="mp-kicker">
          {ar
            ? "قلب مطعمك، متصل دائمًا"
            : "THE HEART OF YOUR RESTAURANT, CONNECTED"}
        </span>
        <h2>{ar ? "مطبخك، بتناغم جديد." : "Your kitchen. In perfect sync."}</h2>
        <p>
          {ar
            ? "من وصول الطلب إلى لحظة التقديم. كل تفصيلة في مكانها، وكل فرد يعرف خطوته التالية."
            : "From the incoming order to the finishing touch. Every detail in place, and everyone knows what comes next."}
        </p>
        <a href="#how-it-works" className="mp-kitchen-link">
          {ar ? "اكتشف رحلة الطلب" : "Explore the order journey"}
          <MoveUpRight size={18} />
        </a>
      </div>
      <div className="mp-kitchen-stage">
        <div ref={hostRef} className="mp-kitchen-canvas" aria-hidden="true" />
        {status !== "ready" && (
          <div className="mp-kitchen-fallback" aria-hidden="true">
            <ChefHat size={70} />
            <span>
              {ar
                ? "مطبخ متصل. فريق متناغم."
                : "Connected kitchen. A team in sync."}
            </span>
          </div>
        )}
        <span className="mp-kitchen-caption">
          {status === "ready"
            ? ar
              ? "حرّك المؤشر… ودع المطبخ يتفاعل معك"
              : "Move your pointer. Bring the kitchen to life."
            : ar
              ? "من أول طلب، إلى آخر طبق"
              : "From the first order to the last plate"}
        </span>
        <span className="mp-kitchen-coordinate">01 / THE KITCHEN</span>
      </div>
    </section>
  );
}
