import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRequest, RS, type ReimbursementBudgetDto, type ReimbursementRequestDto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  downloadReceipt,
  formatDay,
  formatMoney,
  nextStepText,
  statusMeta,
  todayInput,
} from "@/lib/reimbursements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import {
  WorkspaceDialogBody,
  WorkspaceDialogContent,
  WorkspaceDialogFooter,
  WorkspaceDialogHandle,
  WorkspaceDialogHeader,
  WorkspaceDialogShell,
} from "@/components/ui/workspace-dialog";
import { BudgetPanel } from "@/components/sections/reimbursement/BudgetPanel";

export type ReimbursementMode = "member" | "accountsOfficer" | "accountsAdmin";

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
  Updated: "Updated by the member",
  Submitted: "Submitted for review",
  Resubmitted: "Corrected and resubmitted",
  Reviewed: "Reviewed and forwarded for final approval",
  ReturnedForCorrection: "Returned for correction",
  InfoRequested: "Returned for correction",
  MinisterApproved: "Approved by minister (old process)",
  WorkflowMigrated: "Moved to Under Review (process change)",
  DepartmentLinked: "Department linked",
  Rejected: "Rejected",
  Approved: "Final approval given",
  Paid: "Payment confirmed",
};

type ActionKind = "forward" | "return" | "reject" | "approve" | "pay";

const textareaClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

interface ApprovalState {
  approvedAmount: string;
  notes: string;
  overBudgetJustification: string;
  preparedBy: string;
  chequeNumber: string;
  authorizedByName1: string;
  authorizedByName2: string;
  authorizationDate: string;
}

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

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  );
}

export function ReimbursementDetailDialog({
  open,
  onOpenChange,
  request,
  mode,
  onEdit,
  onChanged,
}: ReimbursementDetailDialogProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<ReimbursementBudgetDto | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [approval, setApproval] = useState<ApprovalState>({
    approvedAmount: "",
    notes: "",
    overBudgetJustification: "",
    preparedBy: "",
    chequeNumber: "",
    authorizedByName1: "",
    authorizedByName2: "",
    authorizationDate: "",
  });
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

  const isStaff = mode === "accountsOfficer" || mode === "accountsAdmin";

  // Reset when a different request is opened.
  useEffect(() => {
    if (!open || !request) return;
    setAction(null);
    setNote("");
    setError(null);
    setApproval({
      approvedAmount: String(request.totalAmount),
      notes: "",
      overBudgetJustification: "",
      preparedBy: request.preparedBy ?? "",
      chequeNumber: request.chequeNumber ?? "",
      authorizedByName1: request.authorizedByName1 ?? "",
      authorizedByName2: request.authorizedByName2 ?? "",
      authorizationDate: request.authorizationDate?.slice(0, 10) ?? "",
    });
    setPayment({
      paymentDate: todayInput(),
      amountPaid: String(request.approvedAmount ?? request.totalAmount),
      paymentMethod: "E-Transfer",
      paymentReference: "",
      chequeNumber: request.chequeNumber ?? "",
      authorizedByName1: request.authorizedByName1 ?? "",
      authorizedByName2: request.authorizedByName2 ?? "",
      authorizationDate: request.authorizationDate?.slice(0, 10) ?? "",
      financeNotes: "",
    });
  }, [open, request]);

  // Budget figures come from the server. When the Accounts Admin edits the approved
  // amount, ask the server again (debounced) so the projection stays accurate.
  const previewAmount = action === "approve" ? approval.approvedAmount : "";
  useEffect(() => {
    if (!open || !request || !isStaff || request.status === RS.Draft) {
      setBudget(null);
      return;
    }

    let cancelled = false;
    const amount = Number(previewAmount);
    const query = previewAmount && Number.isFinite(amount) && amount > 0 ? `?amount=${amount}` : "";
    setBudgetLoading(true);
    const timer = window.setTimeout(async () => {
      const result = await apiRequest<ReimbursementBudgetDto>("GET", `/api/Reimbursements/${request.id}/budget${query}`);
      if (cancelled) return;
      setBudget(result.ok && result.body?.data ? result.body.data : null);
      setBudgetLoading(false);
    }, query ? 400 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, request, isStaff, previewAmount]);

  if (!request) return null;

  const status = statusMeta(request.status);
  const isOwn = !!user && request.payeeUserId === user.id;
  const underReview = request.status === RS.UnderReview || request.status === RS.LegacyAccountsReview;
  const pendingApproval = request.status === RS.PendingApproval;
  const approvedUnpaid = request.status === RS.Approved;

  const canOfficerAct = mode === "accountsOfficer" && underReview && !isOwn;
  const canAdminDecide = mode === "accountsAdmin" && pendingApproval && !isOwn;
  const canAdminPay = mode === "accountsAdmin" && approvedUnpaid && !isOwn;
  const ownerCanEdit = isOwn && (request.status === RS.Draft || request.status === RS.ReturnedForCorrection);

  const approvedAmountNumber = Number(approval.approvedAmount);
  const needsJustification = action === "approve" && !!budget?.requiresOverBudgetJustification;

  async function post(path: string, body: unknown, success: string) {
    setBusy(true);
    setError(null);
    const result = await apiRequest("POST", `/api/Reimbursements/${request!.id}${path}`, body);
    setBusy(false);

    if (!result.ok) {
      const message =
        result.httpStatus === 403
          ? "You don't have permission to do that."
          : result.body?.message ?? "The action could not be completed.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success(result.body?.message ?? success);
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

  function confirmAction() {
    setError(null);
    switch (action) {
      case "forward":
        void post("/review", { notes: note.trim() || null }, "Forwarded for final approval.");
        return;
      case "return":
        if (!note.trim()) return setError("Explain what the member needs to correct or add.");
        void post("/return", { notes: note.trim() }, "Returned to the member.");
        return;
      case "reject":
        if (!note.trim()) return setError("A rejection reason is required.");
        void post("/reject", { reason: note.trim() }, "Reimbursement rejected.");
        return;
      case "approve": {
        if (!Number.isFinite(approvedAmountNumber) || approvedAmountNumber <= 0) {
          return setError("Enter the amount to approve.");
        }
        if (approvedAmountNumber > request!.totalAmount) {
          return setError(`You can't approve more than the requested ${formatMoney(request!.totalAmount)}.`);
        }
        if (approvedAmountNumber < request!.totalAmount && !approval.notes.trim()) {
          return setError("Add a note explaining why less than the requested total is approved.");
        }
        if (needsJustification && !approval.overBudgetJustification.trim()) {
          return setError("This is over budget. Enter a justification to approve it.");
        }
        void post(
          "/approve",
          {
            approvedAmount: approvedAmountNumber,
            notes: approval.notes.trim() || null,
            overBudgetJustification: approval.overBudgetJustification.trim() || null,
            preparedBy: approval.preparedBy.trim() || null,
            chequeNumber: approval.chequeNumber.trim() || null,
            authorizedByName1: approval.authorizedByName1.trim() || null,
            authorizedByName2: approval.authorizedByName2.trim() || null,
            authorizationDate: approval.authorizationDate || null,
          },
          "Approved. Payment has not been recorded yet.",
        );
        return;
      }
      case "pay": {
        const amount = Number(payment.amountPaid);
        const approvedTotal = request!.approvedAmount ?? request!.totalAmount;
        if (!Number.isFinite(amount) || amount <= 0) return setError("Enter the amount actually paid.");
        if (amount > approvedTotal) return setError(`The amount paid can't be more than the approved ${formatMoney(approvedTotal)}.`);
        if (!payment.paymentMethod.trim()) return setError("Payment method is required.");
        if (amount !== approvedTotal && !payment.financeNotes.trim()) {
          return setError("Add a finance note explaining why the amount paid differs from the approved amount.");
        }
        void post(
          "/payment",
          {
            paymentDate: payment.paymentDate || todayInput(),
            amountPaid: amount,
            paymentMethod: payment.paymentMethod.trim(),
            paymentReference: payment.paymentReference.trim() || null,
            chequeNumber: payment.chequeNumber.trim() || null,
            authorizedByName1: payment.authorizedByName1.trim() || null,
            authorizedByName2: payment.authorizedByName2.trim() || null,
            authorizationDate: payment.authorizationDate || null,
            financeNotes: payment.financeNotes.trim() || null,
          },
          "Payment confirmed.",
        );
        return;
      }
    }
  }

  const actionTitle: Record<ActionKind, string> = {
    forward: "Forward for final approval",
    return: "Return to the member for correction",
    reject: "Reject this request",
    approve: "Final approval",
    pay: "Confirm payment",
  };

  const confirmLabel: Record<ActionKind, string> = {
    forward: "Forward for Approval",
    return: "Return to Member",
    reject: "Reject Request",
    approve: needsJustification ? "Approve Over Budget" : "Approve",
    pay: "Confirm Payment",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <WorkspaceDialogContent>
        <WorkspaceDialogShell>
          <WorkspaceDialogHandle />
          <WorkspaceDialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
              {request.requestNumber}
              <Badge variant={status.variant}>{status.label}</Badge>
              {request.classification === 1 && <Badge variant="outline">Personal Use</Badge>}
              {request.needsDepartmentLink && <Badge variant="outline">Department not linked</Badge>}
            </DialogTitle>
          </WorkspaceDialogHeader>

          <WorkspaceDialogBody>
            <div className="workspace-dialog-split text-sm">
              <div className="space-y-5">
                {isOwn && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{nextStepText(request.status)}</div>
                )}

                {isStaff && isOwn && request.status !== RS.Draft && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                    This is your own request. Someone else must review, approve and pay it.
                  </div>
                )}

                <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:grid-cols-2 2xl:grid-cols-3">
                  <Detail label="Payee" value={request.payeeName} />
                  <Detail
                    label="Department"
                    value={
                      <>
                        {request.department}
                        {request.needsDepartmentLink && (
                          <span className="block text-xs font-normal text-amber-700 dark:text-amber-300">Typed on an older request; not linked yet</span>
                        )}
                      </>
                    }
                  />
                  <Detail label="Minister in charge" value={request.ministerInCharge} />
                  <Detail label="Expense date" value={formatDay(request.requestDate)} />
                  <Detail label="Submitted" value={formatDay(request.submittedDate)} />
                  <Detail label="Receipts" value={request.receiptCount} />
                  <Detail label="Requester email" value={<span className="block truncate">{request.payeeEmail ?? "-"}</span>} />
                  <Detail label="Requested total" value={formatMoney(request.totalAmount)} />
                  {request.approvedAmount !== null && request.approvedAmount !== request.totalAmount && (
                    <Detail label="Approved amount" value={formatMoney(request.approvedAmount)} />
                  )}
                </div>

                <div className="space-y-2 md:hidden">
                  {request.items.map((item) => (
                    <div key={item.id} className="space-y-2 rounded-xl border border-border/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Ref #{item.referenceNumber}</p>
                          <p className="font-medium">{item.itemName}</p>
                          {item.requiresSerialNumber && (
                            <p className="mt-0.5 text-xs text-muted-foreground">Serial: {item.serialNumber || "Not provided"}</p>
                          )}
                        </div>
                        <p className="font-semibold tabular-nums">{formatMoney(item.total)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Subtotal</span><span className="text-right tabular-nums text-foreground">{formatMoney(item.subtotal)}</span>
                        <span>GST</span><span className="text-right tabular-nums text-foreground">{formatMoney(item.gst)}</span>
                        <span>PST</span><span className="text-right tabular-nums text-foreground">{formatMoney(item.pst)}</span>
                        <span>HST</span><span className="text-right tabular-nums text-foreground">{formatMoney(item.hst)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between rounded-xl bg-muted/40 px-3 py-2 font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatMoney(request.totalAmount)}</span>
                  </div>
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-border/70 md:block">
                  <table className="w-full min-w-[540px] text-sm">
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
                              <p className="mt-0.5 text-xs text-muted-foreground">Serial: {item.serialNumber || "Not provided"}</p>
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
                  <div>
                    <p className="text-xs text-muted-foreground">Remarks</p>
                    <p className="mt-0.5">{request.remarks}</p>
                  </div>
                )}

                {request.infoRequestNotes && request.status === RS.ReturnedForCorrection && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                    <p className="font-medium">Correction requested</p>
                    <p className="mt-1">{request.infoRequestNotes}</p>
                  </div>
                )}

                {request.rejectionReason && request.status === RS.Rejected && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                    <p className="font-medium text-destructive">
                      Rejected{request.rejectedByName ? ` by ${request.rejectedByName}` : ""}
                      {request.rejectedDate ? ` on ${formatDay(request.rejectedDate)}` : ""}
                    </p>
                    <p className="mt-1">{request.rejectionReason}</p>
                  </div>
                )}

                {action && (
                  <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
                    <p className="text-sm font-semibold">{actionTitle[action]}</p>

                    {(action === "forward" || action === "return" || action === "reject") && (
                      <div className="space-y-1">
                        <Label htmlFor="actionNote">
                          {action === "forward" ? "Review notes (optional)" : action === "return" ? "What needs correcting? *" : "Reason for rejection *"}
                        </Label>
                        <textarea
                          id="actionNote"
                          rows={3}
                          className={textareaClass}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder={
                            action === "forward"
                              ? "e.g. Receipts match the amounts; within budget."
                              : action === "return"
                                ? "e.g. Please attach the receipt for item 2."
                                : "This is shown to the member."
                          }
                        />
                        {action === "forward" && (
                          <p className="text-xs text-muted-foreground">
                            Forwarding sends it to the Accounts Admin for final approval. It does not approve or pay it.
                          </p>
                        )}
                      </div>
                    )}

                    {action === "approve" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="approvedAmount">Approved amount *</Label>
                          <Input
                            id="approvedAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={approval.approvedAmount}
                            onChange={(e) => setApproval({ ...approval, approvedAmount: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">Requested {formatMoney(request.totalAmount)}</p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="authorizationDate">Authorization date</Label>
                          <Input id="authorizationDate" type="date" value={approval.authorizationDate} onChange={(e) => setApproval({ ...approval, authorizationDate: e.target.value })} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="approvalNotes">
                            Approval notes{approvedAmountNumber < request.totalAmount ? " *" : ""}
                          </Label>
                          <textarea id="approvalNotes" rows={2} className={textareaClass} value={approval.notes} onChange={(e) => setApproval({ ...approval, notes: e.target.value })} />
                        </div>
                        {needsJustification && (
                          <div className="space-y-1 sm:col-span-2">
                            <Label htmlFor="overBudget" className="text-destructive">Over-budget justification *</Label>
                            <textarea
                              id="overBudget"
                              rows={2}
                              className={`${textareaClass} border-destructive/60`}
                              value={approval.overBudgetJustification}
                              onChange={(e) => setApproval({ ...approval, overBudgetJustification: e.target.value })}
                              placeholder="Why is this being approved over budget? This is recorded."
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label htmlFor="preparedBy">Prepared by</Label>
                          <Input id="preparedBy" value={approval.preparedBy} onChange={(e) => setApproval({ ...approval, preparedBy: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="chequeNumber">Cheque number</Label>
                          <Input id="chequeNumber" value={approval.chequeNumber} onChange={(e) => setApproval({ ...approval, chequeNumber: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="auth1">Authorized by (1)</Label>
                          <Input id="auth1" value={approval.authorizedByName1} onChange={(e) => setApproval({ ...approval, authorizedByName1: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="auth2">Authorized by (2)</Label>
                          <Input id="auth2" value={approval.authorizedByName2} onChange={(e) => setApproval({ ...approval, authorizedByName2: e.target.value })} />
                        </div>
                        <p className="text-xs text-muted-foreground sm:col-span-2">
                          Approving does not mark the request as paid. Confirm payment separately once the money has been sent.
                        </p>
                      </div>
                    )}

                    {action === "pay" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="paymentDate">Payment date *</Label>
                          <Input id="paymentDate" type="date" max={todayInput()} value={payment.paymentDate} onChange={(e) => setPayment({ ...payment, paymentDate: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="amountPaid">Amount actually paid *</Label>
                          <Input id="amountPaid" type="number" min="0" step="0.01" value={payment.amountPaid} onChange={(e) => setPayment({ ...payment, amountPaid: e.target.value })} />
                          <p className="text-xs text-muted-foreground">Approved {formatMoney(request.approvedAmount ?? request.totalAmount)}</p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="paymentMethod">Payment method *</Label>
                          <Input id="paymentMethod" value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="paymentReference">Payment reference</Label>
                          <Input id="paymentReference" value={payment.paymentReference} onChange={(e) => setPayment({ ...payment, paymentReference: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="payCheque">Cheque number</Label>
                          <Input id="payCheque" value={payment.chequeNumber} onChange={(e) => setPayment({ ...payment, chequeNumber: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="payAuthDate">Authorization date</Label>
                          <Input id="payAuthDate" type="date" value={payment.authorizationDate} onChange={(e) => setPayment({ ...payment, authorizationDate: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="payAuth1">Authorized by (1)</Label>
                          <Input id="payAuth1" value={payment.authorizedByName1} onChange={(e) => setPayment({ ...payment, authorizedByName1: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="payAuth2">Authorized by (2)</Label>
                          <Input id="payAuth2" value={payment.authorizedByName2} onChange={(e) => setPayment({ ...payment, authorizedByName2: e.target.value })} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="financeNotes">Finance note</Label>
                          <Input
                            id="financeNotes"
                            value={payment.financeNotes}
                            onChange={(e) => setPayment({ ...payment, financeNotes: e.target.value })}
                            placeholder="Required when the amount paid differs from the approved amount"
                          />
                        </div>
                      </div>
                    )}

                    {error && (
                      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {isStaff && request.status !== RS.Draft && <BudgetPanel budget={budget} loading={budgetLoading} />}

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
                              void downloadReceipt(receipt.id, receipt.fileName).catch((err: unknown) =>
                                toast.error(err instanceof Error ? err.message : "Download failed."),
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
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Review, approval &amp; payment</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <span className="text-muted-foreground">Reviewed</span>
                    <span>{request.reviewedDate ? `${formatDay(request.reviewedDate)}${request.reviewedByName ? ` · ${request.reviewedByName}` : ""}` : "-"}</span>
                    <span className="text-muted-foreground">Final approval</span>
                    <span>{request.approvedDate ? `${formatDay(request.approvedDate)}${request.approvedByName ? ` · ${request.approvedByName}` : ""}` : "-"}</span>
                    <span className="text-muted-foreground">Approved amount</span>
                    <span>{request.approvedAmount !== null ? formatMoney(request.approvedAmount) : "-"}</span>
                    <span className="text-muted-foreground">Prepared by</span><span>{request.preparedBy || "-"}</span>
                    <span className="text-muted-foreground">Cheque number</span><span>{request.chequeNumber || "-"}</span>
                    <span className="text-muted-foreground">Authorized by (1)</span><span>{request.authorizedByName1 || "-"}</span>
                    <span className="text-muted-foreground">Authorized by (2)</span><span>{request.authorizedByName2 || "-"}</span>
                    <span className="text-muted-foreground">Authorization date</span><span>{formatDay(request.authorizationDate)}</span>
                    <span className="text-muted-foreground">Payment date</span><span>{formatDay(request.paymentDate)}</span>
                    <span className="text-muted-foreground">Amount paid</span><span>{request.amountPaid !== null ? formatMoney(request.amountPaid) : "-"}</span>
                    <span className="text-muted-foreground">Method</span><span>{request.paymentMethod || "-"}</span>
                    <span className="text-muted-foreground">Reference</span><span>{request.paymentReference || "-"}</span>
                    <span className="text-muted-foreground">Payment confirmed by</span><span>{request.paidByName || "-"}</span>
                  </div>
                  {request.reviewNotes && <p className="mt-2 text-xs text-muted-foreground">Review notes: {request.reviewNotes}</p>}
                  {request.approvalNotes && <p className="mt-1 text-xs text-muted-foreground">Approval notes: {request.approvalNotes}</p>}
                  {request.overBudgetAtApproval && (
                    <p className="mt-1 text-xs text-destructive">
                      Approved over budget. Justification: {request.overBudgetJustification ?? "-"}
                    </p>
                  )}
                  {request.financeNotes && <p className="mt-1 text-xs text-muted-foreground">Finance note: {request.financeNotes}</p>}
                </div>

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
                        <p className="text-xs text-muted-foreground">
                          {entry.actorName ?? "System"}
                          {entry.fromStatus !== null && entry.toStatus !== null && entry.fromStatus !== entry.toStatus
                            ? ` · ${statusMeta(entry.fromStatus).label} → ${statusMeta(entry.toStatus).label}`
                            : ""}
                        </p>
                        {entry.notes && <p className="mt-0.5 text-sm">{entry.notes}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </WorkspaceDialogBody>

          <WorkspaceDialogFooter>
            <Button type="button" variant="outline" onClick={() => (action ? setAction(null) : onOpenChange(false))} disabled={busy}>
              {action ? "Back" : "Close"}
            </Button>

            {action ? (
              <Button
                type="button"
                variant={action === "reject" ? "destructive" : "default"}
                onClick={confirmAction}
                disabled={busy || (action === "approve" && budgetLoading)}
              >
                {busy ? "Working…" : confirmLabel[action]}
              </Button>
            ) : (
              <>
                {ownerCanEdit && (
                  <>
                    <Button type="button" variant="secondary" onClick={() => onEdit(request)} disabled={busy}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void post("/submit", undefined, "Submitted for review.")}
                      disabled={busy}
                    >
                      {request.status === RS.ReturnedForCorrection ? "Resubmit" : "Submit"}
                    </Button>
                  </>
                )}

                {isOwn && request.status === RS.Draft && (
                  <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={busy}>
                    Delete Draft
                  </Button>
                )}

                {(canOfficerAct || canAdminDecide) && (
                  <>
                    <Button type="button" variant="outline" onClick={() => { setNote(""); setAction("return"); }} disabled={busy}>
                      Return for Correction
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => { setNote(""); setAction("reject"); }} disabled={busy}>
                      Reject
                    </Button>
                  </>
                )}

                {canOfficerAct && (
                  <Button type="button" onClick={() => { setNote(""); setAction("forward"); }} disabled={busy || request.needsDepartmentLink}>
                    Forward for Approval
                  </Button>
                )}

                {canAdminDecide && (
                  <Button type="button" onClick={() => setAction("approve")} disabled={busy}>
                    Approve
                  </Button>
                )}

                {canAdminPay && (
                  <Button type="button" onClick={() => setAction("pay")} disabled={busy}>
                    Confirm Payment
                  </Button>
                )}
              </>
            )}
          </WorkspaceDialogFooter>
        </WorkspaceDialogShell>
      </WorkspaceDialogContent>
    </Dialog>
  );
}
