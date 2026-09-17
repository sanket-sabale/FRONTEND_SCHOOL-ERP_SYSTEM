import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import {
  attendanceCorrectionSchema,
  attendanceFiltersSchema,
  attendanceHistoryFiltersSchema,
  markAttendanceSchema,
  updateAttendanceSchema,
} from "@/features/attendance/schemas/attendance.schema";
import {
  calculateAttendanceSummary,
  createAttendanceRecordKey,
  validateAttendanceCorrectionPolicy,
  validateAttendanceDatePolicy,
} from "@/features/attendance/services/attendance-rules";
import {
  resolveAttendanceRecordAcademicContext,
  validateAttendanceContextMatchesRequest,
} from "@/features/attendance/services/attendance-academic-context";
import { mockAttendanceCorrections, mockAttendanceRecords } from "@/features/attendance/services/mock-attendance";
import type {
  AttendanceCorrection,
  AttendanceCorrectionInput,
  AttendanceCorrectionResult,
  AttendanceFilters,
  AttendanceHistoryDetail,
  AttendanceHistoryFilters,
  AttendanceHistoryListResponse,
  AttendanceHistoryRecord,
  AttendanceListResponse,
  AttendanceRecord,
  AttendanceRecordSummary,
  AttendanceSummary,
  AttendanceSnapshotRepairInput,
  AttendanceSortBy,
  MarkAttendanceInput,
  UpdateAttendanceInput,
} from "@/features/attendance/types/attendance";
import { studentService } from "@/lib/api/students";

let attendanceRecords = [...mockAttendanceRecords];
let attendanceCorrections = [...mockAttendanceCorrections];

export const attendanceService = {
  async getAttendanceRecords(scope: TenantScopedQuery, filters: AttendanceFilters = {}): Promise<AttendanceListResponse> {
    const parsedFilters = attendanceFiltersSchema.parse(filters);
    const query = parsedFilters.search?.toLowerCase().trim();
    const records = attendanceRecords
      .filter((record) => isAttendanceInScope(record, scope))
      .filter((record) => !parsedFilters.date || record.date === parsedFilters.date)
      .filter((record) => !parsedFilters.dateFrom || record.date >= parsedFilters.dateFrom)
      .filter((record) => !parsedFilters.dateTo || record.date <= parsedFilters.dateTo)
      .filter((record) => !parsedFilters.studentId || record.studentId === parsedFilters.studentId)
      .filter((record) => !parsedFilters.status || record.status === parsedFilters.status);

    const summaries = await toAttendanceSummaries(scope, records);
    const filtered = summaries
      .filter((record) => !parsedFilters.classId || record.classId === parsedFilters.classId)
      .filter((record) => !parsedFilters.sectionId || record.sectionId === parsedFilters.sectionId)
      .filter((record) => {
        if (!query) return true;
        return [
          record.studentName,
          record.admissionNumber,
          record.studentCode,
          record.className,
          record.sectionName,
          record.remarks,
        ].filter(Boolean).join(" ").toLowerCase().includes(query);
      })
      .sort((first, second) => compareAttendance(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / parsedFilters.pageSize));
    const start = (parsedFilters.page - 1) * parsedFilters.pageSize;

    return {
      items: filtered.slice(start, start + parsedFilters.pageSize),
      total,
      page: parsedFilters.page,
      pageSize: parsedFilters.pageSize,
      totalPages,
      summary: calculateAttendanceSummary(filtered),
    };
  },

  async getAttendanceRecord(scope: TenantScopedQuery, attendanceId: string) {
    const record = attendanceRecords.find((item) => item.id === attendanceId && isAttendanceInScope(item, scope));
    if (!record) return null;

    const [summary] = await toAttendanceSummaries(scope, [record]);
    return summary ?? null;
  },

  async getAttendanceSnapshotRecords(scope: TenantScopedQuery): Promise<AttendanceRecord[]> {
    return attendanceRecords.filter((record) => isAttendanceInScope(record, scope)).map((record) => ({ ...record }));
  },

  async getAttendanceSnapshotRecord(scope: TenantScopedQuery, attendanceId: string): Promise<AttendanceRecord | null> {
    const record = attendanceRecords.find((item) => item.id === attendanceId && isAttendanceInScope(item, scope));
    return record ? { ...record } : null;
  },

  async repairAttendanceSnapshot(input: AttendanceSnapshotRepairInput): Promise<AttendanceRecord> {
    const current = attendanceRecords.find((record) => record.id === input.attendanceId && isAttendanceInScope(record, input));
    if (!current) throw new ApiError(404, "Attendance record could not be found in the current repair scope.");

    if (
      normalizeSnapshotValue(current.academicYearId) !== normalizeSnapshotValue(input.beforeAcademicYearId) ||
      normalizeSnapshotValue(current.classId) !== normalizeSnapshotValue(input.beforeClassId) ||
      normalizeSnapshotValue(current.sectionId) !== normalizeSnapshotValue(input.beforeSectionId)
    ) {
      throw new ApiError(409, "Attendance snapshot changed after review. Repair was not applied.");
    }

    const next: AttendanceRecord = {
      ...current,
      academicYearId: input.academicYearId,
      classId: input.classId,
      sectionId: input.sectionId,
    };

    attendanceRecords = attendanceRecords.map((record) => (record.id === next.id ? next : record));
    return { ...next };
  },

  async getAttendanceHistory(scope: TenantScopedQuery, filters: AttendanceHistoryFilters = {}): Promise<AttendanceHistoryListResponse> {
    const parsedFilters = attendanceHistoryFiltersSchema.parse(filters);
    const query = parsedFilters.search?.toLowerCase().trim();
    const records = attendanceRecords
      .filter((record) => isAttendanceInScope(record, scope))
      .filter((record) => !parsedFilters.date || record.date === parsedFilters.date)
      .filter((record) => !parsedFilters.dateFrom || record.date >= parsedFilters.dateFrom)
      .filter((record) => !parsedFilters.dateTo || record.date <= parsedFilters.dateTo)
      .filter((record) => !parsedFilters.studentId || record.studentId === parsedFilters.studentId)
      .filter((record) => !parsedFilters.status || record.status === parsedFilters.status)
      .filter((record) => !parsedFilters.markedBy || record.markedBy === parsedFilters.markedBy);

    const historyRecords = await toAttendanceHistoryRecords(scope, records);
    const filtered = historyRecords
      .filter((record) => !parsedFilters.classId || record.classId === parsedFilters.classId)
      .filter((record) => !parsedFilters.sectionId || record.sectionId === parsedFilters.sectionId)
      .filter((record) => parsedFilters.correctedOnly ? record.isCorrected : true)
      .filter((record) => !parsedFilters.admissionNumber || record.admissionNumber.toLowerCase().includes(parsedFilters.admissionNumber.toLowerCase()))
      .filter((record) => !parsedFilters.correctedBy || getCorrectionsForRecord(scope, record.id).some((correction) => correction.correctedBy === parsedFilters.correctedBy))
      .filter((record) => {
        if (!query) return true;
        return [record.studentName, record.admissionNumber, record.studentCode, record.className, record.sectionName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((first, second) => compareAttendance(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / parsedFilters.pageSize));
    const start = (parsedFilters.page - 1) * parsedFilters.pageSize;

    return {
      items: filtered.slice(start, start + parsedFilters.pageSize),
      total,
      page: parsedFilters.page,
      pageSize: parsedFilters.pageSize,
      totalPages,
      correctedCount: filtered.filter((record) => record.isCorrected).length,
      correctionCount: filtered.reduce((count, record) => count + record.correctionCount, 0),
    };
  },

  async getAttendanceHistoryDetail(scope: TenantScopedQuery, attendanceId: string): Promise<AttendanceHistoryDetail | null> {
    const record = attendanceRecords.find((item) => item.id === attendanceId && isAttendanceInScope(item, scope));
    if (!record) return null;

    const [historyRecord] = await toAttendanceHistoryRecords(scope, [record]);
    if (!historyRecord) return null;

    return {
      record: historyRecord,
      corrections: getCorrectionsForRecord(scope, attendanceId),
    };
  },

  async getAttendanceCorrections(scope: TenantScopedQuery, attendanceId: string) {
    const record = attendanceRecords.find((item) => item.id === attendanceId && isAttendanceInScope(item, scope));
    if (!record) throw new ApiError(404, "Attendance record could not be found.");
    return getCorrectionsForRecord(scope, attendanceId);
  },

  async getStudentAttendance(scope: TenantScopedQuery, studentId: string, filters: AttendanceFilters = {}) {
    await ensureStudentPlacement(scope, studentId);
    return this.getAttendanceRecords(scope, { ...filters, studentId });
  },

  async getClassAttendance(scope: TenantScopedQuery, classId: string, sectionId: string, date: string) {
    return this.getAttendanceRecords(scope, { classId, sectionId, date, page: 1, pageSize: 100, sortBy: "studentName" });
  },

  async getAttendanceSummary(scope: TenantScopedQuery, filters: AttendanceFilters = {}): Promise<AttendanceSummary> {
    const response = await this.getAttendanceRecords(scope, { ...filters, page: 1, pageSize: 100 });
    return response.summary;
  },

  async markAttendance(input: MarkAttendanceInput) {
    const parsedInput = markAttendanceSchema.parse(input);
    if (parsedInput.source !== "manual") {
      throw new ApiError(422, "Only manual attendance marking is available in this stage.");
    }

    ensureAllowedAttendanceDate(parsedInput.date);
    ensureNoDuplicateInputRows(parsedInput.records.map((record) => record.studentId));

    const markedRecords: AttendanceRecord[] = [];
    const now = new Date().toISOString();

    for (const entry of parsedInput.records) {
      await ensureStudentPlacement(parsedInput, entry.studentId);
      const academicContext = await validateAttendanceContextMatchesRequest(
        parsedInput,
        entry.studentId,
        parsedInput.date,
        entry.classId,
        entry.sectionId,
      );

      const key = createAttendanceRecordKey({ ...parsedInput, studentId: entry.studentId });
      const existing = attendanceRecords.find((record) => createAttendanceRecordKey(record) === key);
      if (existing && existing.status !== entry.status) {
        throw new ApiError(422, "Existing attendance status changes require the correction workflow and a reason.");
      }
      const next: AttendanceRecord = existing
        ? {
            ...existing,
            status: entry.status,
            checkInTime: entry.checkInTime,
            checkOutTime: entry.checkOutTime,
            remarks: entry.remarks,
            updatedBy: parsedInput.markedBy,
            updatedAt: now,
            version: existing.version + 1,
          }
        : {
            tenantId: parsedInput.tenantId,
            schoolId: parsedInput.schoolId,
            campusId: parsedInput.campusId,
            academicYearId: parsedInput.academicYearId,
            id: createAttendanceId(entry.studentId, parsedInput.date),
            studentId: entry.studentId,
            classId: academicContext.classId,
            sectionId: academicContext.sectionId,
            date: parsedInput.date,
            status: entry.status,
            checkInTime: entry.checkInTime,
            checkOutTime: entry.checkOutTime,
            remarks: entry.remarks,
            markedBy: parsedInput.markedBy,
            markedAt: now,
            source: "manual",
            version: 1,
          };

      attendanceRecords = existing
        ? attendanceRecords.map((record) => (record.id === existing.id ? next : record))
        : [next, ...attendanceRecords];
      markedRecords.push(next);
    }

    return {
      records: markedRecords,
      summary: calculateAttendanceSummary(markedRecords),
    };
  },

  async updateAttendance(input: UpdateAttendanceInput) {
    const parsedInput = updateAttendanceSchema.parse(input);
    const current = attendanceRecords.find((record) => record.id === parsedInput.id && isAttendanceInScope(record, parsedInput));
    if (!current) throw new ApiError(404, "Attendance record could not be found.");

    await ensureStudentPlacement(parsedInput, current.studentId);
    ensureAllowedAttendanceDate(current.date);

    const next: AttendanceRecord = {
      ...current,
      status: parsedInput.status ?? current.status,
      checkInTime: parsedInput.checkInTime,
      checkOutTime: parsedInput.checkOutTime,
      remarks: parsedInput.remarks,
      updatedBy: parsedInput.updatedBy,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };

    attendanceRecords = attendanceRecords.map((record) => (record.id === next.id ? next : record));
    return next;
  },

  async correctAttendance(input: AttendanceCorrectionInput): Promise<AttendanceCorrectionResult> {
    const parsedInput = attendanceCorrectionSchema.parse(input);
    const current = attendanceRecords.find((record) => record.id === parsedInput.attendanceId && isAttendanceInScope(record, parsedInput));
    if (!current) throw new ApiError(404, "Attendance record could not be found.");

    const student = await ensureStudentPlacement(parsedInput, current.studentId);
    const policy = validateAttendanceCorrectionPolicy({
      currentStatus: current.status,
      newStatus: parsedInput.newStatus,
      reason: parsedInput.reason,
      attendanceDate: current.date,
      studentStatus: student.status,
    });

    if (!policy.valid) throw new ApiError(422, policy.message);

    const corrections = getCorrectionsForRecord(parsedInput, current.id);
    const now = new Date().toISOString();
    const correction: AttendanceCorrection = {
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.academicYearId,
      id: createCorrectionId(current.id, corrections.length + 1),
      attendanceId: current.id,
      studentId: current.studentId,
      previousStatus: current.status,
      newStatus: parsedInput.newStatus,
      reason: parsedInput.reason,
      correctedBy: parsedInput.correctedBy,
      correctedAt: now,
      correctionNumber: corrections.length + 1,
      source: "manual",
      previousMarkedAt: current.updatedAt ?? current.markedAt,
      previousMarkedBy: current.updatedBy ?? current.markedBy,
    };
    const next: AttendanceRecord = {
      ...current,
      status: parsedInput.newStatus,
      updatedBy: parsedInput.correctedBy,
      updatedAt: now,
      version: current.version + 1,
    };

    attendanceCorrections = [...attendanceCorrections, correction];
    attendanceRecords = attendanceRecords.map((record) => (record.id === current.id ? next : record));

    return {
      record: next,
      correction,
      previousStatus: current.status,
      newStatus: next.status,
    };
  },
};

async function toAttendanceSummaries(scope: TenantScopedQuery, records: AttendanceRecord[]) {
  const summaries: AttendanceRecordSummary[] = [];

  for (const record of records) {
    const student = await studentService.getStudent(scope, record.studentId);
    if (!student) continue;
    const academicContext = await resolveAttendanceRecordAcademicContext(scope, record);

    summaries.push({
      ...record,
      studentName: student.displayName,
      admissionNumber: student.admissionNumber,
      studentCode: student.studentCode,
      classId: academicContext.classId,
      sectionId: academicContext.sectionId,
      className: academicContext.className,
      sectionName: academicContext.sectionName,
      academicContextSource: academicContext.source,
      rollNumber: student.academic.rollNumber,
    });
  }

  return summaries;
}

async function toAttendanceHistoryRecords(scope: TenantScopedQuery, records: AttendanceRecord[]) {
  const summaries = await toAttendanceSummaries(scope, records);
  return summaries.map((record): AttendanceHistoryRecord => {
    const corrections = getCorrectionsForRecord(scope, record.id);
    const firstCorrection = corrections[0];
    const lastCorrection = corrections.at(-1);

    return {
      ...record,
      attendanceDate: record.date,
      currentStatus: record.status,
      originalStatus: firstCorrection?.previousStatus ?? record.status,
      isCorrected: corrections.length > 0,
      lastModifiedAt: lastCorrection?.correctedAt ?? record.updatedAt ?? record.markedAt,
      lastModifiedBy: lastCorrection?.correctedBy ?? record.updatedBy ?? record.markedBy,
      correctionCount: corrections.length,
    };
  });
}

function getCorrectionsForRecord(scope: TenantScopedQuery, attendanceId: string) {
  return attendanceCorrections
    .filter((correction) => correction.attendanceId === attendanceId && isCorrectionInScope(correction, scope))
    .sort((first, second) => first.correctionNumber - second.correctionNumber);
}

async function ensureStudentPlacement(scope: TenantScopedQuery, studentId: string) {
  const student = await studentService.getStudent(scope, studentId);
  if (!student) throw new ApiError(404, "Student could not be found in the current attendance scope.");
  if (student.campusId !== scope.campusId || student.academicYearId !== scope.academicYearId) {
    throw new ApiError(403, "Student is outside the active attendance scope.");
  }
  return student;
}

function ensureAllowedAttendanceDate(date: string) {
  const result = validateAttendanceDatePolicy(date);
  if (!result.valid) throw new ApiError(422, result.message);
}

function ensureNoDuplicateInputRows(studentIds: string[]) {
  const seen = new Set<string>();
  for (const studentId of studentIds) {
    if (seen.has(studentId)) throw new ApiError(409, "A student can only appear once in an attendance submission.");
    seen.add(studentId);
  }
}

function isAttendanceInScope(record: AttendanceRecord, scope: TenantScopedQuery) {
  return (
    record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId
  );
}

function isCorrectionInScope(correction: AttendanceCorrection, scope: TenantScopedQuery) {
  return (
    correction.tenantId === scope.tenantId &&
    correction.schoolId === scope.schoolId &&
    correction.campusId === scope.campusId &&
    correction.academicYearId === scope.academicYearId
  );
}

function compareAttendance(
  first: AttendanceRecordSummary,
  second: AttendanceRecordSummary,
  sortBy: AttendanceSortBy,
  sortDirection: "asc" | "desc",
) {
  const firstValue = sortBy === "className" ? `${first.className} ${first.sectionName}` : first[sortBy];
  const secondValue = sortBy === "className" ? `${second.className} ${second.sectionName}` : second[sortBy];
  const result = String(firstValue ?? "").localeCompare(String(secondValue ?? ""), "en-IN", {
    numeric: true,
    sensitivity: "base",
  });

  return sortDirection === "asc" ? result : -result;
}

function createAttendanceId(studentId: string, date: string) {
  return `att-${studentId}-${date}`;
}

function createCorrectionId(attendanceId: string, correctionNumber: number) {
  return `corr-${attendanceId}-${String(correctionNumber).padStart(3, "0")}-${Date.now()}`;
}

function normalizeSnapshotValue(value?: string) {
  return value || "";
}
