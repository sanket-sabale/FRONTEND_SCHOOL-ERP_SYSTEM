import Link from "next/link";
import { hasPermission } from "@/components/shared/permission-gate";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { updateAdmissionApplicationAction } from "@/features/admissions/actions/admission-actions";
import { AdmissionApplicationForm } from "@/features/admissions/components/admission-application-form";
import { AdmissionCommunicationPanel } from "@/features/admissions/components/admission-communication-panel";
import {
  admissionStatusMeta,
  formatAdmissionDateTime,
  formatAdmissionDocumentType,
  formatAdmissionPriority,
  formatAdmissionSource,
  getApplicantInitials,
} from "@/features/admissions/components/admission-formatters";
import { AdmissionDocumentActions, SubmitAdmissionApplicationActionForm } from "@/features/admissions/components/admission-document-actions";
import { AdmissionDecisionPanel } from "@/features/admissions/components/admission-decision-panel";
import { AdmissionEvaluationPanel } from "@/features/admissions/components/admission-evaluation-panels";
import { AdmissionEnrollmentPanel } from "@/features/admissions/components/admission-enrollment-panel";
import { AdmissionFeesPanel } from "@/features/admissions/components/admission-fees-panel";
import { AdmissionReviewPanel } from "@/features/admissions/components/admission-review-panels";
import { AdmissionDocumentStatusBadge, AdmissionStatusBadge } from "@/features/admissions/components/admission-status-badge";
import type { AdmissionApplicationDetail, AdmissionCommunicationIntent, AdmissionCycle, AdmissionEnrollmentReadiness, AdmissionFinanceSummary, AdmissionReviewer } from "@/features/admissions/types/admission";
import { formatGuardianRelationshipType } from "@/features/guardians/components/guardian-formatters";
import type { GuardianSummary } from "@/features/guardians/types/guardian";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";
import type { Role } from "@/types/erp";

type Props = {
  application: AdmissionApplicationDetail;
  communicationSummary: AdmissionCommunicationIntent[];
  context: { school: string; campus: string; academicYear: string };
  cycles: AdmissionCycle[];
  enrollmentReadiness: AdmissionEnrollmentReadiness;
  financeSummary: AdmissionFinanceSummary;
  guardianOptions: GuardianSummary[];
  placementOptions: StudentAcademicPlacementOption[];
  reviewers: AdmissionReviewer[];
  role: Role;
};

export function AdmissionApplicationDetailView({ application, communicationSummary, context, cycles, enrollmentReadiness, financeSummary, guardianOptions, placementOptions, reviewers, role }: Props) {
  const canEdit = hasPermission(role, "admission.edit") && (application.status === "draft" || application.status === "under_review");
  const canSubmit = hasPermission(role, "admission.submit") && application.status === "draft";
  const canVerifyDocuments = hasPermission(role, "admission.verify_documents");
  const canUploadDocuments = hasPermission(role, "admission.edit");
  const canReview = hasPermission(role, "admission.review");
  const canSchedule = hasPermission(role, "admission.schedule");
  const canShortlist = hasPermission(role, "admission.shortlist");
  const canApprove = hasPermission(role, "admission.approve");
  const canWaitlist = hasPermission(role, "admission.waitlist");
  const canReject = hasPermission(role, "admission.reject");
  const canManageFees = hasPermission(role, "fees.view");
  const canConfirm = hasPermission(role, "admission.confirm");
  const canEnroll = hasPermission(role, "admission.enroll");
  const canSendCommunication = hasPermission(role, "communication.send");
  const cycle = cycles.find((item) => item.id === application.admissionCycleId);

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        action={<div className="responsive-action-row"><Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/admissions/applications">Applications</Link><Link className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" href="/admissions/documents">Document Queue</Link></div>}
        breadcrumbs={<span className="text-sm text-foreground-muted">{context.school} / Admissions / {application.applicationNumber}</span>}
        description={`${application.appliedClassName ?? application.appliedClassId} application in ${context.campus} for ${context.academicYear}.`}
        eyebrow="Application 360"
        title={application.applicantName}
      >
        <Card className="responsive-card-padding" variant="muted">
          <div className="flex flex-wrap items-center gap-2"><AdmissionStatusBadge status={application.status} /><Badge tone={admissionStatusMeta[application.status].tone}>{application.applicationNumber}</Badge></div>
        </Card>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          <Card>
            <SectionHeader eyebrow="Overview" title="Application Overview" />
            <div className="grid gap-3 p-4 text-sm sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              <Info label="Application no." value={application.applicationNumber} />
              <Info label="Status" value={admissionStatusMeta[application.status].label} />
              <Info label="Admission cycle" value={cycle?.name ?? application.admissionCycleId} />
              <Info label="Academic year" value={context.academicYear} />
              <Info label="Campus" value={context.campus} />
              <Info label="Applied class" value={application.appliedClassName ?? application.appliedClassId} />
              <Info label="Applied section" value={application.appliedSectionName ?? "Not assigned"} />
              <Info label="Source" value={formatAdmissionSource(application.source)} />
              <Info label="Priority" value={formatAdmissionPriority(application.priority)} />
              <Info label="Reviewer" value={application.assignedReviewerId ?? "Unassigned"} />
              <Info label="Created" value={formatAdmissionDateTime(application.createdAt)} />
              <Info label="Submitted" value={formatAdmissionDateTime(application.submittedAt)} />
              <Info label="Last updated" value={formatAdmissionDateTime(application.updatedAt)} />
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="Applicant" title="Applicant Profile" />
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-border bg-surface-muted text-sm font-semibold">{getApplicantInitials(application.applicantName)}</span>
              <div className="grid flex-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <Info label="Name" value={application.applicantName} />
                <Info label="Date of birth" value={application.applicant.dateOfBirth ?? "Not recorded"} />
                <Info label="Gender" value={application.applicant.gender ?? "Not recorded"} />
                <Info label="Phone" value={application.applicant.phone ?? "Not recorded"} />
                <Info label="Email" value={application.applicant.email ?? "Not recorded"} />
                <Info label="Previous school" value={application.applicant.previousSchool ?? "Not recorded"} />
                <Info label="Previous grade" value={application.applicant.previousGrade ?? "Not recorded"} />
                <Info label="Address" value={[application.applicant.address?.address, application.applicant.address?.city, application.applicant.address?.state, application.applicant.address?.country].filter(Boolean).join(", ") || "Not recorded"} />
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="Guardians" title="Linked Guardians" />
            <div className="grid gap-3 p-4 sm:p-5">
              {application.guardians.map((guardian) => {
                const guardianRecord = guardianOptions.find((item) => item.id === guardian.guardianId);
                return (
                  <div className="rounded-lg border border-border bg-surface-muted p-3" key={`${guardian.applicantId}-${guardian.guardianId}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="font-medium text-foreground">{guardianRecord?.displayName ?? guardian.guardianId}</p><p className="text-sm text-foreground-muted">{formatGuardianRelationshipType(guardian.relationshipType)}</p></div>
                      <div className="flex flex-wrap gap-2">{guardian.isPrimary ? <Badge tone="success">Primary</Badge> : null}{guardian.canReceiveCommunication ? <Badge tone="info">Communication</Badge> : null}{guardian.canPickup ? <Badge tone="neutral">Pickup</Badge> : null}</div>
                    </div>
                  </div>
                );
              })}
              {application.guardians.length === 0 ? <EmptyState title="No guardians linked" description="Guardians can be linked when the application is created." /> : null}
            </div>
          </Card>

          <Card id="documents">
            <SectionHeader eyebrow="Documents" title="Document Checklist" />
            <div className="grid gap-3 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-5">
                <Metric label="Required" value={application.documentSummary.required} />
                <Metric label="Verified" value={application.documentSummary.verified} />
                <Metric label="Pending" value={application.documentSummary.pending} />
                <Metric label="Missing" value={application.documentSummary.missing} />
                <Metric label="Rejected" value={application.documentSummary.rejected} />
              </div>
              {application.documents.map((document) => (
                <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,auto)]" key={document.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-foreground">{formatAdmissionDocumentType(document.documentType)}</p>{document.required ? <Badge tone="warning">Required</Badge> : <Badge tone="neutral">Optional</Badge>}<AdmissionDocumentStatusBadge status={document.status} /></div>
                    <dl className="mt-3 grid gap-2 text-xs text-foreground-muted sm:grid-cols-2 xl:grid-cols-4">
                      <Info label="Version" value={String(document.version)} />
                      <Info label="Uploaded" value={formatAdmissionDateTime(document.uploadedAt)} />
                      <Info label="Verified" value={formatAdmissionDateTime(document.verifiedAt)} />
                      <Info label="Verifier" value={document.verifiedBy ?? "Not recorded"} />
                    </dl>
                    {document.rejectionReason ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">{document.rejectionReason}</p> : null}
                  </div>
                  <AdmissionDocumentActions applicationId={application.id} canEdit={canUploadDocuments} canVerify={canVerifyDocuments} document={document} />
                </div>
              ))}
            </div>
          </Card>

          {canEdit ? (
            <div id="edit">
              <AdmissionApplicationForm action={updateAdmissionApplicationAction} application={application} context={{ campus: context.campus, academicYear: context.academicYear }} cycles={cycles} guardianOptions={guardianOptions} mode="edit" placementOptions={placementOptions} />
            </div>
          ) : null}

          <AdmissionReviewPanel application={application} canReview={canReview} reviewers={reviewers} />
          <AdmissionEvaluationPanel application={application} canSchedule={canSchedule} reviewers={reviewers} />
          <AdmissionDecisionPanel application={application} canApprove={canApprove} canReject={canReject} canShortlist={canShortlist} canWaitlist={canWaitlist} />
          <AdmissionFeesPanel application={application} canManageFees={canManageFees} finance={financeSummary} />
          <AdmissionCommunicationPanel application={application} canSend={canSendCommunication} communications={communicationSummary} />
          <AdmissionEnrollmentPanel application={application} canConfirm={canConfirm} canEnroll={canEnroll} placementOptions={placementOptions} readiness={enrollmentReadiness} />
        </div>

        <aside className="space-y-4">
          <Card id="submit">
            <SectionHeader eyebrow="Actions" title="Workflow Actions" />
            <div className="space-y-3 p-4 sm:p-5">
              {canSubmit ? <SubmitAdmissionApplicationActionForm applicationId={application.id} /> : <EmptyState title="No submit action available" description="Only draft applications with submit permission can be submitted in this phase." />}
            </div>
          </Card>
          <Card>
            <SectionHeader eyebrow="Timeline" title="Application Timeline" />
            <div className="space-y-3 p-4 sm:p-5">
              <TimelineItem title="Application created" value={formatAdmissionDateTime(application.createdAt)} />
              {application.submittedAt ? <TimelineItem title="Application submitted" value={formatAdmissionDateTime(application.submittedAt)} /> : null}
              {application.documents.filter((document) => document.uploadedAt).map((document) => <TimelineItem key={`${document.id}-upload`} title={`${formatAdmissionDocumentType(document.documentType)} uploaded`} value={formatAdmissionDateTime(document.uploadedAt)} />)}
              {application.auditEvents.map((event) => <TimelineItem key={event.id} title={event.action.replace(/_/g, " ")} value={formatAdmissionDateTime(event.occurredAt)} />)}
            </div>
          </Card>
          <Card>
            <SectionHeader eyebrow="Next Phases" title="Pending Integrations" />
            <div className="grid gap-2 p-4 text-sm text-foreground-muted sm:p-5">
              <p>Fees: {financeSummary.financialClearanceStatus}</p>
              <p>Enrollment: {application.enrollment?.status ?? "Not started"}</p>
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt><dd className="responsive-text mt-1 text-foreground">{value}</dd></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="mt-2 text-xl font-semibold text-foreground">{value}</p></div>;
}

function TimelineItem({ title, value }: { title: string; value: string }) {
  return <div className="border-l-2 border-border pl-3"><p className="text-sm font-medium capitalize text-foreground">{title}</p><p className="mt-1 text-xs text-foreground-muted">{value}</p></div>;
}
