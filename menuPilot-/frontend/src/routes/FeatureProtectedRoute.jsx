import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubscriptionPlan, hasPlanFeature } from "../config/subscriptions";

export default function FeatureProtectedRoute({ feature }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const planId = user?.plan || "pro";
  const plan = getSubscriptionPlan(planId);

  if (!hasPlanFeature(planId, feature)) {
    return <Navigate to={`/owner/subscription/${planId}`} replace state={{ requiredFeature: feature }} />;
  }

  return <Outlet />;
}
