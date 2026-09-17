import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StudentPromotionBatchWorkspace } from "@/features/student-promotions/components/student-promotion-batch-workspace";
import { studentPromotionStatuses } from "@/features/student-promotions/types/student-promotion";
import { studentPromotionService } from "@/lib/api/student-promotions";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type BulkPromotionSearchParams = {
  sourceAcademicYearId?: string | string[];
  targetAcademicYearId?: string | string[];
  status?: string | string[];
  query?: string | string[];
  classId?: string | string[];
  sectionId?: string | string[];
};

export default async function BulkPromotionPreviewPage({ searchParams }: { searchParams: Promise<BulkPromotionSearchParams> }) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");

  const params = await searchParams;
  const sourceAcademicYearId = getQueryValue(params.sourceAcademicYearId) ?? tenantContext.academicYearId;
  const targetAcademicYearId = getQueryValue(params.targetAcademicYearId) ?? "ay-2027-28";
  const status = getQueryValue(params.status);
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: sourceAcademicYearId,
  };
  const promotions = await studentPromotionService.getPromotions(scope, {
    sourceAcademicYearId,
    targetAcademicYearId,
    status: isPromotionStatus(status) ? status : undefined,
    query: getQueryValue(params.query),
    classId: getQueryValue(params.classId),
    sectionId: getQueryValue(params.sectionId),
    page: 1,
    pageSize: 100,
  });

  return (
    <AppShell>
      <StudentPromotionBatchWorkspace
        candidates={promotions.items}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        sourceAcademicYearId={sourceAcademicYearId}
        targetAcademicYearId={targetAcademicYearId}
      />
    </AppShell>
  );
}

function getQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isPromotionStatus(value?: string): value is (typeof studentPromotionStatuses)[number] {
  return Boolean(value && studentPromotionStatuses.includes(value as (typeof studentPromotionStatuses)[number]));
}
