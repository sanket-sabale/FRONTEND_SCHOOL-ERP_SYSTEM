import { Badge } from "@/components/ui";
import { getStaffStatusLabel } from "@/features/staff/services/staff-rules";
import type { StaffStatus } from "@/features/staff/types/staff";
import { staffStatusTone } from "@/features/staff/components/staff-formatters";

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  return <Badge tone={staffStatusTone(status)}>{getStaffStatusLabel(status)}</Badge>;
}
