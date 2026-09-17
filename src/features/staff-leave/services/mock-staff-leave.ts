import { tenantContext } from "@/lib/tenant-context";
import type { StaffLeavePolicy, StaffLeaveRequest, StaffLeaveType } from "@/features/staff-leave/types/staff-leave";

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

export const mockStaffLeaveTypes: StaffLeaveType[] = [
  leaveType("leave-casual", "CL", "Casual Leave"),
  leaveType("leave-sick", "SL", "Sick Leave"),
  leaveType("leave-earned", "EL", "Earned Leave"),
  leaveType("leave-medical", "ML", "Medical Leave"),
  leaveType("leave-unpaid", "UL", "Unpaid Leave"),
];

export const mockStaffLeavePolicies: StaffLeavePolicy[] = [
  policy("leave-casual", 12, 2, false, 5),
  policy("leave-sick", 10, undefined, false, 7),
  policy("leave-earned", 18, 8, false, 10),
  policy("leave-medical", 20, undefined, true, 30),
  policy("leave-unpaid", 0, undefined, false, 45),
];

export const mockStaffLeaveRequests: StaffLeaveRequest[] = [
  request("staff-leave-001", "staff-005", "leave-casual", "2026-08-23", "2026-08-23", "Family work", "approved"),
  request("staff-leave-002", "staff-002", "leave-sick", "2026-08-24", "2026-08-25", "Fever and rest advised", "pending_approval"),
  request("staff-leave-003", "staff-003", "leave-earned", "2026-08-20", "2026-08-21", "Personal travel", "rejected", undefined, "Insufficient notice"),
  request("staff-leave-004", "staff-001", "leave-casual", "2026-08-23", "2026-08-23", "Conflict sample", "pending_approval", undefined, undefined, "requires_review", "Existing attendance is already marked for this date."),
];

function leaveType(id: string, code: string, name: string): StaffLeaveType {
  return { ...scope, id, code, name, status: "active" };
}

function policy(leaveTypeId: string, allocation: number, carryForwardLimit?: number, attachmentRequired = false, maximumConsecutiveDays?: number): StaffLeavePolicy {
  return {
    ...scope,
    id: `policy-${leaveTypeId}`,
    leaveTypeId,
    annualAllocation: allocation,
    carryForwardAllowed: Boolean(carryForwardLimit),
    carryForwardLimit,
    approvalRequired: true,
    attachmentRequired,
    minimumNoticeDays: 0,
    maximumConsecutiveDays,
  };
}

function request(
  id: string,
  staffId: string,
  leaveTypeId: string,
  startDate: string,
  endDate: string,
  reason: string,
  status: StaffLeaveRequest["status"],
  attachmentName?: string,
  reviewerRemarks?: string,
  conflictStatus: StaffLeaveRequest["conflictStatus"] = "none",
  conflictReason?: string,
): StaffLeaveRequest {
  const createdAt = `${startDate}T09:00:00+05:30`;
  const durationDays = calculateDuration(startDate, endDate);
  return {
    ...scope,
    id,
    staffId,
    leaveTypeId,
    startDate,
    endDate,
    durationDays,
    reason,
    attachmentName,
    status,
    submittedAt: createdAt,
    reviewedBy: status === "approved" || status === "rejected" ? "current-user" : undefined,
    reviewedAt: status === "approved" || status === "rejected" ? createdAt : undefined,
    reviewerRemarks,
    conflictStatus,
    conflictReason,
    createdAt,
    updatedAt: createdAt,
  };
}

function calculateDuration(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00+05:30`);
  const end = new Date(`${endDate}T00:00:00+05:30`);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}
