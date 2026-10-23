import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
  requiredRole?: string;
  anyRole?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({ requiredRole, anyRole, children }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = hasRole("Admin") || hasRole("AccountsAdmin");

  if (!anyRole && requiredRole && !isSuperAdmin && !hasRole(requiredRole)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
