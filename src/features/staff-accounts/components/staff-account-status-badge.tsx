import { Badge } from "@/components/ui";
import { getStaffAccountStatusLabel } from "@/features/staff-accounts/services/staff-account-rules";
import type { StaffAccountStatus } from "@/features/staff-accounts/types/staff-account";

export function StaffAccountStatusBadge({ status }: { status: StaffAccountStatus }) {
  const tone = status === "active" ? "success" : status === "suspended" ? "danger" : status === "invited" ? "warning" : "neutral";
  return <Badge tone={tone}>{getStaffAccountStatusLabel(status)}</Badge>;
}
