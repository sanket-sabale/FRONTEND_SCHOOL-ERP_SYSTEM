import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { TimetableSettings } from "@/features/timetable/components/timetable-settings";
import { timetableService } from "@/lib/api/timetable";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function TimetableSettingsPage() {
  if (!hasPermission(currentSessionRole, "timetable.manage")) redirect("/unauthorized");
  const scope = { tenantId: tenantContext.tenantId, schoolId: tenantContext.schoolId, campusId: tenantContext.campusId, academicYearId: tenantContext.academicYearId };
  const schedules = await timetableService.listSchedules(scope);
  return <AppShell><TimetableSettings schedules={schedules} context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }} /></AppShell>;
}
