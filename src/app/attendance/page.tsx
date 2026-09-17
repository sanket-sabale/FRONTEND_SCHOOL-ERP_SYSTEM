import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceDirectory } from "@/features/attendance/components/attendance-directory";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendancePage() {
  if (!hasPermission(currentSessionRole, "attendance.view")) redirect("/unauthorized");

  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const placements = await studentService.getAcademicPlacements(scope);

  return (
    <AppShell>
      <AttendanceDirectory
        context={{
          school: tenantContext.school,
          campus: tenantContext.campus,
          academicYear: tenantContext.academicYear,
        }}
        placements={placements}
        role={currentSessionRole}
        scope={scope}
      />
    </AppShell>
  );
}
