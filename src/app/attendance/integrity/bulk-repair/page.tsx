import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceRepairBatchWorkspace } from "@/features/attendance/components/attendance-repair-batch-workspace";
import { attendanceIntegrityService } from "@/lib/api/attendance-integrity";
import { attendanceRepairService } from "@/lib/api/attendance-repairs";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendanceBulkRepairPage() {
  if (!hasPermission(currentSessionRole, "attendance.integrity.view")) redirect("/unauthorized");

  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const [diagnostics, repairs] = await Promise.all([
    attendanceIntegrityService.getAttendanceSnapshotIntegrity(scope),
    attendanceRepairService.getRepairQueue(scope, { page: 1, pageSize: 100 }),
  ]);

  return (
    <AppShell>
      <AttendanceRepairBatchWorkspace
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        diagnostics={diagnostics}
        repairRequests={repairs.items}
      />
    </AppShell>
  );
}
