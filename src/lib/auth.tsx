import { createContext, useContext, useState, type ReactNode } from "react";
import {
  type AuthUser,
  apiRequest,
  clearSession,
  getStoredUser,
  setSession,
  unwrap,
} from "@/lib/api";

interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  roles: string[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());

  const roles = user?.userRoles ?? [];

  async function login(email: string, password: string) {
    const { ok, body } = await apiRequest<LoginResponse>("POST", "/api/User/login", { email, password });

    const loginBody = body as unknown as LoginResponse | null;

    if (ok && loginBody?.token && loginBody.user) {
      const normalizedUser: AuthUser = {
        ...loginBody.user,
        userRoles: unwrap<string>(loginBody.user.userRoles),
      };
      setSession(loginBody.token, normalizedUser);
      setUser(normalizedUser);
      return { ok: true, message: loginBody.message ?? "Login successful." };
    }

    return { ok: false, message: loginBody?.message ?? "Login failed. Check your credentials." };
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  function hasRole(role: string) {
    return roles.includes(role);
  }

  return (
    <AuthContext.Provider value={{ user, roles, isAuthenticated: !!user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
