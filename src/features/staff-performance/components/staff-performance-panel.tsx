import Link from "next/link";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import { StaffPerformanceStatusBadge } from "@/features/staff-performance/components/staff-performance-status-badge";
import { formatRating, goalCategoryLabels, reviewTypeLabels, trainingTypeLabels } from "@/features/staff-performance/services/staff-performance-rules";
import type { StaffPerformanceSummary } from "@/features/staff-performance/types/staff-performance";
import type { StaffProfile } from "@/features/staff/types/staff";

export function StaffPerformancePanel({ canManage, staff, summary }: { canManage: boolean; staff: StaffProfile; summary: StaffPerformanceSummary }) {
  return (
    <Card id="performance">
      <SectionHeader
        eyebrow="Performance"
        title="Performance & Development"
        action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/performance`}>Open Workspace</Link>}
      />
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Latest Rating" value={summary.latestReview?.overallRating ? String(summary.latestReview.overallRating) : "--"} helper={summary.latestReview ? formatRating(summary.latestReview.overallRating) : "No review yet"} />
          <Metric label="Active Goals" value={String(summary.activeGoals.length)} helper="Open development goals" />
          <Metric label="Training" value={String(summary.recentTraining.length)} helper="Recent or planned records" />
          <Metric label="HR Alerts" value={String(summary.openDisciplinaryCount)} helper="Open disciplinary items" tone={summary.openDisciplinaryCount > 0 ? "danger" : "neutral"} />
        </div>

        {summary.latestReview ? (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{reviewTypeLabels[summary.latestReview.reviewType]} Review</p>
                <p className="text-xs text-foreground-muted">{summary.latestReview.reviewPeriodStart} to {summary.latestReview.reviewPeriodEnd}</p>
              </div>
              <StaffPerformanceStatusBadge status={summary.latestReview.status} />
            </div>
            <p className="mt-3 text-sm text-foreground-muted">{summary.latestReview.reviewerComments ?? "Review comments are not available yet."}</p>
          </div>
        ) : (
          <EmptyState description="Create a review cycle when HR is ready to evaluate this staff member." title="No performance review yet" />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <SummaryList
            empty="No active goals."
            items={summary.activeGoals.slice(0, 3).map((goal) => ({
              id: goal.id,
              title: goal.title,
              meta: `${goalCategoryLabels[goal.category]} / ${goal.progress}% / due ${goal.targetDate}`,
              status: goal.status,
            }))}
            title="Active Goals"
          />
          <SummaryList
            empty="No recent training."
            items={summary.recentTraining.slice(0, 3).map((training) => ({
              id: training.id,
              title: training.title,
              meta: `${trainingTypeLabels[training.trainingType]} / ${training.startDate}`,
              status: training.status,
            }))}
            title="Training"
          />
        </div>

        {canManage ? (
          <div className="responsive-action-row">
            <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/performance/reviews/new`}>New Review</Link>
            <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/performance/goals`}>Manage Goals</Link>
            <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/performance/training`}>Manage Training</Link>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({ helper, label, tone = "neutral", value }: { helper: string; label: string; tone?: "danger" | "neutral"; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <Badge tone={tone}>{helper}</Badge>
    </div>
  );
}

function SummaryList({ empty, items, title }: { empty: string; items: Array<{ id: string; title: string; meta: string; status: string }>; title: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {items.length === 0 ? <p className="mt-2 text-sm text-foreground-muted">{empty}</p> : (
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <div className="rounded-lg border border-border bg-surface p-3" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="responsive-text text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-foreground-muted">{item.meta}</p>
                </div>
                <StaffPerformanceStatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
