import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import type { AcademicClass, AcademicYear, Section } from "@/features/academic-structure/types/academic-structure";
import type { StudentPromotionListResponse, StudentPromotionReadModel } from "@/features/student-promotions/types/student-promotion";

export function StudentPromotionDashboard({
  academicClasses,
  academicYears,
  context,
  filters,
  promotions,
  sections,
}: {
  context: { school: string; campus: string; academicYear: string };
  promotions: StudentPromotionListResponse;
  academicYears: AcademicYear[];
  academicClasses: AcademicClass[];
  sections: Section[];
  filters: { sourceAcademicYearId: string; targetAcademicYearId: string; classId?: string; sectionId?: string; status?: string; query?: string };
}) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, "Academics", "Promotions"]} />}
        description="Plan and apply individual academic-year promotions without overwriting historical student placements."
        eyebrow="Academic Year Transition"
        title="Student Promotions"
        action={<LinkButton href="/academics/student-placements">Student Placements</LinkButton>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <p className="text-sm font-semibold text-foreground">{promotions.readiness.sourceYear?.name ?? filters.sourceAcademicYearId} to {promotions.readiness.targetYear?.name ?? filters.targetAcademicYearId}</p>
          <p className="mt-1 text-sm text-foreground-muted">Promotion applies one student at a time. Bulk promotion is intentionally not available in Stage 10.</p>
        </Card>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Students" value={promotions.readiness.summary.students} />
        <Metric label="Eligible" value={promotions.readiness.summary.eligible} tone="success" />
        <Metric label="Requires Review" value={promotions.readiness.summary.requiresReview} tone="warning" />
        <Metric label="Promoted" value={promotions.readiness.summary.promoted} tone="info" />
        <Metric label="Retained" value={promotions.readiness.summary.retained} tone="neutral" />
        <Metric label="Transferred" value={promotions.readiness.summary.transferred + promotions.readiness.summary.withdrawn} tone="danger" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        {promotions.readiness.checks.map((check) => (
          <Card className="p-4" key={check.key} variant="muted">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{check.label}</p>
                <p className="mt-1 text-sm text-foreground-muted">{check.message}</p>
              </div>
              <Badge tone={check.status === "passed" ? "success" : check.status === "warning" ? "warning" : "danger"}>{formatLabel(check.status)}</Badge>
            </div>
          </Card>
        ))}
      </section>

      <Card>
        <SectionHeader eyebrow="Filters" title="Promotion Planning" />
        <form className="grid gap-3 border-b border-border p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-6">
          <Field label="Source year">
            <Select defaultValue={filters.sourceAcademicYearId} name="sourceAcademicYearId">
              {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </Select>
          </Field>
          <Field label="Target year">
            <Select defaultValue={filters.targetAcademicYearId} name="targetAcademicYearId">
              {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </Select>
          </Field>
          <Field label="Class">
            <Select defaultValue={filters.classId ?? ""} name="classId">
              <option value="">All classes</option>
              {academicClasses.map((academicClass) => <option key={academicClass.id} value={academicClass.id}>{academicClass.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Section">
            <Select defaultValue={filters.sectionId ?? ""} name="sectionId">
              <option value="">All sections</option>
              {sections.map((section) => <option key={section.id} value={section.id}>Section {section.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select defaultValue={filters.status ?? ""} name="status">
              <option value="">All statuses</option>
              {["pending", "eligible", "promoted", "retained", "transferred", "withdrawn", "requires_review"].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
            </Select>
          </Field>
          <Field label="Search">
            <input className={inputClasses} defaultValue={filters.query ?? ""} name="query" placeholder="Student, class, status" type="search" />
          </Field>
          <div className="responsive-action-row md:col-span-2 xl:col-span-6">
            <button className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" type="submit">Apply filters</button>
            <LinkButton href="/academics/promotions">Clear</LinkButton>
          </div>
        </form>
        {promotions.items.length === 0 ? (
          <div className="p-4 sm:p-5"><EmptyState description="No promotion planning records match the current filters." title="No promotions found" /></div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Current</th>
                    <th className="px-4 py-3">Proposed</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Validation</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {promotions.items.map((promotion) => <PromotionRow key={promotion.id} promotion={promotion} />)}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 lg:hidden">
              {promotions.items.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function PromotionRow({ promotion }: { promotion: StudentPromotionReadModel }) {
  return (
    <tr>
      <td className="px-4 py-3"><p className="font-medium text-foreground">{promotion.studentName}</p><p className="text-xs text-foreground-muted">{promotion.admissionNumber}</p></td>
      <td className="px-4 py-3">{promotion.sourceClassName} / {promotion.sourceSectionName}</td>
      <td className="px-4 py-3">{promotion.targetClassName ?? "Needs review"} / {promotion.targetSectionName ?? "Needs review"}</td>
      <td className="px-4 py-3"><PromotionBadge status={promotion.status} /></td>
      <td className="px-4 py-3">{formatLabel(promotion.reason)}</td>
      <td className="px-4 py-3"><Badge tone={promotion.validation.valid ? "success" : "warning"}>{promotion.validation.valid ? "Ready" : "Review"}</Badge></td>
      <td className="px-4 py-3"><Link className="text-sm font-medium text-primary hover:underline" href={`/academics/promotions/${encodeURIComponent(promotion.id)}`}>Review</Link></td>
    </tr>
  );
}

function PromotionCard({ promotion }: { promotion: StudentPromotionReadModel }) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-medium text-foreground">{promotion.studentName}</p><p className="text-xs text-foreground-muted">{promotion.admissionNumber}</p></div>
        <PromotionBadge status={promotion.status} />
      </div>
      <p className="mt-3 text-sm text-foreground-muted">Current: {promotion.sourceClassName} / {promotion.sourceSectionName}</p>
      <p className="mt-1 text-sm text-foreground-muted">Proposed: {promotion.targetClassName ?? "Needs review"} / {promotion.targetSectionName ?? "Needs review"}</p>
      <Link className="mt-3 inline-flex text-sm font-medium text-primary hover:underline" href={`/academics/promotions/${encodeURIComponent(promotion.id)}`}>Review promotion</Link>
    </article>
  );
}

export function PromotionBadge({ status }: { status: string }) {
  const tone = status === "promoted" || status === "eligible" ? "success" : status === "requires_review" || status === "pending" ? "warning" : status === "transferred" || status === "withdrawn" ? "danger" : "neutral";
  return <Badge tone={tone}>{formatLabel(status)}</Badge>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <Card className="p-4" variant="muted"><p className="text-sm text-foreground-muted">{label}</p><div className="mt-3"><Badge tone={tone}>{value.toLocaleString("en-IN")}</Badge></div></Card>;
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={href}>{children}</Link>;
}

export function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
