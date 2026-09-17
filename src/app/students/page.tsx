import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StudentDirectory } from "@/features/students/components/student-directory";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default function StudentsPage() {
  if (!hasPermission(currentSessionRole, "student.view")) {
    redirect("/unauthorized");
  }

  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };

  return (
    <AppShell>
      <StudentDirectory
        context={{
          group: tenantContext.group,
          school: tenantContext.school,
          campus: tenantContext.campus,
          academicYear: tenantContext.academicYear,
        }}
        role={currentSessionRole}
        scope={scope}
      />
    </AppShell>
  );
}
