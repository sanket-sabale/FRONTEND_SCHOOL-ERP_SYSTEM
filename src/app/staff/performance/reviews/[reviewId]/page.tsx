import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffReviewDetailPage } from "@/features/staff-performance/components/staff-performance-pages";
import { staffPerformanceService } from "@/lib/api/staff-performance";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffReviewDetailRoute({ params }: { params: Promise<{ reviewId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const { reviewId } = await params;
  if (!/^[a-z0-9_-]{3,100}$/i.test(reviewId)) return <AppShell><StaffProfileNotFound message="The review URL is not valid." /></AppShell>;
  const result = await staffPerformanceService.getReviewById(getScope(), reviewId);
  if (!result) return <AppShell><StaffProfileNotFound message="The requested performance review could not be found." /></AppShell>;
  return <AppShell><StaffReviewDetailPage review={result.review} staff={result.staff} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
