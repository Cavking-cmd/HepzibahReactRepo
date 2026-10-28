import { useCallback, useEffect, useState } from "react";
import { apiList, RS, type ReimbursementRequestDto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDay, formatMoney, statusMeta } from "@/lib/reimbursements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, CreditCard, FileSearch, Undo2 } from "lucide-react";
import {
  ReimbursementDetailDialog,
  type ReimbursementMode,
} from "@/components/sections/reimbursement/ReimbursementDetailDialog";

interface AccountsApprovalDashboardProps {
  /**
   * "review" = the Accounts Officer's queue. An Accounts Admin can open it too and approve,
   * return or reject from there; only the officer forwards.
   * "final" = Accounts Admin approval and payment queue, including Under Review items
   * the admin can approve directly.
   */
  stage: "review" | "final";
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86_400_000)) : null;
}

function lastEntered(request: ReimbursementRequestDto, status: number): string | null {
  const entry = request.history.find((h) => h.toStatus === status && h.fromStatus !== status);
  return entry?.timestamp ?? null;
}

interface QueueTableProps {
  rows: ReimbursementRequestDto[];
  status: number;
  empty: string;
  amountLabel: string;
  amountOf: (r: ReimbursementRequestDto) => number;
  actionLabel: string;
  currentUserId: string | undefined;
  onOpen: (r: ReimbursementRequestDto) => void;
}

function QueueTable({ rows, status, empty, amountLabel, amountOf, actionLabel, currentUserId, onOpen }: QueueTableProps) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request #</TableHead>
            <TableHead>Payee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>In this stage</TableHead>
            <TableHead className="text-right">{amountLabel}</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((request) => {
            const since = lastEntered(request, status) ?? (status === RS.Approved ? request.approvedDate : request.submittedDate);
            const days = daysSince(since);
            const own = request.payeeUserId === currentUserId;
            return (
              <TableRow key={request.id} className="cursor-pointer" onClick={() => onOpen(request)}>
                <TableCell className="font-medium">{request.requestNumber}</TableCell>
                <TableCell>
                  <div>{request.payeeName}</div>
                  {own && <div className="text-xs text-amber-700 dark:text-amber-300">Your own request</div>}
                </TableCell>
                <TableCell>
                  {request.department}
                  {request.needsDepartmentLink && <span className="block text-xs text-amber-700 dark:text-amber-300">not linked</span>}
                  {(request.rejectedVerificationCount ?? 0) > 0 ? (
                    <span className="block text-xs text-destructive">Inventory rejected an item</span>
                  ) : (request.pendingVerificationCount ?? 0) > 0 ? (
                    <span className="block text-xs text-amber-700 dark:text-amber-300">Waiting for inventory check</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <span className={days !== null && days > 14 ? "font-medium text-destructive" : ""}>
                    {days === null ? "-" : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`}
                  </span>
                  <span className="block text-xs text-muted-foreground">since {formatDay(since)}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(amountOf(request))}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={own ? "outline" : "default"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(request);
                    }}
                  >
                    {own ? "View" : actionLabel}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function AccountsApprovalDashboard({ stage }: AccountsApprovalDashboardProps) {
  const { user, hasRole } = useAuth();
  const [requests, setRequests] = useState<ReimbursementRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReimbursementRequestDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // An Accounts Officer reviews and forwards. An Accounts Admin (without the officer role)
  // opens requests in Accounts Admin mode and can approve them directly.
  const canReview = hasRole("AccountsOfficer");
  const watchingReview = stage === "review" && !canReview;
  const mode: ReimbursementMode = stage === "review" && canReview ? "accountsOfficer" : "accountsAdmin";

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiList<ReimbursementRequestDto>("/api/Reimbursements");
    setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const oldestFirst = (a: ReimbursementRequestDto, b: ReimbursementRequestDto) =>
    (a.submittedDate ?? a.createdDate).localeCompare(b.submittedDate ?? b.createdDate);

  const underReview = requests.filter((r) => r.status === RS.UnderReview || r.status === RS.LegacyAccountsReview).sort(oldestFirst);
  const pendingApproval = requests.filter((r) => r.status === RS.PendingApproval).sort(oldestFirst);
  const approved = requests.filter((r) => r.status === RS.Approved).sort(oldestFirst);
  const returned = requests.filter((r) => r.status === RS.ReturnedForCorrection);

  function open(request: ReimbursementRequestDto) {
    setDetail(request);
    setDetailOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const sum = (rows: ReimbursementRequestDto[], amount: (r: ReimbursementRequestDto) => number) =>
    rows.reduce((total, r) => total + amount(r), 0);

  const tiles =
    stage === "review"
      ? [
          { label: watchingReview ? "Under review" : "Waiting for your review", count: underReview.length, amount: sum(underReview, (r) => r.totalAmount), icon: FileSearch },
          { label: "With the member for correction", count: returned.length, amount: sum(returned, (r) => r.totalAmount), icon: Undo2 },
          { label: "Forwarded, awaiting final approval", count: pendingApproval.length, amount: sum(pendingApproval, (r) => r.totalAmount), icon: ClipboardCheck },
        ]
      : [
          { label: "Waiting for final approval", count: pendingApproval.length, amount: sum(pendingApproval, (r) => r.totalAmount), icon: ClipboardCheck },
          { label: "Approved, awaiting payment", count: approved.length, amount: sum(approved, (r) => r.approvedAmount ?? r.totalAmount), icon: CreditCard },
          { label: "Under review (you can approve directly)", count: underReview.length, amount: sum(underReview, (r) => r.totalAmount), icon: FileSearch },
        ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{stage === "review" ? "Review Queue" : "Final Approval & Payment"}</h2>
        <p className="text-sm text-muted-foreground">
          {watchingReview
            ? "Requests the Accounts Officer is working on. You don't have to wait for them to be forwarded: open one to approve it directly, return it or reject it."
            : stage === "review"
            ? "Check receipts and the department budget, then forward each request for final approval, return it for correction, or reject it."
            : "Approve requests (forwarded by the Accounts Officer, or straight from Under Review), then confirm payment once the money has actually been sent."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.label}>
              <CardContent className="flex items-center gap-3 py-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                  <p className="text-lg font-semibold">
                    {tile.count} <span className="text-sm font-normal text-muted-foreground">· {formatMoney(tile.amount)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stage === "review" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-5 w-5" /> Under Review ({underReview.length})
            </CardTitle>
            <CardDescription>Oldest first. Forwarding does not approve or pay a request.</CardDescription>
          </CardHeader>
          <CardContent>
            <QueueTable
              rows={underReview}
              status={RS.UnderReview}
              empty="Nothing is waiting for review."
              amountLabel="Requested"
              amountOf={(r) => r.totalAmount}
              actionLabel={watchingReview ? "Decide" : "Review"}
              currentUserId={user?.id}
              onOpen={open}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-5 w-5" /> Pending Approval ({pendingApproval.length})
              </CardTitle>
              <CardDescription>Passed accounts review. Approving does not mark a request as paid.</CardDescription>
            </CardHeader>
            <CardContent>
              <QueueTable
                rows={pendingApproval}
                status={RS.PendingApproval}
                empty="Nothing is waiting for final approval."
                amountLabel="Requested"
                amountOf={(r) => r.totalAmount}
                actionLabel="Decide"
                currentUserId={user?.id}
                onOpen={open}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSearch className="h-5 w-5" /> Under Review ({underReview.length})
              </CardTitle>
              <CardDescription>
                Not forwarded yet. You can approve directly, return or reject. Requests with unverified physical items need an override reason.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QueueTable
                rows={underReview}
                status={RS.UnderReview}
                empty="Nothing is under review."
                amountLabel="Requested"
                amountOf={(r) => r.totalAmount}
                actionLabel="Decide"
                currentUserId={user?.id}
                onOpen={open}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5" /> Approved · Awaiting Payment ({approved.length})
              </CardTitle>
              <CardDescription>Confirm payment only after the money has actually been paid.</CardDescription>
            </CardHeader>
            <CardContent>
              <QueueTable
                rows={approved}
                status={RS.Approved}
                empty="No approved requests are waiting for payment."
                amountLabel="Approved"
                amountOf={(r) => r.approvedAmount ?? r.totalAmount}
                actionLabel="Confirm Payment"
                currentUserId={user?.id}
                onOpen={open}
              />
            </CardContent>
          </Card>
        </>
      )}

      {stage === "review" && returned.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {returned.length} request{returned.length === 1 ? " is" : "s are"} back with the member for correction:{" "}
          {returned.map((r) => r.requestNumber).join(", ")}. {statusMeta(RS.ReturnedForCorrection).label} requests return to this queue when resubmitted.
        </p>
      )}

      <ReimbursementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={detail}
        mode={mode}
        onEdit={() => {}}
        onChanged={() => void load()}
      />
    </div>
  );
}
