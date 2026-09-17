import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StudentPromotionDashboard } from "@/features/student-promotions/components/student-promotion-management";
import { studentPromotionStatuses } from "@/features/student-promotions/types/student-promotion";
import { academicStructureService } from "@/lib/api/academic-structure";
import { studentPromotionService } from "@/lib/api/student-promotions";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type PromotionSearchParams = {
  sourceAcademicYearId?: string | string[];
  targetAcademicYearId?: string | string[];
  classId?: string | string[];
  sectionId?: string | string[];
  status?: string | string[];
  query?: string | string[];
};

export default async function AcademicPromotionsPage({ searchParams }: { searchParams: Promise<PromotionSearchParams> }) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");

  const params = await searchParams;
  const sourceAcademicYearId = getQueryValue(params.sourceAcademicYearId) ?? tenantContext.academicYearId;
  const targetAcademicYearId = getQueryValue(params.targetAcademicYearId) ?? "ay-2027-28";
  const sourceScope = scope(sourceAcademicYearId);
  const targetScope = scope(targetAcademicYearId);
  const status = getQueryValue(params.status);
  const [academicYears, sourceClasses, sourceSections, promotions] = await Promise.all([
    academicStructureService.getAcademicYears(scope(tenantContext.academicYearId)),
    academicStructureService.getClasses(sourceScope, { includeArchived: true, sortBy: "sortOrder" }),
    academicStructureService.getSections(sourceScope, { includeArchived: true }),
    studentPromotionService.getPromotions(sourceScope, {
      sourceAcademicYearId,
      targetAcademicYearId,
      classId: getQueryValue(params.classId),
      sectionId: getQueryValue(params.sectionId),
      status: isPromotionStatus(status) ? status : undefined,
      query: getQueryValue(params.query),
      page: 1,
      pageSize: 100,
    }),
  ]);
  const targetYears = academicYears.some((year) => year.id === targetAcademicYearId)
    ? academicYears
    : [...academicYears, ...(await academicStructureService.getAcademicYears(targetScope)).filter((year) => year.id === targetAcademicYearId)];

  return (
    <AppShell>
      <StudentPromotionDashboard
        academicClasses={sourceClasses}
        academicYears={targetYears}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        filters={{
          sourceAcademicYearId,
          targetAcademicYearId,
          classId: getQueryValue(params.classId),
          sectionId: getQueryValue(params.sectionId),
          status: isPromotionStatus(status) ? status : undefined,
          query: getQueryValue(params.query),
        }}
        promotions={promotions}
        sections={sourceSections}
      />
    </AppShell>
  );
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

function isPromotionStatus(value?: string): value is (typeof studentPromotionStatuses)[number] {
  return Boolean(value && studentPromotionStatuses.includes(value as (typeof studentPromotionStatuses)[number]));
}
