import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AdmissionSeatCapacity } from "@/features/admissions/components/admission-seat-capacity";
import { admissionService } from "@/lib/api/admissions";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AdmissionSeatsPage() {
  if (!hasPermission(currentSessionRole, "admission.manage_capacity")) redirect("/unauthorized");

  const scope = getScope();
  const [cycles, data, placementOptions] = await Promise.all([
    admissionService.getAdmissionCycles(scope),
    admissionService.getSeatAvailabilityList(scope, { page: 1, pageSize: 100 }),
    studentService.getAcademicPlacements(scope),
  ]);

  return (
    <AppShell>
      <AdmissionSeatCapacity
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        cycles={cycles}
        data={data}
        placementOptions={placementOptions}
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
