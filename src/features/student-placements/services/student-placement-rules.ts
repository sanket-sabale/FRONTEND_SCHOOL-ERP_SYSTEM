import type { TenantScopedQuery } from "@/lib/api/client";
import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";
import type { Student } from "@/features/students/types/student";
import type { StudentAcademicPlacement } from "@/features/student-placements/types/student-placement";

export type PlacementRuleResult = { valid: true } | { valid: false; message: string };

export function validatePlacementDates(startDate: string, endDate?: string): PlacementRuleResult {
  if (endDate && endDate < startDate) {
    return { valid: false, message: "Placement end date cannot be before the start date." };
  }

  return { valid: true };
}

export function validateActivePlacementDates(status: StudentAcademicPlacement["status"], endDate?: string): PlacementRuleResult {
  if (status === "active" && endDate) {
    return { valid: false, message: "An active placement should not have an end date." };
  }

  if (status !== "active" && !endDate) {
    return { valid: false, message: "Ended, transferred, or withdrawn placements require an end date." };
  }

  return { valid: true };
}

export function validateStudentInScope(student: Student, scope: TenantScopedQuery): PlacementRuleResult {
  if (!isSameScope(student, scope)) {
    return { valid: false, message: "Student does not belong to the current academic scope." };
  }

  return { valid: true };
}

export function validateStructureInScope(
  academicYear: AcademicYear,
  academicClass: AcademicClass,
  section: Section,
  scope: TenantScopedQuery,
): PlacementRuleResult {
  if (!isSameTenantSchoolCampus(academicYear, scope) || !isSameScope(academicClass, scope) || !isSameScope(section, scope)) {
    return { valid: false, message: "Academic year, class, and section must belong to the same tenant, school, campus, and academic year." };
  }

  if (academicClass.academicYearId !== scope.academicYearId || section.academicYearId !== scope.academicYearId) {
    return { valid: false, message: "Class and section must belong to the selected academic year." };
  }

  if (section.classId !== academicClass.id) {
    return { valid: false, message: "Selected section does not belong to the selected class." };
  }

  return { valid: true };
}

export function validateStructureCanReceivePlacement(
  academicYear: AcademicYear,
  academicClass: AcademicClass,
  section: Section,
): PlacementRuleResult {
  if (academicYear.status === "archived" || academicYear.status === "closed") {
    return { valid: false, message: "Closed or archived academic years cannot receive new active placements." };
  }

  if (academicClass.status === "archived") {
    return { valid: false, message: "Archived classes cannot receive new active placements." };
  }

  if (section.status === "archived") {
    return { valid: false, message: "Archived sections cannot receive new active placements." };
  }

  return { valid: true };
}

export function validateNoDuplicateActivePlacement(
  placements: StudentAcademicPlacement[],
  scope: TenantScopedQuery,
  studentId: string,
  ignoredPlacementId?: string,
): PlacementRuleResult {
  const exists = placements.some(
    (placement) =>
      placement.id !== ignoredPlacementId &&
      placement.studentId === studentId &&
      placement.status === "active" &&
      isSameScope(placement, scope),
  );

  if (exists) {
    return { valid: false, message: "Student already has an active placement for this academic year." };
  }

  return { valid: true };
}

export function validatePlacementCanTransfer(placement: StudentAcademicPlacement): PlacementRuleResult {
  if (placement.status !== "active") {
    return { valid: false, message: "Only an active placement can be transferred." };
  }

  return { valid: true };
}

export function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return (
    record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId
  );
}

function isSameTenantSchoolCampus(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId;
}
