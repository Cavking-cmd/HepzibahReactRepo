import { useEffect, useState } from "react";
import { apiGet, unwrap, type DashboardAlertDto, type DashboardSummaryDto } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/CountUp";
import { AlertTriangle, ArrowDown, ArrowUp, CalendarCheck2, Home, ShieldCheck, Wallet } from "lucide-react";

interface OverviewSectionProps {
  onNavigate?: (section: string) => void;
}

export function OverviewSection({ onNavigate }: OverviewSectionProps) {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await apiGet<DashboardSummaryDto>("/api/Reports/Dashboard/summary");
      if (!cancelled) setSummary(data);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const growth = summary?.growthVsLastMonthPercent ?? null;
  const alerts = summary ? unwrap<DashboardAlertDto>(summary.alerts) : [];

  const cards = [
    {
      label: "Total Attendance This Month",
      value: summary?.totalAttendanceThisMonth ?? 0,
      icon: CalendarCheck2,
      formatter: (n: number) => n.toLocaleString(),
    },
    {
      label: "Active Fellowship Centers",
      value: summary?.totalActiveFellowshipCenters ?? 0,
      icon: Home,
      formatter: (n: number) => n.toLocaleString(),
    },
    {
      label: "Total Asset Value",
      value: summary?.totalAssetValue ?? 0,
      icon: Wallet,
      formatter: (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">A snapshot of the church's current records.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationFillMode: "backwards" }}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attendance This Month</CardTitle>
            <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {summary ? <CountUp value={summary.totalAttendanceThisMonth} formatter={(n) => n.toLocaleString()} /> : "-"}
            </div>
          </CardContent>
        </Card>

        <Card
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Growth vs Last Month</CardTitle>
            {growth !== null && growth < 0 ? (
              <ArrowDown className="h-4 w-4 text-red-600" />
            ) : (
              <ArrowUp className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-semibold tracking-tight ${
                growth === null ? "" : growth < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {summary ? (growth === null ? "N/A" : <CountUp value={growth} formatter={(n) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`} />) : "-"}
            </div>
          </CardContent>
        </Card>

        {cards.slice(1).map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: `${(idx + 2) * 80}ms`, animationFillMode: "backwards" }}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">
                  {summary ? <CountUp value={card.value} formatter={card.formatter} /> : "-"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary ? (
            <p className="text-sm text-muted-foreground">Loading alerts…</p>
          ) : alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              No alerts - everything looks healthy.
            </div>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert, idx) => {
                const isInventory = alert.type === "InventoryReplacement";
                const body = (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">{alert.type}</div>
                      <div className="text-muted-foreground">{alert.message}</div>
                    </div>
                  </>
                );
                return isInventory && onNavigate ? (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => onNavigate("inventory")}
                      className="flex w-full items-start gap-2 rounded-md border p-3 text-sm text-left hover:bg-muted transition-colors cursor-pointer"
                      title="Open inventory list"
                    >
                      {body}
                    </button>
                  </li>
                ) : (
                  <li key={idx} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                    {body}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
