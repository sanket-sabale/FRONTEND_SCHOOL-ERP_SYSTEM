import { Badge } from "@/components/ui";
import type { TimetableStatus } from "@/features/timetable/types/timetable";

export function TimetableStatusBadge({ status }: { status: TimetableStatus }) {
  const tone = status === "published" ? "success" : status === "draft" ? "warning" : "neutral";
  return <Badge tone={tone}>{getTimetableStatusLabel(status)}</Badge>;
}

export function getTimetableStatusLabel(status: TimetableStatus) {
  const labels: Record<TimetableStatus, string> = {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  };
  return labels[status];
}
