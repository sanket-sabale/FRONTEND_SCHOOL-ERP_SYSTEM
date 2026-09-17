import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffAssignmentsForProfilePage } from "@/features/staff-academic-assignments/components/staff-academic-assignment-pages";
import { staffAcademicAssignmentService } from "@/lib/api/staff-academic-assignments";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffAcademicAssignmentsForStaffRoute({ params }: { params: Promise<{ staffId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const { staffId } = await params;
  const scope = getScope();
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) return <AppShell><StaffProfileNotFound /></AppShell>;
  const response = await staffAcademicAssignmentService.getStaffAssignments(scope, staff.id);
  return <AppShell><StaffAssignmentsForProfilePage canManage={hasPermission(currentSessionRole, "hr.manage")} response={response} staff={staff} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
