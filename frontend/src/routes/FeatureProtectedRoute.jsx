import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubscriptionPlan, hasPlanFeature } from "../config/subscriptions";

export default function FeatureProtectedRoute({ feature }) {
  const { user, isAuthenticated, loading } = useAuth(); const location=useLocation();
  if(loading)return null; if(!isAuthenticated)return <Navigate to="/login" replace state={{from:location}}/>;
  const trial=user?.plan==='trial'&&user?.trial_ends_at&&new Date(user.trial_ends_at)>new Date();
  const planId=user?.plan||'basic'; const plan=getSubscriptionPlan(planId);
  if(!trial&&!hasPlanFeature(planId,feature))return <Navigate to={`/owner/subscription/${planId}`} replace state={{requiredFeature:feature}}/>;
  return <Outlet/>;
}
