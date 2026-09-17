import type { TenantScopedQuery } from "@/lib/api/client";
import type { StudentAcademicPlacementReadModel } from "@/features/student-placements/types/student-placement";

export const studentStatuses = [
  "active",
  "inactive",
  "pending",
  "graduated",
  "transferred",
  "withdrawn",
  "archived",
] as const;

export type StudentStatus = (typeof studentStatuses)[number];

export const studentLifecycleActions = [
  "activate",
  "deactivate",
  "graduate",
  "transfer",
  "withdraw",
  "archive",
  "restore",
] as const;

export type StudentLifecycleAction = (typeof studentLifecycleActions)[number];

export const studentLifecycleReasons = [
  "student_transferred",
  "student_withdrew",
  "duplicate_record",
  "completed_academic_lifecycle",
  "administrative_reason",
  "status_correction",
  "other",
] as const;

export type StudentLifecycleReason = (typeof studentLifecycleReasons)[number];

export type StudentLifecycleInput = TenantScopedQuery & {
  studentId: string;
  action: StudentLifecycleAction;
  reason?: StudentLifecycleReason;
  reasonNote?: string;
};

export type StudentLifecycleResult = {
  student: Student;
  previousStatus: StudentStatus;
  newStatus: StudentStatus;
  reason?: StudentLifecycleReason;
  reasonNote?: string;
  changedAt: string;
};

export const studentGenders = ["female", "male", "other", "not_specified"] as const;

export type StudentGender = (typeof studentGenders)[number];

export const guardianRelationshipTypes = [
  "father",
  "mother",
  "guardian",
  "grandparent",
  "sibling",
  "relative",
  "other",
] as const;

export type GuardianRelationshipType = (typeof guardianRelationshipTypes)[number];

export type GuardianRelationship = {
  guardianId: string;
  studentId: string;
  relationship: GuardianRelationshipType;
  isPrimary: boolean;
};

export type StudentGuardianSummary = GuardianRelationship & {
  name?: string;
};

export type StudentAcademicAssignment = {
  academicYearId: string;
  classId: string;
  className?: string;
  sectionId: string;
  sectionName?: string;
  rollNumber?: string;
};

export type StudentAcademicPlacementOption = {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
};

export type Student = TenantScopedQuery & {
  id: string;
  admissionNumber: string;
  studentCode?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender: StudentGender;
  status: StudentStatus;
  statusChangedAt?: string;
  lifecycleReason?: StudentLifecycleReason;
  lifecycleReasonNote?: string;
  academic: StudentAcademicAssignment;
  admissionDate: string;
  guardians: GuardianRelationship[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type StudentSummary = Pick<
  Student,
  | "id"
  | "tenantId"
  | "schoolId"
  | "campusId"
  | "academicYearId"
  | "admissionNumber"
  | "studentCode"
  | "displayName"
  | "avatarUrl"
  | "gender"
  | "status"
  | "admissionDate"
> & {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  rollNumber?: string;
  primaryGuardian?: {
    guardianId: string;
    name: string;
    relationship: GuardianRelationshipType;
  };
};

export type StudentCreateInput = TenantScopedQuery & {
  admissionNumber: string;
  studentCode?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  gender: StudentGender;
  status?: StudentStatus;
  academicYearId: string;
  classId: string;
  sectionId: string;
  rollNumber?: string;
  admissionDate: string;
  guardians?: Array<Omit<GuardianRelationship, "studentId">>;
};

export type StudentUpdateInput = Partial<
  Omit<
    StudentCreateInput,
    "tenantId" | "schoolId" | "campusId" | "academicYearId"
  >
> & {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId?: string;
};

export type StudentSortBy =
  | "displayName"
  | "admissionNumber"
  | "className"
  | "admissionDate"
  | "status";

export type SortDirection = "asc" | "desc";

export type StudentFilters = Partial<TenantScopedQuery> & {
  query?: string;
  classId?: string;
  sectionId?: string;
  status?: StudentStatus;
  page?: number;
  pageSize?: number;
  sortBy?: StudentSortBy;
  sortDirection?: SortDirection;
};

export type StudentListResponse = {
  items: StudentSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StudentProfile = Student & {
  guardianSummaries: StudentGuardianSummary[];
  currentPlacement?: StudentAcademicPlacementReadModel;
  placementHistory: StudentAcademicPlacementReadModel[];
};

export const studentDocumentCategories = [
  "identity",
  "admission",
  "academic",
  "medical",
  "guardian",
  "other",
] as const;

export type StudentDocumentCategory = (typeof studentDocumentCategories)[number];

export const studentDocumentTypes = [
  "identity_proof",
  "government_id",
  "birth_certificate",
  "previous_school_certificate",
  "transfer_certificate",
  "admission_form",
  "previous_academic_record",
  "mark_sheet",
  "report_card",
  "leaving_certificate",
  "medical_certificate",
  "medical_record",
  "guardian_identity_document",
  "other",
] as const;

export type StudentDocumentType = (typeof studentDocumentTypes)[number];

export const studentDocumentStatuses = ["active", "archived"] as const;

export type StudentDocumentStatus = (typeof studentDocumentStatuses)[number];

export const studentDocumentVerificationStatuses = [
  "pending",
  "verified",
  "rejected",
  "expired",
] as const;

export type StudentDocumentVerificationStatus = (typeof studentDocumentVerificationStatuses)[number];

export type StudentAttachmentKind = "image" | "pdf" | "word" | "excel" | "powerpoint" | "text" | "file";

export type StudentAttachmentReference = {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  kind: StudentAttachmentKind;
  reference: string;
  storageKey?: string;
};

export type StudentDocument = TenantScopedQuery & {
  id: string;
  studentId: string;
  documentType: StudentDocumentType;
  category: StudentDocumentCategory;
  title: string;
  description?: string;
  attachment?: StudentAttachmentReference;
  status: StudentDocumentStatus;
  verificationStatus: StudentDocumentVerificationStatus;
  uploadedAt?: string;
  uploadedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  expiresAt?: string;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type StudentDocumentRequirement = {
  documentType: StudentDocumentType;
  category: StudentDocumentCategory;
  title: string;
  description?: string;
  isRequired: boolean;
  allowExpiry?: boolean;
};

export type StudentDocumentCreateInput = TenantScopedQuery & {
  studentId: string;
  documentType: StudentDocumentType;
  title?: string;
  description?: string;
  attachment: Omit<StudentAttachmentReference, "attachmentId" | "kind" | "reference" | "storageKey">;
  expiresAt?: string;
};

export type StudentDocumentVerificationInput = TenantScopedQuery & {
  studentId: string;
  documentId: string;
  rejectionReason?: string;
};

export type StudentDocumentArchiveInput = TenantScopedQuery & {
  studentId: string;
  documentId: string;
  reason?: string;
};

export type StudentDocumentFilters = {
  status?: StudentDocumentStatus;
  verificationStatus?: StudentDocumentVerificationStatus;
  required?: boolean;
};

export type StudentDocumentListResponse = {
  documents: StudentDocument[];
  requirements: StudentDocumentRequirement[];
  requiredTotal: number;
  requiredComplete: number;
};
