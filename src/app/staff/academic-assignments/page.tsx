import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffAcademicAssignmentsPage } from "@/features/staff-academic-assignments/components/staff-academic-assignment-pages";
import { staffAcademicAssignmentStatuses } from "@/features/staff-academic-assignments/types/staff-academic-assignment";
import { staffAcademicAssignmentService } from "@/lib/api/staff-academic-assignments";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam, readNumberQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffAcademicAssignmentsRoute({ searchParams }: { searchParams: Promise<{ query?: string; page?: string; status?: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const query = await searchParams;
  const response = await staffAcademicAssignmentService.listAssignments(getScope(), {
    query: query.query,
    status: readEnumQueryParam(query.status, staffAcademicAssignmentStatuses),
    page: readNumberQueryParam(query.page, 1),
    pageSize: 25,
  });
  return <AppShell><StaffAcademicAssignmentsPage response={response} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
