import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StudentPromotionDetail, StudentPromotionNotFound } from "@/features/student-promotions/components/student-promotion-detail";
import { academicStructureService } from "@/lib/api/academic-structure";
import { studentPromotionService } from "@/lib/api/student-promotions";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AcademicPromotionDetailPage({ params }: { params: Promise<{ promotionId: string }> }) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");

  const { promotionId } = await params;
  const baseScope = scope(tenantContext.academicYearId);
  const promotion = isSafeId(promotionId) ? await studentPromotionService.getPromotion(baseScope, promotionId) : null;
  if (!promotion) {
    return <AppShell><StudentPromotionNotFound /></AppShell>;
  }
  const targetScope = scope(promotion.targetAcademicYearId);
  const [targetClasses, targetSections] = await Promise.all([
    academicStructureService.getClasses(targetScope, { status: "active", sortBy: "sortOrder" }),
    academicStructureService.getSections(targetScope, { status: "active" }),
  ]);

  return (
    <AppShell>
      <StudentPromotionDetail
        academicClasses={targetClasses}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        promotion={promotion}
        sections={targetSections}
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

function isSafeId(value: string) {
  return /^[a-z0-9_-]{3,160}$/i.test(value);
}
