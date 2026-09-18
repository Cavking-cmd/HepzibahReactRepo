import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiRequest, type FellowshipCenterDto } from "@/lib/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TablePagination } from "@/components/TablePagination";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface FellowshipCentersSectionProps {
  canWrite: boolean;
}

const emptyForm = { centerName: "", zone: "", leaderName: "", location: "" };

export function FellowshipCentersSection({ canWrite }: FellowshipCentersSectionProps) {
  const { items, loading, refresh } = useCrudList<FellowshipCenterDto>("/api/FellowshipCenter");
  const { pageItems, page, pageSize, totalPages, changePage, changePageSize } = usePagination(items);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FellowshipCenterDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FellowshipCenterDto | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(center: FellowshipCenterDto) {
    setEditing(center);
    setForm({
      centerName: center.centerName,
      zone: center.zone,
      leaderName: center.leaderName,
      location: center.location,
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = editing
      ? await apiRequest("PUT", `/api/FellowshipCenter/${editing.id}`, { id: editing.id, ...form })
      : await apiRequest("POST", "/api/FellowshipCenter", form);

    setSaving(false);

    if (result.ok) {
      toast.success(editing ? "Fellowship center updated." : "Fellowship center created.");
      setOpen(false);
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to save fellowship center.");
    }
  }

  async function handleDelete(center: FellowshipCenterDto) {
    const result = await apiRequest("DELETE", `/api/FellowshipCenter/${center.id}`);
    if (result.ok) {
      toast.success("Fellowship center deleted.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to delete fellowship center.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Fellowship Centers</h2>
        {canWrite && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" /> New Center
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
                <TableHead>Center Name</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Leader</TableHead>
                <TableHead>Location</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 5 : 4} className="text-center text-muted-foreground py-8">
                    No fellowship centers yet.
                  </TableCell>
                </TableRow>
              )}
              {pageItems.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="font-medium">{center.centerName}</TableCell>
                  <TableCell>{center.zone}</TableCell>
                  <TableCell>{center.leaderName}</TableCell>
                  <TableCell>{center.location}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(center)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(center)}>
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
            <DialogTitle>{editing ? "Edit Fellowship Center" : "New Fellowship Center"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="centerName">Center Name</Label>
              <Input
                id="centerName"
                required
                value={form.centerName}
                onChange={(e) => setForm({ ...form, centerName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone">Zone</Label>
              <Input id="zone" required value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leaderName">Leader Name</Label>
              <Input
                id="leaderName"
                required
                value={form.leaderName}
                onChange={(e) => setForm({ ...form, leaderName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Center"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete fellowship center?"
        description={deleteTarget ? `This will permanently delete "${deleteTarget.centerName}".` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
