"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SectionHeader } from "@/components/ui";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import {
  archiveStaffDocumentAction,
  rejectStaffDocumentAction,
  verifyStaffDocumentAction,
} from "@/features/staff-documents/actions/staff-document-actions";
import { StaffDocumentStatusBadge } from "@/features/staff-documents/components/staff-document-status-badge";
import {
  classifyStaffDocumentExpiry,
  staffDocumentCategoryLabels,
  staffDocumentTypeLabels,
} from "@/features/staff-documents/services/staff-document-rules";
import type { StaffDocument } from "@/features/staff-documents/types/staff-document";
import type { StaffProfile } from "@/features/staff/types/staff";
import { formatFileSize } from "@/lib/api/attachments";

export function StaffDocumentDetail({ canManageDocuments, document, staff }: { canManageDocuments: boolean; document: StaffDocument; staff: StaffProfile }) {
  const expiry = classifyStaffDocumentExpiry(document);
  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Documents", document.title]} />}
        description="Review secure staff document metadata, verification state, and expiry status."
        eyebrow="Staff Documents"
        title={document.title}
        action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/documents`}>Back to Documents</Link>}
      />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <SectionHeader eyebrow="Document Detail" title="Metadata" />
          <div className="grid gap-4 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <StaffDocumentStatusBadge status={document.status} />
              <Badge tone={expiry.state === "expired" ? "danger" : expiry.state === "expiring_soon" ? "warning" : "neutral"}>{expiry.label}</Badge>
              <Badge tone="info">v{document.version}</Badge>
            </div>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <DetailTerm label="Staff" value={`${staff.displayName} (${staff.employeeNumber})`} />
              <DetailTerm label="Type" value={staffDocumentTypeLabels[document.documentType]} />
              <DetailTerm label="Category" value={staffDocumentCategoryLabels[document.category]} />
              <DetailTerm label="File" value={document.attachment.fileName} />
              <DetailTerm label="MIME type" value={document.attachment.mimeType} />
              <DetailTerm label="Size" value={formatFileSize(document.attachment.fileSize)} />
              <DetailTerm label="Uploaded by" value={document.uploadedBy} />
              <DetailTerm label="Uploaded at" value={formatDate(document.uploadedAt.slice(0, 10))} />
              <DetailTerm label="Verified by" value={document.verifiedBy} />
              <DetailTerm label="Verified at" value={document.verifiedAt ? formatDate(document.verifiedAt.slice(0, 10)) : undefined} />
              <DetailTerm label="Storage reference" value={document.attachment.reference} />
              <DetailTerm label="Storage key" value={document.attachment.storageKey} />
            </dl>
            <p className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">Secure preview boundary: this mock implementation stores metadata and scoped storage references only. It does not expose public document URLs.</p>
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Verification" title="Actions" />
          <div className="grid gap-4 p-4 sm:p-5">
            {document.verificationNotes ? <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">{document.verificationNotes}</div> : <EmptyState description="No verification notes have been recorded." title="No notes" />}
            {canManageDocuments && document.status !== "archived" ? (
              <>
                {document.status !== "verified" && document.status !== "expired" ? <ActionForm action={verifyStaffDocumentAction} documentId={document.id} label="Verify Document" staffId={staff.id} /> : null}
                {document.status !== "rejected" ? <ActionForm action={rejectStaffDocumentAction} documentId={document.id} label="Reject Document" notesRequired staffId={staff.id} /> : null}
                <ActionForm action={archiveStaffDocumentAction} documentId={document.id} label="Archive Document" reasonField staffId={staff.id} />
              </>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}

export function StaffDocumentNotFound({ staffId }: { staffId?: string }) {
  return (
    <div className="erp-container">
      <Card className="mx-auto max-w-xl p-5">
        <SectionHeader eyebrow="Staff Documents" title="Document unavailable" />
        <EmptyState description="The requested staff document could not be found in the current school context." title="Document unavailable" />
        <Link className={`mt-4 ${linkButtonClasses}`} href={staffId ? `/staff/${encodeURIComponent(staffId)}/documents` : "/staff"}>Back to Documents</Link>
      </Card>
    </div>
  );
}

function ActionForm({ action, documentId, label, notesRequired = false, reasonField = false, staffId }: { action: (state: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) => Promise<{ status: "idle" | "success" | "error"; message?: string }>; documentId: string; label: string; notesRequired?: boolean; reasonField?: boolean; staffId: string }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" as const });
  return (
    <form action={formAction} className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3">
      <input name="staffId" type="hidden" value={staffId} />
      <input name="documentId" type="hidden" value={documentId} />
      {state.message ? <p className={state.status === "success" ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-danger"}>{state.message}</p> : null}
      <Field label={reasonField ? "Reason" : "Verification notes"} required={notesRequired}>
        <textarea className={`${inputClasses} min-h-20 py-2`} maxLength={500} name={reasonField ? "reason" : "verificationNotes"} required={notesRequired} />
      </Field>
      <Button disabled={pending || state.status === "success"} loading={pending} type="submit" variant={label.startsWith("Reject") || label.startsWith("Archive") ? "secondary" : "primary"}>{pending ? "Saving..." : state.status === "success" ? "Done" : label}</Button>
    </form>
  );
}

function DetailTerm({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt><dd className="responsive-text mt-1 text-foreground">{value || "Not recorded"}</dd></div>;
}

function formatDate(date?: string) {
  if (!date) return undefined;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
