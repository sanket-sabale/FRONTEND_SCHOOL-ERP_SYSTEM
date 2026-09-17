import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Button, Card, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { SectionList } from "@/features/academic-structure/components/section-management";
import { academicStructureStatuses, type AcademicClass, type AcademicYear, type Section } from "@/features/academic-structure/types/academic-structure";
import { academicStructureService } from "@/lib/api/academic-structure";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type SectionSearchParams = {
  academicYearId?: string | string[];
  classId?: string | string[];
  query?: string | string[];
  status?: string | string[];
  sortBy?: string | string[];
  sortDirection?: string | string[];
  created?: string | string[];
  updated?: string | string[];
  archived?: string | string[];
  restored?: string | string[];
};

export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<SectionSearchParams>;
}) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");

  const params = await searchParams;
  const query = getQueryValue(params.query);
  const status = getQueryValue(params.status);
  const classId = getQueryValue(params.classId);
  const sortBy = getQueryValue(params.sortBy);
  const sortDirection = getQueryValue(params.sortDirection);
  const canManage = hasPermission(currentSessionRole, "academic.manage");
  const activeScope = scope(tenantContext.academicYearId);
  const academicYears = await academicStructureService.getAcademicYears(activeScope);
  const selectedAcademicYearId = getQueryValue(params.academicYearId) ?? tenantContext.academicYearId;
  const selectedYear = academicYears.find((year) => year.id === selectedAcademicYearId) ?? academicYears.find((year) => year.id === tenantContext.academicYearId) ?? academicYears[0];
  const selectedScope = scope(selectedYear?.id ?? tenantContext.academicYearId);
  const [academicClasses, sections] = await Promise.all([
    academicStructureService.getClasses(selectedScope, { includeArchived: true, sortBy: "sortOrder" }),
    academicStructureService.getSections(selectedScope, {
      query,
      classId,
      status: isStructureStatus(status) ? status : undefined,
      includeArchived: true,
      sortBy: isSectionSort(sortBy) ? sortBy : "displayName",
      sortDirection: sortDirection === "desc" ? "desc" : "asc",
    }),
  ]);
  const classMap = new Map(academicClasses.map((academicClass) => [academicClass.id, academicClass]));
  const yearMap = new Map(academicYears.map((year) => [year.id, year]));
  const sectionContexts = buildSectionContexts(sections, classMap, yearMap);

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={[tenantContext.school, tenantContext.campus, selectedYear?.name ?? tenantContext.academicYear, "Academics", "Sections"]} />}
          description="Manage sections from Academic Structure. Sections are authoritative records under a class and can exist before any student is assigned."
          eyebrow="Academic Structure"
          title="Section Management"
          action={<LinkButton href="/academics/classes">Classes</LinkButton>}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Academic Year" value={selectedYear?.name ?? tenantContext.academicYear} />
            </div>
          </Card>
        </PageHeader>

        <StatusMessage
          archived={Boolean(params.archived)}
          created={Boolean(params.created)}
          restored={Boolean(params.restored)}
          updated={Boolean(params.updated)}
        />

        <Card>
          <SectionHeader
            eyebrow="Directory"
            title={`${sections.length.toLocaleString("en-IN")} sections`}
            action={canManage ? <LinkButton href={`/academics/sections/new?academicYearId=${encodeURIComponent(selectedYear?.id ?? tenantContext.academicYearId)}`}>Create Section</LinkButton> : null}
          />
          <form className="grid gap-3 border-b border-border p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-6">
            <Field label="Academic year">
              <Select defaultValue={selectedYear?.id ?? tenantContext.academicYearId} name="academicYearId">
                {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
              </Select>
            </Field>
            <Field label="Class">
              <Select defaultValue={classId ?? ""} name="classId">
                <option value="">All classes</option>
                {academicClasses.map((academicClass) => <option key={academicClass.id} value={academicClass.id}>{academicClass.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Search">
              <input className={inputClasses} defaultValue={query ?? ""} name="query" placeholder="Section, room, teacher" type="search" />
            </Field>
            <Field label="Status">
              <Select defaultValue={isStructureStatus(status) ? status : ""} name="status">
                <option value="">All statuses</option>
                {academicStructureStatuses.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}
              </Select>
            </Field>
            <Field label="Sort by">
              <Select defaultValue={isSectionSort(sortBy) ? sortBy : "displayName"} name="sortBy">
                <option value="displayName">Display name</option>
                <option value="name">Section name</option>
                <option value="capacity">Capacity</option>
                <option value="status">Status</option>
              </Select>
            </Field>
            <Field label="Direction">
              <Select defaultValue={sortDirection === "desc" ? "desc" : "asc"} name="sortDirection">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Select>
            </Field>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
              <Button type="submit" variant="secondary">Apply Filters</Button>
              <LinkButton href="/academics/sections">Clear</LinkButton>
              <LinkButton href="/academics/sections">Refresh</LinkButton>
            </div>
          </form>
          <div className="p-4 sm:p-5">
            <SectionList canManage={canManage} sectionContexts={sectionContexts} sections={sections} />
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

function isStructureStatus(value?: string): value is (typeof academicStructureStatuses)[number] {
  return Boolean(value && academicStructureStatuses.includes(value as (typeof academicStructureStatuses)[number]));
}

function isSectionSort(value?: string): value is "displayName" | "name" | "capacity" | "status" {
  return Boolean(value && ["displayName", "name", "capacity", "status"].includes(value));
}

function buildSectionContexts(sections: Section[], classMap: Map<string, AcademicClass>, yearMap: Map<string, AcademicYear>) {
  return Object.fromEntries(sections.map((section) => [
    section.id,
    {
      academicClass: classMap.get(section.classId),
      academicYear: yearMap.get(section.academicYearId),
    },
  ]));
}

function StatusMessage({
  archived,
  created,
  restored,
  updated,
}: {
  archived: boolean;
  created: boolean;
  restored: boolean;
  updated: boolean;
}) {
  const message = created ? "Section created." : updated ? "Section updated." : archived ? "Section archived." : restored ? "Section restored." : "";
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
