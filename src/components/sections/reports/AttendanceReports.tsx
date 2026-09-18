import { useEffect, useState } from "react";
import {
  apiGet,
  unwrap,
  type DemographicsDto,
  type FirstTimerConversionDto,
  type MonthlyGrowthDto,
  type PreacherImpactDto,
  type ServiceComparisonDto,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const growthConfig = {
  totalAttendance: { label: "Attendance", color: "var(--chart-1)" },
} satisfies ChartConfig;

const serviceTypeConfig = {
  totalAttendance: { label: "Total Attendance", color: "var(--chart-1)" },
} satisfies ChartConfig;

const onlinePhysicalConfig = {
  totalOnline: { label: "Online", color: "var(--chart-2)" },
  totalPhysical: { label: "Physical", color: "var(--chart-1)" },
} satisfies ChartConfig;

const demographicsConfig = {
  men: { label: "Men", color: "var(--chart-1)" },
  women: { label: "Women", color: "var(--chart-2)" },
  children: { label: "Children", color: "var(--chart-3)" },
} satisfies ChartConfig;

const preacherConfig = {
  totalAttendance: { label: "Total Attendance", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function AttendanceReports() {
  const [growth, setGrowth] = useState<MonthlyGrowthDto[] | null>(null);
  const [comparison, setComparison] = useState<ServiceComparisonDto | null>(null);
  const [demographics, setDemographics] = useState<DemographicsDto | null>(null);
  const [conversion, setConversion] = useState<FirstTimerConversionDto | null>(null);
  const [preachers, setPreachers] = useState<PreacherImpactDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [growthData, comparisonData, demographicsData, conversionData, preacherData] = await Promise.all([
        apiGet<MonthlyGrowthDto[]>("/api/Reports/Attendance/monthly-growth?months=12"),
        apiGet<ServiceComparisonDto>("/api/Reports/Attendance/service-comparison"),
        apiGet<DemographicsDto>("/api/Reports/Attendance/demographics"),
        apiGet<FirstTimerConversionDto>("/api/Reports/Attendance/first-timer-conversion"),
        apiGet<PreacherImpactDto[]>("/api/Reports/Attendance/preacher-impact"),
      ]);

      if (cancelled) return;
      setGrowth(growthData ? unwrap<MonthlyGrowthDto>(growthData) : []);
      setComparison(comparisonData);
      setDemographics(demographicsData);
      setConversion(conversionData);
      setPreachers(preacherData ? unwrap<PreacherImpactDto>(preacherData) : []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const latestGrowth = growth && growth.length > 0 ? growth[growth.length - 1] : null;
  const byServiceType = comparison ? unwrap(comparison.byServiceType) : [];
  const onlineVsPhysical = comparison ? unwrap(comparison.onlineVsPhysicalByMonth) : [];

  const demographicsData = demographics
    ? [
        { key: "men", label: "Men", value: demographics.totalMen, fill: "var(--chart-1)" },
        { key: "women", label: "Women", value: demographics.totalWomen, fill: "var(--chart-2)" },
        { key: "children", label: "Children", value: demographics.totalChildren, fill: "var(--chart-3)" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Monthly Attendance Growth</CardTitle>
          {latestGrowth && latestGrowth.percentChangeFromPreviousMonth !== null && (
            <Badge
              variant="outline"
              className={
                latestGrowth.percentChangeFromPreviousMonth < 0
                  ? "text-red-600 border-red-200"
                  : "text-green-600 border-green-200"
              }
            >
              {latestGrowth.percentChangeFromPreviousMonth < 0 ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <ArrowUp className="h-3 w-3" />
              )}
              {latestGrowth.percentChangeFromPreviousMonth.toFixed(1)}% vs previous month
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {!growth ? (
            <Skeleton className="h-64 w-full" />
          ) : growth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No attendance data yet.</p>
          ) : (
            <ChartContainer config={growthConfig} className="h-64 w-full">
              <BarChart data={growth}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="totalAttendance" fill="var(--color-totalAttendance)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            {!comparison ? (
              <Skeleton className="h-56 w-full" />
            ) : byServiceType.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No service data yet.</p>
            ) : (
              <ChartContainer config={serviceTypeConfig} className="h-56 w-full">
                <BarChart data={byServiceType} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis dataKey="serviceType" type="category" tickLine={false} axisLine={false} width={70} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalAttendance" fill="var(--color-totalAttendance)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Online vs Physical Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {!comparison ? (
              <Skeleton className="h-56 w-full" />
            ) : onlineVsPhysical.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
            ) : (
              <ChartContainer config={onlinePhysicalConfig} className="h-56 w-full">
                <LineChart data={onlineVsPhysical}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="totalPhysical" stroke="var(--color-totalPhysical)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="totalOnline" stroke="var(--color-totalOnline)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            {!demographics ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ChartContainer config={demographicsConfig} className="h-56 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                  <Pie data={demographicsData} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80}>
                    {demographicsData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="label" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">First-Timer Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            {!conversion ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-4 py-4 text-center">
                <div>
                  <div className="text-2xl font-semibold">{conversion.totalFirstTimers}</div>
                  <div className="text-xs text-muted-foreground mt-1">First Timers</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold">{conversion.totalNewConverts}</div>
                  <div className="text-xs text-muted-foreground mt-1">New Converts</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold">{conversion.conversionRatePercent.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Conversion Rate</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preacher Impact</CardTitle>
        </CardHeader>
        <CardContent>
          {!preachers ? (
            <Skeleton className="h-48 w-full" />
          ) : preachers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No preacher data yet.</p>
          ) : (
            <ChartContainer config={preacherConfig} className="w-full" style={{ height: Math.max(160, preachers.length * 44) }}>
              <BarChart data={preachers} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis dataKey="preacher" type="category" tickLine={false} axisLine={false} width={110} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="totalAttendance" fill="var(--color-totalAttendance)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
