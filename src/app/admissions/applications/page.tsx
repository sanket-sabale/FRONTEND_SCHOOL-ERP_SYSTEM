import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AdmissionApplicationDirectory } from "@/features/admissions/components/admission-application-directory";
import { admissionService } from "@/lib/api/admissions";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AdmissionApplicationsPage() {
  if (!hasPermission(currentSessionRole, "admission.view")) redirect("/unauthorized");

  const scope = getScope();
  const [cycles, summary, placementOptions] = await Promise.all([
    admissionService.getAdmissionCycles(scope),
    admissionService.getAdmissionSummary(scope),
    studentService.getAcademicPlacements(scope),
  ]);

  return (
    <AppShell>
      <AdmissionApplicationDirectory
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        cycles={cycles}
        placementOptions={placementOptions}
        role={currentSessionRole}
        scope={scope}
        summary={summary}
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
