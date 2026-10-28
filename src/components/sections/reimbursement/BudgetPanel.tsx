import type { BudgetAlertDto, ReimbursementBudgetDto } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/reimbursements";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "danger" | "ok" }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right tabular-nums",
          strong && "font-semibold",
          tone === "danger" && "text-destructive",
          tone === "ok" && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {value}
      </span>
    </>
  );
}

function UsageBar({ percent, projected }: { percent: number | null; projected: number | null }) {
  const now = Math.min(Math.max(percent ?? 0, 0), 100);
  const next = Math.min(Math.max(projected ?? now, 0), 100);
  const over = (projected ?? percent ?? 0) > 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className="relative h-full">
        <div className={cn("absolute inset-y-0 left-0 rounded-full", over ? "bg-destructive" : "bg-primary")} style={{ width: `${now}%` }} />
        {next > now && (
          <div
            className={cn("absolute inset-y-0 rounded-r-full opacity-50", over ? "bg-destructive" : "bg-primary")}
            style={{ left: `${now}%`, width: `${next - now}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function AlertList({ alerts }: { alerts: BudgetAlertDto[] }) {
  if (alerts.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {alerts.map((alert, i) => {
        const Icon = alert.severity === "danger" ? ShieldAlert : alert.severity === "warning" ? AlertTriangle : Info;
        return (
          <li
            key={`${alert.code}-${i}`}
            className={cn(
              "flex gap-2 rounded-md px-2 py-1.5 text-xs",
              alert.severity === "danger" && "bg-destructive/10 text-destructive",
              alert.severity === "warning" && "bg-amber-500/10 text-amber-800 dark:text-amber-200",
              alert.severity === "info" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{alert.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Server-calculated budget position for one request. */
export function BudgetPanel({ budget, loading }: { budget: ReimbursementBudgetDto | null; loading: boolean }) {
  if (loading && !budget) {
    return (
      <div className="rounded-lg border border-border/70 p-3 text-sm text-muted-foreground">Checking the department budget…</div>
    );
  }

  if (!budget) return null;

  if (budget.isPersonalUse || budget.needsDepartmentLink || !budget.department) {
    return (
      <div className="rounded-lg border border-border/70 p-3 text-sm">
        <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Budget</p>
        <p className="text-muted-foreground">{budget.note ?? "No department budget applies."}</p>
      </div>
    );
  }

  const d = budget.department;
  const projectedYear = budget.alreadyCommitted ? null : budget.projectedRemainingThisYear;
  const projectedMonth = budget.alreadyCommitted ? null : budget.projectedRemainingThisMonth;

  return (
    <div className={cn("space-y-3 rounded-lg border p-3 text-sm", budget.wouldExceedAnnual ? "border-destructive/50" : "border-border/70")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Budget · {d.departmentName}</p>
          <p className="text-xs text-muted-foreground">
            {d.year} annual budget{d.isActive ? "" : " · department inactive"}
          </p>
        </div>
        {loading && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Used {formatPercent(d.utilisationPercentThisYear)}</span>
          {!budget.alreadyCommitted && <span>If approved {formatPercent(budget.projectedUtilisationPercentThisYear)}</span>}
        </div>
        <UsageBar percent={d.utilisationPercentThisYear} projected={budget.alreadyCommitted ? null : budget.projectedUtilisationPercentThisYear} />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <Row label="Annual budget" value={formatMoney(d.annualBudget)} />
        <Row label="Paid this year" value={formatMoney(d.paidThisYear)} />
        <Row label="Approved, not yet paid" value={formatMoney(d.committedThisYear)} />
        <Row label="Remaining" value={formatMoney(d.remainingThisYear)} strong tone={d.remainingThisYear < 0 ? "danger" : undefined} />
        <Row label="Pending (not spent)" value={formatMoney(d.pendingThisYear)} />
        {!budget.alreadyCommitted && (
          <>
            <Row label="This request" value={formatMoney(budget.requestAmount)} />
            <Row
              label="Remaining if approved"
              value={formatMoney(projectedYear)}
              strong
              tone={(projectedYear ?? 0) < 0 ? "danger" : "ok"}
            />
          </>
        )}
      </div>

      {d.monthlyBudget !== null && (
        <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-border/60 pt-2">
          <Row label="Monthly guide" value={formatMoney(d.monthlyBudget)} />
          <Row label="Paid + approved this month" value={formatMoney(d.paidThisMonth + d.committedThisMonth)} />
          {!budget.alreadyCommitted ? (
            <Row label="Month remaining if approved" value={formatMoney(projectedMonth)} tone={(projectedMonth ?? 0) < 0 ? "danger" : undefined} />
          ) : (
            <Row label="Month remaining" value={formatMoney(d.remainingThisMonth)} tone={(d.remainingThisMonth ?? 0) < 0 ? "danger" : undefined} />
          )}
        </div>
      )}

      <AlertList alerts={budget.alerts} />

      <p className="text-[11px] leading-snug text-muted-foreground">{budget.calculationNote}</p>
    </div>
  );
}
