import type { TenantScopedQuery } from "@/lib/api/client";

export const staffAttendanceStatuses = ["present", "absent", "late", "half_day", "leave", "holiday", "weekend"] as const;
export type StaffAttendanceStatus = (typeof staffAttendanceStatuses)[number];

export const staffAttendanceSources = ["manual", "future_import", "future_biometric"] as const;
export type StaffAttendanceSource = (typeof staffAttendanceSources)[number];

export type StaffAttendanceRecord = TenantScopedQuery & {
  id: string;
  staffId: string;
  attendanceDate: string;
  status: StaffAttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  source: StaffAttendanceSource;
  markedBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffAttendanceSummaryRecord = StaffAttendanceRecord & {
  staffName: string;
  employeeNumber: string;
  departmentId: string;
  designationId: string;
  departmentName: string;
  designationName: string;
};

export type StaffAttendanceFilters = Partial<TenantScopedQuery> & {
  attendanceDate?: string;
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
  departmentId?: string;
  designationId?: string;
  staffCategory?: string;
  employmentType?: string;
  status?: StaffAttendanceStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "staffName" | "employeeNumber" | "attendanceDate" | "status" | "departmentName";
  sortDirection?: "asc" | "desc";
};

export type StaffAttendanceListResponse = {
  items: StaffAttendanceSummaryRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: StaffAttendanceSummary;
};

export type StaffAttendanceSummary = {
  totalStaff: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  holiday: number;
  weekend: number;
  unmarked: number;
};

export type StaffAttendanceMarkEntry = {
  staffId: string;
  status: StaffAttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
};

export type StaffAttendanceMarkInput = TenantScopedQuery & {
  attendanceDate: string;
  records: StaffAttendanceMarkEntry[];
  markedBy?: string;
  source?: StaffAttendanceSource;
};
