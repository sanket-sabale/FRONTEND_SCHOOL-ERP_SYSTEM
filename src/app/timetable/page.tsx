import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { TimetableDashboard } from "@/features/timetable/components/timetable-dashboard";
import { timetableService } from "@/lib/api/timetable";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function TimetablePage() {
  if (!hasPermission(currentSessionRole, "timetable.view")) redirect("/unauthorized");
  const scope = { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
  const summary = await timetableService.getSummary(scope);
  return <AppShell><TimetableDashboard context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }} role={currentSessionRole} summary={summary} /></AppShell>;
}
