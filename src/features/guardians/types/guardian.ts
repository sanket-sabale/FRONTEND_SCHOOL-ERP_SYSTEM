import type { TenantScopedQuery } from "@/lib/api/client";
import type { StudentSummary } from "@/features/students/types/student";

export const guardianStatuses = ["active", "inactive", "archived"] as const;
export type GuardianStatus = (typeof guardianStatuses)[number];

export const guardianVerificationStatuses = ["unverified", "pending", "verified", "rejected"] as const;
export type GuardianVerificationStatus = (typeof guardianVerificationStatuses)[number];

export const guardianRelationshipTypes = [
  "father",
  "mother",
  "stepfather",
  "stepmother",
  "grandfather",
  "grandmother",
  "brother",
  "sister",
  "legalGuardian",
  "fosterGuardian",
  "relative",
  "emergencyContact",
  "other",
] as const;
export type GuardianStudentRelationshipType = (typeof guardianRelationshipTypes)[number];

export const guardianCustodyStatuses = ["not_specified", "joint", "primary", "restricted", "none"] as const;
export type GuardianCustodyStatus = (typeof guardianCustodyStatuses)[number];

export type GuardianAddress = {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
};

export type Guardian = TenantScopedQuery & GuardianAddress & {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  occupation?: string;
  employer?: string;
  email?: string;
  primaryPhone: string;
  alternatePhone?: string;
  preferredLanguage?: string;
  status: GuardianStatus;
  verificationStatus: GuardianVerificationStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type GuardianCreateInput = TenantScopedQuery & {
  firstName: string;
  middleName?: string;
  lastName: string;
  occupation?: string;
  employer?: string;
  email?: string;
  primaryPhone: string;
  alternatePhone?: string;
  preferredLanguage?: string;
} & GuardianAddress;

export type GuardianUpdateInput = Partial<Omit<GuardianCreateInput, keyof TenantScopedQuery>> & TenantScopedQuery & {
  id: string;
  status?: GuardianStatus;
  verificationStatus?: GuardianVerificationStatus;
};

export type GuardianFilters = Partial<TenantScopedQuery> & {
  query?: string;
  status?: GuardianStatus;
  verificationStatus?: GuardianVerificationStatus;
  page?: number;
  pageSize?: number;
};

export type GuardianSummary = Pick<
  Guardian,
  "id" | "tenantId" | "schoolId" | "campusId" | "academicYearId" | "displayName" | "primaryPhone" | "email" | "status" | "verificationStatus"
> & {
  studentCount: number;
};

export type GuardianListResponse = {
  items: GuardianSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type GuardianStudentRelationship = TenantScopedQuery & {
  id: string;
  guardianId: string;
  studentId: string;
  relationshipType: GuardianStudentRelationshipType;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  canReceiveAcademicCommunication: boolean;
  canReceiveFeeCommunication: boolean;
  canReceiveAttendanceCommunication: boolean;
  canReceiveGeneralCommunication: boolean;
  custodyStatus: GuardianCustodyStatus;
  notes?: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type GuardianRelationshipInput = TenantScopedQuery & {
  guardianId: string;
  studentId: string;
  relationshipType: GuardianStudentRelationshipType;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  canPickup?: boolean;
  canReceiveAcademicCommunication?: boolean;
  canReceiveFeeCommunication?: boolean;
  canReceiveAttendanceCommunication?: boolean;
  canReceiveGeneralCommunication?: boolean;
  custodyStatus?: GuardianCustodyStatus;
  notes?: string;
  startDate?: string;
};

export type GuardianRelationshipUpdateInput = Partial<Omit<GuardianRelationshipInput, keyof TenantScopedQuery | "guardianId" | "studentId">> & TenantScopedQuery & {
  relationshipId: string;
};

export type StudentGuardianRecord = GuardianStudentRelationship & {
  guardian: Guardian;
};

export type GuardianStudentRecord = GuardianStudentRelationship & {
  student: StudentSummary;
};

export type GuardianProfile = Guardian & {
  students: GuardianStudentRecord[];
};
