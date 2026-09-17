"use client";

import { useActionState, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, SectionHeader } from "@/components/ui";
import {
  archiveStudentDocumentAction,
  createStudentDocumentAction,
  rejectStudentDocumentAction,
  restoreStudentDocumentAction,
  verifyStudentDocumentAction,
  type StudentDocumentActionState,
} from "@/features/students/actions/student-document-actions";
import { formatStudentDate } from "@/features/students/components/student-formatters";
import {
  studentDocumentCategoryLabels,
  studentDocumentTypeLabels,
} from "@/features/students/services/student-documents";
import type {
  StudentDocument,
  StudentDocumentListResponse,
  StudentDocumentRequirement,
  StudentDocumentType,
  StudentProfile,
} from "@/features/students/types/student";
import { validateAttachmentFile } from "@/features/attachments/adapters/web/attachment-web-adapter";
import { communicationUploadPolicy, formatFileSize } from "@/lib/api/attachments";

type StudentDocumentsPanelProps = {
  canManageDocuments: boolean;
  documentsResponse: StudentDocumentListResponse;
  student: StudentProfile;
};

type DocumentFilter = "all" | "required" | "optional" | "pending" | "verified" | "rejected" | "archived" | "expiring";

type DocumentRow =
  | { kind: "document"; document: StudentDocument; requirement?: StudentDocumentRequirement }
  | { kind: "missing"; requirement: StudentDocumentRequirement };

const initialActionState: StudentDocumentActionState = { status: "idle" };

export function StudentDocumentsPanel({ canManageDocuments, documentsResponse, student }: StudentDocumentsPanelProps) {
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [uploadRequirement, setUploadRequirement] = useState<StudentDocumentRequirement | null>(null);
  const [replaceDocument, setReplaceDocument] = useState<StudentDocument | null>(null);
  const [previewDocument, setPreviewDocument] = useState<StudentDocument | null>(null);
  const rows = useMemo(() => buildDocumentRows(documentsResponse), [documentsResponse]);
  const filteredRows = rows.filter((row) => matchesFilter(row, filter));
  const completionText = `${documentsResponse.requiredComplete} of ${documentsResponse.requiredTotal} required documents complete`;

  return (
    <>
      <Card id="documents">
        <SectionHeader
          eyebrow="Documents"
          title="Student Documents"
          action={
            canManageDocuments ? (
              <Button onClick={() => setUploadRequirement(findOtherRequirement(documentsResponse.requirements))} variant="primary">
                Upload Document
              </Button>
            ) : null
          }
        />
        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-semibold text-foreground">{completionText}</p>
              <p className="mt-1 text-sm text-foreground-muted">
                Completeness is based on verified required documents in the active student document set.
              </p>
            </div>
            <Badge tone={documentsResponse.requiredComplete === documentsResponse.requiredTotal ? "success" : "warning"}>
              {documentsResponse.requiredTotal === 0 ? "No requirements" : `${documentsResponse.requiredComplete}/${documentsResponse.requiredTotal}`}
            </Badge>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Document filters">
            {documentFilters.map((item) => (
              <button
                aria-pressed={filter === item.value}
                className={
                  filter === item.value
                    ? "min-h-8 shrink-0 rounded-lg bg-sky-50 px-3 text-sm font-medium text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-sky-950 dark:text-sky-200"
                    : "min-h-8 shrink-0 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground-muted transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                }
                key={item.value}
                onClick={() => setFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState description="No student documents match the selected filter." title="No documents found" />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredRows.map((row) =>
                row.kind === "missing" ? (
                  <MissingDocumentCard
                    canManageDocuments={canManageDocuments}
                    key={`missing-${row.requirement.documentType}`}
                    onUpload={() => setUploadRequirement(row.requirement)}
                    requirement={row.requirement}
                  />
                ) : (
                  <StudentDocumentCard
                    canManageDocuments={canManageDocuments}
                    document={row.document}
                    key={row.document.id}
                    onArchive={() => setPreviewDocument(row.document)}
                    onPreview={() => setPreviewDocument(row.document)}
                    onReplace={() => setReplaceDocument(row.document)}
                    studentId={student.id}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </Card>

      {uploadRequirement ? (
        <UploadDocumentDialog
          onClose={() => setUploadRequirement(null)}
          requirement={uploadRequirement}
          studentId={student.id}
        />
      ) : null}
      {replaceDocument ? (
        <UploadDocumentDialog
          document={replaceDocument}
          onClose={() => setReplaceDocument(null)}
          requirement={requirementForDocument(documentsResponse.requirements, replaceDocument)}
          studentId={student.id}
        />
      ) : null}
      {previewDocument ? (
        <DocumentPreviewDialog
          canManageDocuments={canManageDocuments}
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
          studentId={student.id}
        />
      ) : null}
    </>
  );
}

function MissingDocumentCard({
  canManageDocuments,
  onUpload,
  requirement,
}: {
  canManageDocuments: boolean;
  onUpload: () => void;
  requirement: StudentDocumentRequirement;
}) {
  return (
    <article className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="responsive-text font-semibold text-foreground">{requirement.title}</p>
          <p className="mt-1 text-sm text-foreground-muted">{requirement.description ?? "Document metadata is required for this student."}</p>
        </div>
        <Badge tone={requirement.isRequired ? "warning" : "neutral"}>{requirement.isRequired ? "Required" : "Optional"}</Badge>
      </div>
      <p className="mt-4 text-sm font-medium text-foreground-muted">Document required / not uploaded</p>
      {canManageDocuments ? (
        <Button className="mt-4" onClick={onUpload} variant="secondary">
          Upload Document
        </Button>
      ) : null}
    </article>
  );
}

function StudentDocumentCard({
  canManageDocuments,
  document,
  onArchive,
  onPreview,
  onReplace,
  studentId,
}: {
  canManageDocuments: boolean;
  document: StudentDocument;
  onArchive: () => void;
  onPreview: () => void;
  onReplace: () => void;
  studentId: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface-muted p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="responsive-text font-semibold text-foreground">{document.title}</p>
          <p className="mt-1 text-sm text-foreground-muted">{studentDocumentCategoryLabels[document.category]} / {studentDocumentTypeLabels[document.documentType]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={document.isRequired ? "warning" : "neutral"}>{document.isRequired ? "Required" : "Optional"}</Badge>
          <DocumentStatusBadge document={document} />
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DocumentTerm label="File" value={document.attachment?.fileName} />
        <DocumentTerm label="Size" value={document.attachment ? formatFileSize(document.attachment.fileSize) : undefined} />
        <DocumentTerm label="Uploaded" value={formatStudentDate(document.uploadedAt?.slice(0, 10))} />
        <DocumentTerm label="Expires" value={formatStudentDate(document.expiresAt)} />
      </dl>
      {document.rejectionReason ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">{document.rejectionReason}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onPreview} size="sm" variant="secondary">
          View
        </Button>
        <Button aria-disabled="true" disabled size="sm" title="Secure download endpoint pending" variant="ghost">
          Download
        </Button>
        {canManageDocuments && document.status === "active" ? (
          <>
            <Button onClick={onReplace} size="sm" variant="secondary">
              Replace
            </Button>
            {document.verificationStatus !== "verified" && document.verificationStatus !== "expired" ? (
              <DocumentMutationButton action={verifyStudentDocumentAction} documentId={document.id} label="Verify" studentId={studentId} />
            ) : null}
            {document.verificationStatus !== "rejected" ? (
              <Button onClick={onArchive} size="sm" variant="ghost">
                More
              </Button>
            ) : (
              <Button onClick={onArchive} size="sm" variant="ghost">
                More
              </Button>
            )}
          </>
        ) : null}
        {canManageDocuments && document.status === "archived" ? (
          <DocumentMutationButton action={restoreStudentDocumentAction} documentId={document.id} label="Restore" studentId={studentId} />
        ) : null}
      </div>
    </article>
  );
}

function UploadDocumentDialog({
  document,
  onClose,
  requirement,
  studentId,
}: {
  document?: StudentDocument;
  onClose: () => void;
  requirement: StudentDocumentRequirement;
  studentId: string;
}) {
  const [actionState, formAction, pending] = useActionState(createStudentDocumentAction, initialActionState);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; size: number } | null>(null);
  const [fileError, setFileError] = useState("");

  return (
    <div aria-modal="true" className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-slate-950/45 p-3" role="dialog">
      <form action={formAction} className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <input name="studentId" type="hidden" value={studentId} />
        <input name="documentType" type="hidden" value={requirement.documentType} />
        <input name="fileName" type="hidden" value={selectedFile?.name ?? ""} />
        <input name="mimeType" type="hidden" value={selectedFile?.type ?? ""} />
        <input name="fileSize" type="hidden" value={selectedFile?.size ?? 0} />
        <h2 className="text-lg font-semibold text-foreground">{document ? "Replace Document" : "Upload Document"}</h2>
        <p className="mt-2 text-sm text-foreground-muted">{requirement.title} / {studentDocumentCategoryLabels[requirement.category]}</p>

        {actionState.message ? (
          <div className={actionState.status === "success" ? "mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"}>
            {actionState.message}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4">
          <Field label="Title">
            <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" name="title" type="text" defaultValue={document?.title ?? requirement.title} />
          </Field>
          <Field label="Description">
            <textarea className="min-h-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" name="description" defaultValue={document?.description ?? requirement.description ?? ""} />
          </Field>
          <Field helperText="Allowed: PDF, JPEG, PNG, WebP, DOCX. Maximum 25 MB." label="File" required>
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
          {requirement.allowExpiry ? (
            <Field label="Expiry date">
              <input className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" name="expiresAt" type="date" defaultValue={document?.expiresAt ?? ""} />
            </Field>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            {actionState.status === "success" ? "Close" : "Cancel"}
          </Button>
          <Button disabled={pending || !selectedFile || actionState.status === "success"} loading={pending} type="submit" variant="primary">
            {pending ? "Uploading..." : document ? "Replace" : "Upload"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DocumentPreviewDialog({
  canManageDocuments,
  document,
  onClose,
  studentId,
}: {
  canManageDocuments: boolean;
  document: StudentDocument;
  onClose: () => void;
  studentId: string;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  return (
    <div aria-modal="true" className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-slate-950/45 p-3" role="dialog">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <h2 className="text-lg font-semibold text-foreground">{document.title}</h2>
        <p className="mt-2 text-sm text-foreground-muted">Secure preview boundary. This mock implementation exposes metadata only and does not create public file URLs.</p>
        <dl className="mt-4 grid gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
          <DocumentTerm label="File" value={document.attachment?.fileName} />
          <DocumentTerm label="MIME type" value={document.attachment?.mimeType} />
          <DocumentTerm label="Reference" value={document.attachment?.reference} />
          <DocumentTerm label="Verification" value={verificationLabel(document)} />
        </dl>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {canManageDocuments && document.status === "active" ? (
            <>
              {document.verificationStatus !== "rejected" ? (
                <Button onClick={() => setRejectOpen(true)} variant="secondary">
                  Reject
                </Button>
              ) : null}
              <Button onClick={() => setArchiveOpen(true)} variant="secondary">
                Archive
              </Button>
            </>
          ) : null}
          <Button onClick={onClose} variant="primary">
            Close
          </Button>
        </div>
      </div>
      {rejectOpen ? <ReasonDialog action={rejectStudentDocumentAction} documentId={document.id} fieldName="rejectionReason" label="Reject Document" onClose={() => setRejectOpen(false)} studentId={studentId} /> : null}
      {archiveOpen ? <ReasonDialog action={archiveStudentDocumentAction} documentId={document.id} fieldName="reason" label="Archive Document" onClose={() => setArchiveOpen(false)} studentId={studentId} /> : null}
    </div>
  );
}

function ReasonDialog({
  action,
  documentId,
  fieldName,
  label,
  onClose,
  studentId,
}: {
  action: (state: StudentDocumentActionState, formData: FormData) => Promise<StudentDocumentActionState>;
  documentId: string;
  fieldName: "reason" | "rejectionReason";
  label: string;
  onClose: () => void;
  studentId: string;
}) {
  const [actionState, formAction, pending] = useActionState(action, initialActionState);

  return (
    <div aria-modal="true" className="fixed inset-0 z-[105] grid place-items-center bg-slate-950/50 p-3" role="dialog">
      <form action={formAction} className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-2xl">
        <input name="studentId" type="hidden" value={studentId} />
        <input name="documentId" type="hidden" value={documentId} />
        <h3 className="text-base font-semibold text-foreground">{label}</h3>
        <p className="mt-2 text-sm text-foreground-muted">The document record is preserved. No physical deletion occurs in this workflow.</p>
        {actionState.message ? <p className={actionState.status === "error" ? "mt-3 text-sm text-danger" : "mt-3 text-sm text-emerald-700 dark:text-emerald-300"}>{actionState.message}</p> : null}
        <Field label="Reason" required={fieldName === "rejectionReason"}>
          <textarea className="mt-3 min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" maxLength={500} name={fieldName} required={fieldName === "rejectionReason"} />
        </Field>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            {actionState.status === "success" ? "Close" : "Cancel"}
          </Button>
          <Button disabled={pending || actionState.status === "success"} loading={pending} type="submit" variant="primary">
            {pending ? "Saving..." : label}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DocumentMutationButton({
  action,
  documentId,
  label,
  studentId,
}: {
  action: (state: StudentDocumentActionState, formData: FormData) => Promise<StudentDocumentActionState>;
  documentId: string;
  label: string;
  studentId: string;
}) {
  const [actionState, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="inline-flex">
      <input name="studentId" type="hidden" value={studentId} />
      <input name="documentId" type="hidden" value={documentId} />
      <Button disabled={pending || actionState.status === "success"} loading={pending} size="sm" type="submit" variant="secondary">
        {pending ? "Saving..." : actionState.status === "success" ? "Done" : label}
      </Button>
    </form>
  );
}

function buildDocumentRows(response: StudentDocumentListResponse): DocumentRow[] {
  const rows: DocumentRow[] = [];
  response.requirements.forEach((requirement) => {
    const document = response.documents.find((item) => item.documentType === requirement.documentType && item.status === "active");
    rows.push(document ? { kind: "document", document, requirement } : { kind: "missing", requirement });
  });

  response.documents
    .filter((document) => !response.requirements.some((requirement) => requirement.documentType === document.documentType))
    .forEach((document) => rows.push({ kind: "document", document }));

  response.documents
    .filter((document) => document.status === "archived")
    .forEach((document) => rows.push({ kind: "document", document }));

  return rows;
}

function matchesFilter(row: DocumentRow, filter: DocumentFilter) {
  if (filter === "all") return row.kind === "document" ? row.document.status !== "archived" : true;
  if (filter === "required") return row.kind === "missing" ? row.requirement.isRequired : row.document.isRequired;
  if (filter === "optional") return row.kind === "missing" ? !row.requirement.isRequired : !row.document.isRequired;
  if (row.kind === "missing") return false;
  if (filter === "archived") return row.document.status === "archived";
  if (filter === "pending") return row.document.verificationStatus === "pending";
  if (filter === "verified") return row.document.verificationStatus === "verified";
  if (filter === "rejected") return row.document.verificationStatus === "rejected";
  return Boolean(row.document.expiresAt && daysUntil(row.document.expiresAt) <= 30);
}

function requirementForDocument(requirements: StudentDocumentRequirement[], document: StudentDocument) {
  return requirements.find((requirement) => requirement.documentType === document.documentType) ?? {
    documentType: document.documentType,
    category: document.category,
    title: document.title,
    isRequired: document.isRequired,
  };
}

function findOtherRequirement(requirements: StudentDocumentRequirement[]) {
  return requirements.find((requirement) => requirement.documentType === "other") ?? {
    documentType: "other" as StudentDocumentType,
    category: "other",
    title: "Other Document",
    isRequired: false,
  };
}

function DocumentStatusBadge({ document }: { document: StudentDocument }) {
  if (document.status === "archived") return <Badge tone="neutral">Archived</Badge>;
  if (document.verificationStatus === "verified") return <Badge tone="success">Verified</Badge>;
  if (document.verificationStatus === "rejected") return <Badge tone="danger">Rejected</Badge>;
  if (document.verificationStatus === "expired") return <Badge tone="danger">Expired</Badge>;
  return <Badge tone="warning">Pending Verification</Badge>;
}

function DocumentTerm({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="responsive-text mt-1 text-foreground">{value || "Not recorded"}</dd>
    </div>
  );
}

function verificationLabel(document: StudentDocument) {
  if (document.status === "archived") return "Archived";
  if (document.verificationStatus === "verified") return "Verified";
  if (document.verificationStatus === "rejected") return "Rejected";
  if (document.verificationStatus === "expired") return "Expired";
  return "Pending verification";
}

function daysUntil(date: string) {
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const documentFilters: Array<{ label: string; value: DocumentFilter }> = [
  { label: "All", value: "all" },
  { label: "Required", value: "required" },
  { label: "Optional", value: "optional" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
  { label: "Archived", value: "archived" },
  { label: "Expiring", value: "expiring" },
];
