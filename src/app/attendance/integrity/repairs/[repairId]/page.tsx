import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceRepairDetail } from "@/features/attendance/components/attendance-repair-detail";
import { AttendanceRepairNotFound } from "@/features/attendance/components/attendance-repair-states";
import { attendanceRepairService } from "@/lib/api/attendance-repairs";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendanceRepairDetailPage({
  params,
}: {
  params: Promise<{ repairId: string }>;
}) {
  if (!hasPermission(currentSessionRole, "attendance.integrity.view")) redirect("/unauthorized");

  const { repairId } = await params;
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const request = isSafeId(repairId) ? await attendanceRepairService.getRepairRequest(scope, repairId) : null;
  const events = request ? await attendanceRepairService.getRepairHistory(scope, request.attendanceId) : [];

  return (
    <AppShell>
      {request ? (
        <AttendanceRepairDetail
          context={{
            school: tenantContext.school,
            campus: tenantContext.campus,
            academicYear: tenantContext.academicYear,
          }}
          events={events.filter((event) => event.repairId === request.id)}
          request={request}
        />
      ) : (
        <AttendanceRepairNotFound />
      )}
    </AppShell>
  );
}

function isSafeId(value: string) {
  return /^[a-z0-9_-]{3,128}$/i.test(value);
}
