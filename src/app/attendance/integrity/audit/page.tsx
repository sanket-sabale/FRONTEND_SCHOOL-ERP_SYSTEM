import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { AttendanceRepairAuditDashboard } from "@/features/attendance/components/attendance-repair-audit-dashboard";
import { attendanceSnapshotIntegrityStatuses } from "@/features/attendance/types/attendance-integrity";
import { attendanceRepairAuditSources } from "@/features/attendance/types/attendance-repair-audit";
import { attendanceRepairStatuses } from "@/features/attendance/types/attendance-repair";
import { attendanceRepairAuditService } from "@/lib/api/attendance-repair-audit";
import { currentSessionRole } from "@/lib/current-user";
import { readDateQueryParam, readEnumQueryParam, readQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function AttendanceRepairAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | string[];
    source?: string | string[];
    repairStatus?: string | string[];
    integrityStatus?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
    batchCorrelationId?: string | string[];
    repairedOnly?: string | string[];
  }>;
}) {
  if (!hasPermission(currentSessionRole, "attendance.integrity.view")) redirect("/unauthorized");

  const params = await searchParams;
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const filters = {
    query: readQueryParam(params.query),
    source: readEnumQueryParam(params.source, attendanceRepairAuditSources),
    repairStatus: readEnumQueryParam(params.repairStatus, attendanceRepairStatuses),
    integrityStatus: readEnumQueryParam(params.integrityStatus, attendanceSnapshotIntegrityStatuses),
    dateFrom: readDateQueryParam(params.dateFrom),
    dateTo: readDateQueryParam(params.dateTo),
    batchCorrelationId: readQueryParam(params.batchCorrelationId),
    repairedOnly: readQueryParam(params.repairedOnly) === "true" ? true : undefined,
  };
  const [audit, exportPreview] = await Promise.all([
    attendanceRepairAuditService.getRepairAudit(scope, filters),
    attendanceRepairAuditService.getRepairAuditExportPreview(scope, {
      filters,
      includedFields: ["attendanceId", "student", "attendanceDate", "integrityStatus", "repairStatus", "beforeSnapshot", "afterSnapshot", "source"],
      requestedBy: "current-user",
    }),
  ]);

  return (
    <AppShell>
      <AttendanceRepairAuditDashboard
        audit={audit}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        exportPreview={exportPreview}
        filters={filters}
      />
    </AppShell>
  );
}
