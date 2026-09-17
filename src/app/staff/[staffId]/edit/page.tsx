import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, PageHeader } from "@/components/ui";
import { updateStaffAction } from "@/features/staff/actions/staff-actions";
import { StaffForm } from "@/features/staff/components/staff-form";
import { StaffProfileNotFound } from "@/features/staff/components/staff-profile";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffEditPage({ params }: { params: Promise<{ staffId: string }> }) {
  if (!hasPermission(currentSessionRole, "hr.view") || !hasPermission(currentSessionRole, "hr.manage")) {
    redirect("/unauthorized");
  }

  const { staffId } = await params;
  if (!isValidStaffId(staffId)) {
    return (
      <AppShell>
        <StaffProfileNotFound message="The staff edit URL is not valid. Return to the directory and select a staff record." />
      </AppShell>
    );
  }

  const scope = getScope();
  const [staff, departments, designations, managerDirectory] = await Promise.all([
    staffService.getStaffById(scope, staffId),
    staffService.getDepartments(scope),
    staffService.getDesignations(scope),
    staffService.listStaff(scope, { page: 1, pageSize: 100, sortBy: "displayName", sortDirection: "asc" }),
  ]);

  if (!staff) {
    return (
      <AppShell>
        <StaffProfileNotFound message="The staff member you want to edit doesn't exist or is no longer available." />
      </AppShell>
    );
  }

  const action = updateStaffAction.bind(null, staff.id);

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Edit"]} />}
          description="Update supported Staff foundation fields within the active tenant, campus, and academic year context."
          eyebrow="Staff Management"
          title={`Edit ${staff.displayName}`}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Academic Year" value={tenantContext.academicYear} />
            </div>
          </Card>
        </PageHeader>

        <StaffForm
          action={action}
          context={{ campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
          departments={departments}
          designations={designations}
          managerOptions={managerDirectory.items}
          mode="edit"
          staff={staff}
        />
      </div>
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

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}
