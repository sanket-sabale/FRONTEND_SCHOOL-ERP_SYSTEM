import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Button, Card, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { AcademicYearCreateForm, AcademicYearList } from "@/features/academic-structure/components/academic-year-management";
import { academicYearStatuses } from "@/features/academic-structure/types/academic-structure";
import { academicStructureService } from "@/lib/api/academic-structure";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

type YearSearchParams = {
  query?: string | string[];
  status?: string | string[];
  currentOnly?: string | string[];
  created?: string | string[];
  updated?: string | string[];
  archived?: string | string[];
};

export default async function AcademicYearsPage({
  searchParams,
}: {
  searchParams: Promise<YearSearchParams>;
}) {
  if (!hasPermission(currentSessionRole, "academic.view")) redirect("/unauthorized");

  const params = await searchParams;
  const query = getQueryValue(params.query);
  const status = getQueryValue(params.status);
  const currentOnly = getQueryValue(params.currentOnly) === "true";
  const canManage = hasPermission(currentSessionRole, "academic.manage");
  const academicYears = await academicStructureService.getAcademicYears(scope(), {
    query,
    status: isYearStatus(status) ? status : undefined,
    currentOnly,
  });

  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={[tenantContext.school, tenantContext.campus, "Academics", "Academic Years"]} />}
          description="Manage academic years for this campus. Current-year rules are enforced by the Academic Structure service."
          eyebrow="Academic Structure"
          title="Academic Year Management"
          action={<LinkButton href="/academics/classes">Classes</LinkButton>}
        >
          <Card className="responsive-card-padding" variant="muted">
            <div className="grid gap-2 text-sm">
              <ContextLine label="School" value={tenantContext.school} />
              <ContextLine label="Campus" value={tenantContext.campus} />
              <ContextLine label="Active Context" value={tenantContext.academicYear} />
            </div>
          </Card>
        </PageHeader>

        <StatusMessage created={Boolean(params.created)} updated={Boolean(params.updated)} archived={Boolean(params.archived)} />

        <AcademicYearCreateForm canManage={canManage} />

        <Card>
          <SectionHeader
            eyebrow="Directory"
            title={`${academicYears.length.toLocaleString("en-IN")} academic years`}
            action={canManage ? <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="#create-academic-year">Create academic year</a> : null}
          />
          <form className="grid gap-3 border-b border-border p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Search">
              <input className={inputClasses} defaultValue={query ?? ""} name="query" placeholder="Year, status, or dates" type="search" />
            </Field>
            <Field label="Status">
              <Select defaultValue={isYearStatus(status) ? status : ""} name="status">
                <option value="">All statuses</option>
                {academicYearStatuses.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}
              </Select>
            </Field>
            <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground xl:mt-6">
              <input className="h-4 w-4 rounded border-border text-primary focus:ring-primary" defaultChecked={currentOnly} name="currentOnly" type="checkbox" value="true" />
              Current only
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-1 xl:mt-6">
              <Button type="submit" variant="secondary">Apply Filters</Button>
              <LinkButton href="/academics/academic-years">Clear</LinkButton>
            </div>
          </form>
          <div className="p-4 sm:p-5">
            <AcademicYearList academicYears={academicYears} canManage={canManage} />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}

function getQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isYearStatus(value?: string): value is (typeof academicYearStatuses)[number] {
  return Boolean(value && academicYearStatuses.includes(value as (typeof academicYearStatuses)[number]));
}

function StatusMessage({ archived, created, updated }: { archived: boolean; created: boolean; updated: boolean }) {
  const message = created ? "Academic year created." : updated ? "Academic year updated." : archived ? "Academic year archived." : "";
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
