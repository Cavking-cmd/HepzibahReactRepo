import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiRequest, type FellowshipAttendanceDto, type FellowshipCenterDto } from "@/lib/api";
import { useCrudList } from "@/hooks/useCrudList";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TablePagination } from "@/components/TablePagination";
import { Plus, Pencil, Trash2, Check, Lock } from "lucide-react";

interface FellowshipAttendanceSectionProps {
  canWrite: boolean;
  canApprove: boolean;
}

const emptyForm = {
  fellowshipCenterId: "",
  date: "",
  men: "0",
  women: "0",
  children: "0",
  newConverts: "0",
};

export function FellowshipAttendanceSection({ canWrite, canApprove }: FellowshipAttendanceSectionProps) {
  const { items, loading, refresh } = useCrudList<FellowshipAttendanceDto>("/api/FellowshipAttendance");
  const { items: centers } = useCrudList<FellowshipCenterDto>("/api/FellowshipCenter");
  const { pageItems, page, pageSize, totalPages, changePage, changePageSize } = usePagination(items);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FellowshipAttendanceDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "lock"; record: FellowshipAttendanceDto } | null>(null);

  function centerLabel(id: string) {
    return centers.find((c) => c.id === id)?.centerName ?? "Deleted center";
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(record: FellowshipAttendanceDto) {
    setEditing(record);
    setForm({
      fellowshipCenterId: record.fellowshipCenterId,
      date: record.date.slice(0, 10),
      men: String(record.men),
      women: String(record.women),
      children: String(record.children),
      newConverts: String(record.newConverts),
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      fellowshipCenterId: form.fellowshipCenterId,
      date: form.date,
      men: Number(form.men) || 0,
      women: Number(form.women) || 0,
      children: Number(form.children) || 0,
      newConverts: Number(form.newConverts) || 0,
    };

    const result = editing
      ? await apiRequest("PUT", `/api/FellowshipAttendance/${editing.id}`, { id: editing.id, ...payload })
      : await apiRequest("POST", "/api/FellowshipAttendance", payload);

    setSaving(false);

    if (result.ok) {
      toast.success(editing ? "Fellowship attendance updated." : "Fellowship attendance recorded.");
      setOpen(false);
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to save fellowship attendance.");
    }
  }

  async function handleDelete(record: FellowshipAttendanceDto) {
    const result = await apiRequest("DELETE", `/api/FellowshipAttendance/${record.id}`);
    if (result.ok) {
      toast.success("Fellowship attendance deleted.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to delete fellowship attendance.");
    }
  }

  async function handleApprove(record: FellowshipAttendanceDto) {
    const result = await apiRequest("POST", `/api/FellowshipAttendance/${record.id}/approve`);
    if (result.ok) {
      toast.success("Fellowship attendance approved.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to approve fellowship attendance.");
    }
  }

  async function handleLock(record: FellowshipAttendanceDto) {
    const result = await apiRequest("POST", `/api/FellowshipAttendance/${record.id}/lock`);
    if (result.ok) {
      toast.success("Fellowship attendance record locked.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to lock fellowship attendance record.");
    }
  }

  const showActionsCol = canWrite || canApprove;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Fellowship Attendance</h2>
        {canWrite && (
          <Button onClick={openCreate} size="sm" disabled={centers.length === 0}>
            <Plus className="h-4 w-4" /> New Attendance
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Center</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Men</TableHead>
                <TableHead>Women</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>New Converts</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                {showActionsCol && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showActionsCol ? 9 : 8} className="text-center text-muted-foreground py-8">
                    No fellowship attendance records yet.
                  </TableCell>
                </TableRow>
              )}
              {pageItems.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{centerLabel(record.fellowshipCenterId)}</TableCell>
                  <TableCell>{record.date.slice(0, 10)}</TableCell>
                  <TableCell>{record.men}</TableCell>
                  <TableCell>{record.women}</TableCell>
                  <TableCell>{record.children}</TableCell>
                  <TableCell>{record.newConverts}</TableCell>
                  <TableCell className="font-medium">{record.total}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={record.isApproved ? "default" : "secondary"}>
                        {record.isApproved ? "Approved" : "Pending"}
                      </Badge>
                      {record.isLocked && <Badge variant="outline">Locked</Badge>}
                    </div>
                  </TableCell>
                  {showActionsCol && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canApprove && !record.isApproved && (
                          <Button variant="ghost" size="icon-sm" onClick={() => handleApprove(record)} title="Approve">
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        {canApprove && record.isApproved && !record.isLocked && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setConfirmAction({ type: "lock", record })} title="Lock">
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        {canWrite && !record.isLocked && (
                          <>
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(record)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setConfirmAction({ type: "delete", record })}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            total={items.length}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={changePage}
            onPageSizeChange={changePageSize}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Fellowship Attendance" : "New Fellowship Attendance"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Fellowship Center</Label>
              <Select
                value={form.fellowshipCenterId}
                onValueChange={(v) => setForm({ ...form, fellowshipCenterId: v as string })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a center">
                    {form.fellowshipCenterId ? centerLabel(form.fellowshipCenterId) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.centerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="men">Men</Label>
                <Input id="men" type="number" min={0} value={form.men} onChange={(e) => setForm({ ...form, men: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="women">Women</Label>
                <Input id="women" type="number" min={0} value={form.women} onChange={(e) => setForm({ ...form, women: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="children">Children</Label>
                <Input id="children" type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newConverts">New Converts</Label>
                <Input id="newConverts" type="number" min={0} value={form.newConverts} onChange={(e) => setForm({ ...form, newConverts: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving || !form.fellowshipCenterId}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Record Attendance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.type === "lock" ? "Lock fellowship attendance record?" : "Delete fellowship attendance record?"}
        description={
          confirmAction?.type === "lock"
            ? "Once locked, this record can no longer be edited or deleted."
            : "This will permanently delete this fellowship attendance record."
        }
        confirmLabel={confirmAction?.type === "lock" ? "Lock" : "Delete"}
        destructive={confirmAction?.type !== "lock"}
        onConfirm={() => {
          if (confirmAction?.type === "lock") handleLock(confirmAction.record);
          else if (confirmAction?.type === "delete") handleDelete(confirmAction.record);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
