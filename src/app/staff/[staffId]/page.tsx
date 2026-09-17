import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfile, StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { staffAccountService } from "@/lib/api/staff-accounts";
import { staffAcademicAssignmentService } from "@/lib/api/staff-academic-assignments";
import { staffAttendanceService } from "@/lib/api/staff-attendance";
import { staffDocumentService } from "@/lib/api/staff-documents";
import { staffEmploymentService } from "@/lib/api/staff-employment";
import { staffPerformanceService } from "@/lib/api/staff-performance";
import { staffService } from "@/lib/api/staff";
import { staffWorkloadService } from "@/lib/api/staff-workload";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>;
  searchParams: Promise<{ created?: string | string[]; updated?: string | string[] }>;
}) {
  if (!hasPermission(currentSessionRole, "hr.view")) {
    redirect("/unauthorized");
  }

  const { staffId } = await params;
  const query = await searchParams;
  const created = Array.isArray(query.created) ? query.created.includes("1") : query.created === "1";
  const updated = Array.isArray(query.updated) ? query.updated.includes("1") : query.updated === "1";

  if (!isValidStaffId(staffId)) {
    return (
      <AppShell>
        <StaffProfileNotFound message="The staff profile URL is not valid. Return to the directory and select a staff record." />
      </AppShell>
    );
  }

  const scope = getScope();
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) {
    return (
      <AppShell>
        <StaffProfileNotFound />
      </AppShell>
    );
  }
  const [academicAssignments, accountView, attendanceSummary, recentAttendance, documentsResponse, employmentRecords, performanceSummary, workloadDetail] = await Promise.all([
    staffAcademicAssignmentService.getStaffAssignments(scope, staff.id),
    staffAccountService.getStaffAccountView(scope, staff.id),
    staffAttendanceService.getStaffSummary(scope, staff.id),
    staffAttendanceService.getRecentStaffAttendance(scope, staff.id, 5),
    staffDocumentService.listStaffDocuments(scope, staff.id),
    staffEmploymentService.listEmploymentRecords(scope, staff.id),
    staffPerformanceService.getStaffPerformance(scope, staff.id),
    staffWorkloadService.getStaffWorkload(scope, staff.id),
  ]);

  return (
    <AppShell>
      <StaffProfile
        accountView={accountView}
        academicAssignments={academicAssignments}
        attendanceSummary={attendanceSummary}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        created={created}
        documentsResponse={documentsResponse}
        employmentRecords={employmentRecords}
        performanceSummary={performanceSummary}
        recentAttendance={recentAttendance}
        role={currentSessionRole}
        staff={staff}
        updated={updated}
        workloadDetail={workloadDetail}
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

function isValidStaffId(value: string) {
  return /^[a-z0-9_-]{3,80}$/i.test(value);
}
