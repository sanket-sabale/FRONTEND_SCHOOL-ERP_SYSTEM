import { Badge } from "@/components/ui";
import type { StudentStatus } from "@/features/students/types/student";

const statusPresentation: Record<StudentStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  graduated: { label: "Graduated", tone: "info" },
  transferred: { label: "Transferred", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "danger" },
  archived: { label: "Archived", tone: "neutral" },
};

export function getStudentStatusLabel(status: StudentStatus) {
  return statusPresentation[status].label;
}

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const presentation = statusPresentation[status];

  return <Badge tone={presentation.tone}>{presentation.label}</Badge>;
}
