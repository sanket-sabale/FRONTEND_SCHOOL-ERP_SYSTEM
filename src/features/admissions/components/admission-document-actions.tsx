"use client";

import { useActionState, useState } from "react";
import { Button, Field, Select } from "@/components/ui";
import type { AdmissionActionState } from "@/features/admissions/actions/admission-actions";
import {
  rejectAdmissionDocumentAction,
  startAdmissionDocumentVerificationAction,
  submitAdmissionApplicationAction,
  uploadAdmissionDocumentAction,
  verifyAdmissionDocumentAction,
} from "@/features/admissions/actions/admission-actions";
import type { AdmissionDocument } from "@/features/admissions/types/admission";

const initialState: AdmissionActionState = { status: "idle" };
const mimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;

export function AdmissionDocumentActions({ applicationId, canEdit, canVerify, document }: { applicationId: string; canEdit: boolean; canVerify: boolean; document: AdmissionDocument }) {
  const [showReject, setShowReject] = useState(false);
  return (
    <div className="grid gap-3">
      {canEdit && (document.status === "required" || document.status === "rejected") ? <UploadDocumentForm applicationId={applicationId} document={document} /> : null}
      {canVerify && document.status === "uploaded" ? <SimpleDocumentAction action={startAdmissionDocumentVerificationAction} applicationId={applicationId} document={document} label="Start Verification" /> : null}
      {canVerify && (document.status === "uploaded" || document.status === "under_verification") ? (
        <div className="flex flex-wrap gap-2">
          <SimpleDocumentAction action={verifyAdmissionDocumentAction} applicationId={applicationId} document={document} label="Verify" />
          <Button onClick={() => setShowReject((value) => !value)} type="button" variant="destructive">Reject</Button>
        </div>
      ) : null}
      {showReject ? <RejectDocumentForm applicationId={applicationId} document={document} /> : null}
    </div>
  );
}

export function SubmitAdmissionApplicationActionForm({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(submitAdmissionApplicationAction, initialState);
  return (
    <form action={formAction} className="grid gap-3">
      <input name="applicationId" type="hidden" value={applicationId} />
      <input name="reason" type="hidden" value="Submitted from Application 360" />
      <Button disabled={pending} loading={pending} type="submit" variant="primary">Submit Application</Button>
      <p className="text-xs leading-5 text-foreground-muted">Submission uses the admission status transition service. Draft applications cannot jump to approval.</p>
      {state.message ? <p className={`text-sm ${state.status === "error" ? "text-danger" : "text-success"}`}>{state.message}</p> : null}
    </form>
  );
}

function UploadDocumentForm({ applicationId, document }: { applicationId: string; document: AdmissionDocument }) {
  const [state, formAction, pending] = useActionState(uploadAdmissionDocumentAction, initialState);
  const [fileName, setFileName] = useState(document.status === "rejected" ? "" : `${document.documentType}.pdf`);
  return (
    <form action={formAction} className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3">
      <input name="applicationId" type="hidden" value={applicationId} />
      <input name="documentId" type="hidden" value={document.id} />
      <Field label={document.status === "rejected" ? "Re-upload file name" : "Upload file name"} required>
        <input className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" name="fileName" onChange={(event) => setFileName(event.target.value)} required value={fileName} />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="File type" required>
          <Select name="mimeType" required>
            {mimeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
        </Field>
        <Field helperText="Maximum 5 MB in this mock adapter." label="File size" required>
          <input className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" min={1} name="fileSize" required type="number" value={245760} readOnly />
        </Field>
      </div>
      {state.message ? <p className={`text-sm ${state.status === "error" ? "text-danger" : "text-success"}`}>{state.message}</p> : null}
      <Button disabled={pending} loading={pending} type="submit" variant="secondary">{document.status === "rejected" ? "Re-upload" : "Upload"}</Button>
    </form>
  );
}

function SimpleDocumentAction({ action, applicationId, document, label }: { action: (state: AdmissionActionState, formData: FormData) => Promise<AdmissionActionState>; applicationId: string; document: AdmissionDocument; label: string }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="inline-grid gap-2">
      <input name="applicationId" type="hidden" value={applicationId} />
      <input name="documentId" type="hidden" value={document.id} />
      <Button disabled={pending} loading={pending} type="submit" variant="secondary">{label}</Button>
      {state.message ? <span className={`text-xs ${state.status === "error" ? "text-danger" : "text-success"}`}>{state.message}</span> : null}
    </form>
  );
}

function RejectDocumentForm({ applicationId, document }: { applicationId: string; document: AdmissionDocument }) {
  const [state, formAction, pending] = useActionState(rejectAdmissionDocumentAction, initialState);
  return (
    <form action={formAction} className="grid gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950">
      <input name="applicationId" type="hidden" value={applicationId} />
      <input name="documentId" type="hidden" value={document.id} />
      <Field label="Rejection reason" required>
        <textarea className="min-h-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950" minLength={10} name="rejectionReason" required />
      </Field>
      {state.message ? <p className={`text-sm ${state.status === "error" ? "text-danger" : "text-success"}`}>{state.message}</p> : null}
      <Button disabled={pending} loading={pending} type="submit" variant="destructive">Confirm Rejection</Button>
    </form>
  );
}
