import { apiRequest, ITEM_TYPE, type ReceiptFileDto, type ReimbursementRequestDto } from "@/lib/api";
import {
  ALLOWED_RECEIPT_TYPES,
  emptyLine,
  MAX_RECEIPT_BYTES,
  type ReceiptUpload,
  type ReimbursementLine,
} from "@/lib/reimbursement-format";

export * from "@/lib/reimbursement-format";

export function linesFromRequest(request: ReimbursementRequestDto | null): ReimbursementLine[] {
  if (!request || request.items.length === 0) {
    return [emptyLine(1)];
  }

  return [...request.items]
    .sort((a, b) => a.referenceNumber - b.referenceNumber)
    .map((item) => ({
      referenceNumber: item.referenceNumber,
      itemName: item.itemName,
      subtotal: item.subtotal ? String(item.subtotal) : "",
      gst: item.gst ? String(item.gst) : "",
      pst: item.pst ? String(item.pst) : "",
      hst: item.hst ? String(item.hst) : "",
      serialNumber: item.serialNumber ?? "",
      itemType: item.itemType === ITEM_TYPE.Physical ? ("physical" as const) : ("service" as const),
    }));
}

export async function readReceiptFile(file: File): Promise<ReceiptUpload> {
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
    throw new Error(`${file.name}: only PDF, JPEG, PNG and WebP receipts are accepted.`);
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error(`${file.name}: receipts must be 5 MB or smaller.`);
  }

  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return {
    fileName: file.name,
    contentType: file.type,
    dataBase64: btoa(binary),
    size: file.size,
  };
}

export async function downloadReceipt(receiptId: string, fileName: string) {
  const { ok, body } = await apiRequest<ReceiptFileDto>("GET", `/api/Reimbursements/receipts/${receiptId}`);
  if (!ok || !body?.data) {
    throw new Error(body?.message ?? "Receipt could not be downloaded.");
  }

  const binary = atob(body.data.data);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const url = URL.createObjectURL(new Blob([bytes], { type: body.data.contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || body.data.fileName;
  link.click();
  URL.revokeObjectURL(url);
}
