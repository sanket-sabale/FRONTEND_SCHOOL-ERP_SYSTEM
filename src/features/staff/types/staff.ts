import type { TenantScopedQuery } from "@/lib/api/client";

export const staffCategories = [
  "teaching",
  "non_teaching",
  "administrative",
  "accounts_finance",
  "hr",
  "support",
  "transport",
  "other",
] as const;
export type StaffCategory = (typeof staffCategories)[number];

export const employmentTypes = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "visiting",
  "intern_trainee",
] as const;
export type EmploymentType = (typeof employmentTypes)[number];

export const staffStatuses = [
  "active",
  "on_leave",
  "suspended",
  "resigned",
  "terminated",
  "retired",
  "inactive",
] as const;
export type StaffStatus = (typeof staffStatuses)[number];

export const staffPreferredContactMethods = ["mobile", "official_email", "personal_email"] as const;
export type StaffPreferredContactMethod = (typeof staffPreferredContactMethods)[number];

export const emergencyContactRelationships = ["spouse", "parent", "sibling", "child", "relative", "friend", "other"] as const;
export type EmergencyContactRelationship = (typeof emergencyContactRelationships)[number];

export type StaffContactInfo = {
  mobileNumber?: string;
  alternatePhone?: string;
  personalEmail?: string;
  officialEmail?: string;
  preferredContactMethod?: StaffPreferredContactMethod;
};

export type StaffAddress = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  country?: string;
};

export type StaffEmergencyContact = {
  name?: string;
  relationship?: EmergencyContactRelationship;
  mobileNumber?: string;
  alternateNumber?: string;
  email?: string;
  address?: string;
  isPrimary?: boolean;
};

export type StaffTeachingInfo = {
  subjectAreas?: string[];
  academicDepartment?: string;
  teacherCode?: string;
  qualificationSummary?: string;
  experienceSummary?: string;
};

export type Staff = TenantScopedQuery & {
  id: string;
  employeeNumber: string;
  userId?: string | null;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  staffCategory: StaffCategory;
  employmentType: EmploymentType;
  status: StaffStatus;
  joiningDate: string;
  confirmationDate?: string;
  exitDate?: string;
  exitReason?: string;
  departmentId: string;
  designationId: string;
  reportingManagerId?: string;
  contact?: StaffContactInfo;
  currentAddress?: StaffAddress;
  permanentAddress?: StaffAddress;
  permanentAddressSameAsCurrent?: boolean;
  emergencyContacts?: StaffEmergencyContact[];
  teachingInfo?: StaffTeachingInfo;
  createdAt: string;
  updatedAt: string;
};

export type StaffDepartment = TenantScopedQuery & {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type StaffDesignation = TenantScopedQuery & {
  id: string;
  code: string;
  name: string;
  description?: string;
  staffCategory?: StaffCategory;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type StaffSummary = Pick<
  Staff,
  | "id"
  | "tenantId"
  | "schoolId"
  | "campusId"
  | "academicYearId"
  | "employeeNumber"
  | "displayName"
  | "staffCategory"
  | "employmentType"
  | "status"
  | "joiningDate"
  | "userId"
  | "contact"
  | "reportingManagerId"
> & {
  departmentName: string;
  designationName: string;
  reportingManagerName?: string;
};

export type StaffCreateInput = TenantScopedQuery & {
  employeeNumber: string;
  userId?: string | null;
  firstName: string;
  middleName?: string;
  lastName: string;
  staffCategory: StaffCategory;
  employmentType: EmploymentType;
  status?: StaffStatus;
  joiningDate: string;
  confirmationDate?: string;
  exitDate?: string;
  exitReason?: string;
  departmentId: string;
  designationId: string;
  reportingManagerId?: string;
  contact?: StaffContactInfo;
  currentAddress?: StaffAddress;
  permanentAddress?: StaffAddress;
  permanentAddressSameAsCurrent?: boolean;
  emergencyContacts?: StaffEmergencyContact[];
  teachingInfo?: StaffTeachingInfo;
};

export type StaffUpdateInput = Partial<
  Omit<StaffCreateInput, keyof TenantScopedQuery | "employeeNumber">
> & {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId?: string;
  employeeNumber?: string;
};

export type StaffStatusChangeInput = TenantScopedQuery & {
  staffId: string;
  status: StaffStatus;
  exitDate?: string;
  exitReason?: string;
};

export type StaffSortBy =
  | "displayName"
  | "employeeNumber"
  | "departmentName"
  | "designationName"
  | "joiningDate"
  | "status";
export type StaffSortDirection = "asc" | "desc";

export type StaffFilters = Partial<TenantScopedQuery> & {
  query?: string;
  staffCategory?: StaffCategory;
  employmentType?: EmploymentType;
  status?: StaffStatus;
  departmentId?: string;
  designationId?: string;
  joiningDateFrom?: string;
  joiningDateTo?: string;
  userLinked?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: StaffSortBy;
  sortDirection?: StaffSortDirection;
};

export type StaffListResponse = {
  items: StaffSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StaffDepartmentInput = TenantScopedQuery & {
  id?: string;
  code: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
};

export type StaffDesignationInput = TenantScopedQuery & {
  id?: string;
  code: string;
  name: string;
  description?: string;
  staffCategory?: StaffCategory;
  status?: "active" | "inactive";
};

export type StaffOrgEntityFilters = {
  query?: string;
  status?: "active" | "inactive";
};

export type StaffDepartmentSummary = StaffDepartment & {
  staffCount: number;
};

export type StaffDesignationSummary = StaffDesignation & {
  staffCount: number;
};

export type StaffProfile = Staff & {
  departmentName: string;
  designationName: string;
  reportingManagerName?: string;
};
