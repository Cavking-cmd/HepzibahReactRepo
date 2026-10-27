import { useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  apiRequest,
  type ReimbursementRequestDto,
} from "@/lib/api";
import {
  computeTotals,
  emptyLine,
  formatMoney,
  lineAmount,
  lineTotal,
  linesFromRequest,
  MAX_REIMBURSEMENT_ITEMS,
  readReceiptFile,
  requiresSerialNumber,
  todayInput,
  type ReceiptUpload,
  type ReimbursementLine,
} from "@/lib/reimbursements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import {
  WorkspaceDialogBody,
  WorkspaceDialogContent,
  WorkspaceDialogFooter,
  WorkspaceDialogForm,
  WorkspaceDialogHandle,
  WorkspaceDialogHeader,
  WorkspaceDialogShell,
} from "@/components/ui/workspace-dialog";
import { Plus, Trash2, Upload, FileText } from "lucide-react";

interface ReimbursementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ReimbursementRequestDto | null;
  onSaved: () => void;
}

interface FormState {
  payeeName: string;
  department: string;
  ministerInCharge: string;
  requestDate: string;
  remarks: string;
  lines: ReimbursementLine[];
}

function emptyForm(): FormState {
  return {
    payeeName: "",
    department: "",
    ministerInCharge: "",
    requestDate: todayInput(),
    remarks: "",
    lines: [emptyLine(1)],
  };
}

export function ReimbursementFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: ReimbursementFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [newReceipts, setNewReceipts] = useState<ReceiptUpload[]>([]);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

  useEffect(() => {
    if (!open) return;

    setForm(
      editing
        ? {
            payeeName: editing.payeeName,
            department: editing.department,
            ministerInCharge: editing.ministerInCharge,
            requestDate: editing.requestDate.slice(0, 10),
            remarks: editing.remarks ?? "",
            lines: linesFromRequest(editing),
          }
        : emptyForm(),
    );
    setNewReceipts([]);
    setSaving(null);
  }, [open, editing]);

  const totals = computeTotals(form.lines);
  const existingReceipts = editing?.receipts ?? [];

  function updateLine(index: number, patch: Partial<ReimbursementLine>) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  }

  function addLine() {
    setForm((prev) => {
      if (prev.lines.length >= MAX_REIMBURSEMENT_ITEMS) return prev;
      return { ...prev, lines: [...prev.lines, emptyLine(prev.lines.length + 1)] };
    });
  }

  function removeLine(index: number) {
    setForm((prev) => {
      const next = prev.lines.filter((_, i) => i !== index);
      return {
        ...prev,
        lines: next.length === 0 ? [emptyLine(1)] : next.map((line, i) => ({ ...line, referenceNumber: i + 1 })),
      };
    });
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    try {
      const uploads = await Promise.all(files.map(readReceiptFile));
      setNewReceipts((prev) => [...prev, ...uploads]);
      toast.success(`${uploads.length} receipt${uploads.length === 1 ? "" : "s"} attached.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Receipt could not be attached.");
    }
  }

  async function handleSave(submit: boolean) {
    if (!form.payeeName.trim() || !form.department.trim() || !form.ministerInCharge.trim()) {
      toast.error("Payee name, department and minister in charge are required.");
      return;
    }

    const items = form.lines
      .filter((line) => line.itemName.trim())
      .map((line, index) => ({
        referenceNumber: index + 1,
        itemName: line.itemName.trim(),
        subtotal: lineAmount(line.subtotal),
        gst: lineAmount(line.gst),
        pst: lineAmount(line.pst),
        hst: lineAmount(line.hst),
        serialNumber: line.serialNumber.trim() || null,
      }));

    if (items.length === 0) {
      toast.error("Add at least one item.");
      return;
    }

    if (submit) {
      const missingSerial = form.lines.find(
        (line) => line.itemName.trim() && requiresSerialNumber(line.itemName) && !line.serialNumber.trim(),
      );
      if (missingSerial) {
        toast.error(`Enter the serial number for "${missingSerial.itemName.trim()}" before submitting.`);
        return;
      }

      if (existingReceipts.length + newReceipts.length === 0) {
        toast.error("Attach at least one invoice or receipt before submitting.");
        return;
      }
    }

    setSaving(submit ? "submit" : "draft");

    const payload = {
      payeeName: form.payeeName.trim(),
      department: form.department.trim(),
      ministerInCharge: form.ministerInCharge.trim(),
      requestDate: form.requestDate || todayInput(),
      remarks: form.remarks.trim() || null,
      items,
      receipts: newReceipts.map((receipt) => ({
        fileName: receipt.fileName,
        contentType: receipt.contentType,
        dataBase64: receipt.dataBase64,
      })),
    };

    const result = editing
      ? await apiRequest<ReimbursementRequestDto>("PUT", `/api/Reimbursements/${editing.id}`, {
          id: editing.id,
          ...payload,
        })
      : await apiRequest<ReimbursementRequestDto>("POST", "/api/Reimbursements", payload);

    if (!result.ok) {
      setSaving(null);
      toast.error(result.body?.message ?? "Reimbursement could not be saved.");
      return;
    }

    const requestId = result.body?.data?.id ?? editing?.id;

    if (submit && requestId) {
      const submitResult = await apiRequest("POST", `/api/Reimbursements/${requestId}/submit`);
      if (!submitResult.ok) {
        setSaving(null);
        toast.error(submitResult.body?.message ?? "Reimbursement was saved as a draft but could not be submitted.");
        onSaved();
        return;
      }

      toast.success("Reimbursement submitted for minister approval.");
    } else {
      toast.success("Reimbursement saved as a draft.");
    }

    setSaving(null);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <WorkspaceDialogContent>
        <WorkspaceDialogShell>
          <WorkspaceDialogHandle />
          <WorkspaceDialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editing ? `Edit ${editing.requestNumber}` : "New Reimbursement Request"}
            </DialogTitle>
          </WorkspaceDialogHeader>

        <WorkspaceDialogForm
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave(false);
          }}
        >
          <WorkspaceDialogBody>
          <div className="workspace-dialog-split">
          <div className="space-y-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payeeName">Payee Name</Label>
              <Input
                id="payeeName"
                value={form.payeeName}
                onChange={(e) => setForm({ ...form, payeeName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minister">Approved by Minister</Label>
              <Input
                id="minister"
                value={form.ministerInCharge}
                onChange={(e) => setForm({ ...form, ministerInCharge: e.target.value })}
                placeholder="Name of minister in charge"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestDate">Date</Label>
              <Input
                id="requestDate"
                type="date"
                value={form.requestDate}
                onChange={(e) => setForm({ ...form, requestDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 px-2 sm:px-3 py-2">
              <div>
                <p className="text-sm font-medium">Items purchased</p>
                <p className="text-xs text-muted-foreground">
                  Enter GST, PST and HST exactly as shown on the invoice or receipt. Use zero where not applicable.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addLine}
                disabled={form.lines.length >= MAX_REIMBURSEMENT_ITEMS}
                className="self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {form.lines.map((line, index) => {
                const serialRequired = requiresSerialNumber(line.itemName);
                return (
                  <div key={index} className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Item {index + 1}</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeLine(index)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={line.itemName}
                      onChange={(e) => updateLine(index, { itemName: e.target.value })}
                      placeholder="What was purchased?"
                    />
                    {serialRequired && (
                      <div>
                        <Input
                          value={line.serialNumber}
                          onChange={(e) => updateLine(index, { serialNumber: e.target.value })}
                          placeholder="Serial number (required)"
                          className={line.serialNumber.trim() ? "" : "border-destructive"}
                        />
                        <p className="mt-1 text-xs text-destructive">
                          Serialised equipment detected. A serial number is required before submission.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Subtotal</Label>
                        <Input type="number" min="0" step="0.01" value={line.subtotal} onChange={(e) => updateLine(index, { subtotal: e.target.value })} placeholder="0.00" />
                      </div>
                      <div className="space-y-1">
                        <Label>GST</Label>
                        <Input type="number" min="0" step="0.01" value={line.gst} onChange={(e) => updateLine(index, { gst: e.target.value })} placeholder="0.00" />
                      </div>
                      <div className="space-y-1">
                        <Label>PST</Label>
                        <Input type="number" min="0" step="0.01" value={line.pst} onChange={(e) => updateLine(index, { pst: e.target.value })} placeholder="0.00" />
                      </div>
                      <div className="space-y-1">
                        <Label>HST</Label>
                        <Input type="number" min="0" step="0.01" value={line.hst} onChange={(e) => updateLine(index, { hst: e.target.value })} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-border/60 pt-2 text-sm font-medium">
                      <span>Total</span>
                      <span className="tabular-nums">{formatMoney(lineTotal(line))}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 w-12">Ref #</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 w-28">Subtotal</th>
                    <th className="px-3 py-2 w-24">GST</th>
                    <th className="px-3 py-2 w-24">PST</th>
                    <th className="px-3 py-2 w-24">HST</th>
                    <th className="px-3 py-2 w-28 text-right">Total</th>
                    <th className="px-3 py-2 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, index) => {
                    const serialRequired = requiresSerialNumber(line.itemName);
                    return (
                      <tr key={index} className="border-t border-border/60 align-top">
                        <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-2">
                          <Input
                            value={line.itemName}
                            onChange={(e) => updateLine(index, { itemName: e.target.value })}
                            placeholder="What was purchased?"
                          />
                          {serialRequired && (
                            <div className="mt-2">
                              <Input
                                value={line.serialNumber}
                                onChange={(e) => updateLine(index, { serialNumber: e.target.value })}
                                placeholder="Serial number (required)"
                                className={line.serialNumber.trim() ? "" : "border-destructive"}
                              />
                              <p className="mt-1 text-xs text-destructive">
                                Serialised equipment detected. A serial number is required before submission.
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.subtotal}
                            onChange={(e) => updateLine(index, { subtotal: e.target.value })}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.gst}
                            onChange={(e) => updateLine(index, { gst: e.target.value })}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.pst}
                            onChange={(e) => updateLine(index, { pst: e.target.value })}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.hst}
                            onChange={(e) => updateLine(index, { hst: e.target.value })}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">{formatMoney(lineTotal(line))}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeLine(index)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          </div>

          <div className="space-y-3">
            <div className="space-y-3 rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Receipts &amp; invoices</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
                  <Upload className="h-4 w-4" /> Upload
                  <input type="file" multiple accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleFiles} />
                </label>
              </div>

              {existingReceipts.length === 0 && newReceipts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  A reimbursement is void without an accompanying invoice or receipt. PDF, JPEG, PNG or WebP up to 5 MB each.
                </p>
              )}

              <div className="space-y-2">
                {existingReceipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{receipt.fileName}</span>
                    <span className="ml-auto text-xs text-muted-foreground">saved</span>
                  </div>
                ))}
                {newReceipts.map((receipt, index) => (
                  <div key={`${receipt.fileName}-${index}`} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{receipt.fileName}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{Math.ceil(receipt.size / 1024)} KB</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setNewReceipts((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Remove receipt"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <textarea
                  id="remarks"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="Optional notes for Finance"
                />
              </div>

              <div className="rounded-lg border border-border/70 p-3 text-sm">
                <div className="flex justify-between py-0.5"><span>Subtotal</span><span className="tabular-nums">{formatMoney(totals.subtotal)}</span></div>
                <div className="flex justify-between py-0.5"><span>GST</span><span className="tabular-nums">{formatMoney(totals.gst)}</span></div>
                <div className="flex justify-between py-0.5"><span>PST</span><span className="tabular-nums">{formatMoney(totals.pst)}</span></div>
                <div className="flex justify-between py-0.5"><span>HST</span><span className="tabular-nums">{formatMoney(totals.hst)}</span></div>
                <div className="mt-2 flex justify-between border-t border-border/60 pt-2 font-semibold">
                  <span>Total</span><span className="tabular-nums">{formatMoney(totals.total)}</span>
                </div>
              </div>

              {editing?.infoRequestNotes && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">Finance requested more information</p>
                  <p className="mt-1 text-muted-foreground">{editing.infoRequestNotes}</p>
                </div>
              )}
            </div>
          </div>

          </div>
          </WorkspaceDialogBody>
          <WorkspaceDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving !== null} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" variant="secondary" disabled={saving !== null} className="w-full sm:w-auto">
              {saving === "draft" ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave(true)}
              disabled={saving !== null}
              className="w-full sm:w-auto"
            >
              {saving === "submit" ? "Submitting..." : "Submit for Approval"}
            </Button>
          </WorkspaceDialogFooter>
          </WorkspaceDialogForm>
        </WorkspaceDialogShell>
      </WorkspaceDialogContent>
    </Dialog>
  );
}
