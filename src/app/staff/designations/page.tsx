import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import {
  deactivateStaffDesignationAction,
  saveStaffDesignationAction,
} from "@/features/staff/actions/staff-actions";
import { StaffOrganizationDirectory } from "@/features/staff/components/staff-organization-directory";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffDesignationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[] }>;
}) {
  if (!hasPermission(currentSessionRole, "hr.view")) {
    redirect("/unauthorized");
  }

  const query = await searchParams;
  const search = Array.isArray(query.search) ? query.search[0] : query.search;
  const designations = await staffService.getDesignations(getScope(), { query: search });

  return (
    <AppShell>
      <StaffOrganizationDirectory
        context={{ school: tenantContext.school, campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
        deactivateAction={deactivateStaffDesignationAction}
        entities={designations}
        kind="designation"
        query={search}
        role={currentSessionRole}
        saveAction={saveStaffDesignationAction}
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
