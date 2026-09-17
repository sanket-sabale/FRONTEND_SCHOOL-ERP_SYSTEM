import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, Field, PageHeader, SectionHeader, Select } from "@/components/ui";
import { applyStudentPromotionFormAction, updateStudentPromotionFormAction } from "@/features/student-promotions/actions/student-promotion-actions";
import { formatLabel, PromotionBadge } from "@/features/student-promotions/components/student-promotion-management";
import type { AcademicClass, Section } from "@/features/academic-structure/types/academic-structure";
import type { StudentPromotionReadModel } from "@/features/student-promotions/types/student-promotion";

export function StudentPromotionDetail({
  academicClasses,
  context,
  promotion,
  sections,
}: {
  context: { school: string; campus: string; academicYear: string };
  promotion: StudentPromotionReadModel;
  academicClasses: AcademicClass[];
  sections: Section[];
}) {
  const targetSections = sections.filter((section) => section.classId === promotion.targetClassId || !promotion.targetClassId);
  const canApply = ["eligible", "pending"].includes(promotion.status) && promotion.validation.valid;

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, "Academics", "Promotions", promotion.studentName]} />}
        description="Review one academic-year promotion. Applying a promotion ends the source placement and creates a new target placement."
        eyebrow="Promotion Review"
        title={promotion.studentName}
        action={<LinkButton href="/academics/promotions">Promotion Workspace</LinkButton>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="flex flex-wrap gap-2">
            <PromotionBadge status={promotion.status} />
            <Badge tone={promotion.validation.valid ? "success" : "warning"}>{promotion.validation.valid ? "Ready to apply" : "Requires review"}</Badge>
          </div>
          <p className="mt-3 text-sm text-foreground-muted">Historical placement has been preserved. Stage 10 never overwrites previous academic placement history.</p>
        </Card>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Current placement" title="Source Placement" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Academic Year" value={promotion.sourceAcademicYearName} />
            <InfoRow label="Class" value={promotion.sourceClassName} />
            <InfoRow label="Section" value={promotion.sourceSectionName} />
            <InfoRow label="Effective From" value={formatDate(promotion.sourcePlacementStartDate)} />
            <InfoRow label="Effective To" value={promotion.sourcePlacementEndDate ? formatDate(promotion.sourcePlacementEndDate) : "Active until promotion apply"} />
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Proposed placement" title="Target Placement" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Academic Year" value={promotion.targetAcademicYearName} />
            <InfoRow label="Class" value={promotion.targetClassName} />
            <InfoRow label="Section" value={promotion.targetSectionName} />
            <InfoRow label="Status" value={formatLabel(promotion.status)} />
            <InfoRow label="Reason" value={formatLabel(promotion.reason)} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Review" title="Adjust Target" />
          {promotion.status === "promoted" ? (
            <div className="p-4 sm:p-5"><EmptyState description="This promotion has already been applied. Its source and target placement history remains readable." title="Promotion applied" /></div>
          ) : (
            <form action={updateStudentPromotionFormAction} className="grid gap-3 p-4 sm:p-5">
              <input name="id" type="hidden" value={promotion.id} />
              <input name="sourceAcademicYearId" type="hidden" value={promotion.sourceAcademicYearId} />
              <Field label="Target class">
                <Select defaultValue={promotion.targetClassId ?? ""} name="targetClassId">
                  <option value="">Select class</option>
                  {academicClasses.map((academicClass) => <option key={academicClass.id} value={academicClass.id}>{academicClass.displayName}</option>)}
                </Select>
              </Field>
              <Field label="Target section">
                <Select defaultValue={promotion.targetSectionId ?? ""} name="targetSectionId">
                  <option value="">Select section</option>
                  {targetSections.map((section) => <option key={section.id} value={section.id}>Section {section.displayName}</option>)}
                </Select>
              </Field>
              <Field label="Reason">
                <Select defaultValue={promotion.reason} name="reason">
                  {["annual_promotion", "retained", "section_change", "administrative_correction", "student_transfer", "withdrawal", "manual_review"].map((reason) => <option key={reason} value={reason}>{formatLabel(reason)}</option>)}
                </Select>
              </Field>
              <Field label="Review status">
                <Select defaultValue={promotion.status} name="status">
                  {["pending", "eligible", "retained", "transferred", "withdrawn", "requires_review"].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
                </Select>
              </Field>
              <Field label="Notes">
                <textarea className={textareaClasses} defaultValue={promotion.notes} maxLength={500} name="notes" />
              </Field>
              <button className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" type="submit">Save Review</button>
            </form>
          )}
        </Card>

        <Card>
          <SectionHeader eyebrow="Apply" title="Individual Promotion" />
          <div className="grid gap-3 p-4 sm:p-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Applying changes academic placement only. It does not change attendance history, guardians, communication, or academic structure.
            </div>
            {canApply ? (
              <form action={applyStudentPromotionFormAction} className="grid gap-3">
                <input name="id" type="hidden" value={promotion.id} />
                <input name="sourceAcademicYearId" type="hidden" value={promotion.sourceAcademicYearId} />
                <Field label="Target start date">
                  <input className={inputClasses} defaultValue="2027-04-01" name="startDate" type="date" />
                </Field>
                <Field label="Apply notes">
                  <textarea className={textareaClasses} defaultValue={promotion.notes} maxLength={500} name="notes" />
                </Field>
                <button className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" type="submit">Apply Promotion</button>
              </form>
            ) : (
              <EmptyState description="Resolve failed validation checks before applying this individual promotion." title="Promotion cannot be applied yet" />
            )}
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Validation" title="Promotion Checks" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {promotion.validation.checks.map((check) => (
            <div className="rounded-lg border border-border bg-surface-muted p-3" key={check.key}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{check.label}</p>
                <Badge tone={check.status === "passed" ? "success" : check.status === "warning" ? "warning" : "danger"}>{formatLabel(check.status)}</Badge>
              </div>
              <p className="mt-2 text-sm text-foreground-muted">{check.message}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Timeline" title="Promotion History" />
        <ol className="grid gap-3 p-4 sm:p-5">
          <TimelineItem label="Proposed" actor={promotion.proposedBy} at={promotion.proposedAt} />
          {promotion.reviewedAt ? <TimelineItem label="Reviewed" actor={promotion.reviewedBy} at={promotion.reviewedAt} /> : null}
          {promotion.appliedAt ? <TimelineItem label="Applied" actor={promotion.appliedBy} at={promotion.appliedAt} /> : null}
          {!promotion.reviewedAt && !promotion.appliedAt ? <li><EmptyState description="This promotion has not been reviewed or applied yet." title="Awaiting review" /></li> : null}
        </ol>
      </Card>
    </div>
  );
}

export function StudentPromotionNotFound() {
  return (
    <div className="erp-container">
      <Card className="mx-auto max-w-xl">
        <SectionHeader eyebrow="Academic Promotions" title="Promotion not found" />
        <div className="p-4 sm:p-5">
          <EmptyState description="The promotion record does not exist or is outside the active school scope." title="Promotion unavailable" />
          <LinkButton href="/academics/promotions">Back to Promotions</LinkButton>
        </div>
      </Card>
    </div>
  );
}

function TimelineItem({ actor, at, label }: { label: string; actor?: string; at?: string }) {
  return <li className="rounded-lg border border-border bg-surface-muted p-3 text-sm"><p className="font-semibold text-foreground">{label}</p><p className="mt-1 text-foreground-muted">{actor ?? "Actor unavailable"} / {formatDateTime(at)}</p></li>;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return <div className="flex min-w-0 justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm"><span className="text-foreground-muted">{label}</span><span className="responsive-text text-right font-medium text-foreground">{value || "Not available"}</span></div>;
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={href}>{children}</Link>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const textareaClasses = "min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
