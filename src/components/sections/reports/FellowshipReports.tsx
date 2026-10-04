import { useEffect, useState } from "react";
import {
  apiGet,
  unwrap,
  type CenterRankingDto,
  type ExpansionAlertDto,
  type LeaderTrendDto,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export function FellowshipReports() {
  const [ranking, setRanking] = useState<CenterRankingDto[] | null>(null);
  const [leaders, setLeaders] = useState<LeaderTrendDto[] | null>(null);
  const [alerts, setAlerts] = useState<ExpansionAlertDto[] | null>(null);
  const rankingPaging = usePagination(ranking ?? []);
  const leaderPaging = usePagination(leaders ?? []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [rankingData, leaderData, alertData] = await Promise.all([
        apiGet<CenterRankingDto[]>("/api/Reports/Fellowship/center-ranking"),
        apiGet<LeaderTrendDto[]>("/api/Reports/Fellowship/leader-trend"),
        apiGet<ExpansionAlertDto[]>("/api/Reports/Fellowship/expansion-alerts"),
      ]);

      if (cancelled) return;
      setRanking(rankingData ? unwrap<CenterRankingDto>(rankingData) : []);
      setLeaders(leaderData ? unwrap<LeaderTrendDto>(leaderData) : []);
      setAlerts(alertData ? unwrap<ExpansionAlertDto>(alertData) : []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fellowship Center Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          {!ranking ? (
            <Skeleton className="h-48 w-full" />
          ) : ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No fellowship attendance data yet.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Center</TableHead>
                    <TableHead>Total Attendance</TableHead>
                    <TableHead>Average Attendance</TableHead>
                    <TableHead>Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingPaging.pageItems.map((center, idx) => (
                    <TableRow key={center.centerId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {center.centerName}
                          {rankingPaging.page === 1 && idx === 0 && <Badge>Top performer</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{center.totalAttendance}</TableCell>
                      <TableCell>{center.averageAttendance.toFixed(1)}</TableCell>
                      <TableCell>{center.recordCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                total={ranking.length}
                page={rankingPaging.page}
                pageSize={rankingPaging.pageSize}
                totalPages={rankingPaging.totalPages}
                onPageChange={rankingPaging.changePage}
                onPageSizeChange={rankingPaging.changePageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leader Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {!leaders ? (
            <Skeleton className="h-40 w-full" />
          ) : leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No leader data yet.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leader</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Average Attendance</TableHead>
                    <TableHead>Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderPaging.pageItems.map((leader, idx) => (
                    <TableRow key={`${leader.leaderName}-${idx}`}>
                      <TableCell className="font-medium">{leader.leaderName}</TableCell>
                      <TableCell>{leader.centerName}</TableCell>
                      <TableCell>{leader.averageAttendance.toFixed(1)}</TableCell>
                      <TableCell>{leader.recordCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                total={leaders.length}
                page={leaderPaging.page}
                pageSize={leaderPaging.pageSize}
                totalPages={leaderPaging.totalPages}
                onPageChange={leaderPaging.changePage}
                onPageSizeChange={leaderPaging.changePageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expansion Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {!alerts ? (
            <Skeleton className="h-24 w-full" />
          ) : alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              No centers currently flagged.
            </div>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li key={alert.centerId} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">
                      {alert.centerName} - {alert.alertType}
                    </div>
                    <div className="text-muted-foreground">{alert.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
