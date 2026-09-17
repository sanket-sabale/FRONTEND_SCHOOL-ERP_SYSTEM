import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffDirectory } from "@/features/staff/components/staff-directory";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffPage() {
  if (!hasPermission(currentSessionRole, "hr.view")) {
    redirect("/unauthorized");
  }

  const scope = getScope();
  const [departments, designations] = await Promise.all([
    staffService.getDepartments(scope),
    staffService.getDesignations(scope),
  ]);

  return (
    <AppShell>
      <StaffDirectory
        context={{
          school: tenantContext.school,
          campus: tenantContext.campus,
          academicYear: tenantContext.academicYear,
        }}
        departments={departments}
        designations={designations}
        role={currentSessionRole}
        scope={scope}
      />
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
