import type { GuardianStudentRelationshipType } from "@/features/guardians/types/guardian";
import type { StudentGender } from "@/features/students/types/student";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Permission } from "@/types/erp";

export type AdmissionScope = TenantScopedQuery & {
  admissionCycleId?: string;
};

export type AdmissionOperationContext = {
  userId: string;
  scope: AdmissionScope;
  permissions: Permission[];
};

export const admissionCycleStatuses = ["draft", "open", "paused", "closed", "archived"] as const;
export type AdmissionCycleStatus = (typeof admissionCycleStatuses)[number];

export const admissionApplicationStatuses = [
  "draft",
  "submitted",
  "under_review",
  "document_pending",
  "documents_verified",
  "shortlisted",
  "interview_scheduled",
  "approved",
  "waitlisted",
  "rejected",
  "fee_pending",
  "confirmed",
  "enrolled",
] as const;
export type AdmissionApplicationStatus = (typeof admissionApplicationStatuses)[number];

export const admissionSources = [
  "website",
  "walk_in",
  "referral",
  "existing_parent",
  "advertisement",
  "school_event",
  "other",
] as const;
export type AdmissionSource = (typeof admissionSources)[number];

export const admissionPriorities = ["normal", "high", "urgent"] as const;
export type AdmissionPriority = (typeof admissionPriorities)[number];

export const admissionDocumentTypes = [
  "birth_certificate",
  "identity_proof",
  "previous_school_certificate",
  "transfer_certificate",
  "address_proof",
  "admission_form",
  "medical_certificate",
  "guardian_identity_document",
  "other",
] as const;
export type AdmissionDocumentType = (typeof admissionDocumentTypes)[number];

export const admissionDocumentStatuses = [
  "required",
  "uploaded",
  "under_verification",
  "verified",
  "rejected",
] as const;
export type AdmissionDocumentStatus = (typeof admissionDocumentStatuses)[number];

export const admissionReviewDecisions = ["proceed", "hold", "request_information", "reject"] as const;
export type AdmissionReviewDecision = (typeof admissionReviewDecisions)[number];

export const admissionReviewStatuses = ["unassigned", "assigned", "in_progress", "completed", "returned"] as const;
export type AdmissionReviewStatus = (typeof admissionReviewStatuses)[number];

export const admissionEvaluationTypes = [
  "interview",
  "test",
  "assessment",
  "interaction",
  "practical_assessment",
  "academic_assessment",
  "custom",
] as const;
export type AdmissionEvaluationType = (typeof admissionEvaluationTypes)[number];

export const admissionEvaluationStatuses = ["not_scheduled", "planned", "scheduled", "in_progress", "completed", "cancelled", "no_show"] as const;
export type AdmissionEvaluationStatus = (typeof admissionEvaluationStatuses)[number];

export const admissionDecisionTypes = ["approved", "waitlisted", "rejected"] as const;
export type AdmissionDecisionType = (typeof admissionDecisionTypes)[number];

export const admissionEnrollmentStatuses = ["not_started", "ready", "pending", "confirmed", "enrolled", "blocked", "cancelled"] as const;
export type AdmissionEnrollmentStatus = (typeof admissionEnrollmentStatuses)[number];

export const admissionCommunicationEvents = [
  "application_submitted",
  "document_required",
  "document_rejected",
  "interview_scheduled",
  "review_assigned",
  "evaluation_scheduled",
  "shortlisted",
  "approved",
  "waitlisted",
  "rejected",
  "fee_assessment_created",
  "payment_pending",
  "payment_verified",
  "financial_clearance",
  "admission_confirmed",
  "confirmed",
  "enrolled",
] as const;
export type AdmissionCommunicationEvent = (typeof admissionCommunicationEvents)[number];

export type AdmissionFinancePaymentStatus = "not_started" | "invoice_pending" | "partially_paid" | "paid" | "failed" | "refunded";
export type AdmissionFinanceVerificationStatus = "not_required" | "pending" | "verified" | "rejected";
export type AdmissionFinancialClearanceStatus = "not_required" | "pending" | "cleared" | "blocked";

export type AdmissionFinanceSummary = TenantScopedQuery & {
  applicationId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  feeType?: "admission_fee";
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: "INR";
  paymentStatus: AdmissionFinancePaymentStatus;
  verificationStatus: AdmissionFinanceVerificationStatus;
  financialClearanceStatus: AdmissionFinancialClearanceStatus;
  dueDate?: string;
  clearedAt?: string;
  paymentHistory: AdmissionPaymentSummary[];
};

export type AdmissionPaymentSummary = {
  id: string;
  invoiceId: string;
  amount: number;
  method: "UPI" | "Card" | "Net Banking" | "Cash";
  status: "pending" | "successful" | "failed" | "refunded";
  verificationStatus: AdmissionFinanceVerificationStatus;
  paidAt: string;
  verifiedAt?: string;
};

export type ApplicantAddress = {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
};

export type AdmissionCycle = TenantScopedQuery & {
  id: string;
  name: string;
  code: string;
  status: AdmissionCycleStatus;
  startDate: string;
  endDate: string;
  applicationStartDate: string;
  applicationEndDate: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type Applicant = {
  id: string;
  tenantId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  dateOfBirth?: string;
  gender?: StudentGender;
  phone?: string;
  email?: string;
  address?: ApplicantAddress;
  previousSchool?: string;
  previousGrade?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionGuardianRelationship = {
  applicantId: string;
  guardianId: string;
  relationshipType: GuardianStudentRelationshipType;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  canReceiveCommunication: boolean;
  canPickup: boolean;
};

export type AdmissionApplication = TenantScopedQuery & {
  id: string;
  admissionCycleId: string;
  applicationNumber: string;
  applicantId: string;
  appliedClassId: string;
  appliedSectionId?: string;
  status: AdmissionApplicationStatus;
  source: AdmissionSource;
  priority: AdmissionPriority;
  assignedReviewerId?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionApplicationSummary = AdmissionApplication & {
  applicantName: string;
  applicantPhone?: string;
  applicantEmail?: string;
  guardianNames: string[];
  appliedClassName?: string;
  appliedSectionName?: string;
  documentSummary: AdmissionDocumentSummary;
  latestReviewDecision?: AdmissionReviewDecision;
  evaluationStatus?: AdmissionEvaluationStatus;
  paymentStatus?: "not_required" | "not_started" | "invoice_pending" | "paid";
};

export type AdmissionApplicationFilters = Partial<AdmissionScope> & {
  query?: string;
  status?: AdmissionApplicationStatus;
  source?: AdmissionSource;
  assignedReviewerId?: string;
  classId?: string;
  sectionId?: string;
  documentStatus?: AdmissionDocumentCompletionStatus | AdmissionDocumentStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "applicationNumber" | "applicantName" | "status" | "submittedAt" | "createdAt";
  sortDirection?: "asc" | "desc";
};

export type AdmissionApplicationListResponse = {
  items: AdmissionApplicationSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdmissionDocument = TenantScopedQuery & {
  id: string;
  applicationId: string;
  documentType: AdmissionDocumentType;
  status: AdmissionDocumentStatus;
  required: boolean;
  uploadedAt?: string;
  uploadedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionDocumentSummary = {
  required: number;
  verified: number;
  pending: number;
  missing: number;
  rejected: number;
};

export type AdmissionDocumentCompletionStatus = "incomplete" | "pending_verification" | "complete";

export type AdmissionReview = {
  id: string;
  applicationId: string;
  tenantId?: string;
  schoolId?: string;
  campusId?: string;
  academicYearId?: string;
  admissionCycleId?: string;
  reviewerId: string;
  status?: AdmissionReviewStatus;
  decision: AdmissionReviewDecision;
  score?: number;
  remarks?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionEvaluation = {
  id: string;
  applicationId: string;
  tenantId?: string;
  schoolId?: string;
  campusId?: string;
  academicYearId?: string;
  admissionCycleId?: string;
  type: AdmissionEvaluationType;
  title?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  location?: string;
  mode?: "in_person" | "online" | "phone";
  evaluatorId?: string;
  evaluatorIds?: string[];
  maxScore?: number;
  score?: number;
  result?: "recommended" | "hold" | "not_recommended";
  remarks?: string;
  status: AdmissionEvaluationStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionDecision = {
  id: string;
  applicationId: string;
  tenantId?: string;
  schoolId?: string;
  campusId?: string;
  academicYearId?: string;
  admissionCycleId?: string;
  decision: AdmissionDecisionType;
  decidedBy: string;
  reasonCode?: "eligibility" | "documentation" | "evaluation" | "capacity" | "administrative" | "other";
  reason?: string;
  decidedAt: string;
  waitlistPosition?: number;
  exceptionId?: string;
};

export type AdmissionEnrollment = TenantScopedQuery & {
  id: string;
  applicationId: string;
  studentId?: string;
  admissionCycleId: string;
  academicYearId: string;
  classId: string;
  sectionId?: string;
  admissionNumber?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  enrolledAt?: string;
  enrolledBy?: string;
  status: AdmissionEnrollmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionSeatCapacity = TenantScopedQuery & {
  id: string;
  admissionCycleId: string;
  classId: string;
  sectionId?: string;
  capacity: number;
};

export type AdmissionSeatAvailability = AdmissionSeatCapacity & {
  approved: number;
  enrolled: number;
  reserved: number;
  available: number;
};

export type AdmissionAuditEvent = TenantScopedQuery & {
  id: string;
  applicationId?: string;
  actorId: string;
  action: string;
  previousStatus?: AdmissionApplicationStatus;
  newStatus?: AdmissionApplicationStatus;
  reason?: string;
  occurredAt: string;
};

export type AdmissionReviewer = TenantScopedQuery & {
  id: string;
  name: string;
  status: "active" | "inactive";
  permissions: Permission[];
};

export type AdmissionSummary = {
  totalApplications: number;
  pendingReview: number;
  documentsPending: number;
  interviewsScheduled: number;
  pendingApproval: number;
  approved: number;
  enrolled: number;
  seatsAvailable: number;
};

export type AdmissionApplicationDetail = AdmissionApplicationSummary & {
  applicant: Applicant;
  guardians: AdmissionGuardianRelationship[];
  documents: AdmissionDocument[];
  reviews: AdmissionReview[];
  evaluations: AdmissionEvaluation[];
  decisions: AdmissionDecision[];
  enrollment?: AdmissionEnrollment;
  auditEvents: AdmissionAuditEvent[];
  decisionReadiness: AdmissionDecisionReadiness;
};

export type AdmissionCreateApplicationInput = TenantScopedQuery & {
  admissionCycleId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: StudentGender;
  phone?: string;
  email?: string;
  address?: ApplicantAddress;
  previousSchool?: string;
  previousGrade?: string;
  appliedClassId: string;
  appliedSectionId?: string;
  source?: AdmissionSource;
  priority?: AdmissionPriority;
  guardians?: AdmissionGuardianRelationship[];
};

export type AdmissionUpdateApplicationInput = Partial<
  Omit<AdmissionCreateApplicationInput, keyof TenantScopedQuery | "admissionCycleId">
> & TenantScopedQuery & {
  id: string;
  admissionCycleId?: string;
  assignedReviewerId?: string;
};

export type AdmissionStatusTransitionInput = TenantScopedQuery & {
  applicationId: string;
  nextStatus: AdmissionApplicationStatus;
  actorId: string;
  reason?: string;
};

export type AdmissionDocumentQueueFilters = Partial<AdmissionScope> & {
  query?: string;
  status?: AdmissionDocumentStatus;
  documentType?: AdmissionDocumentType;
  classId?: string;
  sectionId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "applicantName" | "applicationNumber" | "documentType" | "status" | "updatedAt";
  sortDirection?: "asc" | "desc";
};

export type AdmissionDocumentQueueItem = AdmissionDocument & {
  applicantName: string;
  applicationNumber: string;
  appliedClassId: string;
  appliedClassName?: string;
  appliedSectionId?: string;
  appliedSectionName?: string;
  admissionCycleId: string;
  assignedReviewerId?: string;
};

export type AdmissionDocumentQueueResponse = {
  items: AdmissionDocumentQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdmissionDocumentUploadInput = TenantScopedQuery & {
  applicationId: string;
  documentId: string;
  actorId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type AdmissionDocumentVerificationInput = TenantScopedQuery & {
  applicationId: string;
  documentId: string;
  actorId: string;
  rejectionReason?: string;
};

export type AdmissionReviewQueueFilters = Partial<AdmissionScope> & {
  query?: string;
  view?: "all" | "my" | "unassigned" | "in_progress" | "completed";
  status?: AdmissionReviewStatus;
  reviewerId?: string;
  classId?: string;
  sectionId?: string;
  documentStatus?: AdmissionDocumentCompletionStatus | AdmissionDocumentStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "applicantName" | "applicationNumber" | "reviewStatus" | "submittedAt" | "updatedAt";
  sortDirection?: "asc" | "desc";
};

export type AdmissionReviewQueueItem = AdmissionApplicationSummary & {
  reviewStatus: AdmissionReviewStatus;
  reviewerId?: string;
  reviewerName?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  recommendation?: AdmissionReviewDecision;
};

export type AdmissionReviewQueueResponse = {
  items: AdmissionReviewQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdmissionEvaluationQueueFilters = Partial<AdmissionScope> & {
  query?: string;
  view?: "all" | "my" | "upcoming" | "today" | "completed" | "cancelled";
  type?: AdmissionEvaluationType;
  status?: AdmissionEvaluationStatus;
  evaluatorId?: string;
  classId?: string;
  sectionId?: string;
  result?: AdmissionEvaluation["result"];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "applicantName" | "applicationNumber" | "type" | "status" | "scheduledAt" | "updatedAt";
  sortDirection?: "asc" | "desc";
};

export type AdmissionEvaluationQueueItem = AdmissionEvaluation & {
  applicantName: string;
  applicationNumber: string;
  applicationStatus: AdmissionApplicationStatus;
  appliedClassId: string;
  appliedClassName?: string;
  appliedSectionId?: string;
  appliedSectionName?: string;
};

export type AdmissionEvaluationQueueResponse = {
  items: AdmissionEvaluationQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdmissionSeatFilters = Partial<AdmissionScope> & {
  classId?: string;
  sectionId?: string;
  page?: number;
  pageSize?: number;
};

export type AdmissionSeatAvailabilityDetail = AdmissionSeatAvailability & {
  pending: number;
  waitlisted: number;
  utilizationPercentage: number;
  className?: string;
  sectionName?: string;
};

export type AdmissionSeatAvailabilityResponse = {
  items: AdmissionSeatAvailabilityDetail[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdmissionDecisionReadinessCheck = {
  label: string;
  passed: boolean;
  message: string;
};

export type AdmissionDecisionReadiness = {
  eligible: boolean;
  checks: AdmissionDecisionReadinessCheck[];
  blockingReasons: string[];
  warnings: string[];
};

export type AdmissionEnrollmentReadiness = {
  eligible: boolean;
  checks: AdmissionDecisionReadinessCheck[];
  blockingReasons: string[];
  warnings: string[];
};

export type AdmissionCommunicationIntent = TenantScopedQuery & {
  id: string;
  applicationId: string;
  event: AdmissionCommunicationEvent;
  recipientGuardianIds: string[];
  channel: "communication_center";
  status: "queued" | "sent" | "failed";
  subject: string;
  message: string;
  conversationId?: string;
  messageId?: string;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
};

export type AdmissionReviewAssignmentInput = TenantScopedQuery & {
  applicationId: string;
  reviewerId?: string;
  actorId: string;
};

export type AdmissionReviewCompletionInput = TenantScopedQuery & {
  applicationId: string;
  reviewerId: string;
  decision: AdmissionReviewDecision;
  score?: number;
  remarks?: string;
  actorId: string;
};

export type AdmissionEvaluationInput = TenantScopedQuery & {
  applicationId: string;
  evaluationId?: string;
  type?: AdmissionEvaluationType;
  title?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  location?: string;
  mode?: AdmissionEvaluation["mode"];
  evaluatorId?: string;
  maxScore?: number;
  score?: number;
  result?: AdmissionEvaluation["result"];
  remarks?: string;
  actorId: string;
  reason?: string;
};

export type AdmissionDecisionInput = TenantScopedQuery & {
  applicationId: string;
  actorId: string;
  reason?: string;
  reasonCode?: AdmissionDecision["reasonCode"];
  waitlistPosition?: number;
};

export type AdmissionSeatCapacityInput = TenantScopedQuery & {
  id?: string;
  admissionCycleId: string;
  classId: string;
  sectionId?: string;
  capacity: number;
  actorId: string;
};

export type AdmissionFinanceMutationInput = TenantScopedQuery & {
  applicationId: string;
  actorId: string;
  amount?: number;
  paidAmount?: number;
  method?: AdmissionPaymentSummary["method"];
  dueDate?: string;
};

export type AdmissionEnrollmentInput = TenantScopedQuery & {
  applicationId: string;
  actorId: string;
  classId?: string;
  sectionId?: string;
};

export type AdmissionCommunicationInput = TenantScopedQuery & {
  applicationId: string;
  actorId: string;
  event: AdmissionCommunicationEvent;
  message?: string;
};
