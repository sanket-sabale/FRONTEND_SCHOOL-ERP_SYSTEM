import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { TimetableWorkspace } from "@/features/timetable/components/timetable-workspace";
import { timetableService } from "@/lib/api/timetable";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function TimetableMakerPage() {
  if (!hasPermission(currentSessionRole, "timetable.update")) redirect("/unauthorized");
  const scope = { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
  const data = await timetableService.getWorkspaceData(scope);
  return <AppShell><TimetableWorkspace context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }} data={data} role={currentSessionRole} /></AppShell>;
}
