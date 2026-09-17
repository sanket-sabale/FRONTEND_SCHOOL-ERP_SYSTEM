import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffAttendanceHistory } from "@/features/staff-attendance/components/staff-attendance-history";
import { staffAttendanceStatuses } from "@/features/staff-attendance/types/staff-attendance";
import { staffAttendanceService } from "@/lib/api/staff-attendance";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam, readQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffAttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string | string[]; dateTo?: string | string[]; departmentId?: string | string[]; staffId?: string | string[]; status?: string | string[]; search?: string | string[] }>;
}) {
  if (!hasPermission(currentSessionRole, "hr.view")) {
    redirect("/unauthorized");
  }

  const query = await searchParams;
  const filters = {
    dateFrom: readQueryParam(query.dateFrom),
    dateTo: readQueryParam(query.dateTo),
    departmentId: readQueryParam(query.departmentId),
    staffId: readQueryParam(query.staffId),
    status: readEnumQueryParam(query.status, staffAttendanceStatuses),
    search: readQueryParam(query.search),
    pageSize: 100,
  };
  const scope = getScope();
  const [departments, data] = await Promise.all([
    staffService.getDepartments(scope, { status: "active" }),
    staffAttendanceService.listAttendance(scope, filters),
  ]);

  return (
    <AppShell>
      <StaffAttendanceHistory
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        data={data}
        departments={departments}
        filters={filters}
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
