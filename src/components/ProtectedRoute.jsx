import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useProfileMode } from "../context/ProfileModeContext";

export default function ProtectedRoute({ children, sellerOnly = false, profileRequired = false }) {
  const { isAuthenticated, loading, profileStatus, profileError, profile } = useAuth();
  const { canSeller } = useProfileMode();
  const location = useLocation();

  if (!isSupabaseConfigured) return children;
  if (loading || profileStatus === "loading" || profileStatus === "unknown") return null;
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  if (profileRequired && profileStatus === "error") {
    return <div role="alert" className="flex min-h-full items-center justify-center px-6 text-center text-[14px] text-red-600">{profileError?.message || "Unable to load your profile."}</div>;
  }
  if (profile?.suspended_at) return <Navigate to="/account-suspended" replace />;
  if (profileRequired && !profile) {
    return <Navigate to="/onboarding" replace />;
  }
  if (sellerOnly && !canSeller) return <Navigate to="/profile" replace />;
  return children;
}
