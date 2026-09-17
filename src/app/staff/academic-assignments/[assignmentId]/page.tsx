import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffAssignmentDetailPage } from "@/features/staff-academic-assignments/components/staff-academic-assignment-pages";
import { staffAcademicAssignmentService } from "@/lib/api/staff-academic-assignments";
import { staffWorkloadService } from "@/lib/api/staff-workload";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffAcademicAssignmentDetailRoute({ params }: { params: Promise<{ assignmentId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const { assignmentId } = await params;
  const scope = getScope();
  const assignment = await staffAcademicAssignmentService.getAssignment(scope, assignmentId);
  if (!assignment) return <AppShell><StaffProfileNotFound message="The requested academic assignment could not be found." /></AppShell>;
  const workloadConfig = await staffWorkloadService.getAssignmentWorkloadConfig(scope, assignmentId);
  return <AppShell><StaffAssignmentDetailPage assignment={assignment} canManage={hasPermission(currentSessionRole, "hr.manage")} workloadConfig={workloadConfig} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
