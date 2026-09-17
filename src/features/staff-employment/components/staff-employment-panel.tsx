import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import { getStaffEmploymentEventTypeLabel } from "@/features/staff-employment/services/staff-employment-rules";
import type { StaffEmploymentRecord } from "@/features/staff-employment/types/staff-employment";
import { getEmploymentTypeLabel, getStaffStatusLabel } from "@/features/staff/services/staff-rules";
import type { StaffProfile } from "@/features/staff/types/staff";

export function StaffEmploymentPanel({ context, records, staff }: { context: { campus: string }; records: StaffEmploymentRecord[]; staff: StaffProfile }) {
  return (
    <Card id="employment">
      <SectionHeader eyebrow="Employment" title="Employment Records" />
      <div className="grid gap-5 p-4 sm:p-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Current employment">
          <EmploymentTerm label="Department" value={staff.departmentName} />
          <EmploymentTerm label="Designation" value={staff.designationName} />
          <EmploymentTerm label="Employment Type" value={getEmploymentTypeLabel(staff.employmentType)} />
          <EmploymentTerm label="Work Location" value={context.campus} />
          <EmploymentTerm label="Reporting Manager" value={staff.reportingManagerName} />
          <EmploymentTerm label="Status" value={getStaffStatusLabel(staff.status)} />
          <EmploymentTerm label="Joining Date" value={formatDate(staff.joiningDate)} />
          <EmploymentTerm label="Confirmation Date" value={formatDate(staff.confirmationDate)} />
        </section>

        <section aria-label="Employment timeline">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Employment Timeline</p>
              <p className="mt-1 text-sm text-foreground-muted">Historical records support audit context. Current Staff fields remain authoritative.</p>
            </div>
            <Badge tone="info">{records.length} record(s)</Badge>
          </div>
          {records.length === 0 ? (
            <EmptyState description="No historical employment records have been recorded for this staff member." title="No employment records" />
          ) : (
            <ol className="grid gap-3">
              {records.map((record) => (
                <li className="rounded-lg border border-border bg-surface-muted p-3" key={record.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="responsive-text font-semibold text-foreground">{record.title}</p>
                      <p className="mt-1 text-sm text-foreground-muted">{formatDate(record.effectiveDate)} / {record.departmentName ?? staff.departmentName} / {record.designationName ?? staff.designationName}</p>
                    </div>
                    <Badge tone={record.eventType === "joining" || record.eventType === "confirmation" || record.eventType === "promotion" ? "success" : "neutral"}>{getStaffEmploymentEventTypeLabel(record.eventType)}</Badge>
                  </div>
                  {record.description ? <p className="mt-2 text-sm text-foreground-muted">{record.description}</p> : null}
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <EmploymentMiniTerm label="Employment" value={record.employmentType} />
                    <EmploymentMiniTerm label="Location" value={record.workLocation} />
                    <EmploymentMiniTerm label="Probation End" value={formatDate(record.probationEndDate)} />
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Card>
  );
}

function EmploymentTerm({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="responsive-text mt-2 font-medium text-foreground">{value || "Not recorded"}</p>
    </div>
  );
}

function EmploymentMiniTerm({ label, value }: { label: string; value?: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt><dd className="responsive-text mt-1 text-foreground">{value || "Not recorded"}</dd></div>;
}

function formatDate(date?: string) {
  if (!date) return undefined;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}
