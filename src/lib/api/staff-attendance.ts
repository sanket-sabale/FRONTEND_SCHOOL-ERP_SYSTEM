import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { staffAttendanceFiltersSchema, staffAttendanceMarkSchema } from "@/features/staff-attendance/schemas/staff-attendance.schema";
import { canStaffReceiveNewAttendance, createEmptyStaffAttendanceSummary, validateStaffAttendanceTimes } from "@/features/staff-attendance/services/staff-attendance-rules";
import { mockStaffAttendanceRecords } from "@/features/staff-attendance/services/mock-staff-attendance";
import type {
  StaffAttendanceFilters,
  StaffAttendanceListResponse,
  StaffAttendanceMarkInput,
  StaffAttendanceRecord,
  StaffAttendanceSummary,
  StaffAttendanceSummaryRecord,
} from "@/features/staff-attendance/types/staff-attendance";
import { staffService } from "@/lib/api/staff";
import { employmentTypes, staffCategories } from "@/features/staff/types/staff";
import { readEnumQueryParam } from "@/lib/query-params";

let staffAttendanceRecords = [...mockStaffAttendanceRecords];

export const staffAttendanceService = {
  async listAttendance(scope: TenantScopedQuery, filters: StaffAttendanceFilters = {}): Promise<StaffAttendanceListResponse> {
    const parsed = staffAttendanceFiltersSchema.parse(filters);
    const query = parsed.search?.toLowerCase().trim();
    const records = staffAttendanceRecords
      .filter((record) => isSameScope(record, scope))
      .filter((record) => !parsed.attendanceDate || record.attendanceDate === parsed.attendanceDate)
      .filter((record) => !parsed.dateFrom || record.attendanceDate >= parsed.dateFrom)
      .filter((record) => !parsed.dateTo || record.attendanceDate <= parsed.dateTo)
      .filter((record) => !parsed.staffId || record.staffId === parsed.staffId)
      .filter((record) => !parsed.status || record.status === parsed.status);

    const summaries = await toSummaries(scope, records);
    const filtered = summaries
      .filter((record) => !parsed.departmentId || record.departmentId === parsed.departmentId)
      .filter((record) => !parsed.designationId || record.designationId === parsed.designationId)
      .filter((record) => {
        if (!query) return true;
        return [record.staffName, record.employeeNumber, record.departmentName, record.designationName, record.remarks].filter(Boolean).join(" ").toLowerCase().includes(query);
      })
      .sort((first, second) => compareAttendance(first, second, parsed.sortBy, parsed.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));
    const start = (parsed.page - 1) * parsed.pageSize;

    return {
      items: filtered.slice(start, start + parsed.pageSize),
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages,
      summary: summarizeAttendance(filtered),
    };
  },

  async getRoster(scope: TenantScopedQuery, filters: StaffAttendanceFilters = {}) {
    const response = await staffService.listStaff(scope, {
      page: 1,
      pageSize: 100,
      sortBy: "displayName",
      sortDirection: "asc",
      departmentId: filters.departmentId,
      designationId: filters.designationId,
      staffCategory: readEnumQueryParam(filters.staffCategory, staffCategories),
      employmentType: readEnumQueryParam(filters.employmentType, employmentTypes),
    });
    return response.items.filter((staff) => canStaffReceiveNewAttendance(staff.status));
  },

  async getDayAttendance(scope: TenantScopedQuery, attendanceDate: string, filters: StaffAttendanceFilters = {}) {
    return this.listAttendance(scope, { ...filters, attendanceDate, page: 1, pageSize: 100 });
  },

  async markAttendance(input: StaffAttendanceMarkInput) {
    const parsed = staffAttendanceMarkSchema.parse(input);
    if (parsed.source !== "manual") throw new ApiError(422, "Only manual staff attendance is available in this phase.");
    ensureNoDuplicateRows(parsed.records.map((record) => record.staffId));

    const now = new Date().toISOString();
    const saved: StaffAttendanceRecord[] = [];
    for (const entry of parsed.records) {
      const staff = await staffService.getStaffById(parsed, entry.staffId);
      if (!staff) throw new ApiError(404, "Staff member could not be found in the current attendance scope.");
      if (!canStaffReceiveNewAttendance(staff.status)) throw new ApiError(422, "Inactive, exited, or retired staff cannot receive new attendance.");
      const timeValidation = validateStaffAttendanceTimes(entry.checkIn, entry.checkOut);
      if (!timeValidation.valid) throw new ApiError(422, timeValidation.message);

      const existing = staffAttendanceRecords.find((record) => isSameScope(record, parsed) && record.staffId === entry.staffId && record.attendanceDate === parsed.attendanceDate);
      const next: StaffAttendanceRecord = existing
        ? {
            ...existing,
            status: entry.status,
            checkIn: entry.checkIn,
            checkOut: entry.checkOut,
            remarks: entry.remarks,
            updatedBy: parsed.markedBy,
            updatedAt: now,
          }
        : {
            tenantId: parsed.tenantId,
            schoolId: parsed.schoolId,
            campusId: parsed.campusId,
            academicYearId: parsed.academicYearId,
            id: createAttendanceId(entry.staffId, parsed.attendanceDate),
            staffId: entry.staffId,
            attendanceDate: parsed.attendanceDate,
            status: entry.status,
            checkIn: entry.checkIn,
            checkOut: entry.checkOut,
            remarks: entry.remarks,
            source: "manual",
            markedBy: parsed.markedBy,
            createdAt: now,
            updatedAt: now,
          };
      staffAttendanceRecords = existing ? staffAttendanceRecords.map((record) => record.id === existing.id ? next : record) : [next, ...staffAttendanceRecords];
      saved.push(next);
    }

    return { records: saved, summary: summarizeAttendance(await toSummaries(parsed, saved)) };
  },

  async getStaffSummary(scope: TenantScopedQuery, staffId: string): Promise<StaffAttendanceSummary> {
    const records = staffAttendanceRecords.filter((record) => isSameScope(record, scope) && record.staffId === staffId);
    return summarizeAttendance(await toSummaries(scope, records));
  },

  async getRecentStaffAttendance(scope: TenantScopedQuery, staffId: string, limit = 5) {
    const records = staffAttendanceRecords
      .filter((record) => isSameScope(record, scope) && record.staffId === staffId)
      .sort((first, second) => second.attendanceDate.localeCompare(first.attendanceDate))
      .slice(0, limit);
    return toSummaries(scope, records);
  },

  getRawRecords(scope: TenantScopedQuery) {
    return staffAttendanceRecords.filter((record) => isSameScope(record, scope)).map((record) => ({ ...record }));
  },
};

async function toSummaries(scope: TenantScopedQuery, records: StaffAttendanceRecord[]) {
  const staffProfiles = await Promise.all(records.map((record) => staffService.getStaffById(scope, record.staffId)));
  const staffById = new Map(staffProfiles.filter((staff) => staff !== null).map((staff) => [staff.id, staff]));
  const summaries: StaffAttendanceSummaryRecord[] = [];
  for (const record of records) {
    const staff = staffById.get(record.staffId);
    if (!staff) continue;
    summaries.push({
      ...record,
      staffName: staff.displayName,
      employeeNumber: staff.employeeNumber,
      departmentId: staff.departmentId,
      designationId: staff.designationId,
      departmentName: staff.departmentName,
      designationName: staff.designationName,
    });
  }
  return summaries;
}

function summarizeAttendance(records: StaffAttendanceSummaryRecord[]): StaffAttendanceSummary {
  const summary = createEmptyStaffAttendanceSummary(records.length);
  summary.unmarked = 0;
  for (const record of records) {
    if (record.status === "present") summary.present += 1;
    if (record.status === "absent") summary.absent += 1;
    if (record.status === "late") summary.late += 1;
    if (record.status === "half_day") summary.halfDay += 1;
    if (record.status === "leave") summary.leave += 1;
    if (record.status === "holiday") summary.holiday += 1;
    if (record.status === "weekend") summary.weekend += 1;
  }
  return summary;
}

function ensureNoDuplicateRows(staffIds: string[]) {
  const seen = new Set<string>();
  for (const staffId of staffIds) {
    if (seen.has(staffId)) throw new ApiError(409, "A staff member can only appear once in an attendance submission.");
    seen.add(staffId);
  }
}

function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId && record.academicYearId === scope.academicYearId;
}

function compareAttendance(first: StaffAttendanceSummaryRecord, second: StaffAttendanceSummaryRecord, sortBy: NonNullable<StaffAttendanceFilters["sortBy"]>, sortDirection: "asc" | "desc") {
  const result = String(first[sortBy] ?? "").localeCompare(String(second[sortBy] ?? ""), "en-IN", { numeric: true, sensitivity: "base" });
  return sortDirection === "asc" ? result : -result;
}

function createAttendanceId(staffId: string, date: string) {
  return `staff-att-${staffId}-${date}`;
}
