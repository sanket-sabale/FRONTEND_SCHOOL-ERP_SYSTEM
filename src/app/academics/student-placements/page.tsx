import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Button, Card, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { StudentPlacementDirectory } from "@/features/student-placements/components/student-placement-management";
import { studentPlacementStatuses } from "@/features/student-placements/types/student-placement";
import { academicStructureService } from "@/lib/api/academic-structure";
import { studentPlacementService } from "@/lib/api/student-placements";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type PlacementSearchParams = {
  academicYearId?: string | string[];
  classId?: string | string[];
  sectionId?: string | string[];
  query?: string | string[];
  status?: string | string[];
};

export default async function StudentPlacementsPage({
  searchParams,
}: {
  searchParams: Promise<PlacementSearchParams>;
}) {
  if (!hasPermission(currentSessionRole, "academic.view") && !hasPermission(currentSessionRole, "student.view")) redirect("/unauthorized");

  const params = await searchParams;
  const selectedAcademicYearId = getQueryValue(params.academicYearId) ?? tenantContext.academicYearId;
  const status = getQueryValue(params.status);
  const selectedScope = scope(selectedAcademicYearId);
  const [academicYears, academicClasses, sections, response] = await Promise.all([
    academicStructureService.getAcademicYears(scope(tenantContext.academicYearId)),
    academicStructureService.getClasses(selectedScope, { includeArchived: true, sortBy: "sortOrder" }),
    academicStructureService.getSections(selectedScope, { includeArchived: true }),
    studentPlacementService.getStudentsByPlacement(selectedScope, {
      query: getQueryValue(params.query),
      classId: getQueryValue(params.classId),
      sectionId: getQueryValue(params.sectionId),
      status: isPlacementStatus(status) ? status : undefined,
      page: 1,
      pageSize: 100,
    }),
  ]);

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={[tenantContext.school, tenantContext.campus, "Academics", "Student Placements"]} />}
          description="Review student placement history as academic relationships between students, academic years, classes, and sections."
          eyebrow="Academic Structure"
          title="Student Placements"
          action={<LinkButton href="/academics/sections">Sections</LinkButton>}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Academic Year" value={selectedAcademicYearId} />
            </div>
          </Card>
        </PageHeader>

        <Card>
          <SectionHeader eyebrow="Directory" title={`${response.total.toLocaleString("en-IN")} placements`} />
          <form className="grid gap-3 border-b border-border p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Academic year">
              <Select defaultValue={selectedAcademicYearId} name="academicYearId">
                {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
              </Select>
            </Field>
            <Field label="Class">
              <Select defaultValue={getQueryValue(params.classId) ?? ""} name="classId">
                <option value="">All classes</option>
                {academicClasses.map((academicClass) => <option key={academicClass.id} value={academicClass.id}>{academicClass.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Section">
              <Select defaultValue={getQueryValue(params.sectionId) ?? ""} name="sectionId">
                <option value="">All sections</option>
                {sections.map((section) => <option key={section.id} value={section.id}>Section {section.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select defaultValue={status ?? ""} name="status">
                <option value="">All statuses</option>
                {studentPlacementStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </Select>
            </Field>
            <Field label="Search">
              <input className={inputClasses} defaultValue={getQueryValue(params.query) ?? ""} name="query" placeholder="Student, admission, class" type="search" />
            </Field>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
              <Button type="submit" variant="secondary">Apply Filters</Button>
              <LinkButton href="/academics/student-placements">Clear</LinkButton>
            </div>
          </form>
          <div className="p-4 sm:p-5">
            <StudentPlacementDirectory placements={response.items} />
          </div>
        </Card>
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

function isPlacementStatus(value?: string): value is (typeof studentPlacementStatuses)[number] {
  return Boolean(value && studentPlacementStatuses.includes(value as (typeof studentPlacementStatuses)[number]));
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

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100";
