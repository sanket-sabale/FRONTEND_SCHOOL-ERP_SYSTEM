import { tenantContext } from "@/lib/tenant-context";
import type {
  Applicant,
  AdmissionApplication,
  AdmissionAuditEvent,
  AdmissionCycle,
  AdmissionDecision,
  AdmissionDocument,
  AdmissionEnrollment,
  AdmissionEvaluation,
  AdmissionGuardianRelationship,
  AdmissionReview,
  AdmissionSeatCapacity,
} from "@/features/admissions/types/admission";

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const otherScope = {
  tenantId: "tenant-other",
  schoolId: "school-other",
  campusId: "campus-other",
  academicYearId: "ay-2026-27",
};

const otherCampusScope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: "campus-baner",
  academicYearId: tenantContext.academicYearId,
};

export const mockAdmissionCycles: AdmissionCycle[] = [
  {
    ...scope,
    id: "cycle-2026-27-main",
    name: "Main Intake 2026-27",
    code: "ADM-2026-MAIN",
    status: "open",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    applicationStartDate: "2026-09-01",
    applicationEndDate: "2026-12-15",
    description: "Primary admission cycle for nursery through Grade 10.",
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-09-03T08:30:00+05:30",
  },
  {
    ...scope,
    id: "cycle-2026-27-lateral",
    name: "Lateral Transfers 2026-27",
    code: "ADM-2026-LAT",
    status: "paused",
    startDate: "2026-06-01",
    endDate: "2027-03-31",
    applicationStartDate: "2026-09-15",
    applicationEndDate: "2026-11-30",
    createdAt: "2026-08-05T09:00:00+05:30",
    updatedAt: "2026-09-02T17:30:00+05:30",
  },
  {
    ...otherScope,
    id: "cycle-other",
    name: "Other School Intake",
    code: "OTHER-2026",
    status: "open",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    applicationStartDate: "2026-09-01",
    applicationEndDate: "2026-12-15",
    createdAt: "2026-08-01T09:00:00+05:30",
    updatedAt: "2026-09-03T08:30:00+05:30",
  },
];

export const mockApplicants: Applicant[] = [
  {
    id: "applicant-001",
    tenantId: scope.tenantId,
    firstName: "Riya",
    lastName: "Sharma",
    displayName: "Riya Sharma",
    dateOfBirth: "2018-07-14",
    gender: "female",
    phone: "+91 98765 11001",
    email: "parent.riya@example.com",
    address: { city: "Pune", state: "Maharashtra", country: "India" },
    previousSchool: "Little Oaks Preschool",
    previousGrade: "UKG",
    createdAt: "2026-09-01T10:10:00+05:30",
    updatedAt: "2026-09-03T08:10:00+05:30",
  },
  {
    id: "applicant-002",
    tenantId: scope.tenantId,
    firstName: "Kabir",
    lastName: "Mehta",
    displayName: "Kabir Mehta",
    dateOfBirth: "2016-02-21",
    gender: "male",
    phone: "+91 98765 11002",
    email: "parent.kabir@example.com",
    address: { city: "Pune", state: "Maharashtra", country: "India" },
    previousSchool: "Bright Steps School",
    previousGrade: "Grade 2",
    createdAt: "2026-09-01T11:20:00+05:30",
    updatedAt: "2026-09-03T08:20:00+05:30",
  },
  {
    id: "applicant-003",
    tenantId: otherScope.tenantId,
    firstName: "Other",
    lastName: "Applicant",
    displayName: "Other Applicant",
    createdAt: "2026-09-01T11:20:00+05:30",
    updatedAt: "2026-09-03T08:20:00+05:30",
  },
  applicant("applicant-004", scope.tenantId, "Aanya", "Rao", "2019-03-12", "female", "+91 98765 11004", "aanya.rao@example.com"),
  applicant("applicant-005", scope.tenantId, "Vivaan", "Joshi", "2017-10-08", "male", "+91 98765 11005", "vivaan.joshi@example.com"),
  applicant("applicant-006", scope.tenantId, "Sara", "Khan", "2016-05-26", "female", "+91 98765 11006", "sara.khan@example.com"),
  applicant("applicant-007", scope.tenantId, "Neil", "Bendre", "2015-08-18", "male", "+91 98765 11007", "neil.bendre@example.com"),
  applicant("applicant-008", scope.tenantId, "Tara", "Menon", "2018-01-04", "female", "+91 98765 11008", "tara.menon@example.com"),
  applicant("applicant-009", otherCampusScope.tenantId, "Campus", "Applicant", "2018-01-04", "not_specified", "+91 98765 11999", "campus.applicant@example.com"),
];

export const mockAdmissionApplications: AdmissionApplication[] = [
  {
    ...scope,
    id: "admission-app-001",
    admissionCycleId: "cycle-2026-27-main",
    applicationNumber: "ADM-2026-0001",
    applicantId: "applicant-001",
    appliedClassId: "class-grade-1",
    appliedSectionId: "section-grade-1-a",
    status: "under_review",
    source: "website",
    priority: "high",
    assignedReviewerId: "staff-admission-001",
    submittedAt: "2026-09-01T10:30:00+05:30",
    createdAt: "2026-09-01T10:10:00+05:30",
    updatedAt: "2026-09-03T08:45:00+05:30",
  },
  {
    ...scope,
    id: "admission-app-002",
    admissionCycleId: "cycle-2026-27-main",
    applicationNumber: "ADM-2026-0002",
    applicantId: "applicant-002",
    appliedClassId: "class-grade-3",
    status: "document_pending",
    source: "walk_in",
    priority: "normal",
    assignedReviewerId: "staff-admission-002",
    submittedAt: "2026-09-01T11:35:00+05:30",
    createdAt: "2026-09-01T11:20:00+05:30",
    updatedAt: "2026-09-02T15:30:00+05:30",
  },
  {
    ...otherScope,
    id: "admission-app-other",
    admissionCycleId: "cycle-other",
    applicationNumber: "OTHER-0001",
    applicantId: "applicant-003",
    appliedClassId: "class-other",
    status: "submitted",
    source: "website",
    priority: "normal",
    createdAt: "2026-09-01T11:20:00+05:30",
    updatedAt: "2026-09-02T15:30:00+05:30",
  },
  admissionApplication("admission-app-004", scope, "ADM-2026-0004", "applicant-004", "class-grade-1", "section-grade-1-a", "draft", "referral", "normal"),
  admissionApplication("admission-app-005", scope, "ADM-2026-0005", "applicant-005", "class-grade-2", "section-grade-2-a", "submitted", "school_event", "high", "staff-admission-001", "2026-09-02T09:15:00+05:30"),
  admissionApplication("admission-app-006", scope, "ADM-2026-0006", "applicant-006", "class-grade-3", undefined, "documents_verified", "existing_parent", "normal", "staff-admission-002", "2026-09-02T10:20:00+05:30"),
  admissionApplication("admission-app-007", scope, "ADM-2026-0007", "applicant-007", "class-grade-4", undefined, "shortlisted", "advertisement", "urgent", "staff-admission-001", "2026-09-02T11:25:00+05:30"),
  admissionApplication("admission-app-008", scope, "ADM-2026-0008", "applicant-008", "class-grade-1", "section-grade-1-a", "approved", "website", "normal", "staff-admission-002", "2026-09-02T12:30:00+05:30"),
  admissionApplication("admission-app-009", otherCampusScope, "ADM-BANER-0001", "applicant-009", "class-grade-1", undefined, "rejected", "website", "normal", "staff-admission-002", "2026-09-02T12:30:00+05:30"),
];

export const mockAdmissionGuardianRelationships: AdmissionGuardianRelationship[] = [
  {
    applicantId: "applicant-001",
    guardianId: "guardian-001",
    relationshipType: "father",
    isPrimary: true,
    isEmergencyContact: true,
    canReceiveCommunication: true,
    canPickup: true,
  },
  {
    applicantId: "applicant-002",
    guardianId: "guardian-002",
    relationshipType: "mother",
    isPrimary: true,
    isEmergencyContact: true,
    canReceiveCommunication: true,
    canPickup: true,
  },
];

export const mockAdmissionDocuments: AdmissionDocument[] = [
  {
    ...scope,
    id: "admission-doc-001",
    applicationId: "admission-app-001",
    documentType: "birth_certificate",
    status: "verified",
    required: true,
    uploadedAt: "2026-09-01T10:40:00+05:30",
    uploadedBy: "guardian-001",
    verifiedAt: "2026-09-02T09:30:00+05:30",
    verifiedBy: "staff-admission-001",
    version: 1,
    createdAt: "2026-09-01T10:40:00+05:30",
    updatedAt: "2026-09-02T09:30:00+05:30",
  },
  {
    ...scope,
    id: "admission-doc-002",
    applicationId: "admission-app-001",
    documentType: "address_proof",
    status: "under_verification",
    required: true,
    uploadedAt: "2026-09-01T10:45:00+05:30",
    uploadedBy: "guardian-001",
    version: 1,
    createdAt: "2026-09-01T10:45:00+05:30",
    updatedAt: "2026-09-03T08:00:00+05:30",
  },
  {
    ...scope,
    id: "admission-doc-003",
    applicationId: "admission-app-002",
    documentType: "transfer_certificate",
    status: "required",
    required: true,
    version: 1,
    createdAt: "2026-09-01T11:40:00+05:30",
    updatedAt: "2026-09-01T11:40:00+05:30",
  },
  admissionDocument("admission-doc-004", scope, "admission-app-004", "birth_certificate", "required", true),
  admissionDocument("admission-doc-005", scope, "admission-app-005", "birth_certificate", "uploaded", true),
  admissionDocument("admission-doc-006", scope, "admission-app-006", "birth_certificate", "verified", true),
  admissionDocument("admission-doc-007", scope, "admission-app-007", "birth_certificate", "verified", true),
  admissionDocument("admission-doc-008", scope, "admission-app-008", "birth_certificate", "verified", true),
  admissionDocument("admission-doc-009", scope, "admission-app-008", "address_proof", "verified", true),
  admissionDocument("admission-doc-010", otherCampusScope, "admission-app-009", "birth_certificate", "rejected", true),
];

export const mockAdmissionReviews: AdmissionReview[] = [
  {
    id: "admission-review-001",
    applicationId: "admission-app-001",
    reviewerId: "staff-admission-001",
    decision: "proceed",
    score: 82,
    remarks: "Documents are mostly complete. Address proof is in verification.",
    reviewedAt: "2026-09-03T08:45:00+05:30",
    createdAt: "2026-09-03T08:30:00+05:30",
    updatedAt: "2026-09-03T08:45:00+05:30",
  },
];

export const mockAdmissionEvaluations: AdmissionEvaluation[] = [
  {
    id: "admission-evaluation-001",
    applicationId: "admission-app-001",
    type: "interview",
    scheduledAt: "2026-09-05T10:00:00+05:30",
    location: "Admissions Office",
    mode: "in_person",
    evaluatorId: "staff-admission-001",
    status: "scheduled",
    createdAt: "2026-09-03T09:00:00+05:30",
    updatedAt: "2026-09-03T09:00:00+05:30",
  },
];

export const mockAdmissionDecisions: AdmissionDecision[] = [];

export const mockAdmissionEnrollments: AdmissionEnrollment[] = [];

export const mockAdmissionSeatCapacities: AdmissionSeatCapacity[] = [
  {
    ...scope,
    id: "admission-seat-001",
    admissionCycleId: "cycle-2026-27-main",
    classId: "class-grade-1",
    sectionId: "section-grade-1-a",
    capacity: 40,
  },
  {
    ...scope,
    id: "admission-seat-002",
    admissionCycleId: "cycle-2026-27-main",
    classId: "class-grade-3",
    capacity: 36,
  },
];

export const mockAdmissionAuditEvents: AdmissionAuditEvent[] = [
  {
    ...scope,
    id: "admission-audit-001",
    applicationId: "admission-app-001",
    actorId: "staff-admission-001",
    action: "status_changed",
    previousStatus: "submitted",
    newStatus: "under_review",
    occurredAt: "2026-09-02T09:15:00+05:30",
  },
];

function applicant(
  id: string,
  tenantId: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  gender: Applicant["gender"],
  phone: string,
  email: string,
): Applicant {
  return {
    id,
    tenantId,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    dateOfBirth,
    gender,
    phone,
    email,
    address: { city: "Pune", state: "Maharashtra", country: "India" },
    createdAt: "2026-09-02T09:00:00+05:30",
    updatedAt: "2026-09-03T08:00:00+05:30",
  };
}

function admissionApplication(
  id: string,
  applicationScope: typeof scope,
  applicationNumber: string,
  applicantId: string,
  appliedClassId: string,
  appliedSectionId: string | undefined,
  status: AdmissionApplication["status"],
  source: AdmissionApplication["source"],
  priority: AdmissionApplication["priority"],
  assignedReviewerId?: string,
  submittedAt?: string,
): AdmissionApplication {
  return {
    ...applicationScope,
    id,
    admissionCycleId: "cycle-2026-27-main",
    applicationNumber,
    applicantId,
    appliedClassId,
    appliedSectionId,
    status,
    source,
    priority,
    assignedReviewerId,
    submittedAt,
    createdAt: "2026-09-02T09:00:00+05:30",
    updatedAt: "2026-09-03T08:00:00+05:30",
  };
}

function admissionDocument(
  id: string,
  documentScope: typeof scope,
  applicationId: string,
  documentType: AdmissionDocument["documentType"],
  status: AdmissionDocument["status"],
  required: boolean,
): AdmissionDocument {
  const uploaded = status !== "required";
  const verified = status === "verified";
  return {
    ...documentScope,
    id,
    applicationId,
    documentType,
    status,
    required,
    uploadedAt: uploaded ? "2026-09-02T13:00:00+05:30" : undefined,
    uploadedBy: uploaded ? "guardian-upload" : undefined,
    verifiedAt: verified ? "2026-09-03T09:00:00+05:30" : undefined,
    verifiedBy: verified ? "staff-admission-001" : undefined,
    rejectionReason: status === "rejected" ? "Document is unclear. Please upload a readable copy." : undefined,
    version: 1,
    createdAt: "2026-09-02T12:00:00+05:30",
    updatedAt: "2026-09-03T08:00:00+05:30",
  };
}
