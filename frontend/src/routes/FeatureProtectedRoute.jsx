import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addonForFeature, subscriptionOf, userHasFeature } from "../config/subscriptions";

export default function FeatureProtectedRoute({ feature, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!userHasFeature(user, feature)) {
    // The subscription page preselects the plan or add-on that unlocks it.
    return (
      <Navigate
        to={`/owner/subscription/${subscriptionOf(user).plan}`}
        replace
        state={{ requiredFeature: feature, requiredAddon: addonForFeature(feature) }}
      />
    );
  }

  return children ?? <Outlet />;
}
