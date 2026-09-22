/* ==========================================================================
   App.jsx — المكوّن الأعلى في التطبيق (الأب لكل المكوّنات)
   --------------------------------------------------------------------------
   حاليًا يعرض صفحة الهبوط فقط. لاحقًا هنا يوضع الراوتر (React Router)
   لتوزيع الصفحات: صفحة الهبوط، لوحة المطبخ، صفحة الكاشير... إلخ.
   ========================================================================== */
import { BrowserRouter, Routes, Route } from "react-router-dom";

// نستورد مكوّن صفحة الهبوط من مجلد components.
// "./" تعني: ابدأ من مجلد هذا الملف نفسه (src).
import MenuPilotLanding from "./pages/landing/landing.jsx";
import Login from "./pages/login/Login.jsx";
import Register from "./pages/register/Register.jsx";
// import Dashboard from "./pages/dashboard/Dashboard.jsx";
// import Menu from "./pages/menu/Menu.jsx";
// import Orders from "./pages/orders/Orders.jsx";
// import Tables from "./pages/tables/Tables.jsx";
// import Users from "./pages/users/Users.jsx";
// المكوّن في React = دالة عادية تُرجع JSX (شكل يشبه HTML داخل JavaScript).
// export default: يعني "هذا هو الشيء الرئيسي الذي يُصدّره الملف"،
// ولذلك استطعنا في main.jsx كتابة: import App from "./App.jsx"
export default function App() {
  // return: ما سيُرسم على الشاشة.
  // ملاحظة: المكوّن يجب أن يُرجع عنصرًا واحدًا فقط. لو أردت عدة عناصر
  // بجانب بعضها، لُفّها بـ <> ... </> (يسمى Fragment).
  return (
    <BrowserRouter>
      <Routes>
<Route path="/" element={<MenuPilotLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/users" element={<Users />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
