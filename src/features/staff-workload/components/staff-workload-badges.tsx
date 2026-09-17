import { Badge } from "@/components/ui";
import { readinessLabels, workloadStatusLabels } from "@/features/staff-workload/services/staff-workload-rules";
import type { SchedulingReadinessStatus, WorkloadStatus } from "@/features/staff-workload/types/staff-workload";

export function WorkloadStatusBadge({ status }: { status: WorkloadStatus }) {
  const tone = status === "balanced" ? "success" : status === "overloaded" ? "danger" : status === "near_capacity" ? "warning" : status === "under_assigned" ? "info" : "neutral";
  return <Badge tone={tone}>{workloadStatusLabels[status]}</Badge>;
}

export function ReadinessBadge({ status }: { status: SchedulingReadinessStatus }) {
  const tone = status === "ready" ? "success" : status === "blocked" ? "danger" : status === "has_warnings" ? "warning" : "info";
  return <Badge tone={tone}>{readinessLabels[status]}</Badge>;
}
