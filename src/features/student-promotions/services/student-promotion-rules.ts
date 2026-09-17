import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";
import type { AcademicRosterSummary, StudentAcademicPlacementReadModel } from "@/features/student-placements/types/student-placement";
import type {
  StudentPromotionValidationCheck,
  StudentPromotionValidationResult,
  TransitionReadiness,
  TransitionReadinessCheck,
  TransitionReadinessSummary,
} from "@/features/student-promotions/types/student-promotion";
import type { TenantScopedQuery } from "@/lib/api/client";

export function isSameTenantSchoolCampus(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId;
}

export function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return isSameTenantSchoolCampus(record, scope) && record.academicYearId === scope.academicYearId;
}

export function buildReadiness(
  sourceYearId: string,
  targetYearId: string,
  sourceYear: AcademicYear | undefined,
  targetYear: AcademicYear | undefined,
  summary: TransitionReadinessSummary,
): TransitionReadiness {
  const checks: TransitionReadinessCheck[] = [];
  checks.push(sourceYear ? pass("source-year", "Source academic year", `${sourceYear.name} is available for transition planning.`) : fail("source-year", "Source academic year", "Source academic year could not be resolved."));
  checks.push(targetYear ? pass("target-year", "Target academic year", `${targetYear.name} is available for transition planning.`) : fail("target-year", "Target academic year", "Target academic year could not be resolved."));
  if (sourceYear && targetYear) {
    checks.push(sourceYear.id !== targetYear.id ? pass("different-years", "Different years", "Source and target academic years are distinct.") : fail("different-years", "Different years", "Source and target academic years must be different."));
    checks.push(targetYear.status === "archived" || targetYear.status === "closed" ? fail("target-open", "Target year can receive placements", "Target academic year is closed or archived.") : pass("target-open", "Target year can receive placements", "Target academic year can receive new placements."));
    checks.push(sourceYear.startDate < targetYear.startDate ? pass("year-order", "Year order", "Target academic year starts after the source year.") : warn("year-order", "Year order", "Target year does not look like a later academic year."));
  }
  checks.push(summary.students > 0 ? pass("students", "Students found", `${summary.students} source-year placement${summary.students === 1 ? "" : "s"} found.`) : warn("students", "Students found", "No active source-year placements were found."));

  return {
    sourceYearId,
    targetYearId,
    ready: checks.every((check) => check.status !== "failed"),
    sourceYear,
    targetYear,
    checks,
    summary,
  };
}

export function validatePromotion({
  existingTargetPlacement,
  placement,
  sourceClass,
  sourceSection,
  targetClass,
  targetRoster,
  targetSection,
  targetYear,
}: {
  placement?: StudentAcademicPlacementReadModel;
  sourceClass?: AcademicClass;
  sourceSection?: Section;
  targetYear?: AcademicYear;
  targetClass?: AcademicClass;
  targetSection?: Section;
  targetRoster?: AcademicRosterSummary;
  existingTargetPlacement?: StudentAcademicPlacementReadModel;
}): StudentPromotionValidationResult {
  const checks: StudentPromotionValidationCheck[] = [];
  checks.push(placement ? passCheck("source-placement", "Source placement", "Student has a readable source-year placement.") : failCheck("source-placement", "Source placement", "Student does not have a readable source-year placement."));
  checks.push(placement?.status === "active" ? passCheck("source-active", "Source placement active", "Source placement is active.") : failCheck("source-active", "Source placement active", "Source placement is not active."));
  checks.push(sourceClass ? passCheck("source-class", "Source class", "Source class exists.") : failCheck("source-class", "Source class", "Source class could not be resolved."));
  checks.push(sourceSection ? passCheck("source-section", "Source section", "Source section exists.") : failCheck("source-section", "Source section", "Source section could not be resolved."));
  checks.push(sourceClass && sourceSection && sourceSection.classId === sourceClass.id ? passCheck("source-chain", "Source chain", "Source section belongs to source class.") : failCheck("source-chain", "Source chain", "Source section does not belong to source class."));
  checks.push(targetYear ? passCheck("target-year", "Target year", "Target academic year exists.") : failCheck("target-year", "Target year", "Target academic year could not be resolved."));
  if (targetYear) {
    checks.push(targetYear.status === "archived" || targetYear.status === "closed" ? failCheck("target-open", "Target year open", "Target academic year is closed or archived.") : passCheck("target-open", "Target year open", "Target academic year can receive placements."));
  }
  checks.push(targetClass ? passCheck("target-class", "Target class", "Target class exists.") : failCheck("target-class", "Target class", "Target class must be selected."));
  checks.push(targetSection ? passCheck("target-section", "Target section", "Target section exists.") : failCheck("target-section", "Target section", "Target section must be selected."));
  if (targetClass && targetSection) {
    checks.push(targetSection.classId === targetClass.id ? passCheck("target-chain", "Target chain", "Target section belongs to target class.") : failCheck("target-chain", "Target chain", "Target section does not belong to target class."));
    checks.push(targetClass.status === "active" && targetSection.status === "active" ? passCheck("target-active", "Target structure active", "Target class and section are active.") : failCheck("target-active", "Target structure active", "Target class or section is inactive/archived."));
  }
  checks.push(existingTargetPlacement ? failCheck("target-duplicate", "No target-year placement", "Student already has an active placement in the target academic year.") : passCheck("target-duplicate", "No target-year placement", "No active target-year placement exists."));
  if (targetSection?.capacity && targetRoster) {
    checks.push(targetRoster.activeStudentCount < targetSection.capacity ? passCheck("capacity", "Section capacity", `${targetRoster.activeStudentCount}/${targetSection.capacity} active students in target section.`) : failCheck("capacity", "Section capacity", `Target section is at capacity (${targetRoster.activeStudentCount}/${targetSection.capacity}).`));
  } else if (targetSection?.capacity) {
    checks.push(warnCheck("capacity", "Section capacity", "Capacity exists but current roster could not be fully evaluated."));
  }

  return {
    valid: checks.every((check) => check.status !== "failed"),
    requiresReview: checks.some((check) => check.status !== "passed"),
    checks,
  };
}

export function proposeNextClass(sourceClass: AcademicClass, targetClasses: AcademicClass[]) {
  const sourceNumber = extractClassNumber(sourceClass.displayName) ?? extractClassNumber(sourceClass.code);
  if (sourceNumber === undefined) return undefined;
  return targetClasses.find((targetClass) => {
    const targetNumber = extractClassNumber(targetClass.displayName) ?? extractClassNumber(targetClass.code);
    return targetNumber === sourceNumber + 1;
  });
}

export function proposeMatchingSection(sourceSection: Section, targetSections: Section[]) {
  return targetSections.find((section) => section.name.toLowerCase() === sourceSection.name.toLowerCase() || section.displayName.toLowerCase() === sourceSection.displayName.toLowerCase());
}

function extractClassNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function pass(key: string, label: string, message: string): TransitionReadinessCheck {
  return { key, label, status: "passed", severity: "info", message };
}

function warn(key: string, label: string, message: string): TransitionReadinessCheck {
  return { key, label, status: "warning", severity: "warning", message };
}

function fail(key: string, label: string, message: string): TransitionReadinessCheck {
  return { key, label, status: "failed", severity: "critical", message };
}

function passCheck(key: string, label: string, message: string): StudentPromotionValidationCheck {
  return { key, label, status: "passed", message };
}

function warnCheck(key: string, label: string, message: string): StudentPromotionValidationCheck {
  return { key, label, status: "warning", message };
}

function failCheck(key: string, label: string, message: string): StudentPromotionValidationCheck {
  return { key, label, status: "failed", message };
}
