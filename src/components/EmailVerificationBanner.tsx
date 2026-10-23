import { useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MailWarning } from "lucide-react";

export function EmailVerificationBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (dismissed) return null;

  async function resend() {
    setSending(true);
    const { ok, body } = await apiRequest<boolean>("POST", "/api/User/resend-verification", { email });
    setSending(false);

    if (ok && body?.status) {
      toast.success("Verification email sent. Please check your inbox.");
      setDismissed(true);
    } else {
      toast.error(body?.message ?? "We could not send the verification email.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100">
      <MailWarning className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Your email address isn't verified yet. Check your inbox, or send a new verification link.
      </span>
      <Button size="sm" variant="outline" onClick={() => void resend()} disabled={sending}>
        {sending ? "Sending…" : "Resend email"}
      </Button>
      <button
        type="button"
        className="text-xs underline-offset-2 hover:underline"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </button>
    </div>
  );
}
