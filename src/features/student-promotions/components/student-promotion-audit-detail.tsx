import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionHeader } from "@/components/ui";
import {
  formatAuditDate,
  formatAuditDateTime,
  formatAuditLabel,
  PromotionAuditEventBadge,
  PromotionAuditEvidenceBadge,
  PromotionAuditSourceBadge,
  PromotionAuditStatusBadge,
} from "@/features/student-promotions/components/student-promotion-audit-states";
import type {
  StudentPromotionAuditDetail as StudentPromotionAuditDetailModel,
  StudentPromotionAuditTimelineEvent,
  StudentPromotionPlacementEvidence,
} from "@/features/student-promotions/types/student-promotion-audit";

export function StudentPromotionAuditDetail({
  audit,
  context,
}: {
  context: { school: string; campus: string; academicYear: string };
  audit: StudentPromotionAuditDetailModel;
}) {
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[context.school, context.campus, "Academics", "Promotions", "Audit", audit.studentName]} />}
        description="Read-only evidence for this academic transition. Use Promotion Review for any controlled Stage 10 action."
        eyebrow="Promotion Evidence"
        title={audit.studentName}
        action={<LinkButton href={`/academics/promotions/${encodeURIComponent(audit.promotionId)}`}>Open Promotion Review</LinkButton>}
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="flex flex-wrap gap-2">
            <PromotionAuditStatusBadge status={audit.status} />
            <PromotionAuditSourceBadge source={audit.source} />
            <Badge tone={audit.validation.overallStatus === "ready" ? "success" : audit.validation.overallStatus === "blocked" ? "danger" : "warning"}>{formatAuditLabel(audit.validation.overallStatus)}</Badge>
          </div>
          <p className="mt-3 text-sm text-foreground-muted">Academic snapshot only. This audit page does not apply promotions, update student placements, or change attendance history.</p>
        </Card>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Student" title="Student Identity" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Student" value={audit.studentName} />
            <InfoRow label="Student ID" value={audit.studentId} />
            <InfoRow label="Admission Number" value={audit.admissionNumber} />
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Promotion" title="Promotion Identity" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Promotion ID" value={audit.promotionId} />
            <InfoRow label="Status" value={formatAuditLabel(audit.status)} />
            <InfoRow label="Reason" value={formatAuditLabel(audit.reason)} />
            <InfoRow label="Source" value={formatAuditLabel(audit.source)} />
            <InfoRow label="Batch Correlation" value={audit.batchCorrelationId} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <PlacementPanel evidence={audit.sourcePlacement} eyebrow="Source Academic Context" title="Historical Source Placement" />
        <PlacementPanel evidence={audit.targetPlacement} eyebrow="Target Academic Context" title={audit.status === "promoted" ? "New Target Placement" : "Proposed Target Placement"} />
      </section>

      <Card>
        <SectionHeader eyebrow="Before / After" title="Placement Evidence" />
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1fr_1fr]">
          <SnapshotBox evidence={audit.beforePlacement} label="Before" title="Historical Source Placement" />
          {audit.afterPlacement ? (
            <SnapshotBox evidence={audit.afterPlacement} label="After" title="New Target Placement" />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">After</p>
              <h3 className="mt-2 text-sm font-semibold text-foreground">Target placement not yet applied</h3>
              <p className="mt-2 text-sm text-foreground-muted">The proposed target context is visible above. No StudentAcademicPlacement mutation has occurred from this audit view.</p>
            </div>
          )}
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader eyebrow="Validation" title="Readiness Evidence" />
          <div className="grid gap-3 p-4 sm:p-5">
            {audit.validation.checks.map((check) => (
              <div className="rounded-lg border border-border bg-surface-muted p-3" key={check.key}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{check.label}</p>
                  <Badge tone={check.status === "passed" ? "success" : check.status === "warning" ? "warning" : "danger"}>{formatAuditLabel(check.status)}</Badge>
                </div>
                <p className="mt-2 text-sm text-foreground-muted">{check.message}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Evidence" title="Review Actors" />
          <div className="grid gap-3 p-4 sm:p-5">
            <InfoRow label="Proposed By" value={audit.proposedBy} />
            <InfoRow label="Proposed At" value={formatAuditDateTime(audit.proposedAt)} />
            <InfoRow label="Reviewed By" value={audit.reviewedBy} />
            <InfoRow label="Reviewed At" value={formatAuditDateTime(audit.reviewedAt)} />
            <InfoRow label="Applied By" value={audit.appliedBy} />
            <InfoRow label="Applied At" value={formatAuditDateTime(audit.appliedAt)} />
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Timeline" title="Chronological Timeline" />
        <ol className="grid gap-3 p-4 sm:p-5" aria-label="Promotion audit timeline">
          {audit.timeline.map((event) => <TimelineItem event={event} key={event.eventId} />)}
        </ol>
      </Card>

      <Card className="p-4 sm:p-5" variant="muted">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Export Preview</p>
            <p className="mt-1 text-sm text-foreground-muted">{audit.exportPreview.message}</p>
          </div>
          <Badge tone="info">{audit.exportPreview.exportKind === "preview_only" ? "Preview Only" : "Unavailable"}</Badge>
        </div>
      </Card>
    </div>
  );
}

export function StudentPromotionAuditNotFound() {
  return (
    <div className="erp-container">
      <Card className="mx-auto max-w-xl">
        <SectionHeader eyebrow="Promotion Audit" title="Promotion unavailable" />
        <div className="p-4 sm:p-5">
          <EmptyState description="The promotion audit record does not exist, is malformed, or is outside the active school scope." title="Promotion unavailable" />
          <LinkButton href="/academics/promotions/audit">Back to Promotion Audit</LinkButton>
        </div>
      </Card>
    </div>
  );
}

function PlacementPanel({ evidence, eyebrow, title }: { evidence: StudentPromotionPlacementEvidence; eyebrow: string; title: string }) {
  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="grid gap-3 p-4 sm:p-5">
        <div className="flex justify-end"><PromotionAuditEvidenceBadge state={evidence.evidenceState} /></div>
        <InfoRow label="Academic Year" value={evidence.academicYearName ?? evidence.academicYearId} />
        <InfoRow label="Class" value={evidence.className} />
        <InfoRow label="Section" value={evidence.sectionName} />
        <InfoRow label="Placement ID" value={evidence.placementId} />
        <InfoRow label="Effective From" value={formatAuditDate(evidence.effectiveFrom)} />
        <InfoRow label="Effective To" value={evidence.effectiveTo ? formatAuditDate(evidence.effectiveTo) : "Not ended"} />
        <InfoRow label="Placement Status" value={evidence.status} />
        {evidence.evidenceNote ? <p className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">{evidence.evidenceNote}</p> : null}
      </div>
    </Card>
  );
}

function SnapshotBox({ evidence, label, title }: { evidence: StudentPromotionPlacementEvidence; label: string; title: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="mt-3 grid gap-2 text-sm">
        <SnapshotRow label="Academic Year" value={evidence.academicYearName ?? evidence.academicYearId} />
        <SnapshotRow label="Class" value={evidence.className} />
        <SnapshotRow label="Section" value={evidence.sectionName} />
        <SnapshotRow label="Placement ID" value={evidence.placementId} />
        <SnapshotRow label="Effective Period" value={`${formatAuditDate(evidence.effectiveFrom)} to ${evidence.effectiveTo ? formatAuditDate(evidence.effectiveTo) : "Not ended"}`} />
      </dl>
    </div>
  );
}

function TimelineItem({ event }: { event: StudentPromotionAuditTimelineEvent }) {
  return (
    <li className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{event.label}</p>
          <p className="mt-1 text-sm text-foreground-muted">{event.description}</p>
        </div>
        <PromotionAuditEventBadge status={event.status} />
      </div>
      <p className="mt-2 text-xs text-foreground-muted">{event.actorDisplayName ?? "Actor unavailable"} / {formatAuditDateTime(event.timestamp)}</p>
    </li>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return <div className="grid min-w-0 gap-1 rounded-lg border border-border bg-surface-muted p-3 text-sm min-[480px]:grid-cols-[auto_1fr] min-[480px]:items-center"><span className="text-foreground-muted">{label}</span><span className="responsive-text font-medium text-foreground min-[480px]:text-right">{value || "Not available"}</span></div>;
}

function SnapshotRow({ label, value }: { label: string; value?: string }) {
  return <div className="grid gap-1 min-[480px]:grid-cols-[8rem_1fr] min-[480px]:gap-3"><dt className="text-foreground-muted">{label}</dt><dd className="responsive-text font-medium text-foreground">{value || "Not available"}</dd></div>;
}
