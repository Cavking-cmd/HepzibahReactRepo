import { useCallback, useEffect, useState } from "react";
import { apiList, REIMBURSEMENT_STATUS_NAMES, type ReimbursementRequestDto } from "@/lib/api";
import { formatDay, formatMoney, statusMeta } from "@/lib/reimbursements";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye } from "lucide-react";
import { ReimbursementFormDialog } from "@/components/sections/reimbursement/ReimbursementFormDialog";
import {
  ReimbursementDetailDialog,
  type ReimbursementMode,
} from "@/components/sections/reimbursement/ReimbursementDetailDialog";

interface ReimbursementSectionProps {
  mode: ReimbursementMode;
}

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "0", label: "Draft" },
  { value: "1", label: "Pending Approval" },
  { value: "2", label: "Accounts Review" },
  { value: "3", label: "Approved" },
  { value: "4", label: "Paid" },
  { value: "5", label: "Rejected" },
  { value: "6", label: "Info Requested" },
];

export function ReimbursementSection({ mode }: ReimbursementSectionProps) {
  const { hasRole } = useAuth();
  const [requests, setRequests] = useState<ReimbursementRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReimbursementRequestDto | null>(null);
  const [detail, setDetail] = useState<ReimbursementRequestDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const canCreate = mode === "member" || mode === "accountsAdmin";
  const isAccountsAdmin = hasRole("AccountsAdmin");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiList<ReimbursementRequestDto>("/api/Reimbursements");
    setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = [...requests]
    .filter((request) => statusFilter === "all" || String(request.status) === statusFilter)
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate));

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(request: ReimbursementRequestDto) {
    setDetailOpen(false);
    setEditing(request);
    setFormOpen(true);
  }

  function openDetail(request: ReimbursementRequestDto) {
    setDetail(request);
    setDetailOpen(true);
  }

  const heading =
    mode === "member"
      ? "My Reimbursements"
      : mode === "accountsOfficer"
        ? "Accounts Payable"
        : mode === "pastor"
          ? "Reimbursement Oversight"
          : "Accounts Payable";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{heading}</h2>
          <p className="text-sm text-muted-foreground">
            {mode === "member"
              ? "Prepare a request, attach receipts, and track its approval and payment."
              : mode === "pastor"
                ? "Review every reimbursement and approve requests as Minister in charge."
                : "Reconcile receipts, approve requests, and record payments."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Reimbursement
            </Button>
          )}
        </div>
      </div>

      {mode === "member" && (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
          Reimbursements are void without an accompanying invoice or receipt. Payments are made to the banking
          information on the request after Finance reconciles the amounts. Differences between the form and the
          receipt may delay payment.
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="font-medium">No reimbursements found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "member"
              ? "Create your first reimbursement request to get started."
              : "Requests will appear here as members submit them."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Receipts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((request) => {
                const status = statusMeta(request.status);
                return (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(request)}
                  >
                    <TableCell className="font-medium">{request.requestNumber}</TableCell>
                    <TableCell>
                      <div>{request.payeeName}</div>
                      <div className="text-xs text-muted-foreground">{request.payeeEmail}</div>
                    </TableCell>
                    <TableCell>{request.department}</TableCell>
                    <TableCell>{formatDay(request.requestDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(request.totalAmount)}</TableCell>
                    <TableCell>{request.receiptCount}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {request.status === 6 && request.infoRequestNotes && (
                        <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground" title={request.infoRequestNotes}>
                          {request.infoRequestNotes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDetail(request);
                        }}
                      >
                        <Eye className="h-4 w-4" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>
          Process: Member submits &rarr; Minister in charge approves &rarr; Accounts Officer reconciles receipts
          &rarr; {isAccountsAdmin ? "Accounts Admin approves" : "Accounts Admin approves"} &rarr; payment is
          recorded within three business days of authorization.
        </p>
        <p className="mt-1">
          Statuses: {Object.values(REIMBURSEMENT_STATUS_NAMES).join(" / ")}. Rejections and information requests
          are shown on the request.
        </p>
      </div>

      <ReimbursementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => void load()}
      />

      <ReimbursementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={detail}
        mode={mode}
        onEdit={openEdit}
        onChanged={() => void load()}
      />
    </div>
  );
}
