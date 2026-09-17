import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AdmissionApplicationDetailView } from "@/features/admissions/components/admission-application-detail";
import { admissionService } from "@/lib/api/admissions";
import { admissionFinanceService } from "@/lib/api/admission-finance";
import { admissionCommunicationService } from "@/lib/api/admission-communication";
import { guardianService } from "@/lib/api/guardians";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AdmissionApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  if (!hasPermission(currentSessionRole, "admission.view")) redirect("/unauthorized");

  const { applicationId } = await params;
  const scope = getScope();
  const application = await admissionService.getApplication(scope, applicationId);
  if (!application) notFound();

  const [financeSummary, enrollmentReadiness, communicationSummary, cycles, placementOptions, guardianDirectory, reviewers] = await Promise.all([
    admissionFinanceService.getApplicationFinancialSummary(scope, applicationId),
    admissionService.getEnrollmentReadiness(scope, applicationId),
    admissionCommunicationService.getApplicationCommunicationSummary(scope, applicationId),
    admissionService.getAdmissionCycles(scope),
    studentService.getAcademicPlacements(scope),
    guardianService.getGuardians(scope, { page: 1, pageSize: 100, status: "active" }),
    admissionService.getAdmissionReviewers(scope),
  ]);

  return (
    <AppShell>
      <AdmissionApplicationDetailView
        application={application}
        communicationSummary={communicationSummary}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        cycles={cycles}
        enrollmentReadiness={enrollmentReadiness}
        financeSummary={financeSummary}
        guardianOptions={guardianDirectory.items}
        placementOptions={placementOptions}
        reviewers={reviewers}
        role={currentSessionRole}
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
