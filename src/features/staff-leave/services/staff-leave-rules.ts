import type { StaffLeavePolicy, StaffLeaveStatus } from "@/features/staff-leave/types/staff-leave";

export const staffLeaveStatusLabels: Record<StaffLeaveStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function getStaffLeaveStatusLabel(status: StaffLeaveStatus) {
  return staffLeaveStatusLabels[status];
}

export function calculateLeaveDuration(startDate: string, endDate: string) {
  const start = parseIso(startDate);
  const end = parseIso(endDate);
  if (!start || !end) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function validateLeaveDateRange(startDate: string, endDate: string) {
  const duration = calculateLeaveDuration(startDate, endDate);
  if (duration <= 0) return { valid: false as const, message: "Leave end date cannot be before start date." };
  return { valid: true as const, duration };
}

export function validateLeavePolicy(policy: StaffLeavePolicy, durationDays: number, attachmentName?: string) {
  if (policy.attachmentRequired && !attachmentName) return { valid: false as const, message: "Attachment is required for this leave type." };
  if (policy.maximumConsecutiveDays && durationDays > policy.maximumConsecutiveDays) {
    return { valid: false as const, message: "Leave exceeds the maximum consecutive days allowed by policy." };
  }
  return { valid: true as const };
}

export function canTransitionLeaveStatus(current: StaffLeaveStatus, action: "approve" | "reject" | "cancel") {
  if (action === "approve") return current === "pending_approval" || current === "submitted";
  if (action === "reject") return current === "pending_approval" || current === "submitted";
  return current === "approved" || current === "pending_approval" || current === "submitted";
}

function parseIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
}
