import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceRepairAuditDetail } from "@/features/attendance/components/attendance-repair-audit-detail";
import { AttendanceRepairAuditRecordNotFound } from "@/features/attendance/components/attendance-repair-audit-states";
import { attendanceRepairAuditService } from "@/lib/api/attendance-repair-audit";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendanceRepairAuditDetailPage({
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
  const detail = isSafeId(attendanceId) ? await attendanceRepairAuditService.getRepairAuditDetail(scope, attendanceId) : null;

  return (
    <AppShell>
      {detail ? (
        <AttendanceRepairAuditDetail
          context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
          detail={detail}
        />
      ) : (
        <AttendanceRepairAuditRecordNotFound />
      )}
    </AppShell>
  );
}

function isSafeId(value: string) {
  return /^[a-z0-9_-]{3,128}$/i.test(value);
}
