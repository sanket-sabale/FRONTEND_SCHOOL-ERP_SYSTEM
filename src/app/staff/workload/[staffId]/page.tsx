import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffWorkloadDetailPage } from "@/features/staff-workload/components/staff-workload-pages";
import { staffWorkloadService } from "@/lib/api/staff-workload";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffWorkloadDetailRoute({ params }: { params: Promise<{ staffId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const { staffId } = await params;
  if (!/^[a-z0-9_-]{3,80}$/i.test(staffId)) {
    return (
      <AppShell>
        <StaffProfileNotFound message="The workload URL is not valid. Return to the workload dashboard and select a staff member." />
      </AppShell>
    );
  }
  const detail = await staffWorkloadService.getStaffWorkload(getScope(), staffId);
  if (!detail) {
    return (
      <AppShell>
        <StaffProfileNotFound message="Workload information could not be found for this staff member in the current school context." />
      </AppShell>
    );
  }
  return (
    <AppShell>
      <StaffWorkloadDetailPage canManage={hasPermission(currentSessionRole, "hr.manage")} detail={detail} />
    </AppShell>
  );
}

function getScope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}
