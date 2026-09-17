import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { createAdmissionApplicationAction } from "@/features/admissions/actions/admission-actions";
import { AdmissionApplicationForm } from "@/features/admissions/components/admission-application-form";
import { admissionService } from "@/lib/api/admissions";
import { guardianService } from "@/lib/api/guardians";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function NewAdmissionApplicationPage() {
  if (!hasPermission(currentSessionRole, "admission.create")) redirect("/unauthorized");

  const scope = getScope();
  const [cycles, placementOptions, guardianDirectory] = await Promise.all([
    admissionService.getAdmissionCycles(scope),
    studentService.getAcademicPlacements(scope),
    guardianService.getGuardians(scope, { page: 1, pageSize: 100, status: "active" }),
  ]);

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Admissions", "Applications", "New"]} />}
          description="Create an admission application draft. Submission is a separate domain transition."
          eyebrow="Admissions"
          title="New Admission Application"
        />
        {cycles.length === 0 || placementOptions.length === 0 ? (
          <Card>
            <SectionHeader eyebrow="Setup" title="Admission setup incomplete" />
            <div className="p-4 sm:p-5">
              <EmptyState description="An open admission cycle and academic placement options are required before applications can be created." title="Cannot create application" />
            </div>
          </Card>
        ) : (
          <AdmissionApplicationForm
            action={createAdmissionApplicationAction}
            context={{ campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
            cycles={cycles}
            guardianOptions={guardianDirectory.items}
            mode="create"
            placementOptions={placementOptions}
          />
        )}
      </div>
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
