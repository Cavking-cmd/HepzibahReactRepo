import { useEffect, useState } from "react";
import {
  apiGet,
  unwrap,
  type CustodianAccountabilityDto,
  type CustodianItemDto,
  type InventoryValuationDto,
  type MissingVerificationDto,
  type ReplacementAlertDto,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/CountUp";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const valuationConfig = {
  totalValue: { label: "Total Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

const currency = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function InventoryReports() {
  const [valuation, setValuation] = useState<InventoryValuationDto | null>(null);
  const [replacements, setReplacements] = useState<ReplacementAlertDto[] | null>(null);
  const [missingVerification, setMissingVerification] = useState<MissingVerificationDto[] | null>(null);
  const [custodians, setCustodians] = useState<CustodianAccountabilityDto[] | null>(null);
  const replacementPaging = usePagination(replacements ?? []);
  const missingPaging = usePagination(missingVerification ?? []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [valuationData, replacementData, missingData, custodianData] = await Promise.all([
        apiGet<InventoryValuationDto>("/api/Reports/Inventory/valuation"),
        apiGet<ReplacementAlertDto[]>("/api/Reports/Inventory/replacement-alerts?years=10"),
        apiGet<MissingVerificationDto[]>("/api/Reports/Inventory/missing-verification?months=6"),
        apiGet<CustodianAccountabilityDto[]>("/api/Reports/Inventory/custodian-accountability"),
      ]);

      if (cancelled) return;
      setValuation(valuationData);
      setReplacements(replacementData ? unwrap<ReplacementAlertDto>(replacementData) : []);
      setMissingVerification(missingData ? unwrap<MissingVerificationDto>(missingData) : []);
      setCustodians(custodianData ? unwrap<CustodianAccountabilityDto>(custodianData) : []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const byCategory = valuation ? unwrap(valuation.byCategory) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-4xl font-semibold tracking-tight py-6">
              {valuation ? <CountUp value={valuation.totalValue} formatter={currency} /> : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {!valuation ? (
              <Skeleton className="h-48 w-full" />
            ) : byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No inventory data yet.</p>
            ) : (
              <ChartContainer config={valuationConfig} className="h-48 w-full">
                <BarChart data={byCategory}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={50} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalValue" fill="var(--color-totalValue)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Replacement Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {!replacements ? (
            <Skeleton className="h-24 w-full" />
          ) : replacements.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              No items need replacement.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Age (years)</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacementPaging.pageItems.map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          {item.itemName}
                        </div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.condition}</TableCell>
                      <TableCell>{item.ageInYears.toFixed(1)}</TableCell>
                      <TableCell>{item.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                total={replacements.length}
                page={replacementPaging.page}
                pageSize={replacementPaging.pageSize}
                totalPages={replacementPaging.totalPages}
                onPageChange={replacementPaging.changePage}
                onPageSizeChange={replacementPaging.changePageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Missing Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {!missingVerification ? (
            <Skeleton className="h-24 w-full" />
          ) : missingVerification.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              All items have been recently verified.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Last Verified</TableHead>
                    <TableHead>Months Since Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingPaging.pageItems.map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.lastVerifiedDate ? item.lastVerifiedDate.slice(0, 10) : "Never verified"}</TableCell>
                      <TableCell>{item.monthsSinceVerified ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                total={missingVerification.length}
                page={missingPaging.page}
                pageSize={missingPaging.pageSize}
                totalPages={missingPaging.totalPages}
                onPageChange={missingPaging.changePage}
                onPageSizeChange={missingPaging.changePageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custodian Accountability</CardTitle>
        </CardHeader>
        <CardContent>
          {!custodians ? (
            <Skeleton className="h-24 w-full" />
          ) : custodians.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No custodian data yet.</p>
          ) : (
            <div className="space-y-4">
              {custodians.map((custodian) => {
                const items = unwrap<CustodianItemDto>(custodian.items);
                return (
                  <div key={custodian.custodian} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{custodian.custodian}</div>
                      <div className="text-sm text-muted-foreground">
                        {custodian.itemCount} item{custodian.itemCount === 1 ? "" : "s"} · {currency(custodian.totalValue)}
                      </div>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {items.map((item) => (
                        <li key={item.itemId} className="flex justify-between">
                          <span>{item.itemName}</span>
                          <span>{currency(item.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
