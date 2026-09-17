import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { academicStructureService } from "@/lib/api/academic-structure";
import { studentPlacementService } from "@/lib/api/student-placements";
import type { AttendanceRecord } from "@/features/attendance/types/attendance";

export type AttendanceAcademicContext = {
  academicYearId: string;
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  placementId?: string;
  source: "stored_snapshot" | "resolved_placement_fallback";
};

export async function resolveAttendanceAcademicContext(
  scope: TenantScopedQuery,
  studentId: string,
  attendanceDate: string,
): Promise<AttendanceAcademicContext> {
  const placement = await studentPlacementService.getEffectiveStudentPlacement(scope, studentId, attendanceDate);
  if (!placement) {
    throw new ApiError(422, "Student has no active placement for this attendance date.");
  }
  if (placement.academicYearId !== scope.academicYearId) {
    throw new ApiError(422, "Student placement does not belong to the active attendance academic year.");
  }

  const placementScope = { ...scope, academicYearId: placement.academicYearId };
  const [academicClass, section] = await Promise.all([
    academicStructureService.getClass(placementScope, placement.classId),
    academicStructureService.getSection(placementScope, placement.sectionId),
  ]);

  if (!academicClass || !section) {
    throw new ApiError(422, "Student placement references an academic class or section that is not available.");
  }

  if (section.classId !== academicClass.id) {
    throw new ApiError(422, "Student placement section does not belong to the resolved class.");
  }

  return {
    academicYearId: placement.academicYearId,
    classId: academicClass.id,
    sectionId: section.id,
    className: academicClass.displayName,
    sectionName: section.displayName,
    placementId: placement.id,
    source: "resolved_placement_fallback",
  };
}

export async function resolveAttendanceRecordAcademicContext(
  scope: TenantScopedQuery,
  record: Pick<AttendanceRecord, "studentId" | "classId" | "sectionId" | "date">,
): Promise<AttendanceAcademicContext> {
  const snapshot = await resolveSnapshotContext(scope, record);
  if (snapshot) return snapshot;

  try {
    return await resolveAttendanceAcademicContext(scope, record.studentId, record.date);
  } catch {
    return {
      academicYearId: scope.academicYearId,
      classId: record.classId,
      sectionId: record.sectionId,
      className: "Unresolved class",
      sectionName: "Unresolved section",
      source: "resolved_placement_fallback",
    };
  }
}

export async function validateAttendanceContextMatchesRequest(
  scope: TenantScopedQuery,
  studentId: string,
  attendanceDate: string,
  requestedClassId: string,
  requestedSectionId: string,
) {
  const context = await resolveAttendanceAcademicContext(scope, studentId, attendanceDate);
  if (context.classId !== requestedClassId || context.sectionId !== requestedSectionId) {
    throw new ApiError(422, "Attendance class and section must match the student's placement effective on the attendance date.");
  }

  return context;
}

async function resolveSnapshotContext(
  scope: TenantScopedQuery,
  record: Pick<AttendanceRecord, "classId" | "sectionId">,
): Promise<AttendanceAcademicContext | null> {
  const [academicClass, section] = await Promise.all([
    academicStructureService.getClass(scope, record.classId),
    academicStructureService.getSection(scope, record.sectionId),
  ]);

  if (!academicClass || !section || section.classId !== academicClass.id) return null;

  return {
    academicYearId: scope.academicYearId,
    classId: academicClass.id,
    sectionId: section.id,
    className: academicClass.displayName,
    sectionName: section.displayName,
    source: "stored_snapshot",
  };
}
