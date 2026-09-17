"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, SectionHeader, Select } from "@/components/ui";
import { validateAttachmentFile } from "@/features/attachments/adapters/web/attachment-web-adapter";
import {
  archiveStaffDocumentAction,
  createStaffDocumentAction,
  rejectStaffDocumentAction,
  verifyStaffDocumentAction,
  type StaffDocumentActionState,
} from "@/features/staff-documents/actions/staff-document-actions";
import { StaffDocumentStatusBadge } from "@/features/staff-documents/components/staff-document-status-badge";
import {
  classifyStaffDocumentExpiry,
  staffDocumentCategoryLabels,
  staffDocumentTypeLabels,
} from "@/features/staff-documents/services/staff-document-rules";
import type {
  StaffDocument,
  StaffDocumentDefinition,
  StaffDocumentFilters,
  StaffDocumentListResponse,
  StaffDocumentStatus,
  StaffDocumentType,
} from "@/features/staff-documents/types/staff-document";
import type { StaffProfile } from "@/features/staff/types/staff";
import { formatFileSize, communicationUploadPolicy } from "@/lib/api/attachments";

type StaffDocumentsPanelProps = {
  canManageDocuments: boolean;
  documentsResponse: StaffDocumentListResponse;
  staff: StaffProfile;
};

type FilterKey = "all" | "pending" | "verified" | "rejected" | "expired" | "expiring_soon" | "archived";

const initialActionState: StaffDocumentActionState = { status: "idle" };

export function StaffDocumentsPanel({ canManageDocuments, documentsResponse, staff }: StaffDocumentsPanelProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [uploadDefinition, setUploadDefinition] = useState<StaffDocumentDefinition | null>(null);
  const [replaceDocument, setReplaceDocument] = useState<StaffDocument | null>(null);
  const [detailDocument, setDetailDocument] = useState<StaffDocument | null>(null);
  const visibleDocuments = useMemo(() => filterDocuments(documentsResponse.documents, { search: query, status: statusFromFilter(filter), expiry: filter === "expiring_soon" ? "expiring_soon" : undefined }), [documentsResponse.documents, filter, query]);

  return (
    <>
      <Card id="documents">
        <SectionHeader
          eyebrow="Documents"
          title="Staff Documents"
          action={canManageDocuments ? <Button onClick={() => setUploadDefinition(findDefaultDefinition(documentsResponse.definitions))}>Add Document</Button> : null}
        />
        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 sm:grid-cols-5">
            <Metric label="Total" value={documentsResponse.total} tone="info" />
            <Metric label="Pending" value={documentsResponse.pending} tone="warning" />
            <Metric label="Verified" value={documentsResponse.verified} tone="success" />
            <Metric label="Expired" value={documentsResponse.expired} tone="danger" />
            <Metric label="Expiring" value={documentsResponse.expiringSoon} tone="warning" />
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Field label="Search documents">
              <input className={inputClasses} onChange={(event) => setQuery(event.target.value)} placeholder="Title, type, file name" type="search" value={query} />
            </Field>
            <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/documents`}>Open Workspace</Link>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Document filters">
            {documentFilters.map((item) => (
              <button
                aria-pressed={filter === item.value}
                className={filter === item.value ? selectedFilterClasses : filterClasses}
                key={item.value}
                onClick={() => setFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {visibleDocuments.length === 0 ? (
            <EmptyState description={query || filter !== "all" ? "No staff documents match the selected filter." : "Add the first document for this staff member."} title="No staff documents yet" />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleDocuments.map((document) => (
                <StaffDocumentCard
                  canManageDocuments={canManageDocuments}
                  document={document}
                  key={document.id}
                  onArchive={() => setDetailDocument(document)}
                  onDetail={() => setDetailDocument(document)}
                  onReplace={() => setReplaceDocument(document)}
                  staffId={staff.id}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
      {uploadDefinition ? <UploadDocumentDialog definition={uploadDefinition} onClose={() => setUploadDefinition(null)} staffId={staff.id} /> : null}
      {replaceDocument ? <UploadDocumentDialog definition={definitionForDocument(documentsResponse.definitions, replaceDocument)} document={replaceDocument} onClose={() => setReplaceDocument(null)} staffId={staff.id} /> : null}
      {detailDocument ? <DocumentDetailDialog canManageDocuments={canManageDocuments} document={detailDocument} onClose={() => setDetailDocument(null)} staffId={staff.id} /> : null}
    </>
  );
}

export function StaffDocumentCard({
  canManageDocuments,
  document,
  onArchive,
  onDetail,
  onReplace,
  staffId,
}: {
  canManageDocuments: boolean;
  document: StaffDocument;
  onArchive: () => void;
  onDetail: () => void;
  onReplace: () => void;
  staffId: string;
}) {
  const expiry = classifyStaffDocumentExpiry(document);
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="responsive-text font-semibold text-foreground">{document.title}</p>
          <p className="mt-1 text-sm text-foreground-muted">{staffDocumentCategoryLabels[document.category]} / {staffDocumentTypeLabels[document.documentType]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StaffDocumentStatusBadge status={document.status} />
          <Badge tone={expiry.state === "expired" ? "danger" : expiry.state === "expiring_soon" ? "warning" : "neutral"}>{expiry.label}</Badge>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DocumentTerm label="File" value={document.attachment.fileName} />
        <DocumentTerm label="Size" value={formatFileSize(document.attachment.fileSize)} />
        <DocumentTerm label="Uploaded" value={formatDate(document.uploadedAt.slice(0, 10))} />
        <DocumentTerm label="Version" value={`v${document.version}`} />
      </dl>
      {document.verificationNotes ? <p className="mt-3 rounded-lg border border-border bg-surface p-2 text-sm text-foreground-muted">{document.verificationNotes}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onDetail} size="sm" variant="secondary">View</Button>
        <Button aria-disabled="true" disabled size="sm" title="Secure file delivery is outside this mock phase." variant="ghost">Download</Button>
        {canManageDocuments && document.status !== "archived" ? (
          <>
            <Button onClick={onReplace} size="sm" variant="secondary">Replace</Button>
            {document.status !== "verified" && document.status !== "expired" ? <DocumentMutationButton action={verifyStaffDocumentAction} documentId={document.id} label="Verify" staffId={staffId} /> : null}
            <Button onClick={onArchive} size="sm" variant="ghost">More</Button>
          </>
        ) : null}
      </div>
    </article>
  );
}

export function UploadDocumentDialog({ definition, document, onClose, staffId }: { definition: StaffDocumentDefinition; document?: StaffDocument; onClose: () => void; staffId: string }) {
  const [actionState, formAction, pending] = useActionState(createStaffDocumentAction, initialActionState);
  const [documentType, setDocumentType] = useState<StaffDocumentType>(definition.documentType);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; size: number } | null>(null);
  const [fileError, setFileError] = useState("");

  return (
    <div aria-modal="true" className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-slate-950/45 p-3" role="dialog">
      <form action={formAction} className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <input name="staffId" type="hidden" value={staffId} />
        <input name="fileName" type="hidden" value={selectedFile?.name ?? ""} />
        <input name="mimeType" type="hidden" value={selectedFile?.type ?? ""} />
        <input name="fileSize" type="hidden" value={selectedFile?.size ?? 0} />
        {document ? <input name="replacementOfDocumentId" type="hidden" value={document.id} /> : null}
        <h2 className="text-lg font-semibold text-foreground">{document ? "Replace Staff Document" : "Add Staff Document"}</h2>
        <p className="mt-2 text-sm text-foreground-muted">Mock upload stores validated metadata and a scoped storage reference. It does not create a public file URL.</p>
        {actionState.message ? <ActionMessage state={actionState} /> : null}
        <div className="mt-4 grid gap-4">
          <Field label="Document type" required>
            <Select name="documentType" onChange={(event) => setDocumentType(event.target.value as StaffDocumentType)} value={documentType}>
              {Object.entries(staffDocumentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Title">
            <input className={inputClasses} name="title" type="text" defaultValue={document?.title ?? staffDocumentTypeLabels[documentType]} />
          </Field>
          <Field label="Description">
            <textarea className={`${inputClasses} min-h-20 py-2`} name="description" defaultValue={document?.description ?? ""} />
          </Field>
          <Field helperText="Allowed: PDF, image, Word, Excel, PowerPoint, text, or CSV. Maximum 25 MB." label="File" required>
            <input
              accept={communicationUploadPolicy.allowedMimeTypes.join(",")}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setSelectedFile(null);
                  return;
                }
                const validation = validateAttachmentFile(file);
                if (!validation.ok) {
                  setFileError(validation.message);
                  setSelectedFile(null);
                  event.target.value = "";
                  return;
                }
                setFileError("");
                setSelectedFile({ name: file.name, type: file.type, size: file.size });
              }}
              required
              type="file"
            />
          </Field>
          {fileError ? <p className="text-sm text-danger">{fileError}</p> : null}
          {selectedFile ? <p className="text-sm text-foreground-muted">{selectedFile.name} / {formatFileSize(selectedFile.size)}</p> : null}
          <Field label="Expiry date">
            <input className={inputClasses} name="expiryDate" type="date" defaultValue={document?.expiryDate ?? ""} />
          </Field>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">{actionState.status === "success" ? "Close" : "Cancel"}</Button>
          <Button disabled={pending || !selectedFile || actionState.status === "success"} loading={pending} type="submit">{pending ? "Uploading..." : document ? "Replace" : "Upload"}</Button>
        </div>
      </form>
    </div>
  );
}

function DocumentDetailDialog({ canManageDocuments, document, onClose, staffId }: { canManageDocuments: boolean; document: StaffDocument; onClose: () => void; staffId: string }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const expiry = classifyStaffDocumentExpiry(document);
  return (
    <div aria-modal="true" className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-slate-950/45 p-3" role="dialog">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{document.title}</h2>
            <p className="mt-2 text-sm text-foreground-muted">Secure document detail. No public document URL is exposed.</p>
          </div>
          <StaffDocumentStatusBadge status={document.status} />
        </div>
        <dl className="mt-4 grid gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm sm:grid-cols-2">
          <DocumentTerm label="Type" value={staffDocumentTypeLabels[document.documentType]} />
          <DocumentTerm label="File" value={document.attachment.fileName} />
          <DocumentTerm label="MIME type" value={document.attachment.mimeType} />
          <DocumentTerm label="Size" value={formatFileSize(document.attachment.fileSize)} />
          <DocumentTerm label="Expiry" value={expiry.label} />
          <DocumentTerm label="Uploaded by" value={document.uploadedBy} />
          <DocumentTerm label="Uploaded at" value={formatDate(document.uploadedAt.slice(0, 10))} />
          <DocumentTerm label="Verified by" value={document.verifiedBy} />
          <DocumentTerm label="Verified at" value={document.verifiedAt ? formatDate(document.verifiedAt.slice(0, 10)) : undefined} />
          <DocumentTerm label="Storage reference" value={document.attachment.reference} />
        </dl>
        {document.verificationNotes ? <p className="mt-3 rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground-muted">{document.verificationNotes}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {canManageDocuments && document.status !== "archived" ? (
            <>
              {document.status !== "rejected" ? <Button onClick={() => setRejectOpen(true)} variant="secondary">Reject</Button> : null}
              <Button onClick={() => setArchiveOpen(true)} variant="secondary">Archive</Button>
            </>
          ) : null}
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
      {rejectOpen ? <ReasonDialog action={rejectStaffDocumentAction} documentId={document.id} fieldName="verificationNotes" label="Reject Document" onClose={() => setRejectOpen(false)} staffId={staffId} /> : null}
      {archiveOpen ? <ReasonDialog action={archiveStaffDocumentAction} documentId={document.id} fieldName="reason" label="Archive Document" onClose={() => setArchiveOpen(false)} staffId={staffId} /> : null}
    </div>
  );
}

function ReasonDialog({ action, documentId, fieldName, label, onClose, staffId }: { action: (state: StaffDocumentActionState, formData: FormData) => Promise<StaffDocumentActionState>; documentId: string; fieldName: "reason" | "verificationNotes"; label: string; onClose: () => void; staffId: string }) {
  const [actionState, formAction, pending] = useActionState(action, initialActionState);
  return (
    <div aria-modal="true" className="fixed inset-0 z-[105] grid place-items-center bg-slate-950/50 p-3" role="dialog">
      <form action={formAction} className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-2xl">
        <input name="staffId" type="hidden" value={staffId} />
        <input name="documentId" type="hidden" value={documentId} />
        <h3 className="text-base font-semibold text-foreground">{label}</h3>
        {actionState.message ? <ActionMessage state={actionState} /> : null}
        <Field label={fieldName === "verificationNotes" ? "Verification notes" : "Reason"} required={fieldName === "verificationNotes"}>
          <textarea className={`${inputClasses} mt-3 min-h-24 py-2`} maxLength={500} name={fieldName} required={fieldName === "verificationNotes"} />
        </Field>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">{actionState.status === "success" ? "Close" : "Cancel"}</Button>
          <Button disabled={pending || actionState.status === "success"} loading={pending} type="submit">{pending ? "Saving..." : label}</Button>
        </div>
      </form>
    </div>
  );
}

function DocumentMutationButton({ action, documentId, label, staffId }: { action: (state: StaffDocumentActionState, formData: FormData) => Promise<StaffDocumentActionState>; documentId: string; label: string; staffId: string }) {
  const [actionState, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="inline-flex">
      <input name="staffId" type="hidden" value={staffId} />
      <input name="documentId" type="hidden" value={documentId} />
      <Button disabled={pending || actionState.status === "success"} loading={pending} size="sm" type="submit" variant="secondary">{pending ? "Saving..." : actionState.status === "success" ? "Done" : label}</Button>
    </form>
  );
}

function filterDocuments(documents: StaffDocument[], filters: StaffDocumentFilters) {
  const query = filters.search?.toLowerCase().trim();
  return documents.filter((document) => !filters.status || document.status === filters.status)
    .filter((document) => !filters.expiry || classifyStaffDocumentExpiry(document).state === filters.expiry)
    .filter((document) => !query || [document.title, document.description, document.attachment.fileName, staffDocumentTypeLabels[document.documentType], document.status].filter(Boolean).join(" ").toLowerCase().includes(query));
}

function statusFromFilter(filter: FilterKey): StaffDocumentStatus | undefined {
  return ["pending", "verified", "rejected", "expired", "archived"].includes(filter) ? filter as StaffDocumentStatus : undefined;
}

function definitionForDocument(definitions: StaffDocumentDefinition[], document: StaffDocument) {
  return definitions.find((definition) => definition.documentType === document.documentType) ?? findDefaultDefinition(definitions);
}

function findDefaultDefinition(definitions: StaffDocumentDefinition[]) {
  return definitions.find((definition) => definition.documentType === "other") ?? definitions[0]!;
}

function Metric({ label, tone, value }: { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral"; value: number }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p><p className="mt-1 text-lg font-semibold text-foreground">{value}</p><Badge tone={tone}>{label}</Badge></div>;
}

function DocumentTerm({ label, value }: { label: string; value?: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt><dd className="responsive-text mt-1 text-foreground">{value || "Not recorded"}</dd></div>;
}

function ActionMessage({ state }: { state: StaffDocumentActionState }) {
  return <div className={state.status === "success" ? "mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"}>{state.message}</div>;
}

function formatDate(date?: string) {
  if (!date) return undefined;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
const filterClasses = "min-h-8 shrink-0 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground-muted transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
const selectedFilterClasses = "min-h-8 shrink-0 rounded-lg bg-sky-50 px-3 text-sm font-medium text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-sky-950 dark:text-sky-200";
const documentFilters: Array<{ label: string; value: FilterKey }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
  { label: "Expired", value: "expired" },
  { label: "Expiring", value: "expiring_soon" },
  { label: "Archived", value: "archived" },
];
