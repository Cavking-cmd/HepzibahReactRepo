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

  if (!anyRole && requiredRole && !hasRole("Admin") && !hasRole(requiredRole)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
