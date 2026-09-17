import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { StaffDocumentDetail, StaffDocumentNotFound } from "@/features/staff-documents/components/staff-document-detail";
import { staffDocumentService } from "@/lib/api/staff-documents";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffDocumentDetailPage({ params }: { params: Promise<{ staffId: string; documentId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view")) redirect("/unauthorized");
  const { documentId, staffId } = await params;
  if (!isValidId(staffId) || !isValidId(documentId)) {
    return <AppShell><StaffDocumentNotFound staffId={isValidId(staffId) ? staffId : undefined} /></AppShell>;
  }
  const scope = getScope();
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) return <AppShell><StaffProfileNotFound /></AppShell>;
  const document = await staffDocumentService.getStaffDocument(scope, staff.id, documentId);
  if (!document) return <AppShell><StaffDocumentNotFound staffId={staff.id} /></AppShell>;
  return (
    <AppShell>
      <StaffDocumentDetail canManageDocuments={hasPermission(currentSessionRole, "hr.manage")} document={document} staff={staff} />
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

function isValidId(value: string) {
  return /^[a-z0-9_-]{3,100}$/i.test(value);
}
