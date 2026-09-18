import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiRequest, type AttendanceDto, type ServiceDto } from "@/lib/api";
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

interface AttendanceSectionProps {
  canWrite: boolean;
  canApprove: boolean;
}

const emptyForm = {
  serviceId: "",
  men: "0",
  women: "0",
  children: "0",
  sundaySchool: "0",
  newConverts: "0",
  firstTimers: "0",
};

export function AttendanceSection({ canWrite, canApprove }: AttendanceSectionProps) {
  const { items, loading, refresh } = useCrudList<AttendanceDto>("/api/Attendance");
  const { items: services } = useCrudList<ServiceDto>("/api/Service");
  const { pageItems, page, pageSize, totalPages, changePage, changePageSize } = usePagination(items);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "lock"; record: AttendanceDto } | null>(null);

  function serviceLabel(id: string) {
    const s = services.find((x) => x.id === id);
    return s ? `${s.date.slice(0, 10)} - ${s.day}` : "Deleted service";
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(record: AttendanceDto) {
    setEditing(record);
    setForm({
      serviceId: record.serviceId,
      men: String(record.men),
      women: String(record.women),
      children: String(record.children),
      sundaySchool: String(record.sundaySchool),
      newConverts: String(record.newConverts),
      firstTimers: String(record.firstTimers),
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      serviceId: form.serviceId,
      men: Number(form.men) || 0,
      women: Number(form.women) || 0,
      children: Number(form.children) || 0,
      sundaySchool: Number(form.sundaySchool) || 0,
      newConverts: Number(form.newConverts) || 0,
      firstTimers: Number(form.firstTimers) || 0,
    };

    const result = editing
      ? await apiRequest("PUT", `/api/Attendance/${editing.id}`, { id: editing.id, ...payload })
      : await apiRequest("POST", "/api/Attendance", payload);

    setSaving(false);

    if (result.ok) {
      toast.success(editing ? "Attendance updated." : "Attendance recorded.");
      setOpen(false);
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to save attendance.");
    }
  }

  async function handleDelete(record: AttendanceDto) {
    const result = await apiRequest("DELETE", `/api/Attendance/${record.id}`);
    if (result.ok) {
      toast.success("Attendance deleted.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to delete attendance.");
    }
  }

  async function handleApprove(record: AttendanceDto) {
    const result = await apiRequest("POST", `/api/Attendance/${record.id}/approve`);
    if (result.ok) {
      toast.success("Attendance approved.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to approve attendance.");
    }
  }

  async function handleLock(record: AttendanceDto) {
    const result = await apiRequest("POST", `/api/Attendance/${record.id}/lock`);
    if (result.ok) {
      toast.success("Attendance record locked.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to lock attendance record.");
    }
  }

  const showActionsCol = canWrite || canApprove;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Attendance</h2>
        {canWrite && (
          <Button onClick={openCreate} size="sm" disabled={services.length === 0}>
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
                <TableHead>Service</TableHead>
                <TableHead>Men</TableHead>
                <TableHead>Women</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>Sunday School</TableHead>
                <TableHead>New Converts</TableHead>
                <TableHead>First Timers</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                {showActionsCol && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showActionsCol ? 10 : 9} className="text-center text-muted-foreground py-8">
                    No attendance records yet.
                  </TableCell>
                </TableRow>
              )}
              {pageItems.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{serviceLabel(record.serviceId)}</TableCell>
                  <TableCell>{record.men}</TableCell>
                  <TableCell>{record.women}</TableCell>
                  <TableCell>{record.children}</TableCell>
                  <TableCell>{record.sundaySchool}</TableCell>
                  <TableCell>{record.newConverts}</TableCell>
                  <TableCell>{record.firstTimers}</TableCell>
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
            <DialogTitle>{editing ? "Edit Attendance" : "New Attendance"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Select
                value={form.serviceId}
                onValueChange={(v) => setForm({ ...form, serviceId: v as string })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a service">
                    {form.serviceId ? serviceLabel(form.serviceId) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date.slice(0, 10)} - {s.day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label htmlFor="sundaySchool">Sunday School</Label>
                <Input id="sundaySchool" type="number" min={0} value={form.sundaySchool} onChange={(e) => setForm({ ...form, sundaySchool: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newConverts">New Converts</Label>
                <Input id="newConverts" type="number" min={0} value={form.newConverts} onChange={(e) => setForm({ ...form, newConverts: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firstTimers">First Timers</Label>
                <Input id="firstTimers" type="number" min={0} value={form.firstTimers} onChange={(e) => setForm({ ...form, firstTimers: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving || !form.serviceId}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Record Attendance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.type === "lock" ? "Lock attendance record?" : "Delete attendance record?"}
        description={
          confirmAction?.type === "lock"
            ? "Once locked, this record can no longer be edited or deleted."
            : "This will permanently delete this attendance record."
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
