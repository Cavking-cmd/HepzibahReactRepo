import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  apiGet,
  apiList,
  SERVICE_TYPE_NAMES,
  unwrap,
  type AttendanceDto,
  type DemographicsDto,
  type FirstTimerConversionDto,
  type MonthOptionDto,
  type MonthlyGrowthDto,
  type MonthServiceAttendanceDto,
  type OnlineVsPhysicalDto,
  type PreacherImpactDto,
  type ServiceComparisonDto,
  type ServiceDto,
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
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileDown,
  ImageDown,
  Loader2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { downloadImagePdf, downloadTablePdf } from "@/lib/pdf";
import { captureElementAsJpeg } from "@/lib/export";
import {
  ServiceDetailsTable,
  type ServiceDetailRow,
  type ServiceRecordStatus,
} from "./ServiceDetailsTable";
import { formatReportDate } from "@/lib/report-format";

const serviceTypeLabelMap: Record<string, string> = {
  SundayService: "Sunday Service",
  WednesdayBibleStudy: "Wednesday Bible Study",
  Rodah: "Rodah",
  Special: "Special",
};

const serviceTypeShortMap: Record<string, string> = {
  "Sunday Service": "Sunday",
  "Wednesday Bible Study": "Bible Study",
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

const serviceBreakdownConfig = {
  men: { label: "Men", color: "var(--chart-1)" },
  women: { label: "Women", color: "var(--chart-2)" },
  children: { label: "Children", color: "var(--chart-3)" },
  online: { label: "Online", color: "var(--chart-4)" },
} satisfies ChartConfig;

const serviceDemographicsConfig = {
  men: { label: "Men", color: "var(--chart-1)" },
  women: { label: "Women", color: "var(--chart-2)" },
  children: { label: "Children", color: "var(--chart-3)" },
} satisfies ChartConfig;

const preacherConfig = {
  totalAttendance: { label: "Total Attendance", color: "var(--chart-1)" },
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

function recordStatus(records: AttendanceDto[]): ServiceRecordStatus {
  if (records.length === 0) return "No record";
  if (records.some((record) => record.isLocked)) return "Locked";
  if (records.some((record) => record.isApproved)) return "Approved";
  return "Pending";
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
  const [services, setServices] = useState<ServiceDto[] | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDto[] | null>(null);
  const [exportingCharts, setExportingCharts] = useState(false);

  const growthRef = useRef<HTMLDivElement | null>(null);
  const serviceTypeRef = useRef<HTMLDivElement | null>(null);
  const onlinePhysicalRef = useRef<HTMLDivElement | null>(null);
  const monthServiceRef = useRef<HTMLDivElement | null>(null);
  const monthOnlinePhysicalRef = useRef<HTMLDivElement | null>(null);
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
        attendanceData,
        serviceData,
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
        apiList<AttendanceDto>("/api/Attendance"),
        apiList<ServiceDto>("/api/Service"),
      ]);

      if (cancelled) return;

      setGrowth(growthData ? unwrap<MonthlyGrowthDto>(growthData) : []);
      setMonths(monthsData ? unwrap<MonthOptionDto>(monthsData) : []);
      setComparison(comparisonData);
      setMonthReport(monthData);
      setDemographics(demographicsData);
      setConversion(conversionData);
      setPreachers(preacherData ? unwrap<PreacherImpactDto>(preacherData) : []);
      setAttendanceRecords(attendanceData);
      setServices(serviceData);
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

  const detailedRows: ServiceDetailRow[] | null =
    services && attendanceRecords
      ? services
          .filter((service) => service.date.slice(0, 7) === selectedKey)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((service) => {
            const records = attendanceRecords.filter(
              (record) => record.serviceId === service.id
            );
            const sum = (pick: (record: AttendanceDto) => number) =>
              records.reduce((total, record) => total + pick(record), 0);

            const men = sum((record) => record.men);
            const women = sum((record) => record.women);
            const children = sum((record) => record.children);
            const online = sum((record) => record.onlineAttendance);
            const physical = men + women + children;

            return {
              id: service.id,
              date: service.date,
              serviceType:
                SERVICE_TYPE_NAMES[service.serviceType] ??
                String(service.serviceType),
              theme: service.theme ?? "",
              scriptureText: service.scriptureText ?? "",
              preacher: service.preacher ?? "",
              men,
              women,
              children,
              sundaySchool: sum((record) => record.sundaySchool),
              firstTimers: sum((record) => record.firstTimers),
              newConverts: sum((record) => record.newConverts),
              online,
              physical,
              total: physical + online,
              status: recordStatus(records),
            };
          })
      : null;

  const serviceChartData = (detailedRows ?? []).map((row) => ({
    label: `${formatReportDate(row.date).replace(/ \d{4}$/, "")} - ${
      serviceTypeShortMap[row.serviceType] ?? row.serviceType
    }`,
    men: row.men,
    women: row.women,
    children: row.children,
    online: row.online,
    total: row.total,
  }));

  const hasBreakdownData = serviceChartData.some(
    (row) => row.men + row.women + row.children + row.online > 0
  );

  function handlePrintTablePdf() {
    if (!detailedRows) return;

    const totals = detailedRows.reduce(
      (acc, row) => ({
        men: acc.men + row.men,
        women: acc.women + row.women,
        children: acc.children + row.children,
        sundaySchool: acc.sundaySchool + row.sundaySchool,
        firstTimers: acc.firstTimers + row.firstTimers,
        newConverts: acc.newConverts + row.newConverts,
        online: acc.online + row.online,
        physical: acc.physical + row.physical,
        total: acc.total + row.total,
      }),
      {
        men: 0,
        women: 0,
        children: 0,
        sundaySchool: 0,
        firstTimers: 0,
        newConverts: 0,
        online: 0,
        physical: 0,
        total: 0,
      }
    );

    const rows = detailedRows.map((row) => [
      formatReportDate(row.date),
      row.serviceType,
      row.theme,
      row.scriptureText,
      row.preacher,
      String(row.men),
      String(row.women),
      String(row.children),
      String(row.sundaySchool),
      String(row.firstTimers),
      String(row.newConverts),
      String(row.online),
      String(row.physical),
      String(row.total),
      row.status,
    ]);

    if (rows.length > 0) {
      rows.push([
        "TOTAL",
        "",
        "",
        "",
        "",
        String(totals.men),
        String(totals.women),
        String(totals.children),
        String(totals.sundaySchool),
        String(totals.firstTimers),
        String(totals.newConverts),
        String(totals.online),
        String(totals.physical),
        String(totals.total),
        "",
      ]);
    }

    downloadTablePdf(`attendance-details-${selectedKey}.pdf`, {
      title: "Attendance Report - Service Details",
      subtitle: `${selectedLabel} - ${detailedRows.length} service${
        detailedRows.length === 1 ? "" : "s"
      } - Total attendance ${totals.total}`,
      headers: [
        "Date",
        "Service",
        "Theme",
        "Scripture",
        "Preacher",
        "Men",
        "Women",
        "Children",
        "S. School",
        "First Timers",
        "Converts",
        "Online",
        "Physical",
        "Total",
        "Status",
      ],
      rows,
      widths: [62, 78, 95, 78, 72, 26, 32, 26, 38, 38, 40, 36, 40, 32, 50],
      align: [
        "left",
        "left",
        "left",
        "left",
        "left",
        "right",
        "right",
        "right",
        "right",
        "right",
        "right",
        "right",
        "right",
        "right",
        "left",
      ],
      footerNote:
        "Total = Men + Women + Children + Online. Sunday School is recorded separately.",
    });
  }

  async function handlePrintChartsPdf() {
    setExportingCharts(true);
    try {
      const targets: Array<[string, React.RefObject<HTMLDivElement | null>]> = [
        ["Monthly Attendance Growth", growthRef],
        [`Attendance by Service Type (${selectedLabel})`, serviceTypeRef],
        [`Online vs Physical Attendance (${selectedLabel})`, onlinePhysicalRef],
        [`Attendance Breakdown by Service (${selectedLabel})`, monthServiceRef],
        [`Online vs Physical by Service (${selectedLabel})`, monthOnlinePhysicalRef],
        [`Demographics by Service (${selectedLabel})`, demographicsRef],
        [`Preacher Impact (${selectedLabel})`, preacherRef],
      ];

      const pages: Array<{ caption: string; dataUrl: string }> = [];
      for (const [caption, ref] of targets) {
        const dataUrl = await captureElementAsJpeg(ref.current);
        if (dataUrl) pages.push({ caption, dataUrl });
      }

      if (pages.length === 0) {
        toast.error("No charts to export for this month.");
        return;
      }

      const generatedOn = new Date().toLocaleDateString("en-CA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      downloadImagePdf(`attendance-charts-${selectedKey}.pdf`, {
        title: "Attendance Report - Charts",
        subtitle: selectedLabel,
        pages,
        footerNote: `Generated ${generatedOn}`,
      });
    } catch {
      toast.error("Could not generate the charts PDF.");
    } finally {
      setExportingCharts(false);
    }
  }

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

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{selectedLabel}</span>
          {isCurrentMonth && <Badge variant="outline">Current Month</Badge>}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintTablePdf}
            disabled={!detailedRows || detailedRows.length === 0}
            title="Download the service details as a PDF table"
          >
            <FileDown className="h-4 w-4" /> Print Table PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handlePrintChartsPdf()}
            disabled={exportingCharts}
            title="Download the charts as a PDF"
          >
            {exportingCharts ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageDown className="h-4 w-4" />
            )}
            Print Charts PDF
          </Button>
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

      <ServiceDetailsTable rows={detailedRows} monthLabel={selectedLabel} />

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
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              Attendance by Service Type ({selectedLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!comparison ? (
              <Skeleton className="h-56 w-full" />
            ) : byServiceType.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No attendance recorded in {selectedLabel} yet.
              </p>
            ) : (
              <div ref={serviceTypeRef} className="w-full">
                <ChartContainer
                  config={serviceTypeConfig}
                  className="h-56 w-full"
                >
                  <BarChart data={byServiceType} layout="vertical">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="serviceType"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={70}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="totalAttendance"
                      fill="var(--color-totalAttendance)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              Online vs Physical Attendance ({selectedLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!comparison ? (
              <Skeleton className="h-56 w-full" />
            ) : onlineVsPhysical.length === 0 ||
              onlineVsPhysical.every(
                (row) => row.totalOnline + row.totalPhysical === 0
              ) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No attendance recorded in {selectedLabel} yet.
              </p>
            ) : (
              <div ref={onlinePhysicalRef} className="w-full">
                <ChartContainer
                  config={onlinePhysicalConfig}
                  className="h-56 w-full"
                >
                  <BarChart data={onlineVsPhysical}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="totalPhysical"
                      fill="var(--color-totalPhysical)"
                      radius={4}
                    />
                    <Bar
                      dataKey="totalOnline"
                      fill="var(--color-totalOnline)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              Attendance Breakdown by Service ({selectedLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!detailedRows ? (
              <Skeleton className="h-56 w-full" />
            ) : serviceChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No services recorded in {selectedLabel} yet.
              </p>
            ) : !hasBreakdownData ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No attendance recorded in {selectedLabel} yet.
              </p>
            ) : (
              <div ref={monthServiceRef} className="w-full">
                <ChartContainer
                  config={serviceBreakdownConfig}
                  className="h-56 w-full"
                >
                  <BarChart data={serviceChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={70}
                      fontSize={11}
                    />
                    <YAxis tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="men"
                      stackId="a"
                      fill="var(--color-men)"
                      radius={4}
                    />
                    <Bar
                      dataKey="women"
                      stackId="a"
                      fill="var(--color-women)"
                    />
                    <Bar
                      dataKey="children"
                      stackId="a"
                      fill="var(--color-children)"
                    />
                    <Bar
                      dataKey="online"
                      stackId="a"
                      fill="var(--color-online)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              Online vs Physical by Service ({selectedLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!monthReport ? (
              <Skeleton className="h-56 w-full" />
            ) : monthServices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No services recorded in {selectedLabel} yet.
              </p>
            ) : (
              <div ref={monthOnlinePhysicalRef} className="w-full">
                <ChartContainer
                  config={currentMonthOnlinePhysicalConfig}
                  className="h-56 w-full"
                >
                  <BarChart data={monthServices}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                      fontSize={11}
                    />
                    <YAxis tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="physical"
                      stackId="a"
                      fill="var(--color-physical)"
                      radius={4}
                    />
                    <Bar
                      dataKey="online"
                      stackId="a"
                      fill="var(--color-online)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              Demographics by Service ({selectedLabel})
            </CardTitle>
            {demographics && !demographicsEmpty && (
              <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />
                  Men {demographics.totalMen}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />
                  Women {demographics.totalWomen}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--chart-3)]" />
                  Children {demographics.totalChildren}
                </span>
              </span>
            )}
          </CardHeader>
          <CardContent>
            {!detailedRows ? (
              <Skeleton className="h-56 w-full" />
            ) : serviceChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No services recorded in {selectedLabel} yet.
              </p>
            ) : !hasBreakdownData ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No attendance recorded in {selectedLabel} yet.
              </p>
            ) : (
              <div ref={demographicsRef} className="w-full">
                <ChartContainer
                  config={serviceDemographicsConfig}
                  className="h-56 w-full"
                >
                  <BarChart data={serviceChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={70}
                      fontSize={11}
                    />
                    <YAxis tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="men"
                      stackId="a"
                      fill="var(--color-men)"
                      radius={4}
                    />
                    <Bar
                      dataKey="women"
                      stackId="a"
                      fill="var(--color-women)"
                    />
                    <Bar
                      dataKey="children"
                      stackId="a"
                      fill="var(--color-children)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              First-Timer Conversion ({selectedLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!conversion ? (
              <Skeleton className="h-40 w-full" />
            ) : conversion.totalFirstTimers === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No first-timers recorded in {selectedLabel} yet.
              </p>
            ) : (
              <div ref={conversionRef} className="w-full">
                <div className="grid grid-cols-1 gap-4 py-4 text-center sm:grid-cols-3">
                  <div>
                    <div className="text-2xl font-semibold">
                      {conversion.totalFirstTimers}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      First Timers
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {conversion.totalNewConverts}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      New Converts
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {conversion.conversionRatePercent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Conversion Rate
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Preacher Impact ({selectedLabel})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!preachers ? (
            <Skeleton className="h-48 w-full" />
          ) : preachers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No preacher data for {selectedLabel} yet.
            </p>
          ) : (
            <div ref={preacherRef} className="w-full">
              <ChartContainer
                config={preacherConfig}
                className="w-full"
                style={{ height: Math.max(160, preachers.length * 44) }}
              >
                <BarChart
                  data={preachers}
                  layout="vertical"
                  margin={{ left: 12 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="preacher"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="totalAttendance"
                    fill="var(--color-totalAttendance)"
                    radius={4}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
