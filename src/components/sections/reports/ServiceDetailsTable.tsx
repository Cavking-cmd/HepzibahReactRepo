import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatReportDate } from "@/lib/report-format";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ServiceRecordStatus = "No record" | "Pending" | "Approved" | "Locked";

export interface ServiceDetailRow {
  id: string;
  date: string;
  serviceType: string;
  theme: string;
  scriptureText: string;
  preacher: string;
  men: number;
  women: number;
  children: number;
  sundaySchool: number;
  firstTimers: number;
  newConverts: number;
  online: number;
  physical: number;
  total: number;
  status: ServiceRecordStatus;
}

function statusVariant(
  status: ServiceRecordStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "Locked") return "default";
  if (status === "Approved") return "secondary";
  if (status === "Pending") return "outline";
  return "destructive";
}

const NUMERIC_NOTE =
  "Total = Men + Women + Children + Online. Sunday School is recorded separately and not included in Total.";

interface ServiceDetailsTableProps {
  rows: ServiceDetailRow[] | null;
  monthLabel: string;
}

export function ServiceDetailsTable({ rows, monthLabel }: ServiceDetailsTableProps) {
  const totals = (rows ?? []).reduce(
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

  const recordedCount = (rows ?? []).filter((row) => row.status !== "No record").length;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Service Details ({monthLabel})</CardTitle>
        {rows !== null && (
          <span className="text-xs text-muted-foreground">
            {recordedCount} of {rows.length} services recorded
          </span>
        )}
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <Skeleton className="h-56 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No services recorded in {monthLabel} yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[1150px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead>Scripture</TableHead>
                  <TableHead>Preacher</TableHead>
                  <TableHead className="text-right">Men</TableHead>
                  <TableHead className="text-right">Women</TableHead>
                  <TableHead className="text-right">Children</TableHead>
                  <TableHead className="text-right">S. School</TableHead>
                  <TableHead className="text-right">First Timers</TableHead>
                  <TableHead className="text-right">New Converts</TableHead>
                  <TableHead className="text-right">Online</TableHead>
                  <TableHead className="text-right">Physical</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatReportDate(row.date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.serviceType}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={row.theme}>
                      {row.theme || "—"}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate" title={row.scriptureText}>
                      {row.scriptureText || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.preacher || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.men}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.women}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.children}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.sundaySchool}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.firstTimers}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.newConverts}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.online}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.physical}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.total}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-medium">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{totals.men}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{totals.women}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {totals.children}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {totals.sundaySchool}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {totals.firstTimers}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {totals.newConverts}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{totals.online}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {totals.physical}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{totals.total}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{NUMERIC_NOTE}</p>
      </CardContent>
    </Card>
  );
}
