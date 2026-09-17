import type { StaffStatus } from "@/features/staff/types/staff";
import type { StaffAttendanceStatus, StaffAttendanceSummary } from "@/features/staff-attendance/types/staff-attendance";

export const staffAttendanceStatusLabels: Record<StaffAttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half-day",
  leave: "Leave",
  holiday: "Holiday",
  weekend: "Weekend",
};

export function getStaffAttendanceStatusLabel(status: StaffAttendanceStatus) {
  return staffAttendanceStatusLabels[status];
}

export function validateStaffAttendanceTimes(checkIn?: string, checkOut?: string) {
  if (checkIn && checkOut && checkOut < checkIn) {
    return { valid: false as const, message: "Check-out cannot be earlier than check-in." };
  }
  return { valid: true as const };
}

export function canStaffReceiveNewAttendance(status: StaffStatus) {
  return !["resigned", "terminated", "retired", "inactive"].includes(status);
}

export function createEmptyStaffAttendanceSummary(totalStaff = 0): StaffAttendanceSummary {
  return {
    totalStaff,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    holiday: 0,
    weekend: 0,
    unmarked: totalStaff,
  };
}
