import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { attendanceReportFiltersSchema } from "@/features/attendance/schemas/attendance-report.schema";
import {
  buildStatusDistribution,
  calculateReportAttendancePercentage,
  calculateReportSummary,
  countStatus,
  defaultAttendanceThreshold,
  getAttendanceRiskLevel,
  roundPercent,
} from "@/features/attendance/services/attendance-report-rules";
import type { AttendanceHistoryRecord, AttendanceStatus } from "@/features/attendance/types/attendance";
import type {
  AttendanceDailySummary,
  AttendanceReportDashboard,
  AttendanceReportFilters,
  AttendanceReportSortBy,
  AttendanceTrendPoint,
  ClassAttendanceReport,
  LowAttendanceStudent,
  PaginatedAttendanceReport,
  SectionAttendanceReport,
  StudentAttendanceReport,
} from "@/features/attendance/types/attendance-report";
import { attendanceService } from "@/lib/api/attendance";

export const attendanceReportService = {
  async getReportDashboard(scope: TenantScopedQuery, filters: AttendanceReportFilters = {}): Promise<AttendanceReportDashboard> {
    const parsedFilters = parseAndValidateFilters(filters);
    const records = await getReportRecords(scope, parsedFilters);
    const threshold = parsedFilters.attendanceThreshold ?? defaultAttendanceThreshold;
    const studentReports = buildStudentReports(records, threshold);
    const classReports = buildClassReports(records);
    const sectionReports = buildSectionReports(records);
    const pagedStudentReports = paginate(sortStudentReports(studentReports, parsedFilters.sortBy, parsedFilters.sortDirection), parsedFilters.page, parsedFilters.pageSize);

    return {
      summary: calculateReportSummary(records, new Set(records.map((record) => record.studentId)).size),
      dailySummaries: buildDailySummaries(records),
      trend: buildTrend(records),
      statusDistribution: buildStatusDistribution(records),
      studentReports: pagedStudentReports,
      classReports: paginate(sortClassReports(classReports, parsedFilters.sortDirection), 1, 10),
      sectionReports: paginate(sortSectionReports(sectionReports, parsedFilters.sortDirection), 1, 10),
      lowAttendanceStudents: studentReports
        .filter((student) => student.attendancePercentage < threshold)
        .map((student): LowAttendanceStudent => ({
          studentId: student.studentId,
          studentName: student.studentName,
          admissionNumber: student.admissionNumber,
          className: student.className,
          sectionName: student.sectionName,
          attendancePercentage: student.attendancePercentage,
          absentDays: student.absentDays,
          totalDays: student.totalDays,
          threshold,
          riskLevel: student.riskLevel,
        }))
        .sort((first, second) => first.attendancePercentage - second.attendancePercentage)
        .slice(0, 8),
      correctionMetrics: {
        correctedRecordCount: records.filter((record) => record.isCorrected).length,
        correctionEventCount: records.reduce((total, record) => total + record.correctionCount, 0),
        correctedRecordPercentage: records.length ? roundPercent((records.filter((record) => record.isCorrected).length / records.length) * 100) : 0,
      },
    };
  },
};

async function getReportRecords(scope: TenantScopedQuery, filters: Required<Pick<AttendanceReportFilters, "page" | "pageSize" | "sortBy" | "sortDirection" | "attendanceThreshold">> & AttendanceReportFilters) {
  const history = await attendanceService.getAttendanceHistory(scope, {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    studentId: filters.studentId,
    classId: filters.classId,
    sectionId: filters.sectionId,
    status: filters.status,
    correctedOnly: filters.correctedOnly,
    page: 1,
    pageSize: 100,
    sortBy: "date",
    sortDirection: "asc",
  });

  return history.items;
}

function parseAndValidateFilters(filters: AttendanceReportFilters) {
  const parsedFilters = attendanceReportFiltersSchema.parse(filters);
  const today = todayIsoDate();

  if (parsedFilters.dateFrom && parsedFilters.dateFrom > today) {
    throw new ApiError(422, "Report start date cannot be in the future.");
  }

  if (parsedFilters.dateTo && parsedFilters.dateTo > today) {
    throw new ApiError(422, "Report end date cannot be in the future.");
  }

  return parsedFilters;
}

function buildDailySummaries(records: AttendanceHistoryRecord[]): AttendanceDailySummary[] {
  return Array.from(groupBy(records, (record) => record.attendanceDate).entries())
    .map(([date, dayRecords]) => ({
      date,
      totalStudents: new Set(dayRecords.map((record) => record.studentId)).size,
      presentCount: countStatus(dayRecords, "present"),
      absentCount: countStatus(dayRecords, "absent"),
      lateCount: countStatus(dayRecords, "late"),
      excusedCount: countStatus(dayRecords, "excused"),
      halfDayCount: countStatus(dayRecords, "half_day"),
      leaveCount: countStatus(dayRecords, "leave"),
      attendancePercentage: calculateReportAttendancePercentage(dayRecords),
      correctedCount: dayRecords.filter((record) => record.isCorrected).length,
    }))
    .sort((first, second) => first.date.localeCompare(second.date));
}

function buildTrend(records: AttendanceHistoryRecord[]): AttendanceTrendPoint[] {
  return buildDailySummaries(records).map((summary) => ({
    date: summary.date,
    attendancePercentage: summary.attendancePercentage,
    absencePercentage: summary.presentCount + summary.absentCount + summary.lateCount + summary.excusedCount + summary.halfDayCount + summary.leaveCount
      ? roundPercent((summary.absentCount / (summary.presentCount + summary.absentCount + summary.lateCount + summary.excusedCount + summary.halfDayCount + summary.leaveCount)) * 100)
      : 0,
    presentCount: summary.presentCount,
    absentCount: summary.absentCount,
    lateCount: summary.lateCount,
  }));
}

function buildStudentReports(records: AttendanceHistoryRecord[], threshold: number): StudentAttendanceReport[] {
  return Array.from(groupBy(records, (record) => record.studentId).entries()).map(([, studentRecords]) => {
    const first = studentRecords[0];
    const attendancePercentage = calculateReportAttendancePercentage(studentRecords);

    return {
      studentId: first?.studentId ?? "",
      studentName: first?.studentName ?? "Unknown student",
      admissionNumber: first?.admissionNumber ?? "Not available",
      className: first?.className ?? "Not available",
      sectionName: first?.sectionName ?? "Not available",
      totalDays: studentRecords.length,
      presentDays: countStatus(studentRecords, "present"),
      absentDays: countStatus(studentRecords, "absent"),
      lateDays: countStatus(studentRecords, "late"),
      excusedDays: countStatus(studentRecords, "excused"),
      halfDays: countStatus(studentRecords, "half_day"),
      leaveDays: countStatus(studentRecords, "leave"),
      attendancePercentage,
      correctedCount: studentRecords.filter((record) => record.isCorrected).length,
      riskLevel: getAttendanceRiskLevel(attendancePercentage, threshold),
    };
  });
}

function buildClassReports(records: AttendanceHistoryRecord[]): ClassAttendanceReport[] {
  return Array.from(groupBy(records, (record) => record.classId).entries()).map(([, classRecords]) => {
    const first = classRecords[0];
    return {
      classId: first?.classId ?? "",
      className: first?.className ?? "Not available",
      totalStudents: new Set(classRecords.map((record) => record.studentId)).size,
      attendancePercentage: calculateReportAttendancePercentage(classRecords),
      presentCount: countStatus(classRecords, "present"),
      absentCount: countStatus(classRecords, "absent"),
      lateCount: countStatus(classRecords, "late"),
      leaveCount: countStatuses(classRecords, ["leave", "excused", "half_day"]),
      correctedCount: classRecords.filter((record) => record.isCorrected).length,
    };
  });
}

function buildSectionReports(records: AttendanceHistoryRecord[]): SectionAttendanceReport[] {
  return Array.from(groupBy(records, (record) => `${record.classId}:${record.sectionId}`).entries()).map(([, sectionRecords]) => {
    const first = sectionRecords[0];
    return {
      classId: first?.classId ?? "",
      className: first?.className ?? "Not available",
      sectionId: first?.sectionId ?? "",
      sectionName: first?.sectionName ?? "Not available",
      totalStudents: new Set(sectionRecords.map((record) => record.studentId)).size,
      attendancePercentage: calculateReportAttendancePercentage(sectionRecords),
      presentCount: countStatus(sectionRecords, "present"),
      absentCount: countStatus(sectionRecords, "absent"),
      lateCount: countStatus(sectionRecords, "late"),
      leaveCount: countStatuses(sectionRecords, ["leave", "excused", "half_day"]),
      correctedCount: sectionRecords.filter((record) => record.isCorrected).length,
    };
  });
}

function sortStudentReports(items: StudentAttendanceReport[], sortBy: AttendanceReportSortBy = "attendancePercentage", direction: "asc" | "desc" = "asc") {
  return [...items].sort((first, second) => {
    const firstValue = sortBy === "absentDays" ? first.absentDays : sortBy === "lateDays" ? first.lateDays : sortBy === "studentName" ? first.studentName : first.attendancePercentage;
    const secondValue = sortBy === "absentDays" ? second.absentDays : sortBy === "lateDays" ? second.lateDays : sortBy === "studentName" ? second.studentName : second.attendancePercentage;
    const result = typeof firstValue === "number" && typeof secondValue === "number"
      ? firstValue - secondValue
      : String(firstValue).localeCompare(String(secondValue), "en-IN", { numeric: true, sensitivity: "base" });
    return direction === "asc" ? result : -result;
  });
}

function sortClassReports(items: ClassAttendanceReport[], direction: "asc" | "desc" = "asc") {
  return [...items].sort((first, second) => {
    const result = first.className.localeCompare(second.className, "en-IN", { numeric: true, sensitivity: "base" });
    return direction === "asc" ? result : -result;
  });
}

function sortSectionReports(items: SectionAttendanceReport[], direction: "asc" | "desc" = "asc") {
  return [...items].sort((first, second) => {
    const result = `${first.className} ${first.sectionName}`.localeCompare(`${second.className} ${second.sectionName}`, "en-IN", { numeric: true, sensitivity: "base" });
    return direction === "asc" ? result : -result;
  });
}

function paginate<T>(items: T[], page = 1, pageSize = 10): PaginatedAttendanceReport<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

function countStatuses(records: AttendanceHistoryRecord[], statuses: AttendanceStatus[]) {
  return records.filter((record) => statuses.includes(record.currentStatus)).length;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return groups;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
