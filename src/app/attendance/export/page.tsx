import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceExportPage } from "@/features/attendance/components/attendance-export-page";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendanceExportRoute() {
  if (!hasPermission(currentSessionRole, "attendance.report")) redirect("/unauthorized");

  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const [placements, students] = await Promise.all([
    studentService.getAcademicPlacements(scope),
    studentService.getStudents(scope, { page: 1, pageSize: 100, status: "active", sortBy: "displayName", sortDirection: "asc" }),
  ]);

  return (
    <AppShell>
      <AttendanceExportPage
        context={{
          school: tenantContext.school,
          campus: tenantContext.campus,
          academicYear: tenantContext.academicYear,
        }}
        placements={placements}
        scope={scope}
        studentOptions={students.items}
      />
    </AppShell>
  );
}
