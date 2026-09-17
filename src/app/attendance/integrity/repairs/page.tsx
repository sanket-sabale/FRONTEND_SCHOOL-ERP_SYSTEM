import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceRepairQueue } from "@/features/attendance/components/attendance-repair-queue";
import { attendanceRepairStatuses } from "@/features/attendance/types/attendance-repair";
import { attendanceRepairService } from "@/lib/api/attendance-repairs";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam, readQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendanceRepairQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; query?: string | string[] }>;
}) {
  if (!hasPermission(currentSessionRole, "attendance.integrity.view")) redirect("/unauthorized");

  const params = await searchParams;
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const queue = await attendanceRepairService.getRepairQueue(scope, {
    status: readEnumQueryParam(params.status, attendanceRepairStatuses),
    query: readQueryParam(params.query),
  });

  return (
    <AppShell>
      <AttendanceRepairQueue
        context={{
          school: tenantContext.school,
          campus: tenantContext.campus,
          academicYear: tenantContext.academicYear,
        }}
        queue={queue}
      />
    </AppShell>
  );
}
