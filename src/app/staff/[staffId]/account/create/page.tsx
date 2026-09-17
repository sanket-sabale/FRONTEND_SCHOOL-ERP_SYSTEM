import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffAccountCreatePage } from "@/features/staff-accounts/components/staff-account-create-page";
import { staffAccountService } from "@/lib/api/staff-accounts";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffAccountCreateRoute({ params }: { params: Promise<{ staffId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.manage")) redirect("/unauthorized");
  const { staffId } = await params;
  if (!isValidStaffId(staffId)) return <AppShell><StaffProfileNotFound message="The staff account create URL is not valid." /></AppShell>;
  const scope = getScope();
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) return <AppShell><StaffProfileNotFound /></AppShell>;
  const accountView = await staffAccountService.getStaffAccountView(scope, staff.id);
  return <AppShell><StaffAccountCreatePage accountView={accountView} staff={staff} /></AppShell>;
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
