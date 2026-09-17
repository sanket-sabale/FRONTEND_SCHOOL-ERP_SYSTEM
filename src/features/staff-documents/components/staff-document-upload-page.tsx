"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button, Card, Field, PageHeader, Select } from "@/components/ui";
import { validateAttachmentFile } from "@/features/attachments/adapters/web/attachment-web-adapter";
import { createStaffDocumentAction, type StaffDocumentActionState } from "@/features/staff-documents/actions/staff-document-actions";
import { staffDocumentTypeLabels } from "@/features/staff-documents/services/staff-document-rules";
import type { StaffDocumentDefinition, StaffDocumentType } from "@/features/staff-documents/types/staff-document";
import type { StaffProfile } from "@/features/staff/types/staff";
import { communicationUploadPolicy, formatFileSize } from "@/lib/api/attachments";

const initialActionState: StaffDocumentActionState = { status: "idle" };

export function StaffDocumentUploadPage({ definitions, staff }: { definitions: StaffDocumentDefinition[]; staff: StaffProfile }) {
  const [state, formAction, pending] = useActionState(createStaffDocumentAction, initialActionState);
  const [documentType, setDocumentType] = useState<StaffDocumentType>(definitions[0]?.documentType ?? "other");
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; size: number } | null>(null);
  const [fileError, setFileError] = useState("");

  return (
    <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={["Staff", staff.displayName, "Documents", "New"]} />}
        description="Add validated staff document metadata using the project mock storage boundary."
        eyebrow="Staff Documents"
        title="Add Staff Document"
        action={<Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/documents`}>Back to Documents</Link>}
      />
      <Card className="mx-auto max-w-3xl">
        <form action={formAction} className="grid gap-4 p-4 sm:p-5">
          <input name="staffId" type="hidden" value={staff.id} />
          <input name="fileName" type="hidden" value={selectedFile?.name ?? ""} />
          <input name="mimeType" type="hidden" value={selectedFile?.type ?? ""} />
          <input name="fileSize" type="hidden" value={selectedFile?.size ?? 0} />
          {state.message ? <div className={state.status === "success" ? successClasses : errorClasses}>{state.message}</div> : null}
          <Field label="Document type" required>
            <Select name="documentType" onChange={(event) => setDocumentType(event.target.value as StaffDocumentType)} value={documentType}>
              {definitions.map((definition) => <option key={definition.documentType} value={definition.documentType}>{staffDocumentTypeLabels[definition.documentType]}</option>)}
            </Select>
          </Field>
          <Field label="Title">
            <input className={inputClasses} name="title" defaultValue={staffDocumentTypeLabels[documentType]} />
          </Field>
          <Field label="Description">
            <textarea className={`${inputClasses} min-h-24 py-2`} name="description" />
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
            <input className={inputClasses} name="expiryDate" type="date" />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link className={linkButtonClasses} href={`/staff/${encodeURIComponent(staff.id)}/documents`}>Cancel</Link>
            <Button disabled={pending || !selectedFile || state.status === "success"} loading={pending} type="submit">Upload Document</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const inputClasses = "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";
const linkButtonClasses = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
const successClasses = "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
const errorClasses = "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200";
