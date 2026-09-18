import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiRequest, SERVICE_TYPE_NAMES, type ServiceDto } from "@/lib/api";
import { useCrudList } from "@/hooks/useCrudList";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2 } from "lucide-react";

interface ServicesSectionProps {
  canWrite: boolean;
}

const emptyForm = {
  date: "",
  day: "",
  serviceType: "0",
  theme: "",
  scriptureText: "",
  preacher: "",
  onlineAttendance: "0",
};

export function ServicesSection({ canWrite }: ServicesSectionProps) {
  const { items, loading, refresh } = useCrudList<ServiceDto>("/api/Service");
  const { pageItems, page, pageSize, totalPages, changePage, changePageSize } = usePagination(items);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceDto | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(service: ServiceDto) {
    setEditing(service);
    setForm({
      date: service.date.slice(0, 10),
      day: service.day,
      serviceType: String(service.serviceType),
      theme: service.theme ?? "",
      scriptureText: service.scriptureText ?? "",
      preacher: service.preacher ?? "",
      onlineAttendance: String(service.onlineAttendance),
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      date: form.date,
      day: form.day,
      serviceType: Number(form.serviceType),
      theme: form.theme || null,
      scriptureText: form.scriptureText || null,
      preacher: form.preacher || null,
      onlineAttendance: Number(form.onlineAttendance) || 0,
    };

    const result = editing
      ? await apiRequest("PUT", `/api/Service/${editing.id}`, { id: editing.id, ...payload })
      : await apiRequest("POST", "/api/Service", payload);

    setSaving(false);

    if (result.ok) {
      toast.success(editing ? "Service updated." : "Service created.");
      setOpen(false);
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to save service.");
    }
  }

  async function handleDelete(service: ServiceDto) {
    const result = await apiRequest("DELETE", `/api/Service/${service.id}`);
    if (result.ok) {
      toast.success("Service deleted.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to delete service.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Services</h2>
        {canWrite && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" /> New Service
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
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Preacher</TableHead>
                <TableHead>Online</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-muted-foreground py-8">
                    No services yet.
                  </TableCell>
                </TableRow>
              )}
              {pageItems.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.date.slice(0, 10)}</TableCell>
                  <TableCell>{service.day}</TableCell>
                  <TableCell>{SERVICE_TYPE_NAMES[service.serviceType] ?? service.serviceType}</TableCell>
                  <TableCell>{service.theme ?? "-"}</TableCell>
                  <TableCell>{service.preacher ?? "-"}</TableCell>
                  <TableCell>{service.onlineAttendance}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(service)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(service)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
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
            <DialogTitle>{editing ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="day">Day</Label>
                <Input
                  id="day"
                  required
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: e.target.value })}
                  placeholder="Sunday"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Service Type</Label>
              <Select
                value={form.serviceType}
                onValueChange={(v) => setForm({ ...form, serviceType: v as string })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{SERVICE_TYPE_NAMES[Number(form.serviceType)]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPE_NAMES.map((name, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="theme">Theme</Label>
              <Input id="theme" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scripture">Scripture Text</Label>
              <Input
                id="scripture"
                value={form.scriptureText}
                onChange={(e) => setForm({ ...form, scriptureText: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="preacher">Preacher</Label>
                <Input
                  id="preacher"
                  value={form.preacher}
                  onChange={(e) => setForm({ ...form, preacher: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="online">Online Attendance</Label>
                <Input
                  id="online"
                  type="number"
                  min={0}
                  value={form.onlineAttendance}
                  onChange={(e) => setForm({ ...form, onlineAttendance: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete service?"
        description={
          deleteTarget
            ? `This will permanently delete the service on ${deleteTarget.date.slice(0, 10)}.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
