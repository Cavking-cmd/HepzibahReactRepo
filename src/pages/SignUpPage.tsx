import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import churchLogo from "@/assets/church-logo.png";

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fullName: string, email: string, password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!fullName.trim()) errors.fullName = "Enter your full name.";
  else if (fullName.trim().length > 100) errors.fullName = "Keep your name to 100 characters or fewer.";

  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Choose a password.";
  else if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = "Use at least 8 characters, including a letter and a number.";

  if (!confirmPassword) errors.confirmPassword = "Type your password again.";
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";

  return errors;
}

export default function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const found = validate(fullName, email, password, confirmPassword);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const result = await signup({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      confirmPassword,
    });
    setLoading(false);

    if (result.ok) {
      toast.success(result.message);
      navigate("/member");
    } else {
      setServerError(result.message);
    }
  }

  const fieldClass = (hasError: boolean) => (hasError ? "border-destructive aria-invalid:border-destructive" : "");

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
      </div>

      <div className="relative w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-6">
          <img
            src={churchLogo}
            alt="RCCG Hephzibah Parish"
            className="inline-flex w-16 h-16 rounded-full mb-3 shadow-lg object-contain bg-white p-1"
          />
          <h1 className="text-2xl font-semibold tracking-tight">RCCG Hephzibah Parish</h1>
          <p className="text-sm text-muted-foreground">Create a member account</p>
        </div>

        <Card className="shadow-xl border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Sign up</CardTitle>
            <CardDescription>
              For church members who want to submit and track reimbursement requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={!!errors.fullName || undefined}
                  className={fieldClass(!!errors.fullName)}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email || undefined}
                  className={fieldClass(!!errors.email)}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password || undefined}
                    className={`pr-9 ${fieldClass(!!errors.password)}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-1.5 flex items-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-xs text-destructive">{errors.password}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={!!errors.confirmPassword || undefined}
                  className={fieldClass(!!errors.confirmPassword)}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              {serverError && (
                <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>

              <p className="text-xs text-muted-foreground">
                We will email you a link to verify your address. You can sign in straight away, but you need to verify
                before submitting a reimbursement.
              </p>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
