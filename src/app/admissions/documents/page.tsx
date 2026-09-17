import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AdmissionDocumentQueue } from "@/features/admissions/components/admission-document-queue";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AdmissionDocumentsPage() {
  if (!hasPermission(currentSessionRole, "admission.view")) redirect("/unauthorized");

  const scope = getScope();
  const placementOptions = await studentService.getAcademicPlacements(scope);

  return (
    <AppShell>
      <AdmissionDocumentQueue
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        placementOptions={placementOptions}
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
