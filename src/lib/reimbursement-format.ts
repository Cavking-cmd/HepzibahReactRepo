export const MAX_REIMBURSEMENT_ITEMS = 10;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_RECEIPT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export interface ReimbursementLine {
  referenceNumber: number;
  itemName: string;
  subtotal: string;
  gst: string;
  pst: string;
  hst: string;
  serialNumber: string;
}

export interface ReceiptUpload {
  fileName: string;
  contentType: string;
  dataBase64: string;
  size: number;
}

export const emptyLine = (referenceNumber: number): ReimbursementLine => ({
  referenceNumber,
  itemName: "",
  subtotal: "",
  gst: "",
  pst: "",
  hst: "",
  serialNumber: "",
});

const SERIAL_KEYWORDS = [
  "laptop",
  "computer",
  "desktop",
  "printer",
  "scanner",
  "copier",
  "phone",
  "smartphone",
  "mobile",
  "tablet",
  "ipad",
  "iphone",
  "camera",
  "camcorder",
  "projector",
  "television",
  "tv",
  "monitor",
  "router",
  "modem",
  "server",
  "nas",
  "switch",
  "hard drive",
  "ssd",
  "ups",
  "microphone",
  "mixer",
  "amplifier",
  "speaker",
  "console",
  "drone",
  "smartwatch",
  "chromebook",
];

export function requiresSerialNumber(itemName: string): boolean {
  const normalized = itemName.toLowerCase();
  return SERIAL_KEYWORDS.some((keyword) =>
    new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(normalized),
  );
}

export function lineAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function lineTotal(line: ReimbursementLine): number {
  return (
    Math.round(
      (lineAmount(line.subtotal) + lineAmount(line.gst) + lineAmount(line.pst) + lineAmount(line.hst)) * 100,
    ) / 100
  );
}

export function computeTotals(lines: ReimbursementLine[]) {
  const subtotal = lines.reduce((sum, line) => sum + lineAmount(line.subtotal), 0);
  const gst = lines.reduce((sum, line) => sum + lineAmount(line.gst), 0);
  const pst = lines.reduce((sum, line) => sum + lineAmount(line.pst), 0);
  const hst = lines.reduce((sum, line) => sum + lineAmount(line.hst), 0);
  const total = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    pst: Math.round(pst * 100) / 100,
    hst: Math.round(hst * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function formatMoney(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = iso.slice(0, 10);
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day} ${new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("en-CA", {
    month: "short",
  })} ${year}`;
}

export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function statusMeta(status: number): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case 0:
      return { label: "Draft", variant: "outline" };
    case 1:
      return { label: "Pending Approval", variant: "secondary" };
    case 2:
      return { label: "Accounts Review", variant: "secondary" };
    case 3:
      return { label: "Approved", variant: "default" };
    case 4:
      return { label: "Paid", variant: "default" };
    case 5:
      return { label: "Rejected", variant: "destructive" };
    case 6:
      return { label: "Info Requested", variant: "destructive" };
    default:
      return { label: "Unknown", variant: "outline" };
  }
}
