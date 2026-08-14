import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { isAuthenticated, loading, profileStatus, profile } = useAuth();
  const location = useLocation();
  if (loading || profileStatus === "loading" || profileStatus === "unknown") return null;
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (!profile?.is_admin) return <Navigate to="/" replace />;
  return children;
}
