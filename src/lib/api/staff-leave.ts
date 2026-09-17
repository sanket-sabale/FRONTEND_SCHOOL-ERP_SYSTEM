import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { staffLeaveFiltersSchema, staffLeaveRequestSchema, staffLeaveReviewSchema } from "@/features/staff-leave/schemas/staff-leave.schema";
import { mockStaffLeavePolicies, mockStaffLeaveRequests, mockStaffLeaveTypes } from "@/features/staff-leave/services/mock-staff-leave";
import {
  canTransitionLeaveStatus,
  validateLeaveDateRange,
  validateLeavePolicy,
} from "@/features/staff-leave/services/staff-leave-rules";
import type {
  StaffLeaveBalance,
  StaffLeaveFilters,
  StaffLeaveListResponse,
  StaffLeaveRequest,
  StaffLeaveRequestInput,
  StaffLeaveRequestSummary,
  StaffLeaveReviewInput,
} from "@/features/staff-leave/types/staff-leave";
import { staffAttendanceService } from "@/lib/api/staff-attendance";
import { staffService } from "@/lib/api/staff";

let leaveRequests = [...mockStaffLeaveRequests];
const leaveTypes = [...mockStaffLeaveTypes];
const leavePolicies = [...mockStaffLeavePolicies];

export const staffLeaveService = {
  async getLeaveTypes(scope: TenantScopedQuery) {
    return leaveTypes.filter((type) => isSameScope(type, scope)).map((type) => ({ ...type }));
  },

  async getLeavePolicies(scope: TenantScopedQuery) {
    return leavePolicies.filter((policy) => isSameScope(policy, scope)).map((policy) => ({ ...policy }));
  },

  async getLeaveBalances(scope: TenantScopedQuery, staffId?: string): Promise<StaffLeaveBalance[]> {
    const types = await this.getLeaveTypes(scope);
    const relevantRequests = leaveRequests.filter((request) => isSameScope(request, scope) && (!staffId || request.staffId === staffId));
    const staffIds = staffId ? [staffId] : Array.from(new Set(relevantRequests.map((request) => request.staffId)));
    return staffIds.flatMap((currentStaffId) => types.map((type) => {
      const policy = leavePolicies.find((item) => item.leaveTypeId === type.id && isSameScope(item, scope));
      const allocated = policy?.annualAllocation ?? 0;
      const used = relevantRequests.filter((request) => request.staffId === currentStaffId && request.leaveTypeId === type.id && request.status === "approved").reduce((sum, request) => sum + request.durationDays, 0);
      const pending = relevantRequests.filter((request) => request.staffId === currentStaffId && request.leaveTypeId === type.id && request.status === "pending_approval").reduce((sum, request) => sum + request.durationDays, 0);
      return {
        ...scope,
        staffId: currentStaffId,
        leaveTypeId: type.id,
        allocated,
        used,
        pending,
        available: Math.max(0, allocated - used - pending),
      };
    }));
  },

  async listRequests(scope: TenantScopedQuery, filters: StaffLeaveFilters = {}): Promise<StaffLeaveListResponse> {
    const parsed = staffLeaveFiltersSchema.parse(filters);
    const query = parsed.search?.toLowerCase().trim();
    const summaries = await toSummaries(scope, leaveRequests.filter((request) => isSameScope(request, scope)));
    const filtered = summaries
      .filter((request) => !parsed.staffId || request.staffId === parsed.staffId)
      .filter((request) => !parsed.leaveTypeId || request.leaveTypeId === parsed.leaveTypeId)
      .filter((request) => !parsed.departmentId || request.departmentId === parsed.departmentId)
      .filter((request) => !parsed.status || request.status === parsed.status)
      .filter((request) => !parsed.dateFrom || request.endDate >= parsed.dateFrom)
      .filter((request) => !parsed.dateTo || request.startDate <= parsed.dateTo)
      .filter((request) => !query || [request.staffName, request.employeeNumber, request.departmentName, request.leaveTypeName, request.reason].filter(Boolean).join(" ").toLowerCase().includes(query))
      .sort((first, second) => second.startDate.localeCompare(first.startDate));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));
    const start = (parsed.page - 1) * parsed.pageSize;
    return {
      items: filtered.slice(start, start + parsed.pageSize),
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages,
      pendingApproval: filtered.filter((request) => request.status === "pending_approval").length,
    };
  },

  async createRequest(input: StaffLeaveRequestInput) {
    const parsed = staffLeaveRequestSchema.parse(input);
    const staff = await staffService.getStaffById(parsed, parsed.staffId);
    if (!staff) throw new ApiError(404, "Staff member could not be found in the current leave scope.");
    if (["inactive", "resigned", "terminated", "retired"].includes(staff.status)) throw new ApiError(422, "Inactive or exited staff cannot submit new leave.");
    if (parsed.startDate < staff.joiningDate) throw new ApiError(422, "Leave cannot start before staff joining date.");
    if (staff.exitDate && parsed.endDate > staff.exitDate) throw new ApiError(422, "Leave cannot extend after staff exit date.");

    const dateRange = validateLeaveDateRange(parsed.startDate, parsed.endDate);
    if (!dateRange.valid) throw new ApiError(422, dateRange.message);
    const durationDays = dateRange.duration;
    const policy = leavePolicies.find((item) => item.leaveTypeId === parsed.leaveTypeId && isSameScope(item, parsed));
    if (!policy) throw new ApiError(404, "Leave policy could not be found in the current leave scope.");
    const policyResult = validateLeavePolicy(policy, durationDays, parsed.attachmentName);
    if (!policyResult.valid) throw new ApiError(422, policyResult.message);
    ensureNoOverlap(parsed, parsed.staffId, parsed.startDate, parsed.endDate);

    const balances = await this.getLeaveBalances(parsed, parsed.staffId);
    const balance = balances.find((item) => item.leaveTypeId === parsed.leaveTypeId);
    if (policy.annualAllocation > 0 && (!balance || balance.available < durationDays)) throw new ApiError(422, "Insufficient leave balance.");

    const conflict = detectAttendanceConflict(parsed, parsed.staffId, parsed.startDate, parsed.endDate);
    const now = new Date().toISOString();
    const request: StaffLeaveRequest = {
      ...parsed,
      id: `staff-leave-${parsed.staffId}-${parsed.startDate}-${Date.now()}`,
      durationDays,
      status: parsed.status,
      submittedAt: now,
      conflictStatus: conflict ? "requires_review" : "none",
      conflictReason: conflict,
      createdAt: now,
      updatedAt: now,
    };
    leaveRequests = [request, ...leaveRequests];
    return { ...request };
  },

  async reviewRequest(input: StaffLeaveReviewInput) {
    const parsed = staffLeaveReviewSchema.parse(input);
    const current = leaveRequests.find((request) => request.id === parsed.requestId && isSameScope(request, parsed));
    if (!current) throw new ApiError(404, "Leave request could not be found in the current leave scope.");
    if (!canTransitionLeaveStatus(current.status, parsed.action)) throw new ApiError(422, "This leave status transition is not allowed.");
    if (parsed.action === "reject" && !parsed.reviewerRemarks) throw new ApiError(422, "Rejecting leave requires reviewer remarks.");

    const nextStatus = parsed.action === "approve" ? "approved" : parsed.action === "reject" ? "rejected" : "cancelled";
    const next: StaffLeaveRequest = {
      ...current,
      status: nextStatus,
      reviewedBy: parsed.reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewerRemarks: parsed.reviewerRemarks,
      updatedAt: new Date().toISOString(),
    };
    leaveRequests = leaveRequests.map((request) => request.id === next.id ? next : request);
    return { ...next };
  },
};

async function toSummaries(scope: TenantScopedQuery, requests: StaffLeaveRequest[]) {
  const balances = await staffLeaveService.getLeaveBalances(scope);
  const summaries: StaffLeaveRequestSummary[] = [];
  for (const request of requests) {
    const staff = await staffService.getStaffById(scope, request.staffId);
    const leaveType = leaveTypes.find((type) => type.id === request.leaveTypeId && isSameScope(type, scope));
    if (!staff || !leaveType) continue;
    summaries.push({
      ...request,
      staffName: staff.displayName,
      employeeNumber: staff.employeeNumber,
      departmentId: staff.departmentId,
      departmentName: staff.departmentName,
      leaveTypeName: leaveType.name,
      availableBalance: balances.find((balance) => balance.staffId === request.staffId && balance.leaveTypeId === request.leaveTypeId)?.available ?? 0,
    });
  }
  return summaries;
}

function ensureNoOverlap(scope: TenantScopedQuery, staffId: string, startDate: string, endDate: string) {
  const overlap = leaveRequests.find((request) =>
    isSameScope(request, scope) &&
    request.staffId === staffId &&
    !["rejected", "cancelled"].includes(request.status) &&
    request.startDate <= endDate &&
    request.endDate >= startDate,
  );
  if (overlap) throw new ApiError(409, "Overlapping leave request already exists for this staff member.");
}

function detectAttendanceConflict(scope: TenantScopedQuery, staffId: string, startDate: string, endDate: string) {
  const conflict = staffAttendanceService.getRawRecords(scope).find((record) => record.staffId === staffId && record.attendanceDate >= startDate && record.attendanceDate <= endDate && record.status !== "leave");
  return conflict ? "Existing attendance evidence exists for one or more leave dates." : undefined;
}

function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId && record.academicYearId === scope.academicYearId;
}
