import type { TenantScopedQuery } from "@/lib/api/client";
import type { AttendanceAcademicSnapshot, AttendanceSnapshotIntegrityStatus } from "@/features/attendance/types/attendance-integrity";

export const attendanceRepairStatuses = [
  "pending_review",
  "approved",
  "rejected",
  "applied",
  "failed",
  "requires_manual_review",
] as const;

export type AttendanceRepairStatus = (typeof attendanceRepairStatuses)[number];

export type AttendanceSnapshotRepairRequest = TenantScopedQuery & {
  id: string;
  attendanceId: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  attendanceDate: string;
  attendanceStatus?: string;
  requestedBy: string;
  requestedAt: string;
  source?: "individual" | "bulk_preparation";
  batchCorrelationId?: string;
  integrityStatus: AttendanceSnapshotIntegrityStatus;
  currentSnapshot: AttendanceAcademicSnapshot;
  proposedSnapshot: AttendanceAcademicSnapshot;
  reason: string;
  confidence: "low" | "medium" | "high";
  status: AttendanceRepairStatus;
  reviewerId?: string;
  reviewedAt?: string;
  reviewComment?: string;
  appliedBy?: string;
  appliedAt?: string;
  failureReason?: string;
};

export type AttendanceSnapshotRepairEvent = TenantScopedQuery & {
  id: string;
  repairId: string;
  attendanceId: string;
  beforeSnapshot: AttendanceAcademicSnapshot;
  afterSnapshot: AttendanceAcademicSnapshot;
  requestedBy: string;
  approvedBy?: string;
  appliedBy: string;
  requestedAt: string;
  approvedAt?: string;
  appliedAt: string;
  reviewComment?: string;
  repairReason: string;
};

export type AttendanceRepairFilters = Partial<TenantScopedQuery> & {
  status?: AttendanceRepairStatus;
  integrityStatus?: AttendanceSnapshotIntegrityStatus;
  studentId?: string;
  classId?: string;
  sectionId?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type AttendanceRepairQueueResponse = {
  items: AttendanceSnapshotRepairRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AttendanceRepairMutationInput = TenantScopedQuery & {
  repairId: string;
  actorId: string;
  comment?: string;
};

export type AttendanceRepairCreateInput = TenantScopedQuery & {
  attendanceId: string;
  requestedBy: string;
  reason: string;
  source?: "individual" | "bulk_preparation";
  batchCorrelationId?: string;
};
