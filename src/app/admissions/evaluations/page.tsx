import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AdmissionEvaluationQueue } from "@/features/admissions/components/admission-evaluation-queue";
import type { AdmissionEvaluationQueueFilters } from "@/features/admissions/types/admission";
import { admissionService } from "@/lib/api/admissions";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function AdmissionEvaluationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!hasPermission(currentSessionRole, "admission.schedule")) redirect("/unauthorized");

  const scope = getScope();
  const filters = filtersFromSearchParams(await searchParams);
  const [data, reviewers] = await Promise.all([
    admissionService.getEvaluationQueue(scope, filters),
    admissionService.getAdmissionReviewers(scope),
  ]);

  return (
    <AppShell>
      <AdmissionEvaluationQueue
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        data={data}
        filters={filters}
        reviewers={reviewers}
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

function filtersFromSearchParams(params: Record<string, string | string[] | undefined>): AdmissionEvaluationQueueFilters {
  return {
    query: value(params.search),
    view: value(params.view) as AdmissionEvaluationQueueFilters["view"],
    status: value(params.status) as AdmissionEvaluationQueueFilters["status"],
    evaluatorId: value(params.evaluatorId),
    page: toPositiveInt(value(params.page), 1),
    pageSize: toPositiveInt(value(params.pageSize), 10),
  };
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function toPositiveInt(input: string | undefined, fallback: number) {
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
