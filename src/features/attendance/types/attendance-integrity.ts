import type { AttendanceRecordSummary } from "@/features/attendance/types/attendance";

export const attendanceSnapshotIntegrityStatuses = [
  "valid",
  "missing_snapshot",
  "invalid_class",
  "invalid_section",
  "class_section_mismatch",
  "scope_mismatch",
  "placement_mismatch",
  "academic_year_mismatch",
  "archived_structure_reference",
  "unresolved",
] as const;

export type AttendanceSnapshotIntegrityStatus = (typeof attendanceSnapshotIntegrityStatuses)[number];
export type AttendanceSnapshotIntegritySeverity = "ok" | "warning" | "blocked";
export type AttendanceSnapshotRepairability = "not_needed" | "repairable" | "manual_review" | "not_repairable";

export type AttendanceAcademicSnapshot = {
  academicYearId?: string;
  academicYearName?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  placementId?: string;
};

export type AttendanceSnapshotRepairPlan = {
  attendanceId: string;
  currentSnapshot: AttendanceAcademicSnapshot;
  proposedSnapshot?: AttendanceAcademicSnapshot;
  repairability: AttendanceSnapshotRepairability;
  reason: string;
  confidence: "none" | "low" | "medium" | "high";
  requiresManualReview: boolean;
  automaticRepairSafe: boolean;
};

export type AttendanceSnapshotIntegrityResult = {
  attendanceId: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  attendanceDate: string;
  attendanceStatus?: AttendanceRecordSummary["status"];
  storedSnapshot: AttendanceAcademicSnapshot;
  resolvedPlacement?: AttendanceAcademicSnapshot;
  status: AttendanceSnapshotIntegrityStatus;
  severity: AttendanceSnapshotIntegritySeverity;
  reason: string;
  repairPossible: boolean;
  automaticRepairSafe: boolean;
  repairPlan: AttendanceSnapshotRepairPlan;
};

export type AttendanceIntegritySummary = {
  totalRecords: number;
  validRecords: number;
  warningRecords: number;
  blockedRecords: number;
  missingSnapshotRecords: number;
  invalidSnapshotRecords: number;
  repairableRecords: number;
  manualReviewRecords: number;
  unresolvedRecords: number;
  readinessPercentage: number;
};

export type AttendanceMigrationReadiness = AttendanceIntegritySummary & {
  alreadyMigratedRecords: number;
  legacyRecords: number;
  nonRepairableRecords: number;
  blockingIssues: string[];
  warnings: string[];
};

export type AttendanceSnapshotIntegrityListResponse = {
  items: AttendanceSnapshotIntegrityResult[];
  summary: AttendanceIntegritySummary;
  migrationReadiness: AttendanceMigrationReadiness;
};
