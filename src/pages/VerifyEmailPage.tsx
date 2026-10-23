import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("Verifying your email address…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token. Please use the link from your email.");
      return;
    }

    async function verify() {
      const { ok, body } = await apiRequest<boolean>("POST", "/api/User/verify-email", { token });
      if (ok && body?.status) {
        setStatus("success");
        setMessage(body.message ?? "Your email address is verified.");
      } else {
        setStatus("error");
        setMessage(body?.message ?? "We could not verify this link.");
      }
    }

    void verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center">
          {status === "verifying" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
          {status === "success" && <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />}
          {status === "error" && <XCircle className="mx-auto h-10 w-10 text-destructive" />}
          <CardTitle className="mt-2 text-lg">
            {status === "verifying" ? "Verifying…" : status === "success" ? "Email verified" : "Verification failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Go to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
