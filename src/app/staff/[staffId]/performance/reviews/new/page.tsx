import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffReviewCreatePage } from "@/features/staff-performance/components/staff-performance-pages";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffReviewCreateRoute({ params }: { params: Promise<{ staffId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.manage")) redirect("/unauthorized");
  const { staffId } = await params;
  const staff = await staffService.getStaffById(getScope(), staffId);
  if (!staff) return <AppShell><StaffProfileNotFound /></AppShell>;
  return <AppShell><StaffReviewCreatePage staff={staff} /></AppShell>;
}

function getScope() {
  return { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
}
