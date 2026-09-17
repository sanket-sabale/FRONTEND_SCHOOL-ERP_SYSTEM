import type { TenantScopedQuery } from "@/lib/api/client";
import type { AttendanceAcademicSnapshot, AttendanceSnapshotIntegrityStatus } from "@/features/attendance/types/attendance-integrity";
import type { AttendanceRepairStatus } from "@/features/attendance/types/attendance-repair";

export const attendanceRepairAuditEventTypes = [
  "diagnostic_detected",
  "repair_request_created",
  "repair_request_rejected",
  "repair_request_approved",
  "repair_request_applied",
  "repair_request_failed",
  "manual_review_required",
  "repair_skipped",
  "repair_stale",
  "batch_prepared",
] as const;

export type AttendanceRepairAuditEventType = (typeof attendanceRepairAuditEventTypes)[number];

export const attendanceRepairAuditSources = ["individual", "bulk_preparation", "diagnostic"] as const;
export type AttendanceRepairAuditSource = (typeof attendanceRepairAuditSources)[number];

export type AttendanceRepairAuditEvent = {
  eventId: string;
  attendanceId: string;
  repairId?: string;
  eventType: AttendanceRepairAuditEventType;
  actorId?: string;
  actorDisplayName?: string;
  timestamp?: string;
  reason?: string;
  comment?: string;
  beforeSnapshot?: AttendanceAcademicSnapshot;
  afterSnapshot?: AttendanceAcademicSnapshot;
  academicContextSource?: "stored_snapshot" | "resolved_placement_fallback";
  integrityStatus?: AttendanceSnapshotIntegrityStatus;
  repairStatus?: AttendanceRepairStatus;
  batchCorrelationId?: string;
};

export type AttendanceRepairAuditRecord = {
  attendanceId: string;
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  attendanceDate?: string;
  attendanceStatus?: string;
  remarks?: string;
  integrityStatus?: AttendanceSnapshotIntegrityStatus;
  integrityReason?: string;
  currentSnapshot: AttendanceAcademicSnapshot;
  resolvedSnapshot?: AttendanceAcademicSnapshot;
  proposedSnapshot?: AttendanceAcademicSnapshot;
  repairId?: string;
  repairStatus?: AttendanceRepairStatus;
  source: AttendanceRepairAuditSource;
  batchCorrelationId?: string;
  lastEventType?: AttendanceRepairAuditEventType;
  lastActorId?: string;
  lastUpdatedAt?: string;
  events: AttendanceRepairAuditEvent[];
};

export type AttendanceRepairAuditSummary = {
  totalRecords: number;
  totalIntegrityIssues: number;
  deterministicCandidates: number;
  pendingReview: number;
  approved: number;
  applied: number;
  rejected: number;
  failed: number;
  manualReview: number;
  staleOrSkipped: number;
  repairedRecords: number;
  recordsRequiringAttention: number;
  bulkPreparedRequests: number;
};

export type AttendanceRepairAuditFilters = Partial<TenantScopedQuery> & {
  dateFrom?: string;
  dateTo?: string;
  eventDateFrom?: string;
  eventDateTo?: string;
  studentId?: string;
  classId?: string;
  sectionId?: string;
  integrityStatus?: AttendanceSnapshotIntegrityStatus;
  repairStatus?: AttendanceRepairStatus;
  eventType?: AttendanceRepairAuditEventType;
  actorId?: string;
  batchCorrelationId?: string;
  source?: AttendanceRepairAuditSource;
  repairedOnly?: boolean;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type AttendanceRepairAuditListResponse = {
  items: AttendanceRepairAuditRecord[];
  summary: AttendanceRepairAuditSummary;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AttendanceRepairAuditDetail = {
  record: AttendanceRepairAuditRecord;
  timeline: AttendanceRepairAuditEvent[];
};

export type AttendanceRepairAuditExportRequest = {
  filters: AttendanceRepairAuditFilters;
  includedFields: string[];
  requestedBy?: string;
};

export type AttendanceRepairAuditExportPreview = {
  recordCount: number;
  selectedFilters: AttendanceRepairAuditFilters;
  includedFields: string[];
  generatedAt: string;
};
