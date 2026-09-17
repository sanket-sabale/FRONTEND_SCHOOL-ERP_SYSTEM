import { attendanceStatuses, type AttendanceHistoryRecord, type AttendanceStatus } from "@/features/attendance/types/attendance";
import type { AttendanceReportSummary, AttendanceRiskLevel, AttendanceStatusDistributionItem } from "@/features/attendance/types/attendance-report";

export const defaultAttendanceThreshold = 75;

export function calculateReportAttendancePercentage(records: Array<Pick<AttendanceHistoryRecord, "currentStatus">>) {
  if (records.length === 0) return 0;

  const units = records.reduce((total, record) => total + attendanceUnits(record.currentStatus), 0);
  return roundPercent((units / records.length) * 100);
}

export function calculateReportSummary(records: AttendanceHistoryRecord[], totalStudents: number): AttendanceReportSummary {
  const presentCount = countStatus(records, "present");
  const absentCount = countStatus(records, "absent");
  const lateCount = countStatus(records, "late");
  const excusedCount = countStatus(records, "excused");
  const halfDayCount = countStatus(records, "half_day");
  const leaveCount = countStatus(records, "leave");
  const correctedRecordCount = records.filter((record) => record.isCorrected).length;
  const correctionEventCount = records.reduce((total, record) => total + record.correctionCount, 0);

  return {
    totalStudents,
    totalAttendanceRecords: records.length,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    halfDayCount,
    leaveCount,
    attendancePercentage: calculateReportAttendancePercentage(records),
    absencePercentage: records.length ? roundPercent((absentCount / records.length) * 100) : 0,
    latePercentage: records.length ? roundPercent((lateCount / records.length) * 100) : 0,
    correctedRecordCount,
    correctionEventCount,
    correctedRecordPercentage: records.length ? roundPercent((correctedRecordCount / records.length) * 100) : 0,
  };
}

export function buildStatusDistribution(records: AttendanceHistoryRecord[]): AttendanceStatusDistributionItem[] {
  return attendanceStatuses.map((status) => {
    const count = countStatus(records, status);
    return {
      status,
      count,
      percentage: records.length ? roundPercent((count / records.length) * 100) : 0,
    };
  });
}

export function getAttendanceRiskLevel(attendancePercentage: number, threshold = defaultAttendanceThreshold): AttendanceRiskLevel {
  if (attendancePercentage >= threshold) return "healthy";
  if (attendancePercentage >= Math.max(0, threshold - 15)) return "attention";
  return "critical";
}

export function getRiskLabel(riskLevel: AttendanceRiskLevel) {
  if (riskLevel === "healthy") return "Healthy";
  if (riskLevel === "attention") return "Needs attention";
  return "Critical attention";
}

export function getRiskTone(riskLevel: AttendanceRiskLevel): "success" | "warning" | "danger" {
  if (riskLevel === "healthy") return "success";
  if (riskLevel === "attention") return "warning";
  return "danger";
}

export function countStatus(records: Array<Pick<AttendanceHistoryRecord, "currentStatus">>, status: AttendanceStatus) {
  return records.filter((record) => record.currentStatus === status).length;
}

export function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function attendanceUnits(status: AttendanceStatus) {
  if (status === "present" || status === "late" || status === "excused") return 1;
  if (status === "half_day") return 0.5;
  return 0;
}
