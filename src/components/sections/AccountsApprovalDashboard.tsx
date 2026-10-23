import { useCallback, useEffect, useState } from "react";
import { apiList, apiRequest, type ReimbursementRequestDto } from "@/lib/api";
import { formatMoney, statusMeta } from "@/lib/reimbursements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, FileText, CreditCard } from "lucide-react";
import { ReimbursementDetailDialog } from "@/components/sections/reimbursement/ReimbursementDetailDialog";

export function AccountsApprovalDashboard() {
  const [requests, setRequests] = useState<ReimbursementRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReimbursementRequestDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiList<ReimbursementRequestDto>("/api/Reimbursements");
    setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reviewQueue = requests.filter((r) => r.status === 2);
  const readyToPay = requests.filter((r) => r.status === 3);

  async function approveForPayment(request: ReimbursementRequestDto) {
    const result = await apiRequest("POST", `/api/Reimbursements/${request.id}/approve`, { notes: "Approved for payment." });
    if (!result.ok) {
      toast.error(result.body?.message ?? "Approval failed.");
      return;
    }
    toast.success("Approved for payment.");
    void load();
  }

  async function recordPayment(request: ReimbursementRequestDto) {
    const data = paymentData[request.id] || {};
    const amountPaid = Number(data.amountPaid ?? request.totalAmount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      toast.error("Enter the actual amount paid.");
      return;
    }
    if (amountPaid !== request.totalAmount && !data.financeNotes?.trim()) {
      toast.error("Add a finance note explaining the difference.");
      return;
    }
    if (!data.paymentMethod?.trim()) {
      toast.error("Payment method is required.");
      return;
    }

    const result = await apiRequest("POST", `/api/Reimbursements/${request.id}/payment`, {
      paymentDate: data.paymentDate || new Date().toISOString().slice(0, 10),
      amountPaid,
      paymentMethod: data.paymentMethod.trim(),
      paymentReference: data.paymentReference?.trim() || null,
      chequeNumber: data.chequeNumber?.trim() || null,
      authorizedByName1: data.authorizedByName1?.trim() || null,
      authorizedByName2: data.authorizedByName2?.trim() || null,
      authorizationDate: data.authorizationDate || null,
      financeNotes: data.financeNotes?.trim() || null,
    });

    if (!result.ok) {
      toast.error(result.body?.message ?? "Payment could not be recorded.");
      return;
    }
    toast.success("Payment recorded.");
    setPayingId(null);
    void load();
  }

  function openDetail(request: ReimbursementRequestDto) {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Accounts Approval & Payment</h2>
        <p className="text-sm text-muted-foreground">Review requests in accounts review, approve for payment, and mark as paid.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>Awaiting Accounts Approval ({reviewQueue.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No requests awaiting approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewQueue.map((request) => {
                    const status = statusMeta(request.status);
                    return (
                      <TableRow key={request.id} className="cursor-pointer" onClick={() => openDetail(request)}>
                        <TableCell className="font-medium">{request.requestNumber}</TableCell>
                        <TableCell>{request.payeeName}</TableCell>
                        <TableCell>{request.department}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(request.totalAmount)}</TableCell>
                        <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); void approveForPayment(request); }}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve for Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Ready to Pay ({readyToPay.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {readyToPay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No requests ready for payment.</p>
          ) : (
            readyToPay.map((request) => {
              const status = statusMeta(request.status);
              const data = paymentData[request.id] || {};
              return (
                <Card key={request.id} className="border-border/70">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{request.requestNumber}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openDetail(request)}>View Details</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.payeeName} • {request.department} • {formatMoney(request.totalAmount)}</p>
                  </CardHeader>
                  <CardContent>
                    {payingId === request.id ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                          <Label>Payment Date</Label>
                          <Input type="date" value={data.paymentDate || new Date().toISOString().slice(0,10)} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, paymentDate: e.target.value}})} />
                        </div>
                        <div className="space-y-1">
                          <Label>Amount Paid</Label>
                          <Input type="number" step="0.01" value={data.amountPaid ?? request.totalAmount} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, amountPaid: e.target.value}})} />
                        </div>
                        <div className="space-y-1">
                          <Label>Payment Method *</Label>
                          <Input value={data.paymentMethod || "E-Transfer"} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, paymentMethod: e.target.value}})} />
                        </div>
                        <div className="space-y-1">
                          <Label>Cheque Number</Label>
                          <Input value={data.chequeNumber || ""} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, chequeNumber: e.target.value}})} />
                        </div>
                        <div className="space-y-1">
                          <Label>Payment Reference</Label>
                          <Input value={data.paymentReference || ""} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, paymentReference: e.target.value}})} />
                        </div>
                        <div className="space-y-1">
                          <Label>Authorization Date</Label>
                          <Input type="date" value={data.authorizationDate || ""} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, authorizationDate: e.target.value}})} />
                        </div>
                        <div className="space-y-1">
                          <Label>Authorized By (1)</Label>
                          <Input value={data.authorizedByName1 || ""} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, authorizedByName1: e.target.value}})} />
                        </div>
                        <div className="space-y-1">
                          <Label>Authorized By (2)</Label>
                          <Input value={data.authorizedByName2 || ""} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, authorizedByName2: e.target.value}})} />
                        </div>
                        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                          <Label>Finance Notes</Label>
                          <Input value={data.financeNotes || ""} onChange={(e) => setPaymentData({...paymentData, [request.id]: {...data, financeNotes: e.target.value}})} placeholder="Required if amount differs from total" />
                        </div>
                        <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                          <Button onClick={() => void recordPayment(request)}>Mark as Paid</Button>
                          <Button variant="outline" onClick={() => setPayingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={() => setPayingId(request.id)}><CreditCard className="h-4 w-4 mr-1" /> Pay This Bill</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      <ReimbursementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={detail}
        mode="accountsOfficer"
        onEdit={() => {}}
        onChanged={() => void load()}
      />
    </div>
  );
}
