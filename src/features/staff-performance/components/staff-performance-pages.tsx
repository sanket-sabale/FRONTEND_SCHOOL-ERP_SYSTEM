import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { GoalForm, HrNoteForm, ReviewForm, TrainingForm } from "@/features/staff-performance/components/staff-performance-forms";
import { StaffPerformanceStatusBadge } from "@/features/staff-performance/components/staff-performance-status-badge";
import {
  formatRating,
  goalCategoryLabels,
  goalPriorityLabels,
  reviewTypeLabels,
  trainingTypeLabels,
} from "@/features/staff-performance/services/staff-performance-rules";
import type {
  StaffDisciplinaryRecord,
  StaffGoal,
  StaffHrNote,
  StaffHrTimelineEvent,
  StaffPerformanceDashboard,
  StaffPerformanceReview,
  StaffPerformanceReviewListResponse,
  StaffPerformanceSummary,
  StaffTraining,
} from "@/features/staff-performance/types/staff-performance";
import type { StaffProfile } from "@/features/staff/types/staff";

export function StaffPerformanceDashboardPage({ dashboard, reviews }: { dashboard: StaffPerformanceDashboard; reviews: StaffPerformanceReviewListResponse }) {
  const metrics = [
    ["Total Staff", dashboard.totalStaff],
    ["Active Staff", dashboard.activeStaff],
    ["On Leave", dashboard.onLeave],
    ["Upcoming Reviews", dashboard.upcomingReviews],
    ["Reviews Pending", dashboard.reviewsPending],
    ["Goals In Progress", dashboard.goalsInProgress],
    ["Training In Progress", dashboard.trainingInProgress],
    ["Open HR Actions", dashboard.openHrActions],
  ] as const;
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", "Performance"]} />} description="Operational HR performance, development, and review workspace for staff." eyebrow="Staff HR" title="Performance & HR Operations" action={<div className="responsive-action-row"><Link className={linkButtonClasses} href="/staff/performance/reviews">Review Cycles</Link><Link className={linkButtonClasses} href="/staff/hr-operations">HR Operations</Link></div>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}
      </section>
      <ReviewListCard response={reviews} title="Recent Review Cycles" />
    </div>
  );
}

export function StaffReviewListPage({ response }: { response: StaffPerformanceReviewListResponse }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", "Performance", "Reviews"]} />} description="Search, review, and open staff performance cycles." eyebrow="Performance" title="Review Cycles" action={<Link className={linkButtonClasses} href="/staff/performance">Back to Dashboard</Link>} />
      <ReviewListCard response={response} title="Performance Reviews" />
    </div>
  );
}

export function StaffReviewDetailPage({ review, staff }: { review: StaffPerformanceReview; staff: StaffProfile }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", "Performance", staff.displayName]} />} description="Review details are tenant scoped and permission protected." eyebrow="Performance Review" title={`${reviewTypeLabels[review.reviewType]} Review`} action={<div className="responsive-action-row"><Link className={linkButtonClasses} href="/staff/performance/reviews">Back to Reviews</Link><Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/performance`}>Staff Performance</Link></div>} />
      <Card>
        <SectionHeader eyebrow={staff.employeeNumber} title={staff.displayName} action={<StaffPerformanceStatusBadge status={review.status} />} />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
          <InfoRow label="Review Period" value={`${review.reviewPeriodStart} to ${review.reviewPeriodEnd}`} />
          <InfoRow label="Reviewer" value={review.reviewerName} />
          <InfoRow label="Rating" value={formatRating(review.overallRating)} />
          <InfoRow label="Review Date" value={review.reviewDate ?? "Not scheduled"} />
          <InfoBlock label="Strengths" value={review.strengths} />
          <InfoBlock label="Improvement Areas" value={review.improvementAreas} />
          <InfoBlock label="Reviewer Comments" value={review.reviewerComments} />
          <InfoBlock label="Staff Comments" value={review.staffComments} />
        </div>
      </Card>
    </div>
  );
}

export function StaffPerformanceWorkspacePage({ canManage, staff, summary }: { canManage: boolean; staff: StaffProfile; summary: StaffPerformanceSummary }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Performance"]} />} description="Staff 360 performance, development, goals, training, and HR timeline." eyebrow="Staff Performance" title={staff.displayName} action={<div className="responsive-action-row"><Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}`}>Back to Profile</Link>{canManage ? <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/performance/reviews/new`}>New Review</Link> : null}</div>} />
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]">
        <Card>
          <SectionHeader eyebrow="Latest Review" title="Performance Summary" />
          <div className="grid gap-4 p-4 sm:p-5">
            {summary.latestReview ? <ReviewSummary review={summary.latestReview} /> : <EmptyState description="No performance review exists for this staff member." title="No review yet" />}
            <RecordGrid goals={summary.activeGoals} training={summary.recentTraining} />
          </div>
        </Card>
        <Timeline events={summary.timeline} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <SkillsCard summary={summary} />
        <RecognitionCard summary={summary} />
      </section>
    </div>
  );
}

export function StaffReviewCreatePage({ staff }: { staff: StaffProfile }) {
  return <StaffFormShell staff={staff} title="New Performance Review"><ReviewForm staffId={staff.id} /></StaffFormShell>;
}

export function StaffGoalsPage({ canManage, goals, staff }: { canManage: boolean; goals: StaffGoal[]; staff: StaffProfile }) {
  return (
    <StaffFormShell staff={staff} title="Goals">
      <RecordList title="Staff Goals" records={goals.map((goal) => ({ id: goal.id, title: goal.title, meta: `${goalCategoryLabels[goal.category]} / ${goalPriorityLabels[goal.priority]} / ${goal.progress}%`, status: goal.status }))} />
      {canManage ? <GoalForm staffId={staff.id} /> : null}
    </StaffFormShell>
  );
}

export function StaffTrainingPage({ canManage, staff, training }: { canManage: boolean; staff: StaffProfile; training: StaffTraining[] }) {
  return (
    <StaffFormShell staff={staff} title="Training">
      <RecordList title="Training Records" records={training.map((item) => ({ id: item.id, title: item.title, meta: `${trainingTypeLabels[item.trainingType]} / ${item.provider ?? "No provider"} / ${item.startDate}`, status: item.status }))} />
      {canManage ? <TrainingForm staffId={staff.id} /> : null}
    </StaffFormShell>
  );
}

export function StaffHrOperationsPage({ canManage, notes, disciplinaryRecords, staff, timeline }: { canManage: boolean; notes: StaffHrNote[]; disciplinaryRecords: StaffDisciplinaryRecord[]; staff: StaffProfile; timeline: StaffHrTimelineEvent[] }) {
  return (
    <StaffFormShell staff={staff} title="HR Operations">
      <section className="grid gap-4 lg:grid-cols-2">
        <RecordList title="Private HR Notes" records={notes.map((note) => ({ id: note.id, title: note.title, meta: `${note.category.replaceAll("_", " ")} / ${note.createdBy} / ${note.createdDate}`, status: "hr_only" }))} sensitive />
        <RecordList title="Disciplinary Records" records={disciplinaryRecords.map((record) => ({ id: record.id, title: record.recordType, meta: `${record.severity} / ${record.date}`, status: record.status }))} sensitive />
      </section>
      <Timeline events={timeline} />
      {canManage ? <HrNoteForm staffId={staff.id} /> : null}
    </StaffFormShell>
  );
}

function ReviewListCard({ response, title }: { response: StaffPerformanceReviewListResponse; title: string }) {
  return (
    <Card>
      <SectionHeader eyebrow={`${response.total} records`} title={title} />
      {response.items.length === 0 ? <div className="p-4 sm:p-5"><EmptyState description="No performance reviews match the current scope." title="No reviews" /></div> : (
        <div className="grid gap-2 p-4 sm:p-5">
          {response.items.map((review) => (
            <Link className="rounded-lg border border-border bg-surface-muted p-3 transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href={`/staff/performance/reviews/${encodeURIComponent(review.id)}`} key={review.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="responsive-text text-sm font-semibold text-foreground">{review.staffName}</p>
                  <p className="text-xs text-foreground-muted">{review.employeeNumber} / {review.departmentName} / {review.designationName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2"><Badge tone="info">{reviewTypeLabels[review.reviewType]}</Badge><StaffPerformanceStatusBadge status={review.status} /></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function StaffFormShell({ children, staff, title }: { children: React.ReactNode; staff: StaffProfile; title: string }) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, title]} />} description="Sensitive HR information is available only to authorized HR users." eyebrow="Staff HR" title={title} action={<div className="responsive-action-row"><Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/performance`}>Performance</Link><Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}`}>Profile</Link></div>} />
      {children}
    </div>
  );
}

function RecordList({ records, sensitive = false, title }: { records: Array<{ id: string; title: string; meta: string; status: string }>; sensitive?: boolean; title: string }) {
  return (
    <Card>
      <SectionHeader eyebrow={sensitive ? "Restricted HR" : "Records"} title={title} />
      <div className="grid gap-2 p-4 sm:p-5">
        {records.length === 0 ? <EmptyState description="No records exist in the current staff scope." title="No records" /> : records.map((record) => (
          <div className="rounded-lg border border-border bg-surface-muted p-3" key={record.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><p className="responsive-text text-sm font-medium text-foreground">{record.title}</p><p className="mt-1 text-xs text-foreground-muted">{record.meta}</p></div>
              <StaffPerformanceStatusBadge status={record.status} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecordGrid({ goals, training }: { goals: StaffGoal[]; training: StaffTraining[] }) {
  return <div className="grid gap-4 lg:grid-cols-2"><RecordList title="Active Goals" records={goals.slice(0, 4).map((goal) => ({ id: goal.id, title: goal.title, meta: `${goalCategoryLabels[goal.category]} / ${goal.progress}%`, status: goal.status }))} /><RecordList title="Training" records={training.slice(0, 4).map((item) => ({ id: item.id, title: item.title, meta: `${trainingTypeLabels[item.trainingType]} / ${item.startDate}`, status: item.status }))} /></div>;
}

function ReviewSummary({ review }: { review: StaffPerformanceReview }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-foreground">{reviewTypeLabels[review.reviewType]} Review</p><p className="text-xs text-foreground-muted">{review.reviewPeriodStart} to {review.reviewPeriodEnd}</p></div><StaffPerformanceStatusBadge status={review.status} /></div><p className="mt-3 text-sm text-foreground-muted">{formatRating(review.overallRating)}</p></div>;
}

function Timeline({ events }: { events: StaffHrTimelineEvent[] }) {
  return <Card><SectionHeader eyebrow="HR History" title="Timeline" /><div className="grid gap-2 p-4 sm:p-5">{events.length === 0 ? <EmptyState description="No HR timeline events are available yet." title="No timeline" /> : events.map((event) => <div className="rounded-lg border border-border bg-surface-muted p-3" key={event.id}><div className="flex flex-wrap items-center justify-between gap-2"><p className="responsive-text text-sm font-medium text-foreground">{event.title}</p><Badge tone={event.tone}>{event.type}</Badge></div><p className="mt-1 text-xs text-foreground-muted">{event.date}{event.description ? ` / ${event.description}` : ""}</p></div>)}</div></Card>;
}

function SkillsCard({ summary }: { summary: StaffPerformanceSummary }) {
  return <RecordList title="Skills & Qualifications" records={[...summary.skills.map((skill) => ({ id: skill.id, title: skill.name, meta: `${skill.category.replaceAll("_", " ")} / ${skill.proficiency}`, status: skill.verificationStatus })), ...summary.qualifications.map((qualification) => ({ id: qualification.id, title: qualification.qualification, meta: `${qualification.specialization ?? "General"} / ${qualification.institution ?? "Institution not recorded"}`, status: qualification.verificationStatus }))]} />;
}

function RecognitionCard({ summary }: { summary: StaffPerformanceSummary }) {
  return <RecordList title="Recognition" records={summary.recognition.map((item) => ({ id: item.id, title: item.title, meta: `${item.date} / ${item.awardedBy}`, status: "completed" }))} />;
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p></Card>;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="responsive-text mt-1 text-sm font-medium text-foreground">{value ?? "Not provided"}</p></div>;
}

function InfoBlock({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="mt-2 text-sm leading-6 text-foreground">{value ?? "Not provided"}</p></div>;
}

const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
