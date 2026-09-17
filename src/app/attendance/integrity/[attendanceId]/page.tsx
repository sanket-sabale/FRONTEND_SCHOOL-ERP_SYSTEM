import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceIntegrityDetail } from "@/features/attendance/components/attendance-integrity-detail";
import { AttendanceIntegrityRecordNotFound } from "@/features/attendance/components/attendance-integrity-states";
import { attendanceIntegrityService } from "@/lib/api/attendance-integrity";
import { attendanceRepairService } from "@/lib/api/attendance-repairs";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendanceIntegrityDetailPage({
  params,
}: {
  params: Promise<{ attendanceId: string }>;
}) {
  if (!hasPermission(currentSessionRole, "attendance.integrity.view")) redirect("/unauthorized");

  const { attendanceId } = await params;
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const [result, repairRequest, repairEvents] = isSafeId(attendanceId)
    ? await Promise.all([
        attendanceIntegrityService.getAttendanceSnapshotIntegrityDetail(scope, attendanceId),
        attendanceRepairService.getRepairRequestForAttendance(scope, attendanceId),
        attendanceRepairService.getRepairHistory(scope, attendanceId),
      ])
    : [null, null, []];

  return (
    <AppShell>
      {result ? (
        <AttendanceIntegrityDetail
          context={{
            school: tenantContext.school,
            campus: tenantContext.campus,
            academicYear: tenantContext.academicYear,
          }}
          repairEvents={repairEvents}
          repairRequest={repairRequest}
          result={result}
        />
      ) : (
        <AttendanceIntegrityRecordNotFound />
      )}
    </AppShell>
  );
}

function isSafeId(value: string) {
  return /^[a-z0-9_-]{3,96}$/i.test(value);
}
