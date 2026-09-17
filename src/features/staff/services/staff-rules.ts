import type {
  EmploymentType,
  Staff,
  StaffCategory,
  StaffDepartment,
  StaffDesignation,
  StaffStatus,
  EmergencyContactRelationship,
  StaffPreferredContactMethod,
} from "@/features/staff/types/staff";
import type { TenantScopedQuery } from "@/lib/api/client";

export const staffCategoryLabels: Record<StaffCategory, string> = {
  teaching: "Teaching",
  non_teaching: "Non-teaching",
  administrative: "Administrative",
  accounts_finance: "Accounts & Finance",
  hr: "HR",
  support: "Support",
  transport: "Transport",
  other: "Other",
};

export const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  temporary: "Temporary",
  visiting: "Visiting",
  intern_trainee: "Intern / Trainee",
};

export const staffStatusLabels: Record<StaffStatus, string> = {
  active: "Active",
  on_leave: "On leave",
  suspended: "Suspended",
  resigned: "Resigned",
  terminated: "Terminated",
  retired: "Retired",
  inactive: "Inactive",
};

export const staffPreferredContactMethodLabels: Record<StaffPreferredContactMethod, string> = {
  mobile: "Mobile",
  official_email: "Official email",
  personal_email: "Personal email",
};

export const emergencyContactRelationshipLabels: Record<EmergencyContactRelationship, string> = {
  spouse: "Spouse",
  parent: "Parent",
  sibling: "Sibling",
  child: "Child",
  relative: "Relative",
  friend: "Friend",
  other: "Other",
};

const statusTransitions: Record<StaffStatus, StaffStatus[]> = {
  active: ["on_leave", "suspended", "resigned", "terminated", "retired", "inactive"],
  on_leave: ["active", "resigned", "terminated", "retired", "inactive"],
  suspended: ["active", "terminated", "resigned", "inactive"],
  resigned: ["inactive"],
  terminated: ["inactive"],
  retired: ["inactive"],
  inactive: ["active"],
};

const terminalStatuses: StaffStatus[] = ["resigned", "terminated", "retired"];

type RuleResult = { valid: true } | { valid: false; message: string };

export function getStaffCategoryLabel(category: StaffCategory) {
  return staffCategoryLabels[category];
}

export function getEmploymentTypeLabel(employmentType: EmploymentType) {
  return employmentTypeLabels[employmentType];
}

export function getStaffStatusLabel(status: StaffStatus) {
  return staffStatusLabels[status];
}

export function getStaffPreferredContactMethodLabel(method?: StaffPreferredContactMethod) {
  return method ? staffPreferredContactMethodLabels[method] : "Not specified";
}

export function getEmergencyContactRelationshipLabel(relationship?: EmergencyContactRelationship) {
  return relationship ? emergencyContactRelationshipLabels[relationship] : "Not specified";
}

export function isTerminalStaffStatus(status: StaffStatus) {
  return terminalStatuses.includes(status);
}

export function validateStaffStatusTransition(currentStatus: StaffStatus, nextStatus: StaffStatus): RuleResult {
  if (currentStatus === nextStatus) return { valid: true };
  if (statusTransitions[currentStatus].includes(nextStatus)) return { valid: true };

  return {
    valid: false,
    message: `Staff status cannot change from ${getStaffStatusLabel(currentStatus)} to ${getStaffStatusLabel(nextStatus)}.`,
  };
}

export function getAllowedStaffStatusTransitions(currentStatus: StaffStatus) {
  return [...statusTransitions[currentStatus]];
}

export function validateStaffEmploymentDates({
  exitDate,
  exitReason,
  joiningDate,
  status,
}: {
  joiningDate: string;
  status: StaffStatus;
  exitDate?: string;
  exitReason?: string;
}): RuleResult {
  const joining = parseIsoDate(joiningDate);
  const exit = exitDate ? parseIsoDate(exitDate) : null;

  if (!joining) return { valid: false, message: "Joining date is invalid." };
  if (exitDate && !exit) return { valid: false, message: "Exit date is invalid." };
  if (exit && exit.getTime() < joining.getTime()) {
    return { valid: false, message: "Exit date cannot be before joining date." };
  }

  if ((status === "active" || status === "on_leave" || status === "suspended") && exitDate) {
    return { valid: false, message: "Active, on-leave, and suspended staff should not have an exit date." };
  }

  if (isTerminalStaffStatus(status)) {
    if (!exitDate) return { valid: false, message: "Exit date is required for resigned, terminated, and retired staff." };
    if (!exitReason?.trim()) return { valid: false, message: "Exit reason is required for resigned, terminated, and retired staff." };
  }

  if (status === "inactive" && exitDate && !exitReason?.trim()) {
    return { valid: false, message: "Exit reason is required when inactive staff has an exit date." };
  }

  return { valid: true };
}

export function validateDepartmentReference(
  scope: TenantScopedQuery,
  departmentId: string,
  departments: StaffDepartment[],
): RuleResult {
  const department = departments.find((item) => item.id === departmentId && isSameScope(item, scope));
  if (!department) return { valid: false, message: "Department could not be found in the current staff scope." };
  if (department.status !== "active") return { valid: false, message: "Inactive departments cannot receive staff assignments." };
  return { valid: true };
}

export function validateDesignationReference(
  scope: TenantScopedQuery,
  designationId: string,
  designations: StaffDesignation[],
): RuleResult {
  const designation = designations.find((item) => item.id === designationId && isSameScope(item, scope));
  if (!designation) return { valid: false, message: "Designation could not be found in the current staff scope." };
  if (designation.status !== "active") return { valid: false, message: "Inactive designations cannot receive staff assignments." };
  return { valid: true };
}

export function validateReportingManagerReference(
  scope: TenantScopedQuery,
  staffId: string,
  reportingManagerId: string | undefined,
  staffRecords: Staff[],
): RuleResult {
  if (!reportingManagerId) return { valid: true };
  if (staffId === reportingManagerId) return { valid: false, message: "Staff cannot report to themselves." };

  const manager = staffRecords.find((item) => item.id === reportingManagerId && isSameScope(item, scope));
  if (!manager) return { valid: false, message: "Reporting manager could not be found in the current staff scope." };
  if (["resigned", "terminated", "retired"].includes(manager.status)) {
    return { valid: false, message: "Exited staff cannot be selected as reporting manager." };
  }

  const visited = new Set<string>([staffId]);
  let nextManagerId: string | undefined = manager.reportingManagerId;
  while (nextManagerId) {
    if (visited.has(nextManagerId)) {
      return { valid: false, message: "Reporting manager relationship cannot create a circular hierarchy." };
    }
    visited.add(nextManagerId);
    nextManagerId = staffRecords.find((item) => item.id === nextManagerId && isSameScope(item, scope))?.reportingManagerId;
  }

  return { valid: true };
}

export function validateConfirmationDate({
  confirmationDate,
  joiningDate,
}: {
  confirmationDate?: string;
  joiningDate: string;
}): RuleResult {
  if (!confirmationDate) return { valid: true };
  const joining = parseIsoDate(joiningDate);
  const confirmation = parseIsoDate(confirmationDate);
  if (!joining || !confirmation) return { valid: false, message: "Confirmation date is invalid." };
  if (confirmation.getTime() < joining.getTime()) return { valid: false, message: "Confirmation date cannot be before joining date." };
  return { valid: true };
}

export function isSameScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return (
    record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId
  );
}

export function isSameTenant(record: Pick<TenantScopedQuery, "tenantId">, scope: Pick<TenantScopedQuery, "tenantId">) {
  return record.tenantId === scope.tenantId;
}

export function createStaffDisplayName(staff: Pick<Staff, "firstName" | "middleName" | "lastName">) {
  return [staff.firstName, staff.middleName, staff.lastName].filter(Boolean).join(" ");
}

function parseIsoDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}
