import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";
import type {
  AttendanceAcademicSnapshot,
  AttendanceMigrationReadiness,
  AttendanceSnapshotIntegrityResult,
  AttendanceSnapshotIntegritySeverity,
  AttendanceSnapshotIntegrityStatus,
  AttendanceSnapshotRepairPlan,
} from "@/features/attendance/types/attendance-integrity";
import type { AttendanceRecord } from "@/features/attendance/types/attendance";
import type { StudentAcademicPlacementReadModel } from "@/features/student-placements/types/student-placement";

export function getIntegritySeverity(status: AttendanceSnapshotIntegrityStatus): AttendanceSnapshotIntegritySeverity {
  if (status === "valid") return "ok";
  if (status === "archived_structure_reference" || status === "placement_mismatch") return "warning";
  return "blocked";
}

export function evaluateSnapshotIntegrity(input: {
  record: AttendanceRecord;
  academicYear?: AcademicYear | null;
  academicClass?: AcademicClass | null;
  section?: Section | null;
  placementCandidates: StudentAcademicPlacementReadModel[];
  studentName?: string;
  admissionNumber?: string;
}): AttendanceSnapshotIntegrityResult {
  const { record, academicYear, academicClass, section, placementCandidates, studentName, admissionNumber } = input;
  const storedSnapshot = buildStoredSnapshot(record, academicYear, academicClass, section);
  const resolvedPlacement = placementCandidates.length === 1 ? buildResolvedSnapshot(placementCandidates[0]) : undefined;
  const base = {
    attendanceId: record.id,
    studentId: record.studentId,
    studentName,
    admissionNumber,
    attendanceDate: record.date,
    attendanceStatus: record.status,
    storedSnapshot,
    resolvedPlacement,
  };

  if (placementCandidates.length > 1) {
    return withPlan(base, "unresolved", "Multiple placements are effective for this attendance date. Manual review is required.", false);
  }

  if (!record.classId || !record.sectionId || !record.academicYearId) {
    return withPlan(base, "missing_snapshot", "Attendance record is missing one or more stored academic snapshot identifiers.", Boolean(resolvedPlacement));
  }

  if (!academicYear || academicYear.id !== record.academicYearId) {
    return withPlan(base, "academic_year_mismatch", "Stored academic year could not be resolved in the active tenant, school, and campus scope.", Boolean(resolvedPlacement));
  }

  if (!academicClass) {
    return withPlan(base, "invalid_class", "Stored class could not be resolved in the attendance academic scope.", Boolean(resolvedPlacement));
  }

  if (!section) {
    return withPlan(base, "invalid_section", "Stored section could not be resolved in the attendance academic scope.", Boolean(resolvedPlacement));
  }

  if (!sameTenantSchoolCampus(record, academicClass) || !sameTenantSchoolCampus(record, section)) {
    return withPlan(base, "scope_mismatch", "Stored class or section belongs to a different tenant, school, or campus.", false);
  }

  if (academicClass.academicYearId !== record.academicYearId || section.academicYearId !== record.academicYearId) {
    return withPlan(base, "academic_year_mismatch", "Stored class or section belongs to a different academic year.", Boolean(resolvedPlacement));
  }

  if (section.classId !== academicClass.id) {
    return withPlan(base, "class_section_mismatch", "Stored section does not belong to the stored class.", Boolean(resolvedPlacement));
  }

  if (resolvedPlacement && (resolvedPlacement.classId !== record.classId || resolvedPlacement.sectionId !== record.sectionId || resolvedPlacement.academicYearId !== record.academicYearId)) {
    return withPlan(base, "placement_mismatch", "Stored attendance snapshot differs from the placement effective on the attendance date. Keep the snapshot immutable and review placement history before repair.", false);
  }

  if (academicClass.status === "archived" || section.status === "archived") {
    return withPlan(base, "archived_structure_reference", "Stored snapshot references archived academic structure. Historical records remain readable; archive status alone is not corruption.", false);
  }

  return withPlan(base, "valid", "Stored attendance academic snapshot is complete and consistent.", false);
}

export function buildMigrationReadiness(results: AttendanceSnapshotIntegrityResult[]): AttendanceMigrationReadiness {
  const totalRecords = results.length;
  const validLike = results.filter((result) => result.status === "valid" || result.status === "archived_structure_reference").length;
  const validRecords = results.filter((result) => result.status === "valid").length;
  const warningRecords = results.filter((result) => result.severity === "warning").length;
  const blockedRecords = results.filter((result) => result.severity === "blocked").length;
  const missingSnapshotRecords = results.filter((result) => result.status === "missing_snapshot").length;
  const unresolvedRecords = results.filter((result) => result.status === "unresolved").length;
  const repairableRecords = results.filter((result) => result.repairPlan.repairability === "repairable").length;
  const manualReviewRecords = results.filter((result) => result.repairPlan.requiresManualReview).length;
  const invalidSnapshotRecords = results.filter((result) => result.severity === "blocked" && result.status !== "missing_snapshot").length;
  const nonRepairableRecords = results.filter((result) => result.repairPlan.repairability === "not_repairable").length;

  return {
    totalRecords,
    validRecords,
    warningRecords,
    blockedRecords,
    missingSnapshotRecords,
    invalidSnapshotRecords,
    repairableRecords,
    manualReviewRecords,
    unresolvedRecords,
    readinessPercentage: totalRecords ? Math.round((validLike / totalRecords) * 1000) / 10 : 100,
    alreadyMigratedRecords: validLike,
    legacyRecords: missingSnapshotRecords + invalidSnapshotRecords + unresolvedRecords,
    nonRepairableRecords,
    blockingIssues: summarizeIssues(results, "blocked"),
    warnings: summarizeIssues(results, "warning"),
  };
}

function withPlan(
  base: Omit<AttendanceSnapshotIntegrityResult, "status" | "severity" | "reason" | "repairPossible" | "automaticRepairSafe" | "repairPlan">,
  status: AttendanceSnapshotIntegrityStatus,
  reason: string,
  canProposeRepair: boolean,
): AttendanceSnapshotIntegrityResult {
  const severity = getIntegritySeverity(status);
  const repairPlan = buildRepairPlan(base.attendanceId, base.storedSnapshot, base.resolvedPlacement, status, reason, canProposeRepair);

  return {
    ...base,
    status,
    severity,
    reason,
    repairPossible: repairPlan.repairability === "repairable",
    automaticRepairSafe: repairPlan.automaticRepairSafe,
    repairPlan,
  };
}

function buildRepairPlan(
  attendanceId: string,
  currentSnapshot: AttendanceAcademicSnapshot,
  proposedSnapshot: AttendanceAcademicSnapshot | undefined,
  status: AttendanceSnapshotIntegrityStatus,
  reason: string,
  canProposeRepair: boolean,
): AttendanceSnapshotRepairPlan {
  if (status === "valid" || status === "archived_structure_reference") {
    return {
      attendanceId,
      currentSnapshot,
      repairability: "not_needed",
      reason: "No repair is required for this attendance snapshot.",
      confidence: "none",
      requiresManualReview: false,
      automaticRepairSafe: false,
    };
  }

  if (canProposeRepair && proposedSnapshot) {
    return {
      attendanceId,
      currentSnapshot,
      proposedSnapshot,
      repairability: status === "missing_snapshot" ? "repairable" : "manual_review",
      reason,
      confidence: status === "missing_snapshot" ? "high" : "medium",
      requiresManualReview: status !== "missing_snapshot",
      automaticRepairSafe: status === "missing_snapshot",
    };
  }

  return {
    attendanceId,
    currentSnapshot,
    repairability: status === "unresolved" ? "manual_review" : "not_repairable",
    reason,
    confidence: "none",
    requiresManualReview: true,
    automaticRepairSafe: false,
  };
}

function buildStoredSnapshot(
  record: AttendanceRecord,
  academicYear?: AcademicYear | null,
  academicClass?: AcademicClass | null,
  section?: Section | null,
): AttendanceAcademicSnapshot {
  return {
    academicYearId: record.academicYearId,
    academicYearName: academicYear?.name,
    classId: record.classId || undefined,
    className: academicClass?.displayName,
    sectionId: record.sectionId || undefined,
    sectionName: section?.displayName,
  };
}

function buildResolvedSnapshot(placement: StudentAcademicPlacementReadModel): AttendanceAcademicSnapshot {
  return {
    academicYearId: placement.academicYearId,
    academicYearName: placement.academicYearName,
    classId: placement.classId,
    className: placement.className,
    sectionId: placement.sectionId,
    sectionName: placement.sectionName,
    placementId: placement.id,
  };
}

function sameTenantSchoolCampus(first: AttendanceRecord, second: { tenantId: string; schoolId: string; campusId: string }) {
  return first.tenantId === second.tenantId && first.schoolId === second.schoolId && first.campusId === second.campusId;
}

function summarizeIssues(results: AttendanceSnapshotIntegrityResult[], severity: "blocked" | "warning") {
  return Array.from(new Set(results.filter((result) => result.severity === severity).map((result) => result.reason))).slice(0, 6);
}
