import type { StaffEmploymentEventType } from "@/features/staff-employment/types/staff-employment";

export const staffEmploymentEventTypeLabels: Record<StaffEmploymentEventType, string> = {
  joining: "Joined",
  confirmation: "Confirmed",
  department_change: "Department Change",
  designation_change: "Designation Change",
  employment_type_change: "Employment Type Change",
  transfer: "Transfer",
  promotion: "Promotion",
  suspension: "Suspension",
  resignation: "Resignation",
  termination: "Termination",
  retirement: "Retirement",
};

export function getStaffEmploymentEventTypeLabel(type: StaffEmploymentEventType) {
  return staffEmploymentEventTypeLabels[type];
}
