import type { TenantScopedQuery } from "@/lib/api/client";

export const staffLeaveStatuses = ["draft", "submitted", "pending_approval", "approved", "rejected", "cancelled"] as const;
export type StaffLeaveStatus = (typeof staffLeaveStatuses)[number];

export type StaffLeaveType = TenantScopedQuery & {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
};

export type StaffLeavePolicy = TenantScopedQuery & {
  id: string;
  leaveTypeId: string;
  annualAllocation: number;
  carryForwardAllowed: boolean;
  carryForwardLimit?: number;
  approvalRequired: boolean;
  attachmentRequired: boolean;
  minimumNoticeDays?: number;
  maximumConsecutiveDays?: number;
};

export type StaffLeaveBalance = TenantScopedQuery & {
  staffId: string;
  leaveTypeId: string;
  allocated: number;
  used: number;
  pending: number;
  available: number;
};

export type StaffLeaveRequest = TenantScopedQuery & {
  id: string;
  staffId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string;
  attachmentName?: string;
  status: StaffLeaveStatus;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerRemarks?: string;
  conflictStatus?: "none" | "requires_review";
  conflictReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffLeaveRequestSummary = StaffLeaveRequest & {
  staffName: string;
  employeeNumber: string;
  departmentId: string;
  departmentName: string;
  leaveTypeName: string;
  availableBalance: number;
};

export type StaffLeaveFilters = Partial<TenantScopedQuery> & {
  staffId?: string;
  leaveTypeId?: string;
  departmentId?: string;
  status?: StaffLeaveStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type StaffLeaveRequestInput = TenantScopedQuery & {
  staffId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentName?: string;
  status?: StaffLeaveStatus;
};

export type StaffLeaveReviewInput = TenantScopedQuery & {
  requestId: string;
  action: "approve" | "reject" | "cancel";
  reviewedBy: string;
  reviewerRemarks?: string;
};

export type StaffLeaveListResponse = {
  items: StaffLeaveRequestSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pendingApproval: number;
};
