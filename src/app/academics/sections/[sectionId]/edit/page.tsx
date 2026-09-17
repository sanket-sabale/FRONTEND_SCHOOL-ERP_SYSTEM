import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, PageHeader } from "@/components/ui";
import { SectionEditForm } from "@/features/academic-structure/components/section-management";
import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";
import { academicStructureService } from "@/lib/api/academic-structure";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type SectionEditParams = {
  sectionId: string;
};

type SectionResolution = {
  academicClass: AcademicClass;
  academicYear: AcademicYear;
  section: Section;
};

export default async function EditSectionPage({
  params,
}: {
  params: Promise<SectionEditParams>;
}) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");
  if (!hasPermission(currentSessionRole, "academic.manage")) redirect("/unauthorized");

  const { sectionId } = await params;
  const resolved = await resolveSection(sectionId);
  if (!resolved) notFound();

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={[tenantContext.school, tenantContext.campus, resolved.academicYear.name, "Academics", "Sections", resolved.section.displayName, "Edit"]} />}
          description="Edit section metadata and lifecycle status. Academic year and class assignment are structural and read-only in Stage 2."
          eyebrow="Academic Structure"
          title={`Edit ${resolved.section.displayName}`}
          action={<LinkButton href={`/academics/sections/${resolved.section.id}`}>Back to Section</LinkButton>}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="Class" value={resolved.academicClass.displayName} />
              <ContextLine label="Academic Year" value={resolved.academicYear.name} />
              <ContextLine label="Campus" value={tenantContext.campus} />
            </div>
          </Card>
        </PageHeader>

        <SectionEditForm
          academicClass={resolved.academicClass}
          academicYear={resolved.academicYear}
          section={resolved.section}
        />
      </div>
    </AppShell>
  );
}

async function resolveSection(sectionId: string): Promise<SectionResolution | null> {
  const years = await academicStructureService.getAcademicYears(scope(tenantContext.academicYearId));
  for (const academicYear of years) {
    const yearScope = scope(academicYear.id);
    const section = await academicStructureService.getSection(yearScope, sectionId);
    if (!section) continue;

    const academicClass = await academicStructureService.getClass(yearScope, section.classId);
    if (!academicClass) return null;
    return { academicClass, academicYear, section };
  }

  return null;
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
