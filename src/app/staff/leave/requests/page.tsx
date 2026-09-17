import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffLeaveRequests } from "@/features/staff-leave/components/staff-leave-requests";
import { staffLeaveStatuses } from "@/features/staff-leave/types/staff-leave";
import { staffLeaveService } from "@/lib/api/staff-leave";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam, readQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffLeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[]; status?: string | string[]; departmentId?: string | string[]; dateFrom?: string | string[]; dateTo?: string | string[] }>;
}) {
  if (!hasPermission(currentSessionRole, "hr.view")) {
    redirect("/unauthorized");
  }

  const query = await searchParams;
  const filters = {
    search: readQueryParam(query.search),
    status: readEnumQueryParam(query.status, staffLeaveStatuses),
    departmentId: readQueryParam(query.departmentId),
    dateFrom: readQueryParam(query.dateFrom),
    dateTo: readQueryParam(query.dateTo),
    pageSize: 100,
  };
  const scope = getScope();
  const [departments, requests] = await Promise.all([
    staffService.getDepartments(scope, { status: "active" }),
    staffLeaveService.listRequests(scope, filters),
  ]);

  return (
    <AppShell>
      <StaffLeaveRequests
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        departments={departments}
        filters={filters}
        requests={requests}
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
