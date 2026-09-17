import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffHrOperationsPage } from "@/features/staff-performance/components/staff-performance-pages";
import { staffPerformanceService } from "@/lib/api/staff-performance";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffHrOperationsRoute({ searchParams }: { searchParams: Promise<{ staffId?: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const query = await searchParams;
  const scope = getScope();
  const staffId = query.staffId ?? "staff-001";
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) redirect("/staff");
  const data = await staffPerformanceService.getStaffHrOperations(scope, staff.id);
  return <AppShell><StaffHrOperationsPage canManage={hasPermission(currentSessionRole, "hr.manage")} disciplinaryRecords={data.disciplinaryRecords} notes={data.notes} staff={staff} timeline={data.timeline} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
