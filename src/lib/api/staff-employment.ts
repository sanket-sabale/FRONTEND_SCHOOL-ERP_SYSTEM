import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { staffEmploymentRecordSchema } from "@/features/staff-employment/schemas/staff-employment.schema";
import { mockStaffEmploymentRecords } from "@/features/staff-employment/services/mock-staff-employment";
import type { StaffEmploymentRecord, StaffEmploymentRecordInput } from "@/features/staff-employment/types/staff-employment";
import { staffService } from "@/lib/api/staff";

let employmentRecords = [...mockStaffEmploymentRecords];

export const staffEmploymentService = {
  async listEmploymentRecords(scope: TenantScopedQuery, staffId: string): Promise<StaffEmploymentRecord[]> {
    await ensureStaffInScope(scope, staffId);
    return employmentRecords
      .filter((record) => isSameScope(record, scope) && record.staffId === staffId && record.status !== "archived")
      .sort((first, second) => second.effectiveDate.localeCompare(first.effectiveDate))
      .map((record) => ({ ...record }));
  },

  async createEmploymentRecord(input: StaffEmploymentRecordInput) {
    const parsed = staffEmploymentRecordSchema.parse(input);
    await ensureStaffInScope(parsed, parsed.staffId);
    const now = new Date().toISOString();
    const record: StaffEmploymentRecord = {
      ...parsed,
      id: `emp-rec-${parsed.staffId}-${parsed.eventType}-${Date.now()}`,
      status: "active",
      recordedBy: parsed.recordedBy ?? "current-user",
      createdAt: now,
      updatedAt: now,
    };
    employmentRecords = [record, ...employmentRecords];
    return { ...record };
  },
};

async function ensureStaffInScope(scope: TenantScopedQuery, staffId: string) {
  const staff = await staffService.getStaffById(scope, staffId);
  if (!staff) throw new ApiError(404, "Staff member could not be found in the current employment scope.");
}

function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId;
}
