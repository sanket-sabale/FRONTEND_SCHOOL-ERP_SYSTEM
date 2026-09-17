import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { updateStudentAction } from "@/features/students/actions/student-edit-actions";
import { StudentEditForm } from "@/features/students/components/student-edit-form";
import { StudentProfileNotFound } from "@/features/students/components/student-profile";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StudentEditPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  if (!hasPermission(currentSessionRole, "student.view") || !hasPermission(currentSessionRole, "student.update")) {
    redirect("/unauthorized");
  }

  const { studentId } = await params;
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };

  if (!isValidStudentId(studentId)) {
    return (
      <AppShell>
        <StudentProfileNotFound message="The student edit URL is not valid. Return to the directory and select a student record." />
      </AppShell>
    );
  }

  const student = await studentService.getStudent(scope, studentId);

  if (!student) {
    return (
      <AppShell>
        <StudentProfileNotFound message="The student you want to edit doesn't exist or is no longer available." />
      </AppShell>
    );
  }

  const action = updateStudentAction.bind(null, student.id);

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Students", student.displayName, "Edit"]} />}
          description="Update currently supported student profile fields within the active tenant, campus, and academic year context."
          eyebrow="Student Management"
          title={`Edit ${student.displayName}`}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Academic Year" value={tenantContext.academicYear} />
              <ContextLine label="Service Boundary" value="Mock student service" />
            </div>
          </Card>
        </PageHeader>

        <Card variant="muted">
          <SectionHeader eyebrow="Scope" title="Edit Foundation" />
          <div className="p-4 sm:p-5">
            <EmptyState
              description="This form edits only fields supported by the current Student domain. Future stages will add create, archive, contact, and academic catalog workflows."
              title="Profile-safe edit workflow"
            />
          </div>
        </Card>

        <StudentEditForm
          action={action}
          context={{
            campus: tenantContext.campus,
            academicYear: tenantContext.academicYear,
          }}
          student={student}
        />
      </div>
    </AppShell>
  );
}

function isValidStudentId(value: string) {
  return /^[a-z0-9_-]{3,64}$/i.test(value);
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center">
      <span className="text-foreground-muted">{label}</span>
      <span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value}</span>
    </div>
  );
}
