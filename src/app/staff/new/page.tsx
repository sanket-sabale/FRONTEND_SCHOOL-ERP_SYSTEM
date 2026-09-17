import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { createStaffAction } from "@/features/staff/actions/staff-actions";
import { StaffForm } from "@/features/staff/components/staff-form";
import { staffService } from "@/lib/api/staff";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StaffCreatePage() {
  if (!hasPermission(currentSessionRole, "hr.view") || !hasPermission(currentSessionRole, "hr.manage")) {
    redirect("/unauthorized");
  }

  const scope = getScope();
  const [departments, designations, managerDirectory] = await Promise.all([
    staffService.getDepartments(scope),
    staffService.getDesignations(scope),
    staffService.listStaff(scope, { page: 1, pageSize: 100, status: "active", sortBy: "displayName", sortDirection: "asc" }),
  ]);

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Staff", "Add Staff"]} />}
          description="Create a staff record using the supported Staff domain contract."
          eyebrow="Staff Management"
          title="Add Staff"
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Academic Year" value={tenantContext.academicYear} />
            </div>
          </Card>
        </PageHeader>

        {departments.length === 0 || designations.length === 0 ? (
          <Card>
            <SectionHeader eyebrow="Staff" title="Staff setup unavailable" />
            <div className="p-4 sm:p-5">
              <EmptyState description="An active department and designation must exist before staff can be created." title="No supported staff setup" />
            </div>
          </Card>
        ) : (
          <StaffForm
            action={createStaffAction}
            context={{ campus: tenantContext.campus, academicYear: tenantContext.academicYear }}
            departments={departments}
            designations={designations}
            managerOptions={managerDirectory.items}
            mode="create"
          />
        )}
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

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}
