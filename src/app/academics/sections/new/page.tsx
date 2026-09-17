import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Card, PageHeader } from "@/components/ui";
import { SectionCreateForm } from "@/features/academic-structure/components/section-management";
import type { AcademicClass } from "@/features/academic-structure/types/academic-structure";
import { academicStructureService } from "@/lib/api/academic-structure";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type SectionCreateSearchParams = {
  academicYearId?: string | string[];
};

export default async function NewSectionPage({
  searchParams,
}: {
  searchParams: Promise<SectionCreateSearchParams>;
}) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");
  if (!hasPermission(currentSessionRole, "academic.manage")) redirect("/unauthorized");

  const params = await searchParams;
  const academicYears = await academicStructureService.getAcademicYears(scope(tenantContext.academicYearId));
  const editableYears = academicYears.filter((year) => year.status !== "archived" && year.status !== "closed");
  const classesByYear = await Promise.all(
    editableYears.map((year) => academicStructureService.getClasses(scope(year.id), { includeArchived: true, sortBy: "sortOrder" })),
  );
  const academicClasses = classesByYear.flat().filter((academicClass): academicClass is AcademicClass => academicClass.status === "active");
  const selectedAcademicYearId = getQueryValue(params.academicYearId) ?? tenantContext.academicYearId;

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={[tenantContext.school, tenantContext.campus, "Academics", "Sections", "New"]} />}
          description="Create a section under an active class and editable academic year. Scope is derived from the current tenant context on submission."
          eyebrow="Academic Structure"
          title="Create Section"
          action={<LinkButton href="/academics/sections">Back to Sections</LinkButton>}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Active Context" value={tenantContext.academicYear} />
            </div>
          </Card>
        </PageHeader>

        <SectionCreateForm
          academicClasses={academicClasses}
          academicYears={academicYears}
          selectedAcademicYearId={selectedAcademicYearId}
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

function getQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
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
