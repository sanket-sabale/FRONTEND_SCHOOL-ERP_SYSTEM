import { Badge } from "@/components/ui";
import { getStaffLeaveStatusLabel } from "@/features/staff-leave/services/staff-leave-rules";
import type { StaffLeaveStatus } from "@/features/staff-leave/types/staff-leave";

export function StaffLeaveStatusBadge({ status }: { status: StaffLeaveStatus }) {
  const tone = status === "approved" ? "success" : status === "rejected" || status === "cancelled" ? "danger" : status === "pending_approval" || status === "submitted" ? "warning" : "neutral";
  return <Badge tone={tone}>{getStaffLeaveStatusLabel(status)}</Badge>;
}
