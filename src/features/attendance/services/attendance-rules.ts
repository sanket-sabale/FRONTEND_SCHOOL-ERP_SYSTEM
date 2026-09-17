import type { AttendanceRecord, AttendanceSummary, AttendanceStatus } from "@/features/attendance/types/attendance";

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
  half_day: "Half-day",
  leave: "Leave",
};

export const attendanceStatusDescriptions: Record<AttendanceStatus, string> = {
  present: "Student attended as expected.",
  absent: "Student was absent.",
  late: "Student attended after the expected start time.",
  excused: "Absence or exception was excused.",
  half_day: "Student attended for part of the day.",
  leave: "Approved leave was recorded.",
};

export const attendanceStatusOrder: AttendanceStatus[] = ["present", "absent", "late", "excused", "half_day", "leave"];

export function getAttendanceStatusLabel(status: AttendanceStatus) {
  return attendanceStatusLabels[status];
}

export function getAttendanceStatusTone(status: AttendanceStatus): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "present") return "success";
  if (status === "absent") return "danger";
  if (status === "late" || status === "half_day") return "warning";
  if (status === "excused" || status === "leave") return "info";
  return "neutral";
}

export function createAttendanceRecordKey(record: Pick<AttendanceRecord, "tenantId" | "schoolId" | "campusId" | "academicYearId" | "studentId" | "date">) {
  return [
    record.tenantId,
    record.schoolId,
    record.campusId,
    record.academicYearId,
    record.studentId,
    record.date,
  ].join(":");
}

export function calculateAttendanceSummary(records: Array<Pick<AttendanceRecord, "status" | "date">>): AttendanceSummary {
  const summary: AttendanceSummary = {
    totalWorkingDays: records.length,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    excusedDays: 0,
    leaveDays: 0,
    halfDayDays: 0,
    attendancePercentage: 0,
  };

  records.forEach((record) => {
    if (record.status === "present") summary.presentDays += 1;
    if (record.status === "absent") summary.absentDays += 1;
    if (record.status === "late") summary.lateDays += 1;
    if (record.status === "excused") summary.excusedDays += 1;
    if (record.status === "leave") summary.leaveDays += 1;
    if (record.status === "half_day") summary.halfDayDays += 1;
  });

  if (summary.totalWorkingDays === 0) return summary;

  const attendanceUnits =
    summary.presentDays +
    summary.lateDays +
    summary.excusedDays +
    summary.halfDayDays * 0.5;

  summary.attendancePercentage = Math.round((attendanceUnits / summary.totalWorkingDays) * 1000) / 10;
  return summary;
}

export function validateAttendanceDatePolicy(date: string) {
  const requested = parseAttendanceDate(date);
  const today = startOfDay(new Date());

  if (!requested) {
    return { valid: false, message: "Attendance date is invalid." };
  }

  // Stage 9 supports operational attendance only for today and past dates.
  if (requested.getTime() > today.getTime()) {
    return { valid: false, message: "Attendance cannot be marked for a future date." };
  }

  return { valid: true, message: "" };
}

export function validateAttendanceCorrectionPolicy({
  currentStatus,
  newStatus,
  reason,
  attendanceDate,
  studentStatus,
}: {
  currentStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  attendanceDate: string;
  studentStatus: string;
}) {
  if (currentStatus === newStatus) {
    return { valid: false, message: "New attendance status must be different from the current status." };
  }

  if (reason.trim().length < 8) {
    return { valid: false, message: "A correction reason of at least 8 characters is required." };
  }

  const dateValidation = validateAttendanceDatePolicy(attendanceDate);
  if (!dateValidation.valid) return dateValidation;

  if (studentStatus === "archived") {
    return { valid: false, message: "Archived students cannot normally have attendance corrected." };
  }

  return { valid: true, message: "" };
}

function parseAttendanceDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;

  return startOfDay(parsed);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
