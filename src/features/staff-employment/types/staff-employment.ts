import type { TenantScopedQuery } from "@/lib/api/client";

export const staffEmploymentEventTypes = [
  "joining",
  "confirmation",
  "department_change",
  "designation_change",
  "employment_type_change",
  "transfer",
  "promotion",
  "suspension",
  "resignation",
  "termination",
  "retirement",
] as const;
export type StaffEmploymentEventType = (typeof staffEmploymentEventTypes)[number];

export const staffEmploymentRecordStatuses = ["active", "superseded", "archived"] as const;
export type StaffEmploymentRecordStatus = (typeof staffEmploymentRecordStatuses)[number];

export type StaffEmploymentRecord = TenantScopedQuery & {
  id: string;
  staffId: string;
  eventType: StaffEmploymentEventType;
  effectiveDate: string;
  title: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationName?: string;
  employmentType?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  workLocation?: string;
  probationEndDate?: string;
  noticePeriodDays?: number;
  reason?: string;
  status: StaffEmploymentRecordStatus;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffEmploymentRecordInput = TenantScopedQuery & {
  staffId: string;
  eventType: StaffEmploymentEventType;
  effectiveDate: string;
  title: string;
  description?: string;
  departmentId?: string;
  designationId?: string;
  employmentType?: string;
  reportingManagerId?: string;
  probationEndDate?: string;
  noticePeriodDays?: number;
  reason?: string;
  recordedBy?: string;
};
