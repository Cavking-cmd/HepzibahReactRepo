import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  apiGet,
  apiList,
  apiRequest,
  type DepartmentBudgetDto,
  type DepartmentDto,
  type LegacyDepartmentNameDto,
} from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/reimbursements";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchSelect } from "@/components/SearchSelect";
import { AlertList } from "@/components/sections/reimbursement/BudgetPanel";
import { AlertTriangle, Link2, Pencil, Plus } from "lucide-react";

interface DepartmentsSectionProps {
  /** Accounts Admin can create, edit, deactivate and link. Accounts Officers can only view. */
  canManage: boolean;
}

interface FormState {
  name: string;
  description: string;
  annualBudget: string;
  monthlyBudget: string;
  isActive: boolean;
}

const emptyForm: FormState = { name: "", description: "", annualBudget: "", monthlyBudget: "", isActive: true };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function UtilBar({ percent }: { percent: number | null }) {
  const value = Math.min(Math.max(percent ?? 0, 0), 100);
  const over = (percent ?? 0) > 100;
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className={cn("h-full rounded-full", over ? "bg-destructive" : value >= 80 ? "bg-amber-500" : "bg-primary")} style={{ width: `${value}%` }} />
    </div>
  );
}

export function DepartmentsSection({ canManage }: DepartmentsSectionProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [budgets, setBudgets] = useState<DepartmentBudgetDto[]>([]);
  const [legacy, setLegacy] = useState<LegacyDepartmentNameDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const [linkChoice, setLinkChoice] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [deptList, budgetList, legacyList] = await Promise.all([
      apiList<DepartmentDto>("/api/Departments?includeInactive=true"),
      apiList<DepartmentBudgetDto>(`/api/Departments/budgets?year=${year}&month=${month}&includeInactive=true`),
      canManage ? apiGet<LegacyDepartmentNameDto[]>("/api/Departments/legacy-names") : Promise.resolve([] as LegacyDepartmentNameDto[]),
    ]);
    setDepartments(deptList);
    setBudgets(budgetList);
    setLegacy(legacyList ?? []);
    setLoading(false);
  }, [year, month, canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const budgetById = useMemo(() => new Map(budgets.map((b) => [b.departmentId, b])), [budgets]);
  const activeOptions = departments.filter((d) => d.isActive).map((d) => ({ value: d.id, label: d.name }));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  }

  function openEdit(d: DepartmentDto) {
    setEditing(d);
    setForm({
      name: d.name,
      description: d.description ?? "",
      annualBudget: String(d.annualBudget),
      monthlyBudget: d.monthlyBudget === null ? "" : String(d.monthlyBudget),
      isActive: d.isActive,
    });
    setErrors({});
    setOpen(true);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Department name is required.";
    else if (form.name.trim().toLowerCase() === "personal use") next.name = "\"Personal Use\" is built in and is not a department.";
    const annual = Number(form.annualBudget);
    if (form.annualBudget.trim() === "") next.annualBudget = "Annual budget is required. Enter 0 if there is none.";
    else if (!Number.isFinite(annual) || annual < 0) next.annualBudget = "Enter zero or a positive amount.";
    if (form.monthlyBudget.trim() !== "") {
      const monthly = Number(form.monthlyBudget);
      if (!Number.isFinite(monthly) || monthly < 0) next.monthlyBudget = "Enter zero or a positive amount, or leave empty.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      annualBudget: Number(form.annualBudget),
      monthlyBudget: form.monthlyBudget.trim() === "" ? null : Number(form.monthlyBudget),
    };
    const result = editing
      ? await apiRequest("PUT", `/api/Departments/${editing.id}`, { ...payload, id: editing.id, isActive: form.isActive })
      : await apiRequest("POST", "/api/Departments", payload);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.body?.message ?? "The department could not be saved.");
      return;
    }

    toast.success(editing ? "Department updated." : "Department created.");
    setOpen(false);
    void load();
  }

  async function link(item: LegacyDepartmentNameDto) {
    const choice = linkChoice[item.legacyName] ?? item.suggestedDepartmentId ?? "";
    if (!choice) {
      toast.error("Choose a department or Personal Use first.");
      return;
    }
    setLinking(item.legacyName);
    const result = await apiRequest<number>("POST", "/api/Departments/link-legacy", {
      legacyName: item.legacyName,
      departmentId: choice === "personal" ? null : choice,
      personalUse: choice === "personal",
    });
    setLinking(null);
    if (!result.ok) {
      toast.error(result.body?.message ?? "Linking failed.");
      return;
    }
    toast.success(result.body?.message ?? "Linked.");
    void load();
  }

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Departments &amp; Budgets</h2>
          <p className="text-sm text-muted-foreground">
            Annual budgets run January to December. The monthly guide is optional. Budgets inform decisions; they never block them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Budget year"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            aria-label="Month for the monthly guide"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Department
            </Button>
          )}
        </div>
      </div>

      {canManage && legacy.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" /> Needs linking ({legacy.length})
            </CardTitle>
            <CardDescription>
              Older requests were saved with typed department names. Link each name to a department (or Personal Use) so
              they count in budgets and reports. Nothing is linked automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {legacy.map((item) => {
              const value = linkChoice[item.legacyName] ?? item.suggestedDepartmentId ?? "";
              return (
                <div key={item.legacyName} className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-[1fr_16rem_auto] sm:items-center">
                  <div>
                    <p className="font-medium">"{item.legacyName}"</p>
                    <p className="text-xs text-muted-foreground">
                      {item.requestCount} request{item.requestCount === 1 ? "" : "s"} · {formatMoney(item.totalAmount)}
                      {item.suggestedDepartmentName ? ` · exact match: ${item.suggestedDepartmentName}` : ""}
                    </p>
                  </div>
                  <SearchSelect
                    value={value}
                    onChange={(v) => setLinkChoice((prev) => ({ ...prev, [item.legacyName]: v }))}
                    options={activeOptions}
                    pinnedOptions={[{ value: "personal", label: "Personal Use" }]}
                    placeholder="Link to…"
                    searchPlaceholder="Search departments"
                  />
                  <Button size="sm" onClick={() => void link(item)} disabled={linking === item.legacyName || !value}>
                    {linking === item.legacyName ? "Linking…" : "Link"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : departments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="font-medium">No departments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManage ? "Create the church's departments and their budgets." : "An Accounts Admin needs to create departments."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Annual budget</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Approved, unpaid</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>{MONTHS[month - 1]} guide</TableHead>
                {canManage && <TableHead className="text-right">Edit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => {
                const b = budgetById.get(d.id);
                const warn = b?.alerts.some((a) => a.severity !== "info");
                return (
                  <TableRow key={d.id} className={cn(!d.isActive && "opacity-60")}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {d.name}
                        {!d.isActive && <Badge variant="outline">Inactive</Badge>}
                        {warn && <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Budget warning" />}
                      </div>
                      {d.description && <p className="max-w-[260px] truncate text-xs text-muted-foreground">{d.description}</p>}
                      {b && b.alerts.length > 0 && (
                        <div className="mt-1 max-w-[320px]">
                          <AlertList alerts={b.alerts} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(d.annualBudget)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(b?.paidThisYear)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(b?.committedThisYear)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(b?.pendingThisYear)}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", (b?.remainingThisYear ?? 0) < 0 && "text-destructive")}>
                      {formatMoney(b?.remainingThisYear)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UtilBar percent={b?.utilisationPercentThisYear ?? null} />
                        <span className="text-xs tabular-nums">{formatPercent(b?.utilisationPercentThisYear)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.monthlyBudget === null ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <span className={cn((b?.remainingThisMonth ?? 0) < 0 && "text-destructive")}>
                          {formatMoney((b?.paidThisMonth ?? 0) + (b?.committedThisMonth ?? 0))} of {formatMoney(d.monthlyBudget)}
                        </span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(d)} aria-label={`Edit ${d.name}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Paid counts by payment date; approved-unpaid by approval date; pending (under review or awaiting approval) by submission
        date and is not treated as spent. Remaining = budget − paid − approved-unpaid. Personal Use requests are never charged to a
        department.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New Department"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="deptName">Name *</Label>
              <Input id="deptName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name || undefined} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deptDescription">Description</Label>
              <Input id="deptDescription" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="deptAnnual">Annual budget (CAD) *</Label>
                <Input
                  id="deptAnnual"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.annualBudget}
                  onChange={(e) => setForm({ ...form, annualBudget: e.target.value })}
                  aria-invalid={!!errors.annualBudget || undefined}
                />
                {errors.annualBudget && <p className="text-xs text-destructive">{errors.annualBudget}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deptMonthly">Monthly guide (optional)</Label>
                <Input
                  id="deptMonthly"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.monthlyBudget}
                  onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value })}
                  aria-invalid={!!errors.monthlyBudget || undefined}
                />
                {errors.monthlyBudget && <p className="text-xs text-destructive">{errors.monthlyBudget}</p>}
              </div>
            </div>
            {editing && (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 p-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Inactive departments keep their history ({editing.requestCount} request{editing.requestCount === 1 ? "" : "s"}) but
                    can't be chosen for new requests.
                  </p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(checked: boolean) => setForm({ ...form, isActive: checked })} />
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
