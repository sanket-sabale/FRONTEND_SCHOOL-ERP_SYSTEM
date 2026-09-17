import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffAttendanceWorkstation } from "@/features/staff-attendance/components/staff-attendance-workstation";
import { staffAttendanceService } from "@/lib/api/staff-attendance";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; departmentId?: string | string[] }>;
}) {
  if (!hasPermission(currentSessionRole, "hr.view")) {
    redirect("/unauthorized");
  }

  const query = await searchParams;
  const date = readParam(query.date) || new Date().toISOString().slice(0, 10);
  const departmentId = readParam(query.departmentId);
  const scope = getScope();
  const [departments, designations, roster, dayAttendance] = await Promise.all([
    staffService.getDepartments(scope, { status: "active" }),
    staffService.getDesignations(scope, { status: "active" }),
    staffAttendanceService.getRoster(scope, { attendanceDate: date, departmentId, pageSize: 500 }),
    staffAttendanceService.getDayAttendance(scope, date, { departmentId, pageSize: 500 }),
  ]);

  return (
    <AppShell>
      <StaffAttendanceWorkstation
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        date={date}
        departments={departments}
        designations={designations}
        existingRecords={dayAttendance.items}
        roster={roster}
        selectedDepartmentId={departmentId}
      />
    </AppShell>
  );
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getScope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}
