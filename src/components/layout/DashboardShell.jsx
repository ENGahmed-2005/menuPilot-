/* ==========================================================================
   DashboardShell.jsx — إطار موحّد لكل صفحات الأدوار المحمية
   --------------------------------------------------------------------------
   يلف أي صفحة owner/kitchen/cashier/waiter بنفس الـ Sidebar وبنية الصفحة،
   بدل تكرار الشريط الجانبي في كل صفحة على حدة. التخطيط: عمود جانبي ثابت
   (lg+) بجانب منطقة محتوى، مع flex-row-reverse عشان الشريط الجانبي يظهر
   يمين الشاشة (متسق مع اتجاه RTL الافتراضي للتطبيق).

   تطبيق الثيم المخصّص: كل كلاسات Tailwind زي bg-copper/text-herb بتتحوّل
   وقت الـ build لـ background-color:var(--color-copper) إلخ (مش قيمة hex
   ثابتة) — فلو الـ owner عندها ثيم محفوظ (من صفحة "تخصيص الثيم")، بنـ
   override لنفس متغيرات الـ CSS دي كـ inline style على العنصر الجذر هنا،
   فكل مكوّن جوّا اللوحة (Sidebar، أزرار، badges...) بياخد اللون الجديد
   فورًا بدون ما نلمس أي مكوّن تاني بالاسم. لو المستخدم مش owner أو مفيش
   ثيم محفوظ، themeVars بترجع null ومفيش أي override (الهوية الافتراضية).
   ========================================================================== */
import { useAuth } from "../../context/AuthContext";
import { resolveThemeVars } from "../../config/themes";
import Sidebar from "./Sidebar";

export default function DashboardShell({ children }) {
  const { user } = useAuth();
  const themeVars = user?.role === "owner" ? resolveThemeVars(user.theme) : null;

  return (
    <div
      style={themeVars || undefined}
      className="min-h-screen bg-paper-2 text-ink lg:flex lg:flex-row-reverse"
    >
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
