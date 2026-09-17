import { Badge } from "@/components/ui";
import {
  disciplinaryStatusLabels,
  getStatusTone,
  goalStatusLabels,
  reviewStatusLabels,
  trainingStatusLabels,
  verificationStatusLabels,
} from "@/features/staff-performance/services/staff-performance-rules";

export function StaffPerformanceStatusBadge({ status }: { status: string }) {
  return <Badge tone={getStatusTone(status)}>{getStatusLabel(status)}</Badge>;
}

function getStatusLabel(status: string) {
  return reviewStatusLabels[status as keyof typeof reviewStatusLabels] ??
    goalStatusLabels[status as keyof typeof goalStatusLabels] ??
    trainingStatusLabels[status as keyof typeof trainingStatusLabels] ??
    disciplinaryStatusLabels[status as keyof typeof disciplinaryStatusLabels] ??
    verificationStatusLabels[status as keyof typeof verificationStatusLabels] ??
    status.replaceAll("_", " ");
}
