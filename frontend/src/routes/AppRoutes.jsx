import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import FeatureProtectedRoute from "./FeatureProtectedRoute";
import DashboardShell from "../components/layout/DashboardShell";
import Landing from "../pages/landing/LandingPage";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import ScanEntry from "../pages/customer/ScanEntry";
import Menu from "../pages/customer/Menu";
import Cart from "../pages/customer/Cart";
import OrderTracking from "../pages/customer/OrderTracking";
import BillRequest from "../pages/customer/BillRequest";
import SubscriptionDashboard from "../pages/owner/SubscriptionDashboard";
import SubscriptionPlanPage from "../pages/owner/SubscriptionPlanPage";
import ThemeCustomization from "../pages/owner/ThemeCustomization";
import Tables from "../pages/owner/Tables";
import MenuManagement from "../pages/owner/MenuManagement";
import Reports from "../pages/owner/Reports";
import KitchenDashboard from "../pages/kitchen/KitchenDashboard";
import Billing from "../pages/cashier/Billing";
import TableStatus from "../pages/cashier/TableStatus";
import TableSessions from "../pages/waiter/TableSessions";
import AdminDashboard from "../pages/admin/AdminDashboard";
import Checkout from "../pages/checkout/Checkout";
import PaymentSuccess from "../pages/checkout/PaymentSuccess";

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/t/:tableCode" element={<ScanEntry />} />
    <Route path="/t/:tableCode/menu" element={<Menu />} />
    <Route path="/t/:tableCode/cart" element={<Cart />} />
    <Route path="/order-tracking" element={<OrderTracking />} />
    <Route path="/bill-request" element={<BillRequest />} />
    {/* بعد خطوة اختيار الباقة في التسجيل: /checkout?plan=X (دفع تجريبي) ثم
        /payment-success?plan=X. صفحتان بلا اعتماد على AuthContext أو أي
        API — بس خطوة تأكيد بصرية، الباقة نفسها بالفعل انحفظت وقت التسجيل. */}
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/payment-success" element={<PaymentSuccess />} />

    <Route element={<ProtectedRoute allow={["owner"]} />}>
      <Route path="/owner/dashboard" element={<DashboardShell><SubscriptionDashboard /></DashboardShell>} />
      <Route path="/owner/subscription/:planId" element={<DashboardShell><SubscriptionPlanPage /></DashboardShell>} />

      <Route element={<FeatureProtectedRoute feature="tables" />}>
        <Route path="/owner/tables" element={<DashboardShell><Tables /></DashboardShell>} />
      </Route>
      <Route element={<FeatureProtectedRoute feature="menu" />}>
        <Route path="/owner/menu" element={<DashboardShell><MenuManagement /></DashboardShell>} />
      </Route>
      <Route element={<FeatureProtectedRoute feature="reports" />}>
        <Route path="/owner/reports" element={<DashboardShell><Reports /></DashboardShell>} />
      </Route>
      <Route element={<FeatureProtectedRoute feature="theme-presets" />}>
        <Route path="/owner/theme" element={<DashboardShell><ThemeCustomization /></DashboardShell>} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute allow={["kitchen"]} />}>
      <Route element={<FeatureProtectedRoute feature="kitchen" />}>
        <Route path="/kitchen" element={<DashboardShell><KitchenDashboard /></DashboardShell>} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute allow={["cashier"]} />}>
      <Route element={<FeatureProtectedRoute feature="cashier" />}>
        <Route path="/cashier/tables" element={<DashboardShell><TableStatus /></DashboardShell>} />
        <Route path="/cashier/billing/:sessionId" element={<DashboardShell><Billing /></DashboardShell>} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute allow={["waiter"]} />}>
      <Route element={<FeatureProtectedRoute feature="waiter" />}>
        <Route path="/waiter" element={<DashboardShell><TableSessions /></DashboardShell>} />
      </Route>
    </Route>

    {/* مسؤول المنصة — دور مستقل عن owner، بيشوف كل المطاعم مجتمعين. مالوش
        باقة اشتراك خاصة بيه، فمفيش FeatureProtectedRoute هنا. */}
    <Route element={<ProtectedRoute allow={["admin"]} />}>
      <Route path="/admin/dashboard" element={<DashboardShell><AdminDashboard /></DashboardShell>} />
    </Route>
  </Routes>;
}
