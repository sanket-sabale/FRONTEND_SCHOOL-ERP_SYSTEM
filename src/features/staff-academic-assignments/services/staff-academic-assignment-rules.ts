import type { StaffStatus } from "@/features/staff/types/staff";
import type { StaffAcademicAssignmentStatus, StaffAcademicAssignmentType } from "@/features/staff-academic-assignments/types/staff-academic-assignment";

export const staffAcademicAssignmentTypeLabels: Record<StaffAcademicAssignmentType, string> = {
  class_teacher: "Class Teacher",
  subject_teacher: "Subject Teacher",
  assistant_teacher: "Assistant Teacher",
  co_teacher: "Co-Teacher",
  academic_coordinator: "Academic Coordinator",
  department_head: "Department Head",
};

export const staffAcademicAssignmentStatusLabels: Record<StaffAcademicAssignmentStatus, string> = {
  planned: "Planned",
  active: "Active",
  ended: "Ended",
  cancelled: "Cancelled",
};

export function canTransitionAssignmentStatus(current: StaffAcademicAssignmentStatus, next: StaffAcademicAssignmentStatus) {
  if (current === next) return true;
  const allowed: Record<StaffAcademicAssignmentStatus, StaffAcademicAssignmentStatus[]> = {
    planned: ["active", "cancelled"],
    active: ["ended", "cancelled"],
    ended: [],
    cancelled: [],
  };
  return allowed[current].includes(next);
}

export function canStaffReceiveActiveAcademicAssignment(status: StaffStatus) {
  return status === "active" || status === "on_leave";
}

export function getAssignmentStatusTone(status: StaffAcademicAssignmentStatus): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "active") return "success";
  if (status === "planned") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}

export function classifyAssignmentWorkload(activeAssignments: number): "informational" | "under_assigned" | "normal" | "high" | "overloaded" {
  if (activeAssignments <= 0) return "under_assigned";
  if (activeAssignments <= 3) return "normal";
  if (activeAssignments <= 5) return "high";
  return "overloaded";
}
