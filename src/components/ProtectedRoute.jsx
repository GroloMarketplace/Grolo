import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useProfileMode } from "../context/ProfileModeContext";

export default function ProtectedRoute({ children, sellerOnly = false }) {
  const { isAuthenticated, loading } = useAuth();
  const { canSeller } = useProfileMode();
  const location = useLocation();

  if (sellerOnly && !canSeller) return <Navigate to="/profile" replace />;
  if (!isSupabaseConfigured) return children;
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  return children;
}
