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
  signup: (input: SignUpInput) => Promise<{ ok: boolean; message: string }>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
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

  async function signup(input: SignUpInput) {
    // No role is sent: the server always creates a ChurchMember account.
    const { ok, body } = await apiRequest<LoginResponse>("POST", "/api/User/signup", input);
    const signupBody = body as unknown as LoginResponse | null;

    if (ok && signupBody?.token && signupBody.user) {
      const normalizedUser: AuthUser = {
        ...signupBody.user,
        userRoles: unwrap<string>(signupBody.user.userRoles),
      };
      setSession(signupBody.token, normalizedUser);
      setUser(normalizedUser);
      return { ok: true, message: signupBody.message ?? "Account created." };
    }

    return { ok: false, message: signupBody?.message ?? "We could not create your account." };
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  function hasRole(role: string) {
    return roles.includes(role);
  }

  return (
    <AuthContext.Provider value={{ user, roles, isAuthenticated: !!user, login, signup, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
