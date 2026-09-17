import { Badge } from "@/components/ui";
import {
  admissionDocumentCompletionMeta,
  admissionDocumentStatusMeta,
  admissionStatusMeta,
} from "@/features/admissions/components/admission-formatters";
import type {
  AdmissionApplicationStatus,
  AdmissionDocumentCompletionStatus,
  AdmissionDocumentStatus,
} from "@/features/admissions/types/admission";

export function AdmissionStatusBadge({ status }: { status: AdmissionApplicationStatus }) {
  const meta = admissionStatusMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function AdmissionDocumentStatusBadge({ status }: { status: AdmissionDocumentStatus }) {
  const meta = admissionDocumentStatusMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function AdmissionDocumentCompletionBadge({ status }: { status: AdmissionDocumentCompletionStatus }) {
  const meta = admissionDocumentCompletionMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
