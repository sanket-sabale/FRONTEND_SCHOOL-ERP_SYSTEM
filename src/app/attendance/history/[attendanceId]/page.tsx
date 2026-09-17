import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceHistoryDetail } from "@/features/attendance/components/attendance-history-detail";
import { AttendanceRecordNotFound } from "@/features/attendance/components/attendance-record-states";
import { attendanceService } from "@/lib/api/attendance";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendanceHistoryDetailPage({
  params,
}: {
  params: Promise<{ attendanceId: string }>;
}) {
  if (!hasPermission(currentSessionRole, "attendance.history.view")) redirect("/unauthorized");

  const { attendanceId } = await params;
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const detail = await attendanceService.getAttendanceHistoryDetail(scope, attendanceId);

  return (
    <AppShell>
      {detail ? <AttendanceHistoryDetail detail={detail} role={currentSessionRole} /> : <AttendanceRecordNotFound />}
    </AppShell>
  );
}
