import type { TenantScopedQuery } from "@/lib/api/client";
import type {
  AcademicClass,
  AcademicStructureStatus,
  AcademicYear,
  AcademicYearStatus,
  Section,
} from "@/features/academic-structure/types/academic-structure";

export type RuleResult = { valid: true } | { valid: false; message: string };

export function validateAcademicYearDates(startDate: string, endDate: string): RuleResult {
  if (endDate < startDate) {
    return { valid: false, message: "Academic year end date cannot be before the start date." };
  }

  return { valid: true };
}

export function validateNoDuplicateCurrentAcademicYear(
  years: AcademicYear[],
  scope: TenantScopedQuery,
  ignoredAcademicYearId?: string,
): RuleResult {
  const exists = years.some(
    (year) =>
      year.id !== ignoredAcademicYearId &&
      isSameTenantSchoolCampus(year, scope) &&
      year.isCurrent &&
      year.status !== "archived",
  );

  if (exists) {
    return { valid: false, message: "A current academic year already exists in this campus scope." };
  }

  return { valid: true };
}

export function validateAcademicYearStatusTransition(currentStatus: AcademicYearStatus, nextStatus: AcademicYearStatus): RuleResult {
  if (currentStatus === nextStatus) return { valid: true };

  const allowed: Record<AcademicYearStatus, AcademicYearStatus[]> = {
    draft: ["active", "archived"],
    active: ["closed"],
    closed: ["archived"],
    archived: [],
  };

  if (!allowed[currentStatus].includes(nextStatus)) {
    return { valid: false, message: `Academic year cannot move from ${currentStatus} to ${nextStatus}.` };
  }

  return { valid: true };
}

export function validateAcademicYearCanReceiveClasses(academicYear: AcademicYear): RuleResult {
  if (academicYear.status === "archived") {
    return { valid: false, message: "Cannot create a class in an archived academic year." };
  }

  return { valid: true };
}

export function validateAcademicYearCanBeArchived(academicYear: AcademicYear): RuleResult {
  if (academicYear.status === "active") {
    return { valid: false, message: "Academic year cannot be archived because it is currently active." };
  }

  return { valid: true };
}

export function validateClassStatusTransition(currentStatus: AcademicStructureStatus, nextStatus: AcademicStructureStatus): RuleResult {
  if (currentStatus === nextStatus) return { valid: true };

  const allowed: Record<AcademicStructureStatus, AcademicStructureStatus[]> = {
    active: ["inactive", "archived"],
    inactive: ["active", "archived"],
    archived: [],
  };

  if (!allowed[currentStatus].includes(nextStatus)) {
    return { valid: false, message: `Class cannot move from ${currentStatus} to ${nextStatus}.` };
  }

  return { valid: true };
}

export function validateClassCanBeArchived(academicClass: AcademicClass, sections: Section[]): RuleResult {
  if (academicClass.status === "archived") return { valid: true };

  const hasActiveSections = sections.some((section) => section.classId === academicClass.id && section.status === "active");
  if (hasActiveSections) {
    return { valid: false, message: "Class cannot be archived while active sections are attached." };
  }

  return { valid: true };
}

export function validateUniqueClassCode(
  classes: AcademicClass[],
  scope: TenantScopedQuery,
  code: string,
  ignoredClassId?: string,
): RuleResult {
  const exists = classes.some(
    (academicClass) =>
      academicClass.id !== ignoredClassId &&
      isSameScope(academicClass, scope) &&
      academicClass.code.toLowerCase() === code.toLowerCase() &&
      academicClass.status !== "archived",
  );

  if (exists) {
    return { valid: false, message: "Class code must be unique within the academic year and campus." };
  }

  return { valid: true };
}

export function validateClassCanReceiveSection(academicClass: AcademicClass): RuleResult {
  if (academicClass.status === "archived") {
    return { valid: false, message: "Archived classes cannot accept new sections." };
  }

  return { valid: true };
}

export function validateUniqueSectionName(
  sections: Section[],
  scope: TenantScopedQuery,
  classId: string,
  name: string,
  ignoredSectionId?: string,
): RuleResult {
  const exists = sections.some(
    (section) =>
      section.id !== ignoredSectionId &&
      section.classId === classId &&
      isSameScope(section, scope) &&
      section.name.toLowerCase() === name.toLowerCase() &&
      section.status !== "archived",
  );

  if (exists) {
    return { valid: false, message: "Section name must be unique within its class and academic year." };
  }

  return { valid: true };
}

export function validateSectionCanReceiveStudents(section: Section, academicClass: AcademicClass): RuleResult {
  if (academicClass.status === "archived") {
    return { valid: false, message: "Archived classes cannot receive new student placements." };
  }

  if (section.status === "archived") {
    return { valid: false, message: "Archived sections cannot receive new student placements." };
  }

  return { valid: true };
}

export function validateSectionStatusTransition(currentStatus: AcademicStructureStatus, nextStatus: AcademicStructureStatus): RuleResult {
  if (currentStatus === nextStatus) return { valid: true };

  const allowed: Record<AcademicStructureStatus, AcademicStructureStatus[]> = {
    active: ["inactive", "archived"],
    inactive: ["active", "archived"],
    archived: ["active", "inactive"],
  };

  if (!allowed[currentStatus].includes(nextStatus)) {
    return { valid: false, message: `Section cannot move from ${currentStatus} to ${nextStatus}.` };
  }

  return { valid: true };
}

export function validateClassAndSectionShareScope(academicClass: AcademicClass, sectionScope: TenantScopedQuery): RuleResult {
  if (!isSameScope(academicClass, sectionScope)) {
    return { valid: false, message: "Section class must belong to the same tenant, school, campus, and academic year." };
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

export function isSameTenantSchoolCampus(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId;
}
