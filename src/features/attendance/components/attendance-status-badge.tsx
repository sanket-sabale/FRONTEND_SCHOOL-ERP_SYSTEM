import { Badge } from "@/components/ui";
import { getAttendanceStatusLabel, getAttendanceStatusTone } from "@/features/attendance/services/attendance-rules";
import type { AttendanceStatus } from "@/features/attendance/types/attendance";

const statusSymbols: Record<AttendanceStatus, string> = {
  present: "OK",
  absent: "No",
  late: "Late",
  excused: "Exc",
  half_day: "Half",
  leave: "Leave",
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <Badge tone={getAttendanceStatusTone(status)}>
      <span className="sr-only">Attendance status: </span>
      <span aria-hidden="true" className="mr-1 font-mono text-[10px]">{statusSymbols[status]}</span>
      {getAttendanceStatusLabel(status)}
    </Badge>
  );
}
