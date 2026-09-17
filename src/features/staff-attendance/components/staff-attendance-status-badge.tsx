import { Badge } from "@/components/ui";
import { getStaffAttendanceStatusLabel } from "@/features/staff-attendance/services/staff-attendance-rules";
import type { StaffAttendanceStatus } from "@/features/staff-attendance/types/staff-attendance";

export function StaffAttendanceStatusBadge({ status }: { status: StaffAttendanceStatus }) {
  const tone = status === "present" ? "success" : status === "absent" ? "danger" : status === "leave" ? "info" : status === "late" || status === "half_day" ? "warning" : "neutral";
  return <Badge tone={tone}>{getStaffAttendanceStatusLabel(status)}</Badge>;
}
