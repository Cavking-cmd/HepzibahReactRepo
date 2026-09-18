const DEFAULT_API_BASE = "";

export function getApiBase(): string {
  return (localStorage.getItem("apiBase") || DEFAULT_API_BASE).replace(/\/$/, "");
}

export function setApiBase(value: string) {
  localStorage.setItem("apiBase", value);
}

export function getToken(): string {
  return localStorage.getItem("token") || "";
}

export interface AuthUser {
  id: string;
  email: string;
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
    return (value as { $values: T[] }).$values;
  }
  if (Array.isArray(value)) return value as T[];
  return [];
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

export const SERVICE_TYPE_NAMES = ["Sunday", "Wednesday", "Special"] as const;
export const ITEM_CONDITION_NAMES = ["Good", "Needs Repair", "Replace"] as const;

export interface ServiceDto {
  id: string;
  date: string;
  day: string;
  serviceType: number;
  theme: string | null;
  scriptureText: string | null;
  preacher: string | null;
  onlineAttendance: number;
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
  total: number;
  isApproved: boolean;
  isLocked: boolean;
  approvedByUserId: string | null;
  approvedDate: string | null;
}

export interface FellowshipCenterDto {
  id: string;
  centerName: string;
  zone: string;
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

export type CreateServiceRequest = Omit<ServiceDto, "id">;
export type UpdateServiceRequest = ServiceDto;

export type CreateAttendanceRequest = Pick<
  AttendanceDto,
  "serviceId" | "men" | "women" | "children" | "sundaySchool" | "newConverts" | "firstTimers"
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
  zone: string;
  totalAttendance: number;
  averageAttendance: number;
  recordCount: number;
}

export interface ZoneSummaryDto {
  zone: string;
  totalAttendance: number;
  centerCount: number;
  averageAttendance: number;
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
  userRoles: string[];
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

export interface PasskeyDto {
  id: string;
  nickname: string | null;
  createdDate: string;
}
