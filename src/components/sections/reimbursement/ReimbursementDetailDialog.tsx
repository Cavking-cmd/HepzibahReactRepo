import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRequest, type ReimbursementRequestDto } from "@/lib/api";
import {
  downloadReceipt,
  formatDay,
  formatMoney,
  statusMeta,
  todayInput,
} from "@/lib/reimbursements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReimbursementMode = "member" | "accountsOfficer" | "accountsAdmin" | "pastor";

interface ReimbursementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ReimbursementRequestDto | null;
  mode: ReimbursementMode;
  onEdit: (request: ReimbursementRequestDto) => void;
  onChanged: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  Created: "Draft created",
  Updated: "Draft updated",
  Submitted: "Submitted for approval",
  MinisterApproved: "Approved by minister",
  InfoRequested: "More information requested",
  Rejected: "Rejected",
  Approved: "Approved for payment",
  Paid: "Payment recorded",
};

interface PaymentState {
  paymentDate: string;
  amountPaid: string;
  paymentMethod: string;
  paymentReference: string;
  chequeNumber: string;
  authorizedByName1: string;
  authorizedByName2: string;
  authorizationDate: string;
  financeNotes: string;
}

export function ReimbursementDetailDialog({
  open,
  onOpenChange,
  request,
  mode,
  onEdit,
  onChanged,
}: ReimbursementDetailDialogProps) {
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentState>({
    paymentDate: todayInput(),
    amountPaid: "",
    paymentMethod: "E-Transfer",
    paymentReference: "",
    chequeNumber: "",
    authorizedByName1: "",
    authorizedByName2: "",
    authorizationDate: "",
    financeNotes: "",
  });

  useEffect(() => {
    if (!open || !request) return;
    setPayOpen(false);
    setPayment({
      paymentDate: todayInput(),
      amountPaid: String(request.totalAmount),
      paymentMethod: "E-Transfer",
      paymentReference: "",
      chequeNumber: "",
      authorizedByName1: "",
      authorizedByName2: "",
      authorizationDate: "",
      financeNotes: "",
    });
  }, [open, request]);

  if (!request) return null;

  const status = statusMeta(request.status);
  const canManageAccounts = mode === "accountsOfficer" || mode === "accountsAdmin";
  const canApprove = mode === "accountsAdmin" || mode === "accountsOfficer";
  const canMinister = mode === "pastor" || mode === "accountsAdmin";
  const isOwnerView = mode === "member";

  async function run(path: string, body?: unknown, successMessage?: string) {
    setBusy(true);
    const result = await apiRequest("POST", `/api/Reimbursements/${request!.id}${path}`, body);
    setBusy(false);

    if (!result.ok) {
      toast.error(result.body?.message ?? "The action could not be completed.");
      return;
    }

    toast.success(successMessage ?? result.body?.message ?? "Done.");
    onChanged();
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this draft reimbursement?")) return;

    setBusy(true);
    const result = await apiRequest("DELETE", `/api/Reimbursements/${request!.id}`);
    setBusy(false);

    if (!result.ok) {
      toast.error(result.body?.message ?? "The draft could not be deleted.");
      return;
    }

    toast.success("Draft deleted.");
    onChanged();
    onOpenChange(false);
  }

  async function handlePayment() {
    const amount = Number(payment.amountPaid);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter the actual amount paid.");
      return;
    }

    if (amount !== request!.totalAmount && !payment.financeNotes.trim()) {
      toast.error("Add a finance note explaining the difference between the approved total and the amount paid.");
      return;
    }

    setBusy(true);
    const result = await apiRequest("POST", `/api/Reimbursements/${request!.id}/payment`, {
      paymentDate: payment.paymentDate || todayInput(),
      amountPaid: amount,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference || null,
      chequeNumber: payment.chequeNumber || null,
      authorizedByName1: payment.authorizedByName1 || null,
      authorizedByName2: payment.authorizedByName2 || null,
      authorizationDate: payment.authorizationDate || null,
      financeNotes: payment.financeNotes || null,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(result.body?.message ?? "Payment could not be recorded.");
      return;
    }

    toast.success("Payment recorded.");
    onChanged();
    onOpenChange(false);
  }

  function requestInfo() {
    const notes = window.prompt("What information or correction is required from the requester?");
    if (!notes?.trim()) return;
    void run("/request-info", { notes: notes.trim() }, "Information requested.");
  }

  function reject() {
    const reason = window.prompt("Why is this reimbursement being rejected?");
    if (!reason?.trim()) return;
    void run("/reject", { reason: reason.trim() }, "Reimbursement rejected.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] max-w-none h-[100dvh] max-h-[100dvh] m-0 p-0 rounded-none sm:w-[100vw] sm:max-w-none sm:h-[100dvh] sm:max-h-[100dvh] sm:m-0 sm:p-0 sm:rounded-none">
        <div className="flex flex-col h-full max-h-[100dvh]">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
              {request.requestNumber}
              <Badge variant={status.variant}>{status.label}</Badge>
            </DialogTitle>
          </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto space-y-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Payee</p><p className="font-medium">{request.payeeName}</p></div>
            <div><p className="text-xs text-muted-foreground">Department</p><p className="font-medium">{request.department}</p></div>
            <div><p className="text-xs text-muted-foreground">Minister in charge</p><p className="font-medium">{request.ministerInCharge}</p></div>
            <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{formatDay(request.requestDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-medium">{formatDay(request.submittedDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Receipts</p><p className="font-medium">{request.receiptCount}</p></div>
            <div><p className="text-xs text-muted-foreground">Requester email</p><p className="truncate font-medium">{request.payeeEmail ?? "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Draft created</p><p className="font-medium">{formatDay(request.createdDate)}</p></div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Ref #</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                  <th className="px-3 py-2 text-right">GST</th>
                  <th className="px-3 py-2 text-right">PST</th>
                  <th className="px-3 py-2 text-right">HST</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {request.items.map((item) => (
                  <tr key={item.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-2 text-muted-foreground">{item.referenceNumber}</td>
                    <td className="px-3 py-2">
                      <p>{item.itemName}</p>
                      {item.requiresSerialNumber && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Serial: {item.serialNumber || "Not provided"}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(item.subtotal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(item.gst)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(item.pst)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(item.hst)}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border/60 bg-muted/30 font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(request.subtotal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(request.gst)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(request.pst)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(request.hst)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(request.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {request.remarks && (
            <div><p className="text-xs text-muted-foreground">Remarks</p><p className="mt-0.5">{request.remarks}</p></div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border/70 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Receipts</p>
              {request.receipts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No receipts attached.</p>
              ) : (
                <div className="space-y-2">
                  {request.receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center gap-2">
                      <span className="truncate">{receipt.fileName}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        onClick={() =>
                          void downloadReceipt(receipt.id, receipt.fileName).catch((error: unknown) =>
                            toast.error(error instanceof Error ? error.message : "Download failed."),
                          )
                        }
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border/70 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Finance &amp; approval</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="text-muted-foreground">Minister approved</span><span>{formatDay(request.ministerApprovedDate)}</span>
                <span className="text-muted-foreground">Accounts approved</span><span>{formatDay(request.approvedDate)}</span>
                <span className="text-muted-foreground">Cheque number</span><span>{request.chequeNumber || "-"}</span>
                <span className="text-muted-foreground">Authorized by (1)</span><span>{request.authorizedByName1 || "-"}</span>
                <span className="text-muted-foreground">Authorized by (2)</span><span>{request.authorizedByName2 || "-"}</span>
                <span className="text-muted-foreground">Authorization date</span><span>{formatDay(request.authorizationDate)}</span>
                <span className="text-muted-foreground">Payment date</span><span>{formatDay(request.paymentDate)}</span>
                <span className="text-muted-foreground">Amount paid</span><span>{request.amountPaid != null ? formatMoney(request.amountPaid) : "-"}</span>
                <span className="text-muted-foreground">Method</span><span>{request.paymentMethod || "-"}</span>
                <span className="text-muted-foreground">Reference</span><span>{request.paymentReference || "-"}</span>
              </div>
              {request.financeNotes && <p className="mt-2 text-xs text-muted-foreground">Finance note: {request.financeNotes}</p>}
            </div>
          </div>

          {request.infoRequestNotes && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="font-medium">Information requested</p>
              <p className="mt-1">{request.infoRequestNotes}</p>
            </div>
          )}

          {request.rejectionReason && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="font-medium text-destructive">Rejected</p>
              <p className="mt-1">{request.rejectionReason}</p>
            </div>
          )}

          <div className="rounded-lg border border-border/70 p-3">
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">History</p>
            <ol className="space-y-3">
              {request.history.map((entry) => (
                <li key={entry.id} className="relative border-l border-border pl-4">
                  <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</p>
                    <span className="text-xs text-muted-foreground">{formatDay(entry.timestamp)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.actorName ?? "System"}</p>
                  {entry.notes && <p className="mt-0.5 text-sm">{entry.notes}</p>}
                </li>
              ))}
            </ol>
          </div>

          {payOpen && (
            <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-sm font-semibold">Record payment</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="paymentDate">Payment date</Label>
                  <Input id="paymentDate" type="date" value={payment.paymentDate} onChange={(e) => setPayment({ ...payment, paymentDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amountPaid">Actual amount paid</Label>
                  <Input id="amountPaid" type="number" min="0" step="0.01" value={payment.amountPaid} onChange={(e) => setPayment({ ...payment, amountPaid: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="paymentMethod">Payment method</Label>
                  <Input id="paymentMethod" value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="chequeNumber">Cheque number</Label>
                  <Input id="chequeNumber" value={payment.chequeNumber} onChange={(e) => setPayment({ ...payment, chequeNumber: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="paymentReference">Payment reference</Label>
                  <Input id="paymentReference" value={payment.paymentReference} onChange={(e) => setPayment({ ...payment, paymentReference: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="authorizationDate">Authorization date</Label>
                  <Input id="authorizationDate" type="date" value={payment.authorizationDate} onChange={(e) => setPayment({ ...payment, authorizationDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="authorizedByName1">Authorized by (1)</Label>
                  <Input id="authorizedByName1" value={payment.authorizedByName1} onChange={(e) => setPayment({ ...payment, authorizedByName1: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="authorizedByName2">Authorized by (2)</Label>
                  <Input id="authorizedByName2" value={payment.authorizedByName2} onChange={(e) => setPayment({ ...payment, authorizedByName2: e.target.value })} />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="financeNotes">Finance note</Label>
                  <Input id="financeNotes" value={payment.financeNotes} onChange={(e) => setPayment({ ...payment, financeNotes: e.target.value })} placeholder="Required when the amount differs from the approved total" />
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:flex-wrap px-4 sm:px-6 py-3 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Close
          </Button>

          {isOwnerView && (request.status === 0 || request.status === 6) && (
            <>
              <Button type="button" variant="secondary" onClick={() => onEdit(request)} disabled={busy}>
                Edit
              </Button>
              <Button type="button" onClick={() => void run("/submit", undefined, "Submitted for minister approval.")} disabled={busy}>
                Submit
              </Button>
            </>
          )}

          {isOwnerView && request.status === 0 && (
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={busy}>
              Delete Draft
            </Button>
          )}

          {canMinister && request.status === 1 && (
            <Button type="button" onClick={() => void run("/minister-approve", { notes: "Approved by minister in charge." }, "Approved and sent to accounts.")} disabled={busy}>
              Approve as Minister
            </Button>
          )}

          {canManageAccounts && [1, 2, 3].includes(request.status) && (
            <>
              <Button type="button" variant="outline" onClick={requestInfo} disabled={busy}>
                Request Info
              </Button>
              <Button type="button" variant="destructive" onClick={reject} disabled={busy}>
                Reject
              </Button>
            </>
          )}

          {canApprove && request.status === 2 && (
            <Button type="button" onClick={() => void run("/approve", { notes: "Approved for payment." }, "Approved for payment.")} disabled={busy}>
              Approve for Payment
            </Button>
          )}

          {canManageAccounts && request.status === 3 && !payOpen && (
            <Button type="button" onClick={() => setPayOpen(true)} disabled={busy}>
              Record Payment
            </Button>
          )}

          {canManageAccounts && request.status === 3 && payOpen && (
            <Button type="button" onClick={() => void handlePayment()} disabled={busy}>
              Save Payment
            </Button>
          )}
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
