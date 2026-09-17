import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffDocumentsWorkspace } from "@/features/staff-documents/components/staff-documents-workspace";
import { staffDocumentService } from "@/lib/api/staff-documents";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffDocumentsPage({ params }: { params: Promise<{ staffId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const { staffId } = await params;
  if (!isValidStaffId(staffId)) {
    return <AppShell><StaffProfileNotFound message="The staff document URL is not valid." /></AppShell>;
  }
  const scope = getScope();
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) return <AppShell><StaffProfileNotFound /></AppShell>;
  const documentsResponse = await staffDocumentService.listStaffDocuments(scope, staff.id);
  return (
    <AppShell>
      <StaffDocumentsWorkspace
        canManageDocuments={hasPermission(currentSessionRole, "hr.manage")}
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        documentsResponse={documentsResponse}
        staff={staff}
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
