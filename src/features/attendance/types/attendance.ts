import type { TenantScopedQuery } from "@/lib/api/client";

export const attendanceStatuses = ["present", "absent", "late", "excused", "half_day", "leave"] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export const attendanceSources = ["manual", "future_import", "future_mobile", "future_biometric", "future_api"] as const;
export type AttendanceSource = (typeof attendanceSources)[number];

export type AttendanceRecord = TenantScopedQuery & {
  id: string;
  studentId: string;
  classId: string;
  sectionId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  markedBy?: string;
  markedAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  source: AttendanceSource;
  version: number;
};

export type AttendanceRecordSummary = AttendanceRecord & {
  studentName: string;
  admissionNumber: string;
  studentCode?: string;
  className: string;
  sectionName: string;
  academicContextSource: "stored_snapshot" | "resolved_placement_fallback";
  rollNumber?: string;
};

export type AttendanceCorrection = TenantScopedQuery & {
  id: string;
  attendanceId: string;
  studentId: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  correctedBy: string;
  correctedAt: string;
  correctionNumber: number;
  source: AttendanceSource;
  previousMarkedAt?: string;
  previousMarkedBy?: string;
};

export type AttendanceHistoryRecord = AttendanceRecordSummary & {
  attendanceDate: string;
  currentStatus: AttendanceStatus;
  originalStatus: AttendanceStatus;
  isCorrected: boolean;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  correctionCount: number;
};

export type AttendanceHistoryDetail = {
  record: AttendanceHistoryRecord;
  corrections: AttendanceCorrection[];
};

export type AttendanceSummary = {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  leaveDays: number;
  halfDayDays: number;
  attendancePercentage: number;
};

export type AttendanceSortBy = "studentName" | "admissionNumber" | "className" | "status" | "date" | "updatedAt";
export type AttendanceSortDirection = "asc" | "desc";

export type AttendanceFilters = Partial<TenantScopedQuery> & {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  classId?: string;
  sectionId?: string;
  studentId?: string;
  status?: AttendanceStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: AttendanceSortBy;
  sortDirection?: AttendanceSortDirection;
};

export type AttendanceHistoryFilters = AttendanceFilters & {
  admissionNumber?: string;
  correctedOnly?: boolean;
  markedBy?: string;
  correctedBy?: string;
};

export type AttendanceListResponse = {
  items: AttendanceRecordSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: AttendanceSummary;
};

export type AttendanceHistoryListResponse = {
  items: AttendanceHistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  correctedCount: number;
  correctionCount: number;
};

export type MarkAttendanceEntry = {
  studentId: string;
  classId: string;
  sectionId: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
};

export type MarkAttendanceInput = TenantScopedQuery & {
  date: string;
  records: MarkAttendanceEntry[];
  markedBy?: string;
  source?: AttendanceSource;
};

export type UpdateAttendanceInput = TenantScopedQuery & {
  id: string;
  status?: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  updatedBy?: string;
};

export type AttendanceCorrectionInput = TenantScopedQuery & {
  attendanceId: string;
  newStatus: AttendanceStatus;
  reason: string;
  correctedBy: string;
};

export type AttendanceCorrectionResult = {
  record: AttendanceRecord;
  correction: AttendanceCorrection;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
};

export type AttendanceSnapshotRepairInput = TenantScopedQuery & {
  attendanceId: string;
  beforeAcademicYearId?: string;
  beforeClassId?: string;
  beforeSectionId?: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
};
