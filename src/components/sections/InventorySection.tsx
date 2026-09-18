import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiRequest, ITEM_CONDITION_NAMES, type InventoryItemDto } from "@/lib/api";
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
import { Plus, Pencil, Trash2 } from "lucide-react";

interface InventorySectionProps {
  canWrite: boolean;
}

const emptyForm = {
  itemName: "",
  description: "",
  serialNumber: "",
  category: "",
  quantity: "1",
  location: "",
  condition: "0",
  purchaseDate: "",
  value: "0",
  custodian: "",
  lastVerifiedDate: "",
};

const conditionVariant = (c: number): "default" | "secondary" | "destructive" => {
  if (c === 0) return "default";
  if (c === 1) return "secondary";
  return "destructive";
};

export function InventorySection({ canWrite }: InventorySectionProps) {
  const { items, loading, refresh } = useCrudList<InventoryItemDto>("/api/InventoryItem");
  const sortedItems = [...items].sort((a, b) =>
    a.itemName.localeCompare(b.itemName, undefined, { sensitivity: "base", numeric: true }),
  );
  const { pageItems, page, pageSize, totalPages, changePage, changePageSize } = usePagination(sortedItems);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItemDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItemDto | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item: InventoryItemDto) {
    setEditing(item);
    setForm({
      itemName: item.itemName,
      description: item.description,
      serialNumber: item.serialNumber ?? "",
      category: item.category,
      quantity: String(item.quantity),
      location: item.location,
      condition: String(item.condition),
      purchaseDate: item.purchaseDate.slice(0, 10),
      value: String(item.value),
      custodian: item.custodian,
      lastVerifiedDate: item.lastVerifiedDate ? item.lastVerifiedDate.slice(0, 10) : "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      itemName: form.itemName,
      description: form.description,
      serialNumber: form.serialNumber || null,
      category: form.category,
      quantity: Number(form.quantity) || 0,
      location: form.location,
      condition: Number(form.condition),
      purchaseDate: form.purchaseDate,
      value: Number(form.value) || 0,
      custodian: form.custodian,
      lastVerifiedDate: form.lastVerifiedDate || null,
    };

    const result = editing
      ? await apiRequest("PUT", `/api/InventoryItem/${editing.id}`, { id: editing.id, ...payload })
      : await apiRequest("POST", "/api/InventoryItem", payload);

    setSaving(false);

    if (result.ok) {
      toast.success(editing ? "Item updated." : "Item created.");
      setOpen(false);
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to save item.");
    }
  }

  async function handleDelete(item: InventoryItemDto) {
    const result = await apiRequest("DELETE", `/api/InventoryItem/${item.id}`);
    if (result.ok) {
      toast.success("Item deleted.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to delete item.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Inventory</h2>
        {canWrite && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" /> New Item
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
                <TableHead>Item</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Custodian</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 9 : 8} className="text-center text-muted-foreground py-8">
                    No inventory items yet.
                  </TableCell>
                </TableRow>
              )}
              {pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell>{item.serialNumber || "—"}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>
                    <Badge variant={conditionVariant(item.condition)}>
                      {ITEM_CONDITION_NAMES[item.condition] ?? item.condition}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.value.toLocaleString(undefined, { style: "currency", currency: "USD" })}</TableCell>
                  <TableCell>{item.custodian}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(item)}>
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
            total={sortedItems.length}
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
            <DialogTitle>{editing ? "Edit Item" : "New Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="itemName">Item Name</Label>
              <Input id="itemName" required value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input id="category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min={0} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v as string })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{ITEM_CONDITION_NAMES[Number(form.condition)]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CONDITION_NAMES.map((name, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input id="purchaseDate" type="date" required value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">Value ($)</Label>
                <Input id="value" type="number" min={0} step="0.01" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custodian">Custodian</Label>
                <Input id="custodian" required value={form.custodian} onChange={(e) => setForm({ ...form, custodian: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastVerifiedDate">Last Verified</Label>
                <Input id="lastVerifiedDate" type="date" value={form.lastVerifiedDate} onChange={(e) => setForm({ ...form, lastVerifiedDate: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete inventory item?"
        description={deleteTarget ? `This will permanently delete "${deleteTarget.itemName}".` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
