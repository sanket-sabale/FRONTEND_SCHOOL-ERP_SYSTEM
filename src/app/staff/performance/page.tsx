import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffPerformanceDashboardPage } from "@/features/staff-performance/components/staff-performance-pages";
import { staffPerformanceService } from "@/lib/api/staff-performance";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffPerformanceRoute() {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const scope = getScope();
  const [dashboard, reviews] = await Promise.all([
    staffPerformanceService.getDashboard(scope),
    staffPerformanceService.listReviews(scope, { page: 1, pageSize: 8 }),
  ]);
  return <AppShell><StaffPerformanceDashboardPage dashboard={dashboard} reviews={reviews} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
