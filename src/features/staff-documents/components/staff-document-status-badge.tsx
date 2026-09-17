import { Badge } from "@/components/ui";
import { getStaffDocumentStatusLabel } from "@/features/staff-documents/services/staff-document-rules";
import type { StaffDocumentStatus } from "@/features/staff-documents/types/staff-document";

export function StaffDocumentStatusBadge({ status }: { status: StaffDocumentStatus }) {
  const tone = status === "verified" ? "success" : status === "rejected" || status === "expired" ? "danger" : status === "pending" ? "warning" : "neutral";
  return <Badge tone={tone}>{getStaffDocumentStatusLabel(status)}</Badge>;
}
