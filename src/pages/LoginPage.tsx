import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { routeForRoles } from "@/lib/roles";
import { getApiBase, getStoredUser, setApiBase } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import churchLogo from "@/assets/church-logo.png";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@churchportal.local");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiBaseInput, setApiBaseInput] = useState(getApiBase());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      toast.success(result.message);
      const user = getStoredUser();
      navigate(routeForRoles(user?.userRoles ?? []));
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-10%] h-[60vmax] w-[60vmax] rounded-full bg-primary/20 blur-3xl"
          style={{ animation: "aurora-drift-1 18s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[-15%] right-[-10%] h-[55vmax] w-[55vmax] rounded-full bg-blue-400/20 dark:bg-blue-500/15 blur-3xl"
          style={{ animation: "aurora-drift-2 22s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[20%] right-[10%] h-[40vmax] w-[40vmax] rounded-full bg-violet-400/15 dark:bg-violet-500/10 blur-3xl"
          style={{ animation: "aurora-drift-3 26s ease-in-out infinite" }}
        />
      </div>

      <div className="relative w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-6">
          <img
            src={churchLogo}
            alt="RCCG Hephzibah Parish"
            className="inline-flex w-16 h-16 rounded-full mb-3 shadow-lg object-contain bg-white p-1"
          />
          <h1 className="text-2xl font-semibold tracking-tight">RCCG Hephzibah Parish</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <Card className="shadow-xl border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@church.org"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Login"}
              </Button>
            </form>

            <div className="mt-4">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                onClick={() => setShowSettings((s) => !s)}
              >
                API server settings
              </button>
              {showSettings && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    className="h-8 text-xs"
                    value={apiBaseInput}
                    onChange={(e) => setApiBaseInput(e.target.value)}
                    placeholder="/api (blank = same origin)"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setApiBase(apiBaseInput || "");
                      toast.success("API base URL saved.");
                    }}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
