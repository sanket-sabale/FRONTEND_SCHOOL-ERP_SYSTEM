import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StudentPromotionAuditDashboard } from "@/features/student-promotions/components/student-promotion-audit-dashboard";
import { studentPromotionAuditSources } from "@/features/student-promotions/types/student-promotion-audit";
import { studentPromotionReasons, studentPromotionStatuses } from "@/features/student-promotions/types/student-promotion";
import { academicStructureService } from "@/lib/api/academic-structure";
import { studentPromotionAuditService } from "@/lib/api/student-promotion-audit";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type AuditSearchParams = {
  search?: string | string[];
  studentId?: string | string[];
  sourceAcademicYearId?: string | string[];
  targetAcademicYearId?: string | string[];
  sourceClassId?: string | string[];
  targetClassId?: string | string[];
  sourceSectionId?: string | string[];
  targetSectionId?: string | string[];
  status?: string | string[];
  reason?: string | string[];
  source?: string | string[];
  batchCorrelationId?: string | string[];
  dateFrom?: string | string[];
  dateTo?: string | string[];
  appliedOnly?: string | string[];
  reviewedOnly?: string | string[];
};

export default async function AcademicPromotionAuditPage({ searchParams }: { searchParams: Promise<AuditSearchParams> }) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");

  const params = await searchParams;
  const filters = sanitizeFilters(params);
  const auditScope = scope(filters.sourceAcademicYearId ?? tenantContext.academicYearId);
  const [audit, academicYears, sourceClasses, sourceSections, targetClasses, targetSections] = await Promise.all([
    studentPromotionAuditService.getPromotionAudit(auditScope, filters),
    academicStructureService.getAcademicYears(scope(tenantContext.academicYearId)),
    academicStructureService.getClasses(scope(filters.sourceAcademicYearId ?? tenantContext.academicYearId), { includeArchived: true, sortBy: "sortOrder" }),
    academicStructureService.getSections(scope(filters.sourceAcademicYearId ?? tenantContext.academicYearId), { includeArchived: true }),
    academicStructureService.getClasses(scope(filters.targetAcademicYearId ?? "ay-2027-28"), { includeArchived: true, sortBy: "sortOrder" }),
    academicStructureService.getSections(scope(filters.targetAcademicYearId ?? "ay-2027-28"), { includeArchived: true }),
  ]);

  return (
    <AppShell>
      <StudentPromotionAuditDashboard
        academicClasses={[...sourceClasses, ...targetClasses.filter((targetClass) => !sourceClasses.some((sourceClass) => sourceClass.id === targetClass.id))]}
        academicYears={academicYears}
        audit={audit}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        filters={filters}
        sections={[...sourceSections, ...targetSections.filter((targetSection) => !sourceSections.some((sourceSection) => sourceSection.id === targetSection.id))]}
      />
    </AppShell>
  );
}

function sanitizeFilters(params: AuditSearchParams) {
  const status = getQueryValue(params.status);
  const reason = getQueryValue(params.reason);
  const source = getQueryValue(params.source);
  return {
    search: clean(getQueryValue(params.search)),
    studentId: clean(getQueryValue(params.studentId)),
    sourceAcademicYearId: clean(getQueryValue(params.sourceAcademicYearId)),
    targetAcademicYearId: clean(getQueryValue(params.targetAcademicYearId)),
    sourceClassId: clean(getQueryValue(params.sourceClassId)),
    targetClassId: clean(getQueryValue(params.targetClassId)),
    sourceSectionId: clean(getQueryValue(params.sourceSectionId)),
    targetSectionId: clean(getQueryValue(params.targetSectionId)),
    status: studentPromotionStatuses.includes(status as (typeof studentPromotionStatuses)[number]) ? status as (typeof studentPromotionStatuses)[number] : undefined,
    reason: studentPromotionReasons.includes(reason as (typeof studentPromotionReasons)[number]) ? reason as (typeof studentPromotionReasons)[number] : undefined,
    source: studentPromotionAuditSources.includes(source as (typeof studentPromotionAuditSources)[number]) ? source as (typeof studentPromotionAuditSources)[number] : undefined,
    batchCorrelationId: clean(getQueryValue(params.batchCorrelationId)),
    dateFrom: isIsoDate(getQueryValue(params.dateFrom)) ? getQueryValue(params.dateFrom) : undefined,
    dateTo: isIsoDate(getQueryValue(params.dateTo)) ? getQueryValue(params.dateTo) : undefined,
    appliedOnly: getQueryValue(params.appliedOnly) === "true",
    reviewedOnly: getQueryValue(params.reviewedOnly) === "true",
    page: 1,
    pageSize: 100,
  };
}

function scope(academicYearId: string) {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId,
  };
}

function getQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function isIsoDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
