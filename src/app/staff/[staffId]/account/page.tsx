import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffAccountPage } from "@/features/staff-accounts/components/staff-account-page";
import { staffAccountService } from "@/lib/api/staff-accounts";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffAccountRoute({ params }: { params: Promise<{ staffId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const { staffId } = await params;
  if (!isValidStaffId(staffId)) return <AppShell><StaffProfileNotFound message="The staff account URL is not valid." /></AppShell>;
  const scope = getScope();
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) return <AppShell><StaffProfileNotFound /></AppShell>;
  const accountView = await staffAccountService.getStaffAccountView(scope, staff.id);
  return <AppShell><StaffAccountPage accountView={accountView} canManage={hasPermission(currentSessionRole, "hr.manage")} staff={staff} /></AppShell>;
}

function getScope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}

function isValidStaffId(value: string) {
  return /^[a-z0-9_-]{3,80}$/i.test(value);
}
