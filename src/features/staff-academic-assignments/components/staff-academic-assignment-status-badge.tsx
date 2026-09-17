import { Badge } from "@/components/ui";
import { getAssignmentStatusTone, staffAcademicAssignmentStatusLabels } from "@/features/staff-academic-assignments/services/staff-academic-assignment-rules";
import type { StaffAcademicAssignmentStatus } from "@/features/staff-academic-assignments/types/staff-academic-assignment";

export function StaffAcademicAssignmentStatusBadge({ status }: { status: StaffAcademicAssignmentStatus }) {
  return <Badge tone={getAssignmentStatusTone(status)}>{staffAcademicAssignmentStatusLabels[status]}</Badge>;
}
