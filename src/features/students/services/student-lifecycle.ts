import type {
  StudentLifecycleAction,
  StudentLifecycleReason,
  StudentStatus,
} from "@/features/students/types/student";

export type StudentLifecycleTransition = {
  action: StudentLifecycleAction;
  label: string;
  description: string;
  from: StudentStatus[];
  targetStatus: StudentStatus;
  requiresReason: boolean;
  destructive?: boolean;
};

export const studentLifecycleReasonLabels: Record<StudentLifecycleReason, string> = {
  student_transferred: "Student transferred",
  student_withdrew: "Student withdrew",
  duplicate_record: "Duplicate record",
  completed_academic_lifecycle: "Completed academic lifecycle",
  administrative_reason: "Administrative reason",
  status_correction: "Status correction",
  other: "Other",
};

export const studentLifecycleTransitions: StudentLifecycleTransition[] = [
  {
    action: "activate",
    label: "Activate",
    description: "Return the student to active enrollment.",
    from: ["pending", "inactive"],
    targetStatus: "active",
    requiresReason: false,
  },
  {
    action: "deactivate",
    label: "Deactivate",
    description: "Pause the student's active lifecycle without archiving the record.",
    from: ["pending", "active"],
    targetStatus: "inactive",
    requiresReason: true,
  },
  {
    action: "graduate",
    label: "Graduate",
    description: "Mark the student as having completed the academic lifecycle.",
    from: ["active", "inactive"],
    targetStatus: "graduated",
    requiresReason: true,
  },
  {
    action: "transfer",
    label: "Transfer",
    description: "Mark the student as transferred while preserving historical information.",
    from: ["active", "inactive", "pending"],
    targetStatus: "transferred",
    requiresReason: true,
  },
  {
    action: "withdraw",
    label: "Withdraw",
    description: "Mark the student as withdrawn while preserving institutional history.",
    from: ["active", "inactive", "pending"],
    targetStatus: "withdrawn",
    requiresReason: true,
  },
  {
    action: "archive",
    label: "Archive",
    description: "Remove the student from normal active views while retaining the historical record.",
    from: ["inactive", "graduated", "transferred", "withdrawn"],
    targetStatus: "archived",
    requiresReason: true,
    destructive: true,
  },
  {
    action: "restore",
    label: "Restore",
    description: "Restore the archived record to an inactive lifecycle state for review.",
    from: ["archived"],
    targetStatus: "inactive",
    requiresReason: true,
  },
];

export function getStudentLifecycleTransition(action: StudentLifecycleAction) {
  return studentLifecycleTransitions.find((transition) => transition.action === action);
}

export function getAvailableStudentLifecycleTransitions(status: StudentStatus) {
  return studentLifecycleTransitions.filter((transition) => transition.from.includes(status));
}

export function validateStudentLifecycleTransition({
  action,
  currentStatus,
  reason,
  reasonNote,
}: {
  action: StudentLifecycleAction;
  currentStatus: StudentStatus;
  reason?: StudentLifecycleReason;
  reasonNote?: string;
}): { valid: true; transition: StudentLifecycleTransition } | { valid: false; message: string } {
  const transition = getStudentLifecycleTransition(action);

  if (!transition) {
    return {
      valid: false,
      message: "This lifecycle action is not supported.",
    };
  }

  if (!transition.from.includes(currentStatus)) {
    return {
      valid: false,
      message: `This student cannot be moved from ${formatLifecycleStatus(currentStatus)} to ${formatLifecycleStatus(transition.targetStatus)}.`,
    };
  }

  if (transition.requiresReason && !reason) {
    return {
      valid: false,
      message: "A lifecycle reason is required for this action.",
    };
  }

  if (reason === "other" && !reasonNote?.trim()) {
    return {
      valid: false,
      message: "Please enter a reason when selecting Other.",
    };
  }

  return {
    valid: true,
    transition,
  };
}

export function formatLifecycleStatus(status: StudentStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
