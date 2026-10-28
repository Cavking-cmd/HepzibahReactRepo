import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  apiGet,
  apiList,
  type DepartmentOptionDto,
  type DepartmentSpendingReportDto,
  type FinanceForecastDto,
  type FinanceSummaryDto,
  type MonthlyExpenditureDto,
  type SpendingTrendsDto,
  type WorkflowReportDto,
} from "@/lib/api";
import { exportCsv } from "@/lib/export";
import { formatDay, formatMoney, formatPercent } from "@/lib/reimbursements";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Download, Info } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const trendConfig = {
  paidDepartment: { label: "Departments", color: "var(--chart-1)" },
  paidPersonalUse: { label: "Personal Use", color: "var(--chart-3)" },
} satisfies ChartConfig;

const countConfig = {
  submittedCount: { label: "Requests submitted", color: "var(--chart-2)" },
  paidCount: { label: "Payments made", color: "var(--chart-1)" },
} satisfies ChartConfig;

const avgConfig = {
  averagePaid: { label: "Average payment", color: "var(--chart-4)" },
  yearToDateUtilisationPercent: { label: "Year-to-date budget used (%)", color: "var(--chart-5)" },
} satisfies ChartConfig;

const byDeptConfig = {
  amount: { label: "Paid", color: "var(--chart-1)" },
} satisfies ChartConfig;

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const compactMoney = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

interface Filters {
  departmentId: string;
  classification: "" | "department" | "personal";
}

function filterQuery(f: Filters): string {
  const parts: string[] = [];
  if (f.departmentId) parts.push(`departmentId=${f.departmentId}`);
  if (f.classification) parts.push(`classification=${f.classification}`);
  return parts.join("&");
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: "danger" | "warning" }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-xl font-semibold tabular-nums", tone === "danger" && "text-destructive", tone === "warning" && "text-amber-700 dark:text-amber-300")}>
          {value}
        </p>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Definitions({ items }: { items: string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <details className="rounded-lg border border-border/70 p-3 text-xs text-muted-foreground">
      <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-foreground">
        <Info className="h-3.5 w-3.5" /> How these figures are calculated
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </details>
  );
}

function CsvButton({ name, rows }: { name: string; rows: (string | number | null | undefined)[][] }) {
  return (
    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => exportCsv(name, rows)} disabled={rows.length <= 1}>
      <Download className="h-3.5 w-3.5" /> CSV
    </Button>
  );
}

const pct = (n: number | null | undefined) => (n === null || n === undefined ? "" : n.toFixed(1));

export function FinancialReports() {
  const now = new Date();
  const [departments, setDepartments] = useState<DepartmentOptionDto[]>([]);
  const [filters, setFilters] = useState<Filters>({ departmentId: "", classification: "" });

  const [from, setFrom] = useState(isoDay(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(isoDay(now));
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [trendMonths, setTrendMonths] = useState(12);
  const [staleDays, setStaleDays] = useState(14);

  const [summary, setSummary] = useState<FinanceSummaryDto | null>(null);
  const [monthly, setMonthly] = useState<MonthlyExpenditureDto | null>(null);
  const [byDept, setByDept] = useState<DepartmentSpendingReportDto | null>(null);
  const [trends, setTrends] = useState<SpendingTrendsDto | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowReportDto | null>(null);
  const [forecast, setForecast] = useState<FinanceForecastDto | null>(null);

  const [sortKey, setSortKey] = useState<"department" | "paid" | "utilisation" | "remaining" | "pending">("paid");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    void apiList<DepartmentOptionDto>("/api/Departments/options").then(setDepartments);
  }, []);

  const fq = filterQuery(filters);
  const amp = fq ? `&${fq}` : "";

  useEffect(() => {
    setSummary(null);
    void apiGet<FinanceSummaryDto>(`/api/Reports/Finance/summary?from=${from}&to=${to}${amp}`).then(setSummary);
  }, [from, to, amp]);

  useEffect(() => {
    setMonthly(null);
    void apiGet<MonthlyExpenditureDto>(`/api/Reports/Finance/monthly?year=${year}&month=${month}${amp}`).then(setMonthly);
  }, [year, month, amp]);

  useEffect(() => {
    setByDept(null);
    setForecast(null);
    void apiGet<DepartmentSpendingReportDto>(`/api/Reports/Finance/departments?year=${year}${amp}`).then(setByDept);
    void apiGet<FinanceForecastDto>(`/api/Reports/Finance/forecast?year=${year}${amp}`).then(setForecast);
  }, [year, amp]);

  useEffect(() => {
    setTrends(null);
    void apiGet<SpendingTrendsDto>(`/api/Reports/Finance/trends?months=${trendMonths}${amp}`).then(setTrends);
  }, [trendMonths, amp]);

  useEffect(() => {
    setWorkflow(null);
    void apiGet<WorkflowReportDto>(`/api/Reports/Finance/workflow?staleDays=${staleDays}${amp}`).then(setWorkflow);
  }, [staleDays, amp]);

  const sortedDeptRows = useMemo(() => {
    const rows = [...(byDept?.rows ?? [])];
    const value = (r: (typeof rows)[number]) =>
      sortKey === "department" ? r.department.toLowerCase()
        : sortKey === "paid" ? r.paid
          : sortKey === "utilisation" ? r.utilisationPercent ?? -1
            : sortKey === "remaining" ? r.remaining ?? Number.POSITIVE_INFINITY
              : r.pending;
    rows.sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (av as number) - (bv as number);
      return sortDesc ? -cmp : cmp;
    });
    return rows;
  }, [byDept, sortKey, sortDesc]);

  function sortBy(key: typeof sortKey) {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(key !== "department");
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i);
  const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30";
  const SortHead = ({ k, children, right }: { k: typeof sortKey; children: ReactNode; right?: boolean }) => (
    <TableHead className={cn(right && "text-right")}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => sortBy(k)}>
        {children}
        {sortKey === k ? (sortDesc ? "↓" : "↑") : ""}
      </button>
    </TableHead>
  );

  const trendPoints = trends?.points ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Financial Reports</h2>
        <p className="text-sm text-muted-foreground">
          All totals are calculated on the server. Paid amounts use the payment date; requested amounts are never counted as spending.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          <div className="space-y-1">
            <Label className="text-xs">Department</Label>
            <select
              className={selectClass}
              value={filters.departmentId}
              onChange={(e) => setFilters({ departmentId: e.target.value, classification: e.target.value ? "department" : filters.classification })}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <select
              className={selectClass}
              value={filters.classification}
              onChange={(e) => {
                const classification = e.target.value as Filters["classification"];
                setFilters({ classification, departmentId: classification === "personal" ? "" : filters.departmentId });
              }}
            >
              <option value="">Departments and Personal Use</option>
              <option value="department">Departments only</option>
              <option value="personal">Personal Use only</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Year</Label>
            <select className={selectClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="finFrom" className="text-xs">From</Label>
              <Input id="finFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="finTo" className="text-xs">To</Label>
              <Input id="finTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-40" />
            </div>
            {summary && (
              <CsvButton
                name={`finance-summary-${from}-to-${to}`}
                rows={[
                  ["Measure", "Value"],
                  ["Period from", summary.from.slice(0, 10)],
                  ["Period to", summary.to.slice(0, 10)],
                  ["Paid in period", summary.paidInPeriod],
                  ["  of which departments", summary.paidDepartmentInPeriod],
                  ["  of which Personal Use", summary.paidPersonalUseInPeriod],
                  ["Payments made", summary.paidCountInPeriod],
                  ["Average payment", summary.averagePaidInPeriod],
                  ["Requests submitted", summary.submittedCountInPeriod],
                  ["Amount requested", summary.requestedInPeriod],
                  ["Requests approved", summary.approvedCountInPeriod],
                  ["Amount approved", summary.approvedInPeriod],
                  ["Requests rejected", summary.rejectedCountInPeriod],
                  ["Approved, not paid (now)", summary.approvedNotPaidNow],
                  ["Pending approval (now)", summary.pendingApprovalNow],
                  ["Under review (now)", summary.underReviewNow],
                  [`Total active budget ${summary.budgetYear}`, summary.totalActiveAnnualBudget],
                  ["Budget utilisation %", pct(summary.budgetUtilisationPercent)],
                  ["Departments near limit", summary.departmentsNearLimit],
                  ["Departments over budget", summary.departmentsOverBudget],
                ]}
              />
            )}
          </div>

          {!summary ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  label="Paid in period"
                  value={formatMoney(summary.paidInPeriod)}
                  sub={`${summary.paidCountInPeriod} payments · avg ${formatMoney(summary.averagePaidInPeriod)}`}
                />
                <Kpi label="Approved, not yet paid" value={formatMoney(summary.approvedNotPaidNow)} sub={`${summary.approvedNotPaidCountNow} requests (now)`} />
                <Kpi label="Awaiting final approval" value={formatMoney(summary.pendingApprovalNow)} sub={`${summary.pendingApprovalCountNow} requests (now)`} />
                <Kpi label="Under review" value={formatMoney(summary.underReviewNow)} sub={`${summary.underReviewCountNow} requests (now)`} />
                <Kpi label="Requests submitted" value={String(summary.submittedCountInPeriod)} sub={`${formatMoney(summary.requestedInPeriod)} requested`} />
                <Kpi label="Approved in period" value={String(summary.approvedCountInPeriod)} sub={formatMoney(summary.approvedInPeriod)} />
                <Kpi label="Rejected in period" value={String(summary.rejectedCountInPeriod)} />
                <Kpi
                  label={`Budget used (${summary.budgetYear})`}
                  value={formatPercent(summary.budgetUtilisationPercent)}
                  sub={`${formatMoney(summary.departmentPaidThisYear + summary.departmentCommittedThisYear)} of ${formatMoney(summary.totalActiveAnnualBudget)}`}
                  tone={(summary.budgetUtilisationPercent ?? 0) > 100 ? "danger" : (summary.budgetUtilisationPercent ?? 0) >= summary.warningThresholdPercent ? "warning" : undefined}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi label="Department spending (paid)" value={formatMoney(summary.paidDepartmentInPeriod)} />
                <Kpi label="Personal Use (paid)" value={formatMoney(summary.paidPersonalUseInPeriod)} />
                <Kpi
                  label="Departments needing attention"
                  value={`${summary.departmentsOverBudget} over · ${summary.departmentsNearLimit} near limit`}
                  sub={`of ${summary.activeDepartmentCount} active · warning at ${summary.warningThresholdPercent}%`}
                  tone={summary.departmentsOverBudget > 0 ? "danger" : summary.departmentsNearLimit > 0 ? "warning" : undefined}
                />
              </div>

              {summary.unlinkedLegacyRequestCount > 0 && (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                  {summary.unlinkedLegacyRequestCount} older request{summary.unlinkedLegacyRequestCount === 1 ? " has" : "s have"} a typed
                  department name and {summary.unlinkedLegacyRequestCount === 1 ? "is" : "are"} not counted against any budget until linked
                  (Departments → Needs linking).
                </p>
              )}

              <Definitions items={summary.definitions} />
            </>
          )}
        </TabsContent>

        {/* ------------------------------------------------ Monthly */}
        <TabsContent value="monthly" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Month</Label>
              <select className={selectClass} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            {monthly && (
              <CsvButton
                name={`finance-monthly-${monthly.year}-${String(monthly.month).padStart(2, "0")}`}
                rows={[
                  ["Department", "Personal Use", "Payments", "Amount paid"],
                  ...monthly.paidByDepartment.map((r) => [r.label, r.isPersonalUse ? "Yes" : "No", r.count, r.amount]),
                  ["Total", "", monthly.paidCount, monthly.paidTotal],
                ]}
              />
            )}
          </div>

          {!monthly ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  label={`Paid in ${monthly.monthLabel}`}
                  value={formatMoney(monthly.paidTotal)}
                  sub={
                    monthly.paidChangePercent === null ? (
                      `Last month ${formatMoney(monthly.previousMonthPaidTotal)}`
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {monthly.paidChangePercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {formatPercent(Math.abs(monthly.paidChangePercent))} vs last month ({formatMoney(monthly.previousMonthPaidTotal)})
                      </span>
                    )
                  }
                />
                <Kpi label="Approved this month" value={formatMoney(monthly.approvedTotal)} sub={`${monthly.approvedCount} requests`} />
                <Kpi label="Requested this month" value={formatMoney(monthly.requestedTotal)} sub={`${monthly.requestedCount} requests`} />
                <Kpi
                  label="Awaiting payment at month end"
                  value={String(monthly.awaitingPaymentCount)}
                  sub={formatMoney(monthly.awaitingPaymentAmount)}
                />
                <Kpi label="Payments made" value={String(monthly.paidCount)} sub={`avg ${formatMoney(monthly.averagePaid)}`} />
                <Kpi
                  label="Largest payment"
                  value={monthly.largestPaid ? formatMoney(monthly.largestPaid.amount) : "-"}
                  sub={monthly.largestPaid ? `${monthly.largestPaid.requestNumber} · ${monthly.largestPaid.department}` : undefined}
                />
                <Kpi label="Departments (paid)" value={formatMoney(monthly.paidDepartmentTotal)} />
                <Kpi label="Personal Use (paid)" value={formatMoney(monthly.paidPersonalUseTotal)} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Paid by department · {monthly.monthLabel}</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthly.paidByDepartment.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nothing was paid this month.</p>
                  ) : (
                    <ChartContainer config={byDeptConfig} className="w-full" style={{ height: Math.max(160, monthly.paidByDepartment.length * 36) }}>
                      <BarChart data={monthly.paidByDepartment} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={compactMoney} />
                        <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={130} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Definitions items={monthly.definitions} />
            </>
          )}
        </TabsContent>

        {/* ------------------------------------------------ Departments */}
        <TabsContent value="departments" className="mt-4 space-y-4">
          {!byDept ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {byDept.year}: departments {formatMoney(byDept.departmentPaidTotal)} · Personal Use {formatMoney(byDept.personalUsePaidTotal)} ·
                  total paid {formatMoney(byDept.paidTotal)}
                </p>
                <CsvButton
                  name={`finance-departments-${byDept.year}`}
                  rows={[
                    ["Department", "Type", "Active", "Annual budget", "Paid", "Approved not paid", "Pending", "Remaining", "Utilisation %", "Requests", "Payments", "Average paid", "Largest paid", "Rejected"],
                    ...sortedDeptRows.map((r) => [
                      r.department,
                      r.isPersonalUse ? "Personal Use" : r.isLegacyUnlinked ? "Not linked" : "Department",
                      r.isActive ? "Yes" : "No",
                      r.annualBudget ?? "",
                      r.paid,
                      r.committed,
                      r.pending,
                      r.remaining ?? "",
                      pct(r.utilisationPercent),
                      r.requestCount,
                      r.paidCount,
                      r.averagePaid,
                      r.largestPaid,
                      r.rejectedCount,
                    ]),
                  ]}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead k="department">Department</SortHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <SortHead k="paid" right>Paid</SortHead>
                      <TableHead className="text-right">Approved, unpaid</TableHead>
                      <SortHead k="pending" right>Pending</SortHead>
                      <SortHead k="remaining" right>Remaining</SortHead>
                      <SortHead k="utilisation" right>Used</SortHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Avg / largest paid</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDeptRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No spending recorded for {byDept.year}.</TableCell>
                      </TableRow>
                    )}
                    {sortedDeptRows.map((r) => (
                      <TableRow key={r.key} className={cn(r.isOverBudget && "bg-destructive/5")}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5 font-medium">
                            {r.department}
                            {r.isPersonalUse && <Badge variant="outline">Personal Use</Badge>}
                            {!r.isActive && <Badge variant="outline">Inactive</Badge>}
                            {r.isHighestPaid && <Badge variant="secondary">Highest spend</Badge>}
                            {r.isHighestUtilisation && <Badge variant="secondary">Highest % used</Badge>}
                            {r.isOverBudget && <Badge variant="destructive">Over budget</Badge>}
                            {r.isNearLimit && <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">Near limit</Badge>}
                            {r.hasHighPending && <Badge variant="outline">High pending</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.annualBudget === null ? "-" : formatMoney(r.annualBudget)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(r.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(r.committed)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(r.pending)}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", (r.remaining ?? 0) < 0 && "font-medium text-destructive")}>
                          {r.remaining === null ? "-" : formatMoney(r.remaining)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatPercent(r.utilisationPercent)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.requestCount}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMoney(r.averagePaid)} / {formatMoney(r.largestPaid)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.rejectedCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Definitions items={byDept.definitions} />
            </>
          )}
        </TabsContent>

        {/* ------------------------------------------------ Trends */}
        <TabsContent value="trends" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Period</Label>
              <select className={selectClass} value={trendMonths} onChange={(e) => setTrendMonths(Number(e.target.value))}>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
                <option value={24}>Last 24 months</option>
              </select>
            </div>
            {trends && (
              <CsvButton
                name={`finance-trends-${trendMonths}m`}
                rows={[
                  ["Month", "Paid", "Paid departments", "Paid Personal Use", "Payments", "Average payment", "Requests submitted", "Requested", "YTD budget used %", ...trends.byDepartment.map((d) => `Paid: ${d.label}`)],
                  ...trendPoints.map((p, i) => [
                    p.monthLabel,
                    p.paid,
                    p.paidDepartment,
                    p.paidPersonalUse,
                    p.paidCount,
                    p.averagePaid,
                    p.submittedCount,
                    p.requested,
                    pct(p.yearToDateUtilisationPercent),
                    ...trends.byDepartment.map((d) => d.paidByMonth[i] ?? 0),
                  ]),
                ]}
              />
            )}
          </div>

          {!trends ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Monthly expenditure (paid)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={trendConfig} className="h-64 w-full">
                    <BarChart data={trendPoints}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={compactMoney} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="paidDepartment" stackId="paid" fill="var(--color-paidDepartment)" />
                      <Bar dataKey="paidPersonalUse" stackId="paid" fill="var(--color-paidPersonalUse)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Number of requests and payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={countConfig} className="h-56 w-full">
                    <LineChart data={trendPoints}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line dataKey="submittedCount" stroke="var(--color-submittedCount)" strokeWidth={2} dot={false} />
                      <Line dataKey="paidCount" stroke="var(--color-paidCount)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Average payment and budget used</CardTitle>
                  <CardDescription>Budget used is year to date, so it resets each January.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={avgConfig} className="h-56 w-full">
                    <LineChart data={trendPoints}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="money" tickLine={false} axisLine={false} width={60} tickFormatter={compactMoney} />
                      <YAxis yAxisId="pct" orientation="right" tickLine={false} axisLine={false} width={40} unit="%" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line yAxisId="money" dataKey="averagePaid" stroke="var(--color-averagePaid)" strokeWidth={2} dot={false} />
                      <Line yAxisId="pct" dataKey="yearToDateUtilisationPercent" stroke="var(--color-yearToDateUtilisationPercent)" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {trends.byDepartment.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Spending by department over time</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          {trendPoints.map((p) => (
                            <TableHead key={p.monthLabel} className="text-right text-xs">{p.monthLabel}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trends.byDepartment.map((d) => (
                          <TableRow key={d.key}>
                            <TableCell className="font-medium">{d.label}</TableCell>
                            {d.paidByMonth.map((v, i) => (
                              <TableCell key={i} className="text-right text-xs tabular-nums">{v ? compactMoney(v) : "-"}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="lg:col-span-2">
                <Definitions items={trends.definitions} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------ Workflow */}
        <TabsContent value="workflow" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Flag as stale after</Label>
              <select className={selectClass} value={staleDays} onChange={(e) => setStaleDays(Number(e.target.value))}>
                {[3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </div>
            {workflow && (
              <CsvButton
                name="finance-workflow"
                rows={[
                  ["Request", "Payee", "Department", "Stage", "Waiting for", "Amount", "In stage since", "Days", "Stale"],
                  ...workflow.awaitingAction.map((a) => [
                    a.requestNumber,
                    a.payeeName,
                    a.department,
                    a.statusName,
                    a.waitingFor,
                    a.amount,
                    a.inStatusSince.slice(0, 10),
                    a.daysInStatus,
                    a.isStale ? "Yes" : "No",
                  ]),
                ]}
              />
            )}
          </div>

          {!workflow ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {workflow.byStatus.map((s) => (
                  <Kpi key={s.status} label={s.statusName} value={String(s.count)} sub={formatMoney(s.amount)} />
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi
                  label="Average time under review"
                  value={workflow.averageDaysUnderReview === null ? "-" : `${workflow.averageDaysUnderReview} days`}
                  sub={`from ${workflow.underReviewSampleSize} request${workflow.underReviewSampleSize === 1 ? "" : "s"}`}
                />
                <Kpi
                  label="Submission to final approval"
                  value={workflow.averageDaysSubmissionToApproval === null ? "-" : `${workflow.averageDaysSubmissionToApproval} days`}
                  sub={`from ${workflow.submissionToApprovalSampleSize}`}
                />
                <Kpi
                  label="Approval to payment"
                  value={workflow.averageDaysApprovalToPayment === null ? "-" : `${workflow.averageDaysApprovalToPayment} days`}
                  sub={`from ${workflow.approvalToPaymentSampleSize}`}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Waiting for action ({workflow.awaitingAction.length}){workflow.staleCount > 0 ? ` · ${workflow.staleCount} stale` : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {workflow.awaitingAction.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nothing is waiting.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Waiting for</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Days in stage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workflow.awaitingAction.map((a) => (
                          <TableRow key={a.id} className={cn(a.isStale && "bg-destructive/5")}>
                            <TableCell>
                              <div className="font-medium">{a.requestNumber}</div>
                              <div className="text-xs text-muted-foreground">{a.payeeName}</div>
                            </TableCell>
                            <TableCell>{a.department}</TableCell>
                            <TableCell>
                              {a.waitingFor}
                              <span className="block text-xs text-muted-foreground">{a.statusName} since {formatDay(a.inStatusSince)}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatMoney(a.amount)}</TableCell>
                            <TableCell className={cn("text-right tabular-nums", a.isStale && "font-medium text-destructive")}>{a.daysInStatus}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              <Definitions items={workflow.definitions} />
            </>
          )}
        </TabsContent>

        {/* ------------------------------------------------ Forecast */}
        <TabsContent value="forecast" className="mt-4 space-y-4">
          <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Forecasts are estimates based on spending so far, not confirmed expenses. They are only shown where there is enough data.
          </p>
          {!forecast ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Outstanding approved commitments" value={formatMoney(forecast.outstandingApprovedCommitments)} />
                <Kpi label="Paid this month" value={formatMoney(forecast.paidThisMonth)} />
                <Kpi label="Paid last month" value={formatMoney(forecast.paidPreviousMonth)} />
                <Kpi label="Same month last year" value={formatMoney(forecast.paidSameMonthLastYear)} />
              </div>

              <div className="flex justify-end">
                <CsvButton
                  name={`finance-forecast-${forecast.year}`}
                  rows={[
                    ["Department", "Budget", "Paid YTD", "Approved not paid", "Pending", "Projected year end (estimate)", "Projected overrun", "Budget runs out", "Remaining if pending approved", "Rising spend", "Reliable"],
                    ...forecast.departments.map((f) => [
                      f.department,
                      f.annualBudget ?? "",
                      f.paidYearToDate,
                      f.committed,
                      f.pending,
                      f.projectedYearEnd ?? "",
                      f.projectedOverrun ?? "",
                      f.projectedExhaustionMonth ?? "",
                      f.remainingIfPendingApproved ?? "",
                      f.isIncreasing ? "Yes" : "No",
                      f.isReliable ? "Yes" : f.reliabilityNote ?? "No",
                    ]),
                  ]}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Paid + approved so far</TableHead>
                      <TableHead className="text-right">Projected year end (est.)</TableHead>
                      <TableHead>Budget runs out (est.)</TableHead>
                      <TableHead className="text-right">If all pending approved</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.departments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No active departments.</TableCell>
                      </TableRow>
                    )}
                    {forecast.departments.map((f) => (
                      <TableRow key={f.key}>
                        <TableCell className="font-medium">{f.department}</TableCell>
                        <TableCell className="text-right tabular-nums">{f.annualBudget === null ? "-" : formatMoney(f.annualBudget)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(f.paidYearToDate + f.committed)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.isReliable ? (
                            <span className={cn((f.projectedOverrun ?? 0) > 0 && "font-medium text-destructive")}>
                              {formatMoney(f.projectedYearEnd)}
                              {(f.projectedOverrun ?? 0) > 0 && <span className="block text-xs">over by {formatMoney(f.projectedOverrun)}</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{f.reliabilityNote}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{f.isReliable ? f.projectedExhaustionMonth ?? "Not this year" : "-"}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", f.wouldOverrunIfPendingApproved && "font-medium text-destructive")}>
                          {formatMoney(f.remainingIfPendingApproved)} left
                        </TableCell>
                        <TableCell>
                          {f.isIncreasing ? (
                            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">Rising</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Steady</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {forecast.unusualReimbursements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Unusually large payments (last 12 months)</CardTitle>
                    <CardDescription>Large is not necessarily wrong; these are worth a second look.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {forecast.unusualReimbursements.map((u) => (
                      <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3 text-sm">
                        <div>
                          <p className="font-medium">{u.requestNumber} · {u.department}</p>
                          <p className="text-xs text-muted-foreground">{u.payeeName} · {u.reason}</p>
                        </div>
                        <p className="font-semibold tabular-nums">{formatMoney(u.amount)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Definitions items={forecast.definitions} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
