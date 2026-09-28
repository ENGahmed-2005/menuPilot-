import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import FeatureProtectedRoute from "./FeatureProtectedRoute";
import DashboardShell from "../components/layout/DashboardShell";
import { PageLoader } from "../components/loading/LoadingScreen";
import SubscriptionGuard from "../components/subscription/SubscriptionGuard";
import Landing from "../pages/landing/LandingPage";
import Login from "../pages/auth/Login";
const Register = lazy(() => import("../pages/auth/Register"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const ScanEntry = lazy(() => import("../pages/customer/ScanEntry"));
const Menu = lazy(() => import("../pages/customer/Menu"));
const RestaurantMenu = lazy(() => import("../pages/customer/RestaurantMenu"));
const Cart = lazy(() => import("../pages/customer/Cart"));
const PaymentFlow = lazy(() => import("../pages/customer/PaymentFlow"));
const OrderTracking = lazy(() => import("../pages/customer/OrderTracking"));
const BillRequest = lazy(() => import("../pages/customer/BillRequest"));
const SubscriptionDashboard = lazy(() => import("../pages/owner/SubscriptionDashboard"));
const SubscriptionPlanPage = lazy(() => import("../pages/owner/SubscriptionPlanPage"));
const ThemeCustomization = lazy(() => import("../pages/owner/ThemeCustomization"));
const BrandingCustomization = lazy(() => import("../pages/owner/BrandingCustomization"));
const RestaurantSettings = lazy(() => import("../pages/owner/RestaurantSettings"));
const Tables = lazy(() => import("../pages/owner/Tables"));
const Orders = lazy(() => import("../pages/owner/Orders"));
const Welcome = lazy(() => import("../pages/auth/Welcome"));
const AccountingExports = lazy(() => import("../pages/owner/AccountingExports"));
const MenuManagement = lazy(() => import("../pages/owner/MenuManagement"));
const Reports = lazy(() => import("../pages/owner/Reports"));
const StaffManagement = lazy(() => import("../pages/owner/StaffManagement"));
const KitchenDashboard = lazy(() => import("../pages/kitchen/KitchenDashboard"));
const Billing = lazy(() => import("../pages/cashier/Billing"));
const TableStatus = lazy(() => import("../pages/cashier/TableStatus"));
const SalesReports = lazy(() => import("../pages/cashier/SalesReports"));
const TableSessions = lazy(() => import("../pages/waiter/TableSessions"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminReports = lazy(() => import("../pages/admin/AdminReports"));
const RestaurantsManagement = lazy(() => import("../pages/admin/RestaurantsManagement"));
const OwnersManagement = lazy(() => import("../pages/admin/OwnersManagement"));
const AdminSubscriptions = lazy(() => import("../pages/admin/AdminSubscriptions"));
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings"));
const AdminNotifications = lazy(() => import("../pages/admin/AdminNotifications"));

// Each role only downloads its own screens: a customer scanning a QR code
// never loads the admin or cashier bundles.
export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/menu" element={<RestaurantMenu />} />
      <Route path="/t/:tableCode" element={<ScanEntry />} />
      <Route path="/t/:tableCode/menu" element={<Menu />} />
      <Route path="/t/:tableCode/cart" element={<Cart />} />
      <Route path="/t/:tableCode/payment" element={<PaymentFlow />} />
      <Route path="/order-tracking" element={<OrderTracking />} />
      <Route path="/bill-request" element={<BillRequest />} />

      <Route element={<ProtectedRoute allow={["owner"]} />}>
        <Route path="/owner/subscription/:planId" element={<DashboardShell><SubscriptionPlanPage /></DashboardShell>} />
        <Route path="/owner/settings" element={<DashboardShell><RestaurantSettings /></DashboardShell>} />
        <Route path="/owner/branding" element={<DashboardShell><BrandingCustomization /></DashboardShell>} />
        <Route path="/owner/reports" element={<FeatureProtectedRoute feature="reports"><DashboardShell><Reports /></DashboardShell></FeatureProtectedRoute>} />
        <Route path="/owner/theme" element={<FeatureProtectedRoute feature="theme-presets"><DashboardShell><ThemeCustomization /></DashboardShell></FeatureProtectedRoute>} />
      </Route>

      {/* Restaurant operations: owner, or a manager whose permissions allow it. */}
      <Route element={<ProtectedRoute allow={["owner", "manager"]} permission="view_dashboard|view_orders" />}>
        <Route path="/owner/dashboard" element={<DashboardShell><SubscriptionDashboard /></DashboardShell>} />
      </Route>
      {/* Shown once after registration: the 14-day trial is already running (no checkout). */}
      <Route element={<ProtectedRoute allow={["owner"]} />}>
        <Route path="/welcome" element={<Welcome />} />
      </Route>

      {/* Accounting & Excel export: owner, or staff explicitly granted an export permission. */}
      <Route element={<ProtectedRoute allow={["owner", "manager", "cashier"]} permission="export_reports|export_invoices|export_payments|export_sales|manage_accounting_settings" />}>
        <Route path="/owner/accounting" element={<DashboardShell><AccountingExports /></DashboardShell>} />
      </Route>
      <Route element={<ProtectedRoute allow={["owner", "manager"]} permission="view_orders" />}>
        <Route path="/owner/orders" element={<DashboardShell><Orders /></DashboardShell>} />
      </Route>
      <Route element={<ProtectedRoute allow={["owner", "manager"]} permission="manage_tables" />}>
        <Route path="/owner/tables" element={<FeatureProtectedRoute feature="tables"><DashboardShell><Tables /></DashboardShell></FeatureProtectedRoute>} />
      </Route>
      <Route element={<ProtectedRoute allow={["owner", "manager"]} permission="manage_menu" />}>
        <Route path="/owner/menu" element={<FeatureProtectedRoute feature="menu"><DashboardShell><MenuManagement /></DashboardShell></FeatureProtectedRoute>} />
      </Route>
      <Route element={<ProtectedRoute allow={["owner", "manager"]} permission="manage_staff" />}>
        <Route path="/owner/staff" element={<DashboardShell><StaffManagement /></DashboardShell>} />
      </Route>

      <Route element={<ProtectedRoute allow={["kitchen", "owner", "manager"]} permission="manage_orders" />}>
        <Route element={<FeatureProtectedRoute feature="kitchen" />}><Route path="/kitchen" element={<DashboardShell><SubscriptionGuard><KitchenDashboard /></SubscriptionGuard></DashboardShell>} /></Route>
      </Route>
      <Route element={<ProtectedRoute allow={["cashier", "owner", "manager"]} permission="view_payments" />}>
        <Route element={<FeatureProtectedRoute feature="cashier" />}>
          <Route path="/cashier/tables" element={<DashboardShell><TableStatus /></DashboardShell>} />
          <Route path="/cashier/billing/:sessionId" element={<DashboardShell><Billing /></DashboardShell>} />
          <Route path="/cashier/reports" element={<DashboardShell><SalesReports /></DashboardShell>} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute allow={["waiter", "owner", "manager"]} permission="view_tables" />}>
        <Route element={<FeatureProtectedRoute feature="waiter" />}><Route path="/waiter" element={<DashboardShell><SubscriptionGuard><TableSessions /></SubscriptionGuard></DashboardShell>} /></Route>
      </Route>

      <Route element={<ProtectedRoute allow={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/restaurants" element={<RestaurantsManagement />} />
        <Route path="/admin/owners" element={<OwnersManagement />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
