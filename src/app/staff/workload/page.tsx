import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffWorkloadDashboardPage } from "@/features/staff-workload/components/staff-workload-pages";
import { staffWorkloadService } from "@/lib/api/staff-workload";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam, readNumberQueryParam, readQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";
import { schedulingReadinessStatuses, workloadStatuses, type StaffWorkloadFilters } from "@/features/staff-workload/types/staff-workload";

export default async function StaffWorkloadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const query = await searchParams;
  const filters: StaffWorkloadFilters = {
    query: readQueryParam(query.query),
    status: readEnumQueryParam(query.status, workloadStatuses),
    readiness: readEnumQueryParam(query.readiness, schedulingReadinessStatuses),
    page: readNumberQueryParam(query.page, 1),
    pageSize: readNumberQueryParam(query.pageSize, 25),
  };
  const response = await staffWorkloadService.listWorkloads(getScope(), filters);
  return (
    <AppShell>
      <StaffWorkloadDashboardPage filters={filters} response={response} />
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
