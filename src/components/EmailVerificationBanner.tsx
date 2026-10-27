import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MailWarning } from "lucide-react";
import { ResendVerificationDialog } from "@/components/ResendVerificationDialog";

export function EmailVerificationBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(email);

  if (dismissed) return null;

  async function openConfirm() {
    // Re-read the profile so the address shown in the confirmation step is the
    // one currently on the account, not a stale value from page load.
    setChecking(true);
    // /api/User/me returns the user object itself, not a { data } wrapper.
    const { ok, body } = await apiRequest<unknown>("GET", "/api/User/me");
    setChecking(false);
    const current = (body as unknown as { email?: string } | null)?.email;
    if (ok && current) setConfirmEmail(current);
    setConfirmOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100">
        <MailWarning className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          Your email address isn't verified yet. Check your inbox, or send a new verification link.
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void openConfirm()}
          disabled={checking}
        >
          {checking ? "Checking…" : "Resend email"}
        </Button>
        <button
          type="button"
          className="text-xs underline-offset-2 hover:underline"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>

      <ResendVerificationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        email={confirmEmail}
        onSent={() => setDismissed(true)}
      />
    </>
  );
}
