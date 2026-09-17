import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffLeaveDashboard } from "@/features/staff-leave/components/staff-leave-dashboard";
import { staffLeaveService } from "@/lib/api/staff-leave";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffLeavePage() {
  if (!hasPermission(currentSessionRole, "hr.view")) {
    redirect("/unauthorized");
  }

  const scope = getScope();
  const [staff, leaveTypes, requests] = await Promise.all([
    staffService.listStaff(scope, { pageSize: 100, sortBy: "displayName", sortDirection: "asc" }),
    staffLeaveService.getLeaveTypes(scope),
    staffLeaveService.listRequests(scope, { pageSize: 50 }),
  ]);
  const activeStaff = staff.items.filter((item) => !["inactive", "resigned", "terminated", "retired"].includes(item.status));
  const balances = (await Promise.all(activeStaff.map((item) => staffLeaveService.getLeaveBalances(scope, item.id)))).flat();

  return (
    <AppShell>
      <StaffLeaveDashboard
        balances={balances}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        leaveTypes={leaveTypes}
        requests={requests}
        staff={activeStaff}
      />
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
