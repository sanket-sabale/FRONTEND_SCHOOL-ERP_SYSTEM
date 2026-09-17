import { academicStructureService } from "@/lib/api/academic-structure";
import { attendanceService } from "@/lib/api/attendance";
import { studentPlacementService } from "@/lib/api/student-placements";
import { studentService } from "@/lib/api/students";
import type { TenantScopedQuery } from "@/lib/api/client";
import { buildMigrationReadiness, evaluateSnapshotIntegrity } from "@/features/attendance/services/attendance-integrity-rules";
import type {
  AttendanceMigrationReadiness,
  AttendanceSnapshotIntegrityListResponse,
  AttendanceSnapshotIntegrityResult,
} from "@/features/attendance/types/attendance-integrity";
import type { AttendanceRecord } from "@/features/attendance/types/attendance";

export const attendanceIntegrityService = {
  async getAttendanceSnapshotIntegrity(scope: TenantScopedQuery): Promise<AttendanceSnapshotIntegrityListResponse> {
    const records = await attendanceService.getAttendanceSnapshotRecords(scope);
    const items = await Promise.all(records.map((record) => inspectRecord(scope, record)));
    const sorted = items.sort((first, second) => {
      const severityOrder = severityRank(second.severity) - severityRank(first.severity);
      return severityOrder || second.attendanceDate.localeCompare(first.attendanceDate);
    });
    const migrationReadiness = buildMigrationReadiness(sorted);

    return {
      items: sorted,
      summary: {
        totalRecords: migrationReadiness.totalRecords,
        validRecords: migrationReadiness.validRecords,
        warningRecords: migrationReadiness.warningRecords,
        blockedRecords: migrationReadiness.blockedRecords,
        missingSnapshotRecords: migrationReadiness.missingSnapshotRecords,
        invalidSnapshotRecords: migrationReadiness.invalidSnapshotRecords,
        repairableRecords: migrationReadiness.repairableRecords,
        manualReviewRecords: migrationReadiness.manualReviewRecords,
        unresolvedRecords: migrationReadiness.unresolvedRecords,
        readinessPercentage: migrationReadiness.readinessPercentage,
      },
      migrationReadiness,
    };
  },

  async getAttendanceSnapshotIntegrityDetail(scope: TenantScopedQuery, attendanceId: string): Promise<AttendanceSnapshotIntegrityResult | null> {
    const record = await attendanceService.getAttendanceSnapshotRecord(scope, attendanceId);
    if (!record) return null;
    return inspectRecord(scope, record);
  },

  async getAttendanceIntegritySummary(scope: TenantScopedQuery) {
    const diagnostics = await this.getAttendanceSnapshotIntegrity(scope);
    return diagnostics.summary;
  },

  async getAttendanceMigrationReadiness(scope: TenantScopedQuery): Promise<AttendanceMigrationReadiness> {
    const diagnostics = await this.getAttendanceSnapshotIntegrity(scope);
    return diagnostics.migrationReadiness;
  },
};

async function inspectRecord(scope: TenantScopedQuery, record: AttendanceRecord): Promise<AttendanceSnapshotIntegrityResult> {
  const recordScope = { ...scope, academicYearId: record.academicYearId };
  const [student, academicYear, academicClass, section, placementCandidates] = await Promise.all([
    studentService.getStudent(recordScope, record.studentId),
    academicStructureService.getAcademicYear(recordScope, record.academicYearId),
    record.classId ? academicStructureService.getClass(recordScope, record.classId) : Promise.resolve(null),
    record.sectionId ? academicStructureService.getSection(recordScope, record.sectionId) : Promise.resolve(null),
    studentPlacementService.getEffectiveStudentPlacementCandidates(recordScope, record.studentId, record.date).catch(() => []),
  ]);

  return evaluateSnapshotIntegrity({
    record,
    academicYear,
    academicClass,
    section,
    placementCandidates,
    studentName: student?.displayName,
    admissionNumber: student?.admissionNumber,
  });
}

function severityRank(severity: AttendanceSnapshotIntegrityResult["severity"]) {
  if (severity === "blocked") return 3;
  if (severity === "warning") return 2;
  return 1;
}
