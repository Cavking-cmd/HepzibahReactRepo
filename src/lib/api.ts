const DEFAULT_API_BASE = "https://hepzibahchurchportal.onrender.com";

export function getApiBase(): string {
  return (localStorage.getItem("apiBase") || DEFAULT_API_BASE).replace(/\/$/, "");
}

export function setApiBase(value: string) {
  localStorage.setItem("apiBase", value);
}

export function getToken(): string {
  return localStorage.getItem("token") || "";
}

/**
 * Roles inside the signed-in token, which is what the server actually checks.
 * These can differ from the roles shown in the app if the token is from an older sign-in.
 */
export function getTokenRoles(): string[] {
  const token = getToken();
  const part = token.split(".")[1];
  if (!part) return [];
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const claims = JSON.parse(json) as Record<string, unknown>;
    const raw =
      claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? claims["role"] ?? claims["roles"];
    if (Array.isArray(raw)) return raw.map(String);
    return typeof raw === "string" ? [raw] : [];
  } catch {
    return [];
  }
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  userRoles: string[];
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function unwrap<T>(value: unknown): T[] {
  if (value && typeof value === "object" && Array.isArray((value as { $values?: unknown }).$values)) {
    return (value as { $values: T[] }).$values.map((item) => deRef(item));
  }
  if (Array.isArray(value)) return (value as T[]).map((item) => deRef(item));
  return [];
}

export function deRef<T>(node: T): T {
  return deRefNode(node, new WeakMap<object, unknown>()) as T;
}

function deRefNode(node: unknown, visited: WeakMap<object, unknown>): unknown {
  if (!node || typeof node !== "object") return node;

  if (visited.has(node)) return visited.get(node);

  if (Array.isArray(node)) {
    const out: unknown[] = [];
    visited.set(node, out);
    for (const item of node) out.push(deRefNode(item, visited));
    return out;
  }

  if ("$values" in node) {
    const out: unknown[] = [];
    visited.set(node, out);
    const values = deRefNode(node.$values, visited);
    if (Array.isArray(values)) out.push(...values);
    return out;
  }

  const out: Record<string, unknown> = {};
  visited.set(node, out);
  for (const [key, value] of Object.entries(node)) {
    if (key === "$id") continue;
    out[key] = deRefNode(value, visited);
  }
  return out;
}

export interface BaseResponse<T> {
  message: string;
  status: boolean;
  data: T;
}

export interface ApiResult<T> {
  ok: boolean;
  httpStatus: number;
  body: BaseResponse<T> | null;
}

export async function apiRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return {
      ok: false,
      httpStatus: 0,
      body: { message: `Network error - is the API reachable at ${getApiBase() || "this origin"}?`, status: false, data: null as T },
    };
  }

  let parsed: BaseResponse<T> | null = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text) as BaseResponse<T>;
    } catch {
      parsed = { message: text, status: false, data: null as T };
    }
  }

  return { ok: response.ok, httpStatus: response.status, body: parsed };
}

export async function apiList<T>(path: string): Promise<T[]> {
  const { ok, body } = await apiRequest<unknown>("GET", path);
  if (!ok || !body) return [];
  return unwrap<T>(body.data);
}

export async function apiGet<T>(path: string): Promise<T | null> {
  const { ok, body } = await apiRequest<T>("GET", path);
  if (!ok || !body) return null;
  return body.data;
}

export const SERVICE_TYPE_NAMES = ["Sunday Service", "Wednesday Bible Study", "Rodah", "Special"] as const;
export const ITEM_CONDITION_NAMES = ["Good", "Needs Repair", "Replace"] as const;

export interface ServiceDto {
  id: string;
  date: string;
  day: string;
  serviceType: number;
  theme: string | null;
  scriptureText: string | null;
  /** Selected pastor record. Null for older services that still have typed text. */
  pastorId: string | null;
  /** Canonical pastor name, or the original typed text on older services. */
  preacher: string | null;
  /** True when preacher is old free text not yet linked to a pastor record. */
  preacherNeedsLink?: boolean;
}

export interface AttendanceDto {
  id: string;
  serviceId: string;
  men: number;
  women: number;
  children: number;
  sundaySchool: number;
  newConverts: number;
  firstTimers: number;
  onlineAttendance: number;
  total: number;
  isApproved: boolean;
  isLocked: boolean;
  approvedByUserId: string | null;
  approvedDate: string | null;
}

export interface FellowshipCenterDto {
  id: string;
  centerName: string;
  leaderName: string;
  location: string;
}

export interface FellowshipAttendanceDto {
  id: string;
  fellowshipCenterId: string;
  date: string;
  men: number;
  women: number;
  children: number;
  newConverts: number;
  total: number;
  isApproved: boolean;
  isLocked: boolean;
  approvedByUserId: string | null;
  approvedDate: string | null;
}

export interface InventoryItemDto {
  id: string;
  itemName: string;
  description: string;
  serialNumber: string | null;
  category: string;
  quantity: number;
  location: string;
  condition: number;
  purchaseDate: string;
  value: number;
  custodian: string;
  lastVerifiedDate: string | null;
}

export type CreateServiceRequest = Omit<ServiceDto, "id" | "preacherNeedsLink">;
export type UpdateServiceRequest = Omit<ServiceDto, "preacherNeedsLink">;

export type CreateAttendanceRequest = Pick<
  AttendanceDto,
  "serviceId" | "men" | "women" | "children" | "sundaySchool" | "newConverts" | "firstTimers" | "onlineAttendance"
>;
export type UpdateAttendanceRequest = CreateAttendanceRequest & { id: string };

export type CreateFellowshipCenterRequest = Omit<FellowshipCenterDto, "id">;
export type UpdateFellowshipCenterRequest = FellowshipCenterDto;

export type CreateFellowshipAttendanceRequest = Pick<
  FellowshipAttendanceDto,
  "fellowshipCenterId" | "date" | "men" | "women" | "children" | "newConverts"
>;
export type UpdateFellowshipAttendanceRequest = CreateFellowshipAttendanceRequest & { id: string };

export type CreateInventoryItemRequest = Pick<
  InventoryItemDto,
  "itemName" | "description" | "serialNumber" | "category" | "quantity" | "location" | "condition" | "purchaseDate" | "value" | "custodian" | "lastVerifiedDate"
>;
export type UpdateInventoryItemRequest = CreateInventoryItemRequest & { id: string };

export interface DashboardAlertDto {
  type: string;
  message: string;
}

export interface DashboardSummaryDto {
  totalAttendanceThisMonth: number;
  growthVsLastMonthPercent: number | null;
  totalActiveFellowshipCenters: number;
  totalAssetValue: number;
  alerts: DashboardAlertDto[];
}

export interface MonthlyGrowthDto {
  year: number;
  month: number;
  monthLabel: string;
  totalAttendance: number;
  percentChangeFromPreviousMonth: number | null;
}

export interface ServiceTypeComparisonDto {
  serviceType: string;
  totalAttendance: number;
  averageAttendance: number;
  recordCount: number;
}

export interface OnlineVsPhysicalDto {
  monthLabel: string;
  totalOnline: number;
  totalPhysical: number;
}

export interface ServiceComparisonDto {
  byServiceType: ServiceTypeComparisonDto[];
  onlineVsPhysicalByMonth: OnlineVsPhysicalDto[];
}

export interface ServiceMonthAttendanceDto {
  serviceId: string;
  date: string;
  label: string;
  serviceType: string;
  total: number;
  online: number;
  physical: number;
}

export interface MonthServiceAttendanceDto {
  year: number;
  month: number;
  monthLabel: string;
  services: ServiceMonthAttendanceDto[];
}

export interface MonthOptionDto {
  year: number;
  month: number;
  label: string;
}

export interface DemographicsDto {
  totalMen: number;
  totalWomen: number;
  totalChildren: number;
}

export interface FirstTimerConversionDto {
  totalFirstTimers: number;
  totalNewConverts: number;
  conversionRatePercent: number;
}

export interface PreacherImpactDto {
  preacher: string;
  totalAttendance: number;
  averageAttendance: number;
  serviceCount: number;
}

export interface CenterRankingDto {
  centerId: string;
  centerName: string;
  totalAttendance: number;
  averageAttendance: number;
  recordCount: number;
}

export interface LeaderTrendDto {
  leaderName: string;
  centerName: string;
  averageAttendance: number;
  recordCount: number;
}

export interface ExpansionAlertDto {
  centerId: string;
  centerName: string;
  alertType: string;
  detail: string;
}

export interface InventoryCategoryValuationDto {
  category: string;
  totalValue: number;
  itemCount: number;
}

export interface InventoryValuationDto {
  totalValue: number;
  byCategory: InventoryCategoryValuationDto[];
}

export interface ReplacementAlertDto {
  itemId: string;
  itemName: string;
  category: string;
  condition: string;
  purchaseDate: string;
  ageInYears: number;
  reason: string;
}

export interface MissingVerificationDto {
  itemId: string;
  itemName: string;
  category: string;
  lastVerifiedDate: string | null;
  monthsSinceVerified: number | null;
}

export interface CustodianItemDto {
  itemId: string;
  itemName: string;
  value: number;
}

export interface CustodianAccountabilityDto {
  custodian: string;
  itemCount: number;
  totalValue: number;
  items: CustodianItemDto[];
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarBase64: string | null;
  emailVerified: boolean;
  userRoles: string[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  roles: string[];
}

export interface UpdateProfileRequest {
  displayName: string | null;
  avatarBase64: string | null;
}

export interface UpdateEmailRequest {
  newEmail: string;
  currentPassword: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface VerificationEmailSentDto {
  email: string;
  sentAtUtc: string;
}

export interface EmailStatusDto {
  configured: boolean;
  provider: string;
  from: string | null;
  fromName: string | null;
  frontendBaseUrl: string | null;
}

export interface PasskeyDto {
  id: string;
  nickname: string | null;
  createdDate: string;
}

export interface ReimbursementItemDto {
  id: string;
  referenceNumber: number;
  itemName: string;
  subtotal: number;
  gst: number;
  pst: number;
  hst: number;
  total: number;
  requiresSerialNumber: boolean;
  serialNumber: string | null;
  screeningNote: string | null;
}

export interface ReimbursementReceiptDto {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedBy: string;
  createdDate: string;
}

export interface ReimbursementHistoryDto {
  id: string;
  action: string;
  actorUserId: string;
  actorName: string | null;
  fromStatus: number | null;
  toStatus: number | null;
  notes: string | null;
  timestamp: string;
}

export interface ReimbursementRequestDto {
  id: string;
  requestNumber: string;
  payeeUserId: string;
  payeeEmail: string | null;
  payeeName: string;
  /** Department record name, "Personal Use", or older typed text. */
  department: string;
  classification: ReimbursementClassification;
  departmentId: string | null;
  /** Older request with only typed department text, waiting to be linked. */
  needsDepartmentLink: boolean;
  ministerInCharge: string;
  requestDate: string;
  remarks: string | null;
  subtotal: number;
  gst: number;
  pst: number;
  hst: number;
  totalAmount: number;
  status: number;
  statusName: string;
  receiptCount: number;
  submittedDate: string | null;
  ministerApprovedDate: string | null;
  reviewedDate: string | null;
  reviewedByName: string | null;
  reviewNotes: string | null;
  approvedDate: string | null;
  approvedByName: string | null;
  approvedAmount: number | null;
  approvalNotes: string | null;
  overBudgetAtApproval: boolean;
  overBudgetJustification: string | null;
  paymentDate: string | null;
  paymentConfirmedAt: string | null;
  paidByName: string | null;
  amountPaid: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  preparedBy: string | null;
  chequeNumber: string | null;
  authorizedByName1: string | null;
  authorizedByName2: string | null;
  authorizationDate: string | null;
  financeNotes: string | null;
  rejectedDate: string | null;
  rejectedByName: string | null;
  rejectionReason: string | null;
  infoRequestNotes: string | null;
  createdDate: string;
  items: ReimbursementItemDto[];
  receipts: ReimbursementReceiptDto[];
  history: ReimbursementHistoryDto[];
}

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  link: string | null;
  reimbursementRequestId: string | null;
  isRead: boolean;
  createdDate: string;
}

export interface ReceiptFileDto {
  fileName: string;
  contentType: string;
  data: string;
}

/** Status numbers stored by the API. 2 is a retired stage that no longer occurs. */
export const RS = {
  Draft: 0,
  UnderReview: 1,
  LegacyAccountsReview: 2,
  Approved: 3,
  Paid: 4,
  Rejected: 5,
  ReturnedForCorrection: 6,
  PendingApproval: 7,
} as const;

export const REIMBURSEMENT_STATUS_NAMES: Record<number, string> = {
  0: "Draft",
  1: "Under Review",
  2: "Under Review",
  3: "Approved (awaiting payment)",
  4: "Paid",
  5: "Rejected",
  6: "Returned for Correction",
  7: "Pending Approval",
};

/** 0 = charged to a department, 1 = Personal Use (no department budget). */
export type ReimbursementClassification = 0 | 1;
export const CLASSIFICATION = { Department: 0, PersonalUse: 1 } as const;

// ---------------------------------------------------------------- Departments & budgets

export interface DepartmentOptionDto {
  id: string;
  name: string;
}

export interface DepartmentDto {
  id: string;
  name: string;
  description: string | null;
  annualBudget: number;
  monthlyBudget: number | null;
  isActive: boolean;
  createdDate: string;
  updatedDate: string | null;
  requestCount: number;
}

export interface BudgetAlertDto {
  code: string;
  severity: "info" | "warning" | "danger";
  message: string;
}

export interface DepartmentBudgetDto {
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  year: number;
  month: number;
  annualBudget: number;
  paidThisYear: number;
  committedThisYear: number;
  pendingThisYear: number;
  remainingThisYear: number;
  utilisationPercentThisYear: number | null;
  monthlyBudget: number | null;
  paidThisMonth: number;
  committedThisMonth: number;
  pendingThisMonth: number;
  remainingThisMonth: number | null;
  utilisationPercentThisMonth: number | null;
  alerts: BudgetAlertDto[];
}

export interface ReimbursementBudgetDto {
  reimbursementId: string;
  isPersonalUse: boolean;
  needsDepartmentLink: boolean;
  note: string | null;
  requestAmount: number;
  alreadyCommitted: boolean;
  department: DepartmentBudgetDto | null;
  projectedRemainingThisYear: number | null;
  projectedUtilisationPercentThisYear: number | null;
  projectedRemainingThisMonth: number | null;
  projectedUtilisationPercentThisMonth: number | null;
  wouldExceedAnnual: boolean;
  wouldExceedMonthly: boolean;
  requiresOverBudgetJustification: boolean;
  alerts: BudgetAlertDto[];
  calculationNote: string;
}

export interface LegacyDepartmentNameDto {
  legacyName: string;
  requestCount: number;
  totalAmount: number;
  suggestedDepartmentId: string | null;
  suggestedDepartmentName: string | null;
}

// ---------------------------------------------------------------- Pastors

export interface PastorDto {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  description: string | null;
  isActive: boolean;
  serviceCount: number;
  createdDate: string;
  updatedDate: string | null;
}

export interface PastorDuplicateDto {
  message: string;
  matches: PastorDto[];
}

export interface LegacyPreacherDto {
  preacherName: string;
  serviceCount: number;
  firstServiceDate: string;
  lastServiceDate: string;
  suggestedPastors: PastorDto[];
}

// ---------------------------------------------------------------- Financial reports

export interface FinanceSummaryDto {
  from: string;
  to: string;
  paidInPeriod: number;
  paidDepartmentInPeriod: number;
  paidPersonalUseInPeriod: number;
  paidCountInPeriod: number;
  averagePaidInPeriod: number;
  submittedCountInPeriod: number;
  requestedInPeriod: number;
  approvedCountInPeriod: number;
  approvedInPeriod: number;
  rejectedCountInPeriod: number;
  approvedNotPaidNow: number;
  approvedNotPaidCountNow: number;
  pendingApprovalNow: number;
  pendingApprovalCountNow: number;
  underReviewNow: number;
  underReviewCountNow: number;
  returnedForCorrectionNow: number;
  returnedForCorrectionCountNow: number;
  budgetYear: number;
  activeDepartmentCount: number;
  totalActiveAnnualBudget: number;
  departmentPaidThisYear: number;
  departmentCommittedThisYear: number;
  budgetUtilisationPercent: number | null;
  departmentsNearLimit: number;
  departmentsOverBudget: number;
  warningThresholdPercent: number;
  unlinkedLegacyRequestCount: number;
  definitions: string[];
}

export interface LabelAmountDto {
  key: string;
  label: string;
  isPersonalUse: boolean;
  amount: number;
  count: number;
}

export interface MonthlyExpenditureDto {
  year: number;
  month: number;
  monthLabel: string;
  paidTotal: number;
  paidCount: number;
  averagePaid: number;
  largestPaid: {
    id: string;
    requestNumber: string;
    payeeName: string;
    department: string;
    amount: number;
    paymentDate: string | null;
  } | null;
  approvedTotal: number;
  approvedCount: number;
  requestedTotal: number;
  requestedCount: number;
  awaitingPaymentCount: number;
  awaitingPaymentAmount: number;
  previousMonthPaidTotal: number;
  paidChangePercent: number | null;
  paidDepartmentTotal: number;
  paidPersonalUseTotal: number;
  paidByDepartment: LabelAmountDto[];
  definitions: string[];
}

export interface DepartmentSpendingDto {
  key: string;
  departmentId: string | null;
  department: string;
  isPersonalUse: boolean;
  isLegacyUnlinked: boolean;
  isActive: boolean;
  annualBudget: number | null;
  monthlyBudget: number | null;
  paid: number;
  committed: number;
  pending: number;
  remaining: number | null;
  utilisationPercent: number | null;
  requestCount: number;
  paidCount: number;
  averagePaid: number;
  largestPaid: number;
  rejectedCount: number;
  isHighestPaid: boolean;
  isHighestUtilisation: boolean;
  isOverBudget: boolean;
  isNearLimit: boolean;
  hasHighPending: boolean;
}

export interface DepartmentSpendingReportDto {
  year: number;
  warningThresholdPercent: number;
  rows: DepartmentSpendingDto[];
  departmentPaidTotal: number;
  personalUsePaidTotal: number;
  paidTotal: number;
  definitions: string[];
}

export interface TrendPointDto {
  year: number;
  month: number;
  monthLabel: string;
  paid: number;
  paidDepartment: number;
  paidPersonalUse: number;
  paidCount: number;
  averagePaid: number;
  submittedCount: number;
  requested: number;
  yearToDateUtilisationPercent: number | null;
}

export interface SpendingTrendsDto {
  points: TrendPointDto[];
  byDepartment: { key: string; label: string; paidByMonth: number[] }[];
  definitions: string[];
}

export interface WorkflowReportDto {
  staleThresholdDays: number;
  byStatus: { status: number; statusName: string; count: number; amount: number }[];
  awaitingAction: {
    id: string;
    requestNumber: string;
    payeeName: string;
    department: string;
    status: number;
    statusName: string;
    waitingFor: string;
    amount: number;
    inStatusSince: string;
    daysInStatus: number;
    isStale: boolean;
  }[];
  staleCount: number;
  averageDaysUnderReview: number | null;
  underReviewSampleSize: number;
  averageDaysSubmissionToApproval: number | null;
  submissionToApprovalSampleSize: number;
  averageDaysApprovalToPayment: number | null;
  approvalToPaymentSampleSize: number;
  definitions: string[];
}

export interface DepartmentForecastDto {
  key: string;
  departmentId: string | null;
  department: string;
  annualBudget: number | null;
  paidYearToDate: number;
  committed: number;
  pending: number;
  projectedYearEnd: number | null;
  projectedOverrun: number | null;
  projectedExhaustionMonth: string | null;
  remainingIfPendingApproved: number | null;
  wouldOverrunIfPendingApproved: boolean;
  lastThreeMonthsPaid: number;
  previousThreeMonthsPaid: number;
  isIncreasing: boolean;
  isReliable: boolean;
  reliabilityNote: string | null;
}

export interface FinanceForecastDto {
  year: number;
  monthsElapsed: number;
  departments: DepartmentForecastDto[];
  unusualReimbursements: {
    id: string;
    requestNumber: string;
    department: string;
    payeeName: string;
    amount: number;
    departmentAverage: number;
    reason: string;
  }[];
  outstandingApprovedCommitments: number;
  paidThisMonth: number;
  paidSameMonthLastYear: number;
  paidPreviousMonth: number;
  definitions: string[];
}
