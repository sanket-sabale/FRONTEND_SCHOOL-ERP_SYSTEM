import type { AttendanceStatus } from "@/features/attendance/types/attendance";

export const attendanceRiskLevels = ["healthy", "attention", "critical"] as const;
export type AttendanceRiskLevel = (typeof attendanceRiskLevels)[number];

export type AttendanceReportSortBy =
  | "studentName"
  | "attendancePercentage"
  | "absentDays"
  | "lateDays"
  | "className"
  | "sectionName";

export type AttendanceReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  classId?: string;
  sectionId?: string;
  campusId?: string;
  academicYearId?: string;
  status?: AttendanceStatus;
  correctedOnly?: boolean;
  attendanceThreshold?: number;
  page?: number;
  pageSize?: number;
  sortBy?: AttendanceReportSortBy;
  sortDirection?: "asc" | "desc";
};

export type AttendanceReportSummary = {
  totalStudents: number;
  totalAttendanceRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  halfDayCount: number;
  leaveCount: number;
  attendancePercentage: number;
  absencePercentage: number;
  latePercentage: number;
  correctedRecordCount: number;
  correctionEventCount: number;
  correctedRecordPercentage: number;
};

export type AttendanceDailySummary = {
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  halfDayCount: number;
  leaveCount: number;
  attendancePercentage: number;
  correctedCount: number;
};

export type StudentAttendanceReport = {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  halfDays: number;
  leaveDays: number;
  attendancePercentage: number;
  correctedCount: number;
  riskLevel: AttendanceRiskLevel;
};

export type ClassAttendanceReport = {
  classId: string;
  className: string;
  totalStudents: number;
  attendancePercentage: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  correctedCount: number;
};

export type SectionAttendanceReport = ClassAttendanceReport & {
  sectionId: string;
  sectionName: string;
};

export type AttendanceStatusDistributionItem = {
  status: AttendanceStatus;
  count: number;
  percentage: number;
};

export type AttendanceTrendPoint = {
  date: string;
  attendancePercentage: number;
  absencePercentage: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
};

export type LowAttendanceStudent = {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  attendancePercentage: number;
  absentDays: number;
  totalDays: number;
  threshold: number;
  riskLevel: AttendanceRiskLevel;
};

export type AttendanceCorrectionMetrics = {
  correctedRecordCount: number;
  correctionEventCount: number;
  correctedRecordPercentage: number;
};

export type PaginatedAttendanceReport<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AttendanceReportDashboard = {
  summary: AttendanceReportSummary;
  dailySummaries: AttendanceDailySummary[];
  trend: AttendanceTrendPoint[];
  statusDistribution: AttendanceStatusDistributionItem[];
  studentReports: PaginatedAttendanceReport<StudentAttendanceReport>;
  classReports: PaginatedAttendanceReport<ClassAttendanceReport>;
  sectionReports: PaginatedAttendanceReport<SectionAttendanceReport>;
  lowAttendanceStudents: LowAttendanceStudent[];
  correctionMetrics: AttendanceCorrectionMetrics;
};
