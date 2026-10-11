import { useEffect, useRef, useState } from "react";
import {
  apiGet,
  unwrap,
  type DemographicsDto,
  type FirstTimerConversionDto,
  type MonthOptionDto,
  type MonthlyGrowthDto,
  type MonthServiceAttendanceDto,
  type OnlineVsPhysicalDto,
  type PreacherImpactDto,
  type ServiceComparisonDto,
  type ServiceTypeComparisonDto,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const serviceTypeLabelMap: Record<string, string> = {
  SundayService: "Sunday Service",
  WednesdayBibleStudy: "Wednesday Bible Study",
  Rodah: "Rodah",
  Special: "Special",
};

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

const currentMonthTotalConfig = {
  total: { label: "Total Attendance", color: "var(--chart-1)" },
} satisfies ChartConfig;

const currentMonthOnlinePhysicalConfig = {
  online: { label: "Online", color: "var(--chart-2)" },
  physical: { label: "Physical", color: "var(--chart-1)" },
} satisfies ChartConfig;

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabelOf(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function AttendanceReports() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;
  const currentKey = monthKey(currentYear, currentMonthNum);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [months, setMonths] = useState<MonthOptionDto[]>([]);

  const [growth, setGrowth] = useState<MonthlyGrowthDto[] | null>(null);
  const [comparison, setComparison] = useState<ServiceComparisonDto | null>(null);
  const [monthReport, setMonthReport] =
    useState<MonthServiceAttendanceDto | null>(null);
  const [demographics, setDemographics] = useState<DemographicsDto | null>(null);
  const [conversion, setConversion] = useState<FirstTimerConversionDto | null>(
    null
  );
  const [preachers, setPreachers] = useState<PreacherImpactDto[] | null>(null);

  const growthRef = useRef<HTMLDivElement | null>(null);
  const serviceTypeRef = useRef<HTMLDivElement | null>(null);
  const onlinePhysicalRef = useRef<HTMLDivElement | null>(null);
  const demographicsRef = useRef<HTMLDivElement | null>(null);
  const conversionRef = useRef<HTMLDivElement | null>(null);
  const preacherRef = useRef<HTMLDivElement | null>(null);

  const selectedKey = monthKey(selectedYear, selectedMonth);
  const selectedLabel = monthLabelOf(selectedYear, selectedMonth);
  const isCurrentMonth = selectedKey === currentKey;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const startDate = `${selectedKey}-01`;
      const endDate = `${selectedKey}-${String(
        lastDayOfMonth(selectedYear, selectedMonth)
      ).padStart(2, "0")}T23:59:59`;

      const [
        growthData,
        monthsData,
        comparisonData,
        monthData,
        demographicsData,
        conversionData,
        preacherData,
      ] = await Promise.all([
        apiGet<MonthlyGrowthDto[]>(
          "/api/Reports/Attendance/monthly-growth?months=12"
        ),
        apiGet<MonthOptionDto[]>("/api/Reports/Attendance/available-months"),
        apiGet<ServiceComparisonDto>(
          `/api/Reports/Attendance/service-comparison?month=${selectedKey}`
        ),
        apiGet<MonthServiceAttendanceDto>(
          `/api/Reports/Attendance/month-by-service?month=${selectedKey}`
        ),
        apiGet<DemographicsDto>(
          `/api/Reports/Attendance/demographics?startDate=${startDate}&endDate=${endDate}`
        ),
        apiGet<FirstTimerConversionDto>(
          `/api/Reports/Attendance/first-timer-conversion?month=${selectedKey}`
        ),
        apiGet<PreacherImpactDto[]>(
          `/api/Reports/Attendance/preacher-impact?month=${selectedKey}`
        ),
      ]);

      if (cancelled) return;

      setGrowth(growthData ? unwrap<MonthlyGrowthDto>(growthData) : []);
      setMonths(monthsData ? unwrap<MonthOptionDto>(monthsData) : []);
      setComparison(comparisonData);
      setMonthReport(monthData);
      setDemographics(demographicsData);
      setConversion(conversionData);
      setPreachers(preacherData ? unwrap<PreacherImpactDto>(preacherData) : []);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedYear, selectedMonth, selectedKey]);

  function stepMonth(delta: number) {
    const d = new Date(selectedYear, selectedMonth - 1 + delta, 1);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth() + 1);
  }

  function selectMonth(key: string | null) {
    if (!key) return;

    const [y, m] = key.split("-").map(Number);
    setSelectedYear(y);
    setSelectedMonth(m);
  }

  const monthOptions = months.some(
    (m) => m.year === selectedYear && m.month === selectedMonth
  )
    ? months
    : [
        {
          year: selectedYear,
          month: selectedMonth,
          label: selectedLabel,
        },
        ...months,
      ];

  const latestGrowth =
    growth && growth.length > 0 ? growth[growth.length - 1] : null;

  const byServiceType = comparison
    ? unwrap<ServiceTypeComparisonDto>(comparison.byServiceType).map((row) => ({
        ...row,
        serviceType: serviceTypeLabelMap[row.serviceType] ?? row.serviceType,
      }))
    : [];

  const onlineVsPhysical = comparison
    ? unwrap<OnlineVsPhysicalDto>(comparison.onlineVsPhysicalByMonth)
    : [];

  const monthServices = monthReport?.services ?? [];

  const demographicsData = demographics
    ? [
        {
          key: "men",
          label: "Men",
          value: demographics.totalMen,
          fill: "var(--chart-1)",
        },
        {
          key: "women",
          label: "Women",
          value: demographics.totalWomen,
          fill: "var(--chart-2)",
        },
        {
          key: "children",
          label: "Children",
          value: demographics.totalChildren,
          fill: "var(--chart-3)",
        },
      ]
    : [];

  const demographicsEmpty =
    demographics !== null &&
    demographics.totalMen +
      demographics.totalWomen +
      demographics.totalChildren ===
      0;

  const monthHasData =
    monthServices.length > 0 ||
    byServiceType.length > 0 ||
    onlineVsPhysical.some(
      (row) => row.totalOnline + row.totalPhysical > 0
    ) ||
    !demographicsEmpty;

  const lastDataMonth =
    months.length > 0 ? months[months.length - 1] : null;

  const showEmptyMonthHint =
    isCurrentMonth && !monthHasData && lastDataMonth !== null;

  // Download shell disabled for now; see ChartDownloadMenu usages below to re-enable.
  // const growthCsvRows = [
  //   ["Month", "Total Attendance", "% Change vs Prev. Month"],
  //   ...(growth ?? []).map((g) => [
  //     g.monthLabel,
  //     g.totalAttendance,
  //     g.percentChangeFromPreviousMonth ?? "N/A",
  //   ]),
  // ];

  // const serviceTypeCsvRows = [
  //   ["Service Type", "Total Attendance", "Average Attendance", "Record Count"],
  //   ...byServiceType.map((row) => [
  //     row.serviceType,
  //     row.totalAttendance,
  //     row.averageAttendance,
  //     row.recordCount,
  //   ]),
  // ];

  // const onlinePhysicalCsvRows = [
  //   ["Month", "Online", "Physical"],
  //   ...onlineVsPhysical.map((row) => [
  //     row.monthLabel,
  //     row.totalOnline,
  //     row.totalPhysical,
  //   ]),
  // ];

  // const demographicsCsvRows = [
  //   ["Demographic", "Count"],
  //   ...demographicsData.map((row) => [row.label, row.value]),
  // ];

  // const conversionCsvRows = conversion
  //   ? [
  //       ["Metric", "Value"],
  //       ["First Timers", conversion.totalFirstTimers],
  //       ["New Converts", conversion.totalNewConverts],
  //       ["Conversion Rate (%)", conversion.conversionRatePercent.toFixed(1)],
  //     ]
  //   : [["Metric", "Value"]];

  // const preacherCsvRows = [
  //   ["Preacher", "Total Attendance"],
  //   ...(preachers ?? []).map((row) => [row.preacher, row.totalAttendance]),
  // ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => stepMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select value={selectedKey} onValueChange={selectMonth}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder={selectedLabel} />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem
                  key={monthKey(m.year, m.month)}
                  value={monthKey(m.year, m.month)}
                >
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => stepMonth(1)}
            aria-label="Next month"
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{selectedLabel}</span>
          {isCurrentMonth && <Badge variant="outline">Current Month</Badge>}
        </div>
      </div>

      {showEmptyMonthHint && lastDataMonth && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm">
          <p className="text-muted-foreground">
            No attendance recorded in {selectedLabel} yet. Past months with
            data are ready to view.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              selectMonth(monthKey(lastDataMonth.year, lastDataMonth.month))
            }
          >
            View {lastDataMonth.label}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Monthly Attendance Growth</CardTitle>
          <div className="flex items-center gap-2">
            {latestGrowth &&
              latestGrowth.percentChangeFromPreviousMonth !== null && (
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
                  {latestGrowth.percentChangeFromPreviousMonth.toFixed(1)}% vs
                  previous month
                </Badge>
              )}
            {/* <ChartDownloadMenu fileNameBase="monthly-attendance-growth" chartRef={growthRef} csvRows={growthCsvRows} /> */}
          </div>
        </CardHeader>

        <CardContent>
          {!growth ? (
            <Skeleton className="h-64 w-full" />
          ) : growth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No attendance data yet.
            </p>
          ) : (
            <div ref={growthRef} className="w-full">
              <ChartContainer config={growthConfig} className="h-64 w-full">
                <BarChart data={growth}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="totalAttendance"
                    fill="var(--color-totalAttendance)"
                    radius={4}
                  />
                </
