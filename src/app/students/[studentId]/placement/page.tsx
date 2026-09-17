import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, PageHeader } from "@/components/ui";
import { StudentPlacementWorkflow } from "@/features/student-placements/components/student-placement-management";
import { StudentProfileNotFound } from "@/features/students/components/student-profile";
import type { AcademicClass, Section } from "@/features/academic-structure/types/academic-structure";
import { academicStructureService } from "@/lib/api/academic-structure";
import { studentService } from "@/lib/api/students";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function StudentPlacementPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  if (!hasPermission(currentSessionRole, "student.view")) redirect("/unauthorized");

  const { studentId } = await params;
  const activeScope = scope(tenantContext.academicYearId);
  const student = await studentService.getStudent(activeScope, studentId);
  if (!student) {
    return (
      <AppShell>
        <StudentProfileNotFound message="The student placement workflow could not find this student in the current campus scope." />
      </AppShell>
    );
  }

  const academicYears = await academicStructureService.getAcademicYears(activeScope);
  const editableYears = academicYears.filter((year) => year.status !== "archived" && year.status !== "closed");
  const classesByYear = await Promise.all(
    editableYears.map((year) => academicStructureService.getClasses(scope(year.id), { includeArchived: true, sortBy: "sortOrder" })),
  );
  const sectionsByYear = await Promise.all(
    editableYears.map((year) => academicStructureService.getSections(scope(year.id), { includeArchived: true })),
  );
  const academicClasses = classesByYear.flat().filter((academicClass): academicClass is AcademicClass => academicClass.status === "active");
  const sections = sectionsByYear.flat().filter((section): section is Section => section.status === "active");

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={["Students", student.displayName, "Academic Placement"]} />}
          description="Change academic placement through a historical workflow. The previous active placement is ended and the new placement is created."
          eyebrow="Student Academic Placement"
          title={`Placement for ${student.displayName}`}
          action={<LinkButton href={`/students/${student.id}`}>Back to Student</LinkButton>}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Active Context" value={tenantContext.academicYear} />
            </div>
          </Card>
        </PageHeader>

        <StudentPlacementWorkflow
          academicClasses={academicClasses}
          academicYears={academicYears}
          currentPlacement={student.currentPlacement}
          placementHistory={student.placementHistory}
          sections={sections}
          student={student}
        />
      </div>
    </AppShell>
  );
}

function scope(academicYearId: string) {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId,
  };
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={href}>
      {children}
    </Link>
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
