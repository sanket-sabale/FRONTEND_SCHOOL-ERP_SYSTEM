import type {
  DisciplinaryStatus,
  PerformanceRating,
  PerformanceReviewStatus,
  PerformanceReviewType,
  StaffGoalCategory,
  StaffGoalPriority,
  StaffGoalStatus,
  StaffSkillProficiency,
  StaffTrainingStatus,
  StaffTrainingType,
  StaffVerificationStatus,
} from "@/features/staff-performance/types/staff-performance";

export const performanceRatingLabels: Record<PerformanceRating, string> = {
  1: "Needs Significant Improvement",
  2: "Needs Improvement",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Exceptional",
};

export const reviewStatusLabels: Record<PerformanceReviewStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const reviewTypeLabels: Record<PerformanceReviewType, string> = {
  probation: "Probation",
  annual: "Annual",
  mid_year: "Mid-year",
  promotion_review: "Promotion Review",
  performance_improvement: "Performance Improvement",
  ad_hoc: "Ad hoc",
};

export const goalStatusLabels: Record<StaffGoalStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  deferred: "Deferred",
  cancelled: "Cancelled",
};

export const goalCategoryLabels: Record<StaffGoalCategory, string> = {
  teaching: "Teaching",
  academic: "Academic",
  administration: "Administration",
  student_support: "Student Support",
  professional_development: "Professional Development",
  operational: "Operational",
  other: "Other",
};

export const goalPriorityLabels: Record<StaffGoalPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const trainingStatusLabels: Record<StaffTrainingStatus, string> = {
  planned: "Planned",
  enrolled: "Enrolled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const trainingTypeLabels: Record<StaffTrainingType, string> = {
  internal: "Internal",
  external: "External",
  workshop: "Workshop",
  certification: "Certification",
  compliance: "Compliance",
  professional_development: "Professional Development",
};

export const proficiencyLabels: Record<StaffSkillProficiency, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export const verificationStatusLabels: Record<StaffVerificationStatus, string> = {
  unverified: "Unverified",
  verified: "Verified",
  rejected: "Rejected",
};

export const disciplinaryStatusLabels: Record<DisciplinaryStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  resolved: "Resolved",
  closed: "Closed",
};

export function canTransitionReviewStatus(current: PerformanceReviewStatus, next: PerformanceReviewStatus) {
  return canTransition(current, next, {
    draft: ["scheduled", "cancelled"],
    scheduled: ["in_progress", "cancelled"],
    in_progress: ["submitted", "cancelled"],
    submitted: ["acknowledged", "in_progress"],
    acknowledged: ["completed"],
    completed: [],
    cancelled: [],
  });
}

export function canTransitionGoalStatus(current: StaffGoalStatus, next: StaffGoalStatus) {
  return canTransition(current, next, {
    not_started: ["in_progress", "deferred", "cancelled"],
    in_progress: ["completed", "deferred", "cancelled"],
    completed: [],
    deferred: ["in_progress", "cancelled"],
    cancelled: [],
  });
}

export function canTransitionTrainingStatus(current: StaffTrainingStatus, next: StaffTrainingStatus) {
  return canTransition(current, next, {
    planned: ["enrolled", "cancelled"],
    enrolled: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  });
}

export function canTransitionDisciplinaryStatus(current: DisciplinaryStatus, next: DisciplinaryStatus) {
  return canTransition(current, next, {
    open: ["under_review", "resolved", "closed"],
    under_review: ["resolved", "closed"],
    resolved: ["closed"],
    closed: [],
  });
}

export function getStatusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (["completed", "acknowledged", "verified", "resolved", "closed"].includes(status)) return "success";
  if (["in_progress", "submitted", "enrolled", "under_review"].includes(status)) return "info";
  if (["draft", "scheduled", "planned", "not_started", "deferred", "unverified"].includes(status)) return "warning";
  if (["cancelled", "rejected", "open"].includes(status)) return "danger";
  return "neutral";
}

export function formatRating(rating?: PerformanceRating) {
  return rating ? `${rating} - ${performanceRatingLabels[rating]}` : "Not rated";
}

function canTransition<T extends string>(current: T, next: T, transitions: Record<T, T[]>) {
  return current === next || transitions[current].includes(next);
}
