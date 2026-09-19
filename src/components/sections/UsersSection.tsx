import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiRequest, type UserDto, type CreateUserRequest } from "@/lib/api";
import { useCrudList } from "@/hooks/useCrudList";
import { usePagination } from "@/hooks/usePagination";
import { ALL_ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TablePagination } from "@/components/TablePagination";
import { Plus, Trash2 } from "lucide-react";

const roleVariant = (role: string): "default" | "secondary" | "outline" => {
  if (role === "Admin") return "default";
  if (role === "AttendanceOfficer" || role === "FellowshipLeader") return "secondary";
  return "outline";
};

export function UsersSection() {
  const { items, loading, refresh } = useCrudList<UserDto>("/api/User");
  const sortedItems = [...items].sort((a, b) =>
    a.email.localeCompare(b.email, undefined, { sensitivity: "base", numeric: true }),
  );
  const { pageItems, page, pageSize, totalPages, changePage, changePageSize } = usePagination(sortedItems);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);

  function openCreate() {
    setForm({ email: "", password: "" });
    setRoles([]);
    setOpen(true);
  }

  function toggleRole(role: string) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (roles.length === 0) {
      toast.error("Select at least one role.");
      return;
    }
    setSaving(true);
    const payload: CreateUserRequest = {
      email: form.email,
      password: form.password,
      roles,
    };
    const result = await apiRequest("POST", "/api/User/register", payload);
    setSaving(false);
    if (result.ok) {
      toast.success(`User ${form.email} created.`);
      setOpen(false);
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to create user.");
    }
  }

  async function handleDelete(user: UserDto) {
    const result = await apiRequest("DELETE", `/api/User/${user.id}`);
    if (result.ok) {
      toast.success("User removed.");
      refresh();
    } else {
      toast.error(result.body?.message ?? "Failed to remove user.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Users &amp; Roles</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" /> New User
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No users yet.
                  </TableCell>
                </TableRow>
              )}
              {pageItems.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.displayName || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles.map((role) => (
                        <Badge key={role} variant={roleVariant(role)}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(user)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
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
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@churchportal.local"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
                      roles.includes(role)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user?"
        description={deleteTarget ? `This will remove "${deleteTarget.email}" and revoke their access.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}