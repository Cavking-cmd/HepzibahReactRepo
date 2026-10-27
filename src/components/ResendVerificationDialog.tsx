import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { apiRequest, type VerificationEmailSentDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResendVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The signed-in account's address, shown so the user can confirm it. */
  email: string;
  onSent?: (sentTo: string) => void;
}

const sameAddress = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function formatSentAt(iso: string | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Two-step verification resend.
 * Step 1 shows the destination address and asks the person to type it back.
 * The server checks the typed address against the signed-in account before
 * anything is sent. Step 2 shows exactly which address the message went to.
 */
export function ResendVerificationDialog({
  open,
  onOpenChange,
  email,
  onSent,
}: ResendVerificationDialogProps) {
  const [typed, setTyped] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; at: string } | null>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      setSending(false);
      setError(null);
      setSent(null);
    }
  }, [open]);

  const matches = typed.trim().length > 0 && sameAddress(typed, email);
  const showMismatch = typed.trim().length > 0 && !matches && typed.includes("@");

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!matches || sending) return;
    setSending(true);
    setError(null);

    const { ok, body } = await apiRequest<VerificationEmailSentDto>(
      "POST",
      "/api/User/resend-verification",
      { confirmEmail: typed.trim() },
    );
    setSending(false);

    if (ok && body?.status) {
      const delivered = body.data?.email || email;
      setSent({ email: delivered, at: formatSentAt(body.data?.sentAtUtc) });
      toast.success(`Verification email sent to ${delivered}.`);
      onSent?.(delivered);
      return;
    }

    setError(body?.message ?? "We could not send the verification email. Please try again.");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (sending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Verification email sent
              </DialogTitle>
              <DialogDescription>
                We sent a new verification link to the address below.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-400/30 dark:bg-emerald-950/40">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Sent to
              </p>
              <p className="mt-1 break-all font-medium text-emerald-900 dark:text-emerald-100">
                {sent.email}
              </p>
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">{sent.at}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              The link works for 48 hours, and only the newest link works. If it doesn't arrive in a
              few minutes, check your spam or junk folder.
            </p>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={send} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Confirm your email address
              </DialogTitle>
              <DialogDescription>
                For your security, type the address below to confirm the link should go there.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Verification link will be sent to
              </p>
              <p className="mt-1 flex items-center gap-2 break-all font-medium">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                {email}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-verification-email">Type your email address</Label>
              <Input
                id="confirm-verification-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                aria-invalid={showMismatch || undefined}
                disabled={sending}
                autoFocus
              />
              {showMismatch && (
                <p className="text-xs text-destructive">This doesn't match the address above.</p>
              )}
              {matches && (
                <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Address confirmed
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              If this isn't your address, cancel and change your email in Settings first.
            </p>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!matches || sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {sending ? "Sending…" : "Send verification email"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
