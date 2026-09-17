import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { createStudentAction } from "@/features/students/actions/student-create-actions";
import { StudentCreateForm } from "@/features/students/components/student-create-form";
import { guardianService } from "@/lib/api/guardians";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StudentCreatePage() {
  if (!hasPermission(currentSessionRole, "student.create")) {
    redirect("/unauthorized");
  }

  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const [placementOptions, guardianDirectory] = await Promise.all([
    studentService.getAcademicPlacements(scope),
    guardianService.getGuardians(scope, { page: 1, pageSize: 100, status: "active" }),
  ]);

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Students", "New Admission"]} />}
          description="Create a student record inside the active tenant, campus, and academic year using the supported Student domain contract."
          eyebrow="Student Management"
          title="Add Student"
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Academic Year" value={tenantContext.academicYear} />
            </div>
          </Card>
        </PageHeader>

        {placementOptions.length === 0 ? (
          <Card>
            <SectionHeader eyebrow="Admission" title="Academic placement unavailable" />
            <div className="p-4 sm:p-5">
              <EmptyState
                description="A class and section must exist in the current academic context before a student can be admitted."
                title="No supported placements"
              />
            </div>
          </Card>
        ) : (
          <StudentCreateForm
            action={createStudentAction}
            context={{
              campus: tenantContext.campus,
              academicYear: tenantContext.academicYear,
            }}
            guardianOptions={guardianDirectory.items}
            placementOptions={placementOptions}
          />
        )}
      </div>
    </AppShell>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}
