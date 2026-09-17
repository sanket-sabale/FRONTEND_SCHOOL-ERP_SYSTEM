import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StudentPromotionAuditDetail, StudentPromotionAuditNotFound } from "@/features/student-promotions/components/student-promotion-audit-detail";
import { studentPromotionAuditService } from "@/lib/api/student-promotion-audit";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AcademicPromotionAuditDetailPage({ params }: { params: Promise<{ promotionId: string }> }) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");

  const { promotionId } = await params;
  const audit = await studentPromotionAuditService.getPromotionAuditDetail(scope(tenantContext.academicYearId), promotionId);
  if (!audit) {
    return <AppShell><StudentPromotionAuditNotFound /></AppShell>;
  }

  return (
    <AppShell>
      <StudentPromotionAuditDetail
        audit={audit}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
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
