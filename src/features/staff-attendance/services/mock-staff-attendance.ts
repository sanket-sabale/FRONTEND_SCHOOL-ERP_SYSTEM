import { tenantContext } from "@/lib/tenant-context";
import type { StaffAttendanceRecord, StaffAttendanceStatus } from "@/features/staff-attendance/types/staff-attendance";
import type { TenantScopedQuery } from "@/lib/api/client";

const activeScope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const secondTenantScope = {
  tenantId: "tenant-demo-west",
  schoolId: "school-demo-west",
  campusId: "campus-demo-central",
  academicYearId: "ay-2026-27",
};

export const mockStaffAttendanceRecords: StaffAttendanceRecord[] = [
  record("staff-001", "2026-08-23", "present", "08:05", "15:25"),
  record("staff-002", "2026-08-23", "late", "09:10", "15:10", "Traffic delay"),
  record("staff-003", "2026-08-23", "present", "08:20", "16:05"),
  record("staff-004", "2026-08-23", "absent", undefined, undefined, "Uninformed absence"),
  record("staff-005", "2026-08-23", "leave", undefined, undefined, "Approved leave"),
  record("staff-006", "2026-08-22", "weekend"),
  record("staff-007", "2026-08-21", "half_day", "08:15", "12:20"),
  record("staff-west-001", "2026-08-23", "present", "08:00", "15:00", undefined, secondTenantScope),
];

function record(
  staffId: string,
  attendanceDate: string,
  status: StaffAttendanceStatus,
  checkIn?: string,
  checkOut?: string,
  remarks?: string,
  scope: TenantScopedQuery = activeScope,
): StaffAttendanceRecord {
  const timestamp = `${attendanceDate}T08:00:00+05:30`;
  return {
    ...scope,
    id: `staff-att-${staffId}-${attendanceDate}`,
    staffId,
    attendanceDate,
    status,
    checkIn,
    checkOut,
    remarks,
    source: "manual",
    markedBy: "current-user",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
