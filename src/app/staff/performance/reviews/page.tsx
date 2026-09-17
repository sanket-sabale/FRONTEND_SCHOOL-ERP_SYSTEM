import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffReviewListPage } from "@/features/staff-performance/components/staff-performance-pages";
import { performanceReviewStatuses, performanceReviewTypes } from "@/features/staff-performance/types/staff-performance";
import { staffPerformanceService } from "@/lib/api/staff-performance";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam, readNumberQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffReviewListRoute({ searchParams }: { searchParams: Promise<{ query?: string; status?: string; reviewType?: string; page?: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const query = await searchParams;
  const response = await staffPerformanceService.listReviews(getScope(), {
    query: query.query,
    status: readEnumQueryParam(query.status, performanceReviewStatuses),
    reviewType: readEnumQueryParam(query.reviewType, performanceReviewTypes),
    page: readNumberQueryParam(query.page, 1),
    pageSize: 25,
  });
  return <AppShell><StaffReviewListPage response={response} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
