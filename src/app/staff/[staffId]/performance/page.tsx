import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffPerformanceWorkspacePage } from "@/features/staff-performance/components/staff-performance-pages";
import { staffPerformanceService } from "@/lib/api/staff-performance";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffPerformanceWorkspaceRoute({ params }: { params: Promise<{ staffId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const { staffId } = await params;
  const scope = getScope();
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) return <AppShell><StaffProfileNotFound /></AppShell>;
  const summary = await staffPerformanceService.getStaffPerformance(scope, staff.id);
  return <AppShell><StaffPerformanceWorkspacePage canManage={hasPermission(currentSessionRole, "hr.manage")} staff={staff} summary={summary} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
