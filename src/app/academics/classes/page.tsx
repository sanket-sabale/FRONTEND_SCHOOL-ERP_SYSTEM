import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Button, Card, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import {
  AcademicClassCreateForm,
  AcademicClassList,
} from "@/features/academic-structure/components/academic-class-management";
import { academicStructureStatuses, type Section } from "@/features/academic-structure/types/academic-structure";
import { academicStructureService } from "@/lib/api/academic-structure";
import { studentPlacementService } from "@/lib/api/student-placements";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type ClassSearchParams = {
  academicYearId?: string | string[];
  query?: string | string[];
  status?: string | string[];
  sortBy?: string | string[];
  sortDirection?: string | string[];
  created?: string | string[];
  updated?: string | string[];
  archived?: string | string[];
};

export default async function AcademicClassesPage({
  searchParams,
}: {
  searchParams: Promise<ClassSearchParams>;
}) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");

  const params = await searchParams;
  const query = getQueryValue(params.query);
  const status = getQueryValue(params.status);
  const sortBy = getQueryValue(params.sortBy);
  const sortDirection = getQueryValue(params.sortDirection);
  const canManage = hasPermission(currentSessionRole, "academic.manage");
  const activeScope = scope(tenantContext.academicYearId);
  const academicYears = await academicStructureService.getAcademicYears(activeScope);
  const selectedAcademicYearId = getQueryValue(params.academicYearId) ?? tenantContext.academicYearId;
  const selectedYear = academicYears.find((year) => year.id === selectedAcademicYearId) ?? academicYears.find((year) => year.id === tenantContext.academicYearId) ?? academicYears[0];
  const selectedScope = scope(selectedYear?.id ?? tenantContext.academicYearId);
  const [academicClasses, sections] = await Promise.all([
    academicStructureService.getClasses(selectedScope, {
      query,
      status: isClassStatus(status) ? status : undefined,
      includeArchived: true,
      sortBy: isClassSort(sortBy) ? sortBy : "sortOrder",
      sortDirection: sortDirection === "desc" ? "desc" : "asc",
    }),
    academicStructureService.getSections(selectedScope, { includeArchived: true }),
  ]);
  const sectionCounts = buildSectionCounts(sections.filter((section) => section.status === "active"));
  const classRosters = await Promise.all(
    academicClasses.map((academicClass) => studentPlacementService.getClassRoster(selectedScope, academicClass.id)),
  );
  const studentCounts = Object.fromEntries(academicClasses.map((academicClass, index) => [
    academicClass.id,
    classRosters[index]?.activeStudentCount ?? 0,
  ]));

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={[tenantContext.school, tenantContext.campus, selectedYear?.name ?? tenantContext.academicYear, "Academics", "Classes"]} />}
          description="Manage academic classes from Academic Structure. Classes are independent of student existence and remain scoped to tenant, school, campus, and academic year."
          eyebrow="Academic Structure"
          title="Class Management"
          action={<LinkButton href="/academics/academic-years">Academic Years</LinkButton>}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Academic Year" value={selectedYear?.name ?? tenantContext.academicYear} />
            </div>
          </Card>
        </PageHeader>

        <StatusMessage created={Boolean(params.created)} updated={Boolean(params.updated)} archived={Boolean(params.archived)} />

        <AcademicClassCreateForm academicYears={academicYears} canManage={canManage} selectedAcademicYearId={selectedYear?.id ?? tenantContext.academicYearId} />

        <Card>
          <SectionHeader
            eyebrow="Directory"
            title={`${academicClasses.length.toLocaleString("en-IN")} classes`}
            action={canManage ? <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="#create-class">Create class</a> : null}
          />
          <form className="grid gap-3 border-b border-border p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Academic year">
              <Select defaultValue={selectedYear?.id ?? tenantContext.academicYearId} name="academicYearId">
                {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
              </Select>
            </Field>
            <Field label="Search">
              <input className={inputClasses} defaultValue={query ?? ""} name="query" placeholder="Class name or code" type="search" />
            </Field>
            <Field label="Status">
              <Select defaultValue={isClassStatus(status) ? status : ""} name="status">
                <option value="">All statuses</option>
                {academicStructureStatuses.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}
              </Select>
            </Field>
            <Field label="Sort by">
              <Select defaultValue={isClassSort(sortBy) ? sortBy : "sortOrder"} name="sortBy">
                <option value="sortOrder">Sort order</option>
                <option value="displayName">Display name</option>
                <option value="code">Code</option>
                <option value="status">Status</option>
              </Select>
            </Field>
            <Field label="Direction">
              <Select defaultValue={sortDirection === "desc" ? "desc" : "asc"} name="sortDirection">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Select>
            </Field>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
              <Button type="submit" variant="secondary">Apply Filters</Button>
              <LinkButton href="/academics/classes">Clear</LinkButton>
            </div>
          </form>
          <div className="p-4 sm:p-5">
            <AcademicClassList academicClasses={academicClasses} canManage={canManage} sectionCounts={sectionCounts} studentCounts={studentCounts} />
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

function isClassStatus(value?: string): value is (typeof academicStructureStatuses)[number] {
  return Boolean(value && academicStructureStatuses.includes(value as (typeof academicStructureStatuses)[number]));
}

function isClassSort(value?: string): value is "displayName" | "code" | "sortOrder" | "status" {
  return Boolean(value && ["displayName", "code", "sortOrder", "status"].includes(value));
}

function buildSectionCounts(sections: Section[]) {
  return sections.reduce<Record<string, number>>((counts, section) => {
    counts[section.classId] = (counts[section.classId] ?? 0) + 1;
    return counts;
  }, {});
}

function StatusMessage({ archived, created, updated }: { archived: boolean; created: boolean; updated: boolean }) {
  const message = created ? "Class created." : updated ? "Class updated." : archived ? "Class archived." : "";
  if (!message) return null;
  return <Badge tone="success">{message}</Badge>;
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

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100";
