import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  apiList,
  apiRequest,
  ITEM_CONDITION_NAMES,
  VERIFICATION,
  type InventoryVerificationItemDto,
} from "@/lib/api";
import { downloadReceipt, formatDay, formatMoney } from "@/lib/reimbursements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, PackageCheck, PackageX, Paperclip } from "lucide-react";

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
const textareaClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

interface InventoryForm {
  itemName: string;
  description: string;
  serialNumber: string;
  category: string;
  quantity: string;
  location: string;
  condition: string;
  purchaseDate: string;
  value: string;
  custodian: string;
  notes: string;
}

function formFor(item: InventoryVerificationItemDto): InventoryForm {
  return {
    itemName: item.itemName,
    description: `Purchased through reimbursement ${item.requestNumber} (${item.department}).`,
    serialNumber: item.serialNumber ?? "",
    category: "",
    quantity: "1",
    location: "",
    condition: "0",
    purchaseDate: item.requestDate.slice(0, 10),
    value: String(item.total),
    custodian: item.payeeName,
    notes: "",
  };
}

function statusBadge(status: number) {
  if (status === VERIFICATION.Verified) return <Badge>Verified</Badge>;
  if (status === VERIFICATION.Rejected) return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">To verify</Badge>;
}

/**
 * The Inventory Officer's queue of physical items bought through reimbursements.
 * Verify: confirm the item was seen, then fill in its inventory record (added to Inventory).
 * Reject: give a reason; the Accounts team and the member are emailed and the Accounts
 * Officer cannot forward the request until it is resolved.
 */
export function InventoryVerificationSection() {
  const [view, setView] = useState<"pending" | "all">("pending");
  const [items, setItems] = useState<InventoryVerificationItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [verifyTarget, setVerifyTarget] = useState<InventoryVerificationItemDto | null>(null);
  const [step, setStep] = useState<"confirm" | "details">("confirm");
  const [form, setForm] = useState<InventoryForm | null>(null);
  const [rejectTarget, setRejectTarget] = useState<InventoryVerificationItemDto | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiList<InventoryVerificationItemDto>(
      `/api/Reimbursements/verifications${view === "all" ? "?all=true" : ""}`,
    );
    setItems(data);
    setLoading(false);
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  function startVerify(item: InventoryVerificationItemDto) {
    setVerifyTarget(item);
    setStep("confirm");
    setForm(formFor(item));
    setError(null);
  }

  function startReject(item: InventoryVerificationItemDto) {
    setRejectTarget(item);
    setReason("");
    setError(null);
  }

  async function submitVerify(e: FormEvent) {
    e.preventDefault();
    if (!verifyTarget || !form) return;

    const required: [string, string][] = [
      [form.itemName, "Item name"],
      [form.category, "Category"],
      [form.location, "Location"],
      [form.custodian, "Custodian"],
      [form.description, "Description"],
    ];
    const missing = required.find(([value]) => !value.trim());
    if (missing) return setError(`${missing[1]} is required.`);
    if (!(Number(form.quantity) >= 1)) return setError("Quantity must be at least 1.");

    setBusy(true);
    setError(null);
    const result = await apiRequest("POST", `/api/Reimbursements/items/${verifyTarget.itemId}/verify`, {
      itemName: form.itemName.trim(),
      description: form.description.trim(),
      serialNumber: form.serialNumber.trim() || null,
      category: form.category.trim(),
      quantity: Math.floor(Number(form.quantity)),
      location: form.location.trim(),
      condition: Number(form.condition),
      purchaseDate: form.purchaseDate || undefined,
      value: Number(form.value) || 0,
      custodian: form.custodian.trim(),
      notes: form.notes.trim() || null,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.body?.message ?? "The item could not be verified.");
      return;
    }

    toast.success(result.body?.message ?? "Verified and added to inventory.");
    setVerifyTarget(null);
    void load();
  }

  async function submitReject() {
    if (!rejectTarget) return;
    if (!reason.trim()) return setError("Give a reason. It is sent to the member and the Accounts team.");

    setBusy(true);
    setError(null);
    const result = await apiRequest("POST", `/api/Reimbursements/items/${rejectTarget.itemId}/reject`, {
      reason: reason.trim(),
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.body?.message ?? "The item could not be rejected.");
      return;
    }

    toast.success(result.body?.message ?? "Item rejected.");
    setRejectTarget(null);
    void load();
  }

  const set = (patch: Partial<InventoryForm>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Items to Verify</h2>
          <p className="text-sm text-muted-foreground">
            Physical items bought through reimbursements. Check each one, then verify it (it's added to Inventory) or
            reject it with a reason. The Accounts team is emailed either way, and the member is emailed if you reject.
          </p>
        </div>
        <div className="flex gap-1 self-start rounded-lg border border-border p-1">
          <Button size="sm" variant={view === "pending" ? "default" : "ghost"} onClick={() => setView("pending")}>
            To verify
          </Button>
          <Button size="sm" variant={view === "all" ? "default" : "ghost"} onClick={() => setView("all")}>
            All checked items
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8" />
            {view === "pending" ? "Nothing is waiting for you to verify." : "No physical items have been submitted yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const pending = item.verificationStatus === VERIFICATION.Pending;
            return (
              <Card key={item.itemId}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.itemName}</p>
                        {statusBadge(item.verificationStatus)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.requestNumber} · {item.payeeName} · {item.department}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Serial: {item.serialNumber || "none given"} · Submitted {formatDay(item.submittedDate)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums">{formatMoney(item.total)}</p>
                  </div>

                  {item.verificationStatus !== VERIFICATION.Pending && (
                    <p className={`text-sm ${item.verificationStatus === VERIFICATION.Rejected ? "text-destructive" : "text-muted-foreground"}`}>
                      {item.verificationStatus === VERIFICATION.Verified ? "Verified" : "Rejected"}
                      {item.verifiedByName ? ` by ${item.verifiedByName}` : ""}
                      {item.verifiedDate ? ` on ${formatDay(item.verifiedDate)}` : ""}
                      {item.verificationNotes ? `: ${item.verificationNotes}` : ""}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {item.receipts.map((receipt) => (
                      <Button
                        key={receipt.id}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void downloadReceipt(receipt.id, receipt.fileName).catch((err: unknown) =>
                            toast.error(err instanceof Error ? err.message : "Download failed."),
                          )
                        }
                      >
                        <Paperclip className="h-3.5 w-3.5" /> {receipt.fileName}
                      </Button>
                    ))}
                    <div className="ml-auto flex gap-2">
                      {(pending || item.verificationStatus === VERIFICATION.Rejected) && (
                        <Button size="sm" onClick={() => startVerify(item)}>
                          <PackageCheck className="h-4 w-4" /> Verify
                        </Button>
                      )}
                      {pending && (
                        <Button size="sm" variant="destructive" onClick={() => startReject(item)}>
                          <PackageX className="h-4 w-4" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!verifyTarget} onOpenChange={(open) => !open && !busy && setVerifyTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          {verifyTarget && step === "confirm" && (
            <>
              <DialogHeader>
                <DialogTitle>Verify this item?</DialogTitle>
                <DialogDescription>
                  Confirm you have seen <strong>{verifyTarget.itemName}</strong> ({formatMoney(verifyTarget.total)}) from{" "}
                  {verifyTarget.payeeName}'s request {verifyTarget.requestNumber}, and that it matches the receipt.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVerifyTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setStep("details")}>Yes, I've verified it</Button>
              </DialogFooter>
            </>
          )}

          {verifyTarget && step === "details" && form && (
            <form onSubmit={submitVerify} className="space-y-3">
              <DialogHeader>
                <DialogTitle>Add to inventory</DialogTitle>
                <DialogDescription>Fill in the inventory details. The item is added to the Inventory list when you save.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <Label htmlFor="v-name">Item name *</Label>
                  <Input id="v-name" value={form.itemName} onChange={(e) => set({ itemName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-desc">Description *</Label>
                  <Input id="v-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-serial">Serial number</Label>
                  <Input
                    id="v-serial"
                    value={form.serialNumber}
                    onChange={(e) => set({ serialNumber: e.target.value })}
                    placeholder="Only if the item already has one"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-category">Category *</Label>
                    <Input id="v-category" value={form.category} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Media equipment" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-qty">Quantity *</Label>
                    <Input id="v-qty" type="number" min={1} value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-location">Location *</Label>
                    <Input id="v-location" value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Sanctuary store room" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-condition">Condition</Label>
                    <select id="v-condition" className={fieldClass} value={form.condition} onChange={(e) => set({ condition: e.target.value })}>
                      {ITEM_CONDITION_NAMES.map((name, idx) => (
                        <option key={name} value={String(idx)}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-date">Purchase date</Label>
                    <Input id="v-date" type="date" value={form.purchaseDate} onChange={(e) => set({ purchaseDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-value">Value (CAD)</Label>
                    <Input id="v-value" type="number" min={0} step="0.01" value={form.value} onChange={(e) => set({ value: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-custodian">Custodian *</Label>
                  <Input id="v-custodian" value={form.custodian} onChange={(e) => set({ custodian: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-notes">Note to the Accounts team (optional)</Label>
                  <textarea id="v-notes" rows={2} className={textareaClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
                </div>
              </div>
              {error && (
                <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStep("confirm")} disabled={busy}>
                  Back
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Verify & Add to Inventory"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && !busy && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          {rejectTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Reject {rejectTarget.itemName}?</DialogTitle>
                <DialogDescription>
                  The Accounts team and {rejectTarget.payeeName} will be emailed with your reason. The Accounts Officer won't be
                  able to forward the request until it's resolved.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="r-reason">Reason *</Label>
                <textarea
                  id="r-reason"
                  rows={3}
                  className={textareaClass}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Item not received, or it doesn't match the receipt."
                />
              </div>
              {error && (
                <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => void submitReject()} disabled={busy}>
                  {busy ? "Rejecting…" : "Reject Item"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
