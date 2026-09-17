import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { tenantContext } from "@/lib/tenant-context";
import {
  admissionApplicationFiltersSchema,
  admissionCommunicationInputSchema,
  admissionCreateApplicationSchema,
  admissionDecisionInputSchema,
  admissionDocumentQueueFiltersSchema,
  admissionDocumentUploadSchema,
  admissionDocumentVerificationSchema,
  admissionEnrollmentInputSchema,
  admissionEvaluationInputSchema,
  admissionEvaluationQueueFiltersSchema,
  admissionReviewAssignmentSchema,
  admissionReviewCompletionSchema,
  admissionReviewQueueFiltersSchema,
  admissionScopeSchema,
  admissionSeatCapacityInputSchema,
  admissionSeatFiltersSchema,
  admissionStatusTransitionSchema,
  admissionUpdateApplicationSchema,
} from "@/features/admissions/schemas/admission.schema";
import { admissionCommunicationService } from "@/lib/api/admission-communication";
import { admissionFinanceService } from "@/lib/api/admission-finance";
import { studentService } from "@/lib/api/students";
import {
  mockAdmissionApplications,
  mockAdmissionAuditEvents,
  mockAdmissionCycles,
  mockAdmissionDecisions,
  mockAdmissionDocuments,
  mockAdmissionEnrollments,
  mockAdmissionEvaluations,
  mockAdmissionGuardianRelationships,
  mockAdmissionReviews,
  mockAdmissionSeatCapacities,
  mockApplicants,
} from "@/features/admissions/mock/mock-admissions";
import {
  deriveSeatAvailability,
  getAdmissionDecisionReadiness,
  getAdmissionDocumentCompletionStatus,
  isInAdmissionScope,
  summarizeAdmissionDocuments,
  validateAdmissionTransition,
  validateApplicationCycle,
  validateCycleForScope,
  validateScopeMatch,
} from "@/features/admissions/services/admission-rules";
import type {
  Applicant,
  AdmissionApplication,
  AdmissionApplicationDetail,
  AdmissionApplicationFilters,
  AdmissionApplicationListResponse,
  AdmissionApplicationSummary,
  AdmissionCommunicationInput,
  AdmissionCreateApplicationInput,
  AdmissionDocument,
  AdmissionDocumentQueueFilters,
  AdmissionDocumentQueueItem,
  AdmissionDocumentQueueResponse,
  AdmissionDocumentUploadInput,
  AdmissionDocumentVerificationInput,
  AdmissionEnrollment,
  AdmissionEnrollmentInput,
  AdmissionEnrollmentReadiness,
  AdmissionEvaluation,
  AdmissionEvaluationInput,
  AdmissionEvaluationQueueFilters,
  AdmissionEvaluationQueueItem,
  AdmissionEvaluationQueueResponse,
  AdmissionReviewer,
  AdmissionReviewAssignmentInput,
  AdmissionReviewCompletionInput,
  AdmissionReviewQueueFilters,
  AdmissionReviewQueueItem,
  AdmissionReviewQueueResponse,
  AdmissionDecision,
  AdmissionDecisionInput,
  AdmissionScope,
  AdmissionSeatAvailability,
  AdmissionSeatAvailabilityDetail,
  AdmissionSeatAvailabilityResponse,
  AdmissionSeatCapacity,
  AdmissionSeatCapacityInput,
  AdmissionSeatFilters,
  AdmissionStatusTransitionInput,
  AdmissionSummary,
  AdmissionUpdateApplicationInput,
} from "@/features/admissions/types/admission";
import type { GuardianRelationshipType } from "@/features/students/types/student";
import type { Permission } from "@/types/erp";

const cycleRecords = [...mockAdmissionCycles];
let applicantRecords = [...mockApplicants];
let applicationRecords = [...mockAdmissionApplications];
let guardianRelationshipRecords = [...mockAdmissionGuardianRelationships];
let documentRecords = [...mockAdmissionDocuments];
let reviewRecords = [...mockAdmissionReviews];
let evaluationRecords = [...mockAdmissionEvaluations];
let decisionRecords = [...mockAdmissionDecisions];
let enrollmentRecords = [...mockAdmissionEnrollments];
let seatCapacityRecords = [...mockAdmissionSeatCapacities];
let auditRecords = [...mockAdmissionAuditEvents];

const admissionReviewerRecords: AdmissionReviewer[] = [
  {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
    id: "staff-admission-001",
    name: "Anjali Rao",
    status: "active",
    permissions: ["admission.review", "admission.schedule", "admission.shortlist", "admission.approve", "admission.waitlist", "admission.reject", "admission.manage_capacity"],
  },
  {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
    id: "staff-admission-002",
    name: "Rohan Deshmukh",
    status: "active",
    permissions: ["admission.review", "admission.schedule", "admission.shortlist", "admission.waitlist", "admission.reject"],
  },
  {
    tenantId: "tenant-other",
    schoolId: "school-other",
    campusId: "campus-other",
    academicYearId: "ay-2026-27",
    id: "staff-other-001",
    name: "Other Reviewer",
    status: "active",
    permissions: ["admission.review"],
  },
];

export const admissionService = {
  async getAdmissionCycles(scope: TenantScopedQuery) {
    const parsedScope = admissionScopeSchema.omit({ admissionCycleId: true }).parse(scope);
    return cycleRecords
      .filter((cycle) => validateScopeMatch(cycle, parsedScope).valid)
      .sort((first, second) => second.applicationStartDate.localeCompare(first.applicationStartDate));
  },

  async getApplications(
    scope: AdmissionScope,
    filters: AdmissionApplicationFilters = {},
  ): Promise<AdmissionApplicationListResponse> {
    const parsedScope = admissionScopeSchema.parse(scope);
    const parsedFilters = admissionApplicationFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;

    const filtered = applicationRecords
      .filter((application) => isInAdmissionScope(application, parsedScope))
      .filter((application) => !parsedFilters.status || application.status === parsedFilters.status)
      .filter((application) => !parsedFilters.source || application.source === parsedFilters.source)
      .filter((application) => !parsedFilters.assignedReviewerId || application.assignedReviewerId === parsedFilters.assignedReviewerId)
      .filter((application) => !parsedFilters.classId || application.appliedClassId === parsedFilters.classId)
      .filter((application) => !parsedFilters.sectionId || application.appliedSectionId === parsedFilters.sectionId)
      .filter((application) => isApplicationInDocumentFilter(application, parsedFilters.documentStatus))
      .filter((application) => isInDateRange(application.createdAt, parsedFilters.dateFrom, parsedFilters.dateTo))
      .map((application) => toApplicationSummary(application))
      .filter((summary) => {
        if (!query) return true;
        return [summary.applicationNumber, summary.applicantName, summary.applicantPhone, summary.applicantEmail, summary.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((first, second) => sortApplicationSummaries(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return { items: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages };
  },

  async getDocumentQueue(
    scope: AdmissionScope,
    filters: AdmissionDocumentQueueFilters = {},
  ): Promise<AdmissionDocumentQueueResponse> {
    const parsedScope = admissionScopeSchema.parse(scope);
    const parsedFilters = admissionDocumentQueueFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;

    const filtered = documentRecords
      .filter((document) => isInAdmissionScope(document, parsedScope))
      .map((document) => toDocumentQueueItem(document, parsedScope))
      .filter((item): item is AdmissionDocumentQueueItem => Boolean(item))
      .filter((item) => !parsedFilters.status || item.status === parsedFilters.status)
      .filter((item) => !parsedFilters.documentType || item.documentType === parsedFilters.documentType)
      .filter((item) => !parsedFilters.classId || item.appliedClassId === parsedFilters.classId)
      .filter((item) => !parsedFilters.sectionId || item.appliedSectionId === parsedFilters.sectionId)
      .filter((item) => isInDateRange(item.updatedAt, parsedFilters.dateFrom, parsedFilters.dateTo))
      .filter((item) => {
        if (!query) return true;
        return [item.applicationNumber, item.applicantName, item.documentType].join(" ").toLowerCase().includes(query);
      })
      .sort((first, second) => sortDocumentQueue(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return { items: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages };
  },

  async getApplication(scope: AdmissionScope, applicationId: string): Promise<AdmissionApplicationDetail | null> {
    const parsedScope = admissionScopeSchema.parse(scope);
    const application = applicationRecords.find((record) => record.id === applicationId && isInAdmissionScope(record, parsedScope));
    if (!application) return null;

    const documents = getApplicationDocuments(application.id, parsedScope);
    const reviews = getApplicationReviews(application.id, parsedScope);
    const evaluations = getApplicationEvaluations(application.id, parsedScope);
    const decisions = getApplicationDecisions(application.id, parsedScope);

    return {
      ...toApplicationSummary(application),
      applicant: getApplicantOrThrow(application.applicantId),
      guardians: guardianRelationshipRecords.filter((relationship) => relationship.applicantId === application.applicantId),
      documents,
      reviews,
      evaluations,
      decisions,
      enrollment: enrollmentRecords.find((enrollment) => enrollment.applicationId === application.id),
      auditEvents: auditRecords.filter((event) => event.applicationId === application.id && isInAdmissionScope(event, parsedScope)),
      decisionReadiness: getAdmissionDecisionReadiness({
        application,
        documents,
        reviews,
        evaluations,
        seatAvailable: getSeatAvailabilityForApplication(application, parsedScope),
      }),
    };
  },

  async getAdmissionSummary(scope: AdmissionScope): Promise<AdmissionSummary> {
    const parsedScope = admissionScopeSchema.parse(scope);
    const applications = applicationRecords.filter((application) => isInAdmissionScope(application, parsedScope));
    const seatAvailability = await this.getSeatAvailability(parsedScope);

    return {
      totalApplications: applications.length,
      pendingReview: applications.filter((application) => ["submitted", "under_review"].includes(application.status)).length,
      documentsPending: applications.filter((application) => application.status === "document_pending").length,
      interviewsScheduled: evaluationRecords.filter((evaluation) => evaluation.status === "scheduled" && applications.some((application) => application.id === evaluation.applicationId)).length,
      pendingApproval: applications.filter((application) => ["shortlisted", "waitlisted"].includes(application.status)).length,
      approved: applications.filter((application) => ["approved", "fee_pending", "confirmed", "enrolled"].includes(application.status)).length,
      enrolled: applications.filter((application) => application.status === "enrolled").length,
      seatsAvailable: seatAvailability.reduce((sum, seat) => sum + seat.available, 0),
    };
  },

  async getSeatAvailability(scope: AdmissionScope): Promise<AdmissionSeatAvailability[]> {
    const parsedScope = admissionScopeSchema.parse(scope);
    return seatCapacityRecords
      .filter((capacity) => isInAdmissionScope(capacity, parsedScope))
      .map((capacity) => {
        const applications = applicationRecords.filter(
          (application) =>
            isInAdmissionScope(application, parsedScope) &&
            application.admissionCycleId === capacity.admissionCycleId &&
            application.appliedClassId === capacity.classId &&
            (!capacity.sectionId || application.appliedSectionId === capacity.sectionId),
        );
        const counts = {
          approved: applications.filter((application) => ["approved", "fee_pending", "confirmed"].includes(application.status)).length,
          enrolled: applications.filter((application) => application.status === "enrolled").length,
          reserved: applications.filter((application) => application.status === "shortlisted").length,
        };
        return { ...capacity, ...counts, available: deriveSeatAvailability(capacity.capacity, counts) };
      });
  },

  async createApplication(input: AdmissionCreateApplicationInput) {
    const parsedInput = admissionCreateApplicationSchema.parse(input);
    const cycle = getCycleOrThrow(parsedInput, parsedInput.admissionCycleId);
    const cycleValidation = validateCycleForScope(cycle, parsedInput);
    if (!cycleValidation.valid) throw new ApiError(422, cycleValidation.message);
    if (cycle.status !== "open") throw new ApiError(422, "Applications can only be created in an open admission cycle.");

    const now = new Date().toISOString();
    const applicant: Applicant = {
      id: createApplicantId(),
      tenantId: parsedInput.tenantId,
      firstName: parsedInput.firstName,
      middleName: parsedInput.middleName,
      lastName: parsedInput.lastName,
      displayName: [parsedInput.firstName, parsedInput.middleName, parsedInput.lastName].filter(Boolean).join(" "),
      dateOfBirth: parsedInput.dateOfBirth,
      gender: parsedInput.gender,
      phone: parsedInput.phone,
      email: parsedInput.email,
      address: parsedInput.address,
      previousSchool: parsedInput.previousSchool,
      previousGrade: parsedInput.previousGrade,
      createdAt: now,
      updatedAt: now,
    };

    const application: AdmissionApplication = {
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.academicYearId,
      id: createApplicationId(),
      admissionCycleId: parsedInput.admissionCycleId,
      applicationNumber: createApplicationNumber(),
      applicantId: applicant.id,
      appliedClassId: parsedInput.appliedClassId,
      appliedSectionId: parsedInput.appliedSectionId,
      status: "draft",
      source: parsedInput.source,
      priority: parsedInput.priority,
      createdAt: now,
      updatedAt: now,
    };

    applicantRecords = [applicant, ...applicantRecords];
    applicationRecords = [application, ...applicationRecords];
    documentRecords = [...createDefaultDocumentsForApplication(application, now), ...documentRecords];
    guardianRelationshipRecords = [
      ...parsedInput.guardians.map((relationship) => ({ ...relationship, applicantId: applicant.id })),
      ...guardianRelationshipRecords,
    ];
    auditRecords = [
      {
        tenantId: application.tenantId,
        schoolId: application.schoolId,
        campusId: application.campusId,
        academicYearId: application.academicYearId,
        id: `admission-audit-${Date.now()}`,
        applicationId: application.id,
        actorId: "admissions-office",
        action: "application_created",
        occurredAt: now,
      },
      ...auditRecords,
    ];
    return toApplicationSummary(application);
  },

  async updateApplication(input: AdmissionUpdateApplicationInput) {
    const parsedInput = admissionUpdateApplicationSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.id);
    if (application.status !== "draft" && application.status !== "under_review") {
      throw new ApiError(422, "Only draft or under review admission applications can be edited in this phase.");
    }
    const cycle = getCycleOrThrow(parsedInput, parsedInput.admissionCycleId ?? application.admissionCycleId);
    const cycleValidation = validateApplicationCycle({ ...application, admissionCycleId: cycle.id }, cycle);
    if (!cycleValidation.valid) throw new ApiError(422, cycleValidation.message);

    const now = new Date().toISOString();
    const nextApplication: AdmissionApplication = {
      ...application,
      admissionCycleId: parsedInput.admissionCycleId ?? application.admissionCycleId,
      appliedClassId: parsedInput.appliedClassId ?? application.appliedClassId,
      appliedSectionId: parsedInput.appliedSectionId ?? application.appliedSectionId,
      source: parsedInput.source ?? application.source,
      priority: parsedInput.priority ?? application.priority,
      assignedReviewerId: parsedInput.assignedReviewerId ?? application.assignedReviewerId,
      updatedAt: now,
    };
    applicationRecords = applicationRecords.map((record) => (record.id === nextApplication.id ? nextApplication : record));

    const applicant = getApplicantOrThrow(application.applicantId);
    const nextApplicant: Applicant = {
      ...applicant,
      firstName: parsedInput.firstName ?? applicant.firstName,
      middleName: parsedInput.middleName ?? applicant.middleName,
      lastName: parsedInput.lastName ?? applicant.lastName,
      displayName: [parsedInput.firstName ?? applicant.firstName, parsedInput.middleName ?? applicant.middleName, parsedInput.lastName ?? applicant.lastName].filter(Boolean).join(" "),
      dateOfBirth: parsedInput.dateOfBirth ?? applicant.dateOfBirth,
      gender: parsedInput.gender ?? applicant.gender,
      phone: parsedInput.phone ?? applicant.phone,
      email: parsedInput.email ?? applicant.email,
      address: parsedInput.address ?? applicant.address,
      previousSchool: parsedInput.previousSchool ?? applicant.previousSchool,
      previousGrade: parsedInput.previousGrade ?? applicant.previousGrade,
      updatedAt: now,
    };
    applicantRecords = applicantRecords.map((record) => (record.id === nextApplicant.id ? nextApplicant : record));
    auditRecords = [
      {
        tenantId: nextApplication.tenantId,
        schoolId: nextApplication.schoolId,
        campusId: nextApplication.campusId,
        academicYearId: nextApplication.academicYearId,
        id: `admission-audit-${Date.now()}`,
        applicationId: nextApplication.id,
        actorId: "admissions-office",
        action: "application_updated",
        occurredAt: now,
      },
      ...auditRecords,
    ];

    return toApplicationSummary(nextApplication);
  },

  async submitApplication(input: Omit<AdmissionStatusTransitionInput, "nextStatus">) {
    const application = getApplicationOrThrow(input, input.applicationId);
    const applicant = getApplicantOrThrow(application.applicantId);
    if (!applicant.firstName || !applicant.lastName || !application.appliedClassId || !application.admissionCycleId) {
      throw new ApiError(422, "Application requires applicant name, admission cycle, and applied class before submission.");
    }
    return this.transitionApplicationStatus({ ...input, nextStatus: "submitted" });
  },

  async uploadDocument(input: AdmissionDocumentUploadInput) {
    const parsedInput = admissionDocumentUploadSchema.parse(input);
    const document = getDocumentOrThrow(parsedInput, parsedInput.applicationId, parsedInput.documentId);
    const now = new Date().toISOString();
    const next: AdmissionDocument = {
      ...document,
      status: "uploaded",
      uploadedAt: now,
      uploadedBy: parsedInput.actorId,
      verifiedAt: undefined,
      verifiedBy: undefined,
      rejectionReason: undefined,
      version: document.status === "rejected" ? document.version + 1 : document.version,
      updatedAt: now,
    };
    documentRecords = documentRecords.map((record) => (record.id === next.id ? next : record));
    auditDocument(parsedInput, document.status === "rejected" ? "document_reuploaded" : "document_uploaded");
    return next;
  },

  async startDocumentVerification(input: AdmissionDocumentVerificationInput) {
    const parsedInput = admissionDocumentVerificationSchema.parse(input);
    const document = getDocumentOrThrow(parsedInput, parsedInput.applicationId, parsedInput.documentId);
    if (document.status !== "uploaded") throw new ApiError(422, "Only uploaded documents can move under verification.");
    const now = new Date().toISOString();
    const next = { ...document, status: "under_verification" as const, updatedAt: now };
    documentRecords = documentRecords.map((record) => (record.id === next.id ? next : record));
    auditDocument(parsedInput, "document_verification_started");
    return next;
  },

  async verifyDocument(input: AdmissionDocumentVerificationInput) {
    const parsedInput = admissionDocumentVerificationSchema.parse(input);
    const document = getDocumentOrThrow(parsedInput, parsedInput.applicationId, parsedInput.documentId);
    if (document.status !== "uploaded" && document.status !== "under_verification") {
      throw new ApiError(422, "Only uploaded or under verification documents can be verified.");
    }
    const now = new Date().toISOString();
    const next = {
      ...document,
      status: "verified" as const,
      verifiedAt: now,
      verifiedBy: parsedInput.actorId,
      rejectionReason: undefined,
      updatedAt: now,
    };
    documentRecords = documentRecords.map((record) => (record.id === next.id ? next : record));
    auditDocument(parsedInput, "document_verified");
    return next;
  },

  async rejectDocument(input: AdmissionDocumentVerificationInput) {
    const parsedInput = admissionDocumentVerificationSchema.required({ rejectionReason: true }).parse(input);
    const document = getDocumentOrThrow(parsedInput, parsedInput.applicationId, parsedInput.documentId);
    if (document.status !== "uploaded" && document.status !== "under_verification") {
      throw new ApiError(422, "Only uploaded or under verification documents can be rejected.");
    }
    const now = new Date().toISOString();
    const next = {
      ...document,
      status: "rejected" as const,
      verifiedAt: undefined,
      verifiedBy: undefined,
      rejectionReason: parsedInput.rejectionReason,
      updatedAt: now,
    };
    documentRecords = documentRecords.map((record) => (record.id === next.id ? next : record));
    auditDocument(parsedInput, "document_rejected", parsedInput.rejectionReason);
    return next;
  },

  async getAdmissionReviewers(scope: AdmissionScope): Promise<AdmissionReviewer[]> {
    const parsedScope = admissionScopeSchema.parse(scope);
    return admissionReviewerRecords
      .filter((reviewer) => reviewer.status === "active" && isInAdmissionScope(reviewer, parsedScope))
      .sort((first, second) => first.name.localeCompare(second.name, "en-IN", { sensitivity: "base" }));
  },

  async getReviewQueue(scope: AdmissionScope, filters: AdmissionReviewQueueFilters = {}): Promise<AdmissionReviewQueueResponse> {
    const parsedScope = admissionScopeSchema.parse(scope);
    const parsedFilters = admissionReviewQueueFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;

    const filtered = applicationRecords
      .filter((application) => isInAdmissionScope(application, parsedScope))
      .filter((application) => application.status !== "draft")
      .map((application) => toReviewQueueItem(application, parsedScope))
      .filter((item) => !parsedFilters.status || item.reviewStatus === parsedFilters.status)
      .filter((item) => !parsedFilters.reviewerId || item.reviewerId === parsedFilters.reviewerId)
      .filter((item) => !parsedFilters.classId || item.appliedClassId === parsedFilters.classId)
      .filter((item) => !parsedFilters.sectionId || item.appliedSectionId === parsedFilters.sectionId)
      .filter((item) => isApplicationInDocumentFilter(item, parsedFilters.documentStatus))
      .filter((item) => isInDateRange(item.submittedAt ?? item.updatedAt, parsedFilters.dateFrom, parsedFilters.dateTo))
      .filter((item) => filterReviewView(item, parsedFilters.view, parsedFilters.reviewerId))
      .filter((item) => {
        if (!query) return true;
        return [item.applicationNumber, item.applicantName, item.reviewerName, item.reviewStatus].filter(Boolean).join(" ").toLowerCase().includes(query);
      })
      .sort((first, second) => sortReviewQueue(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages };
  },

  async assignReviewer(input: AdmissionReviewAssignmentInput) {
    const parsedInput = admissionReviewAssignmentSchema.required({ reviewerId: true }).parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    const reviewer = getReviewerOrThrow(parsedInput, parsedInput.reviewerId, "admission.review");
    if (["draft", "rejected", "approved", "fee_pending", "confirmed", "enrolled"].includes(application.status)) {
      throw new ApiError(422, "Reviewer can only be assigned to submitted or active admission applications.");
    }

    const now = new Date().toISOString();
    const existingReview = getLatestReview(application.id, parsedInput);
    const nextReview = {
      id: existingReview?.id ?? createReviewId(),
      applicationId: application.id,
      tenantId: application.tenantId,
      schoolId: application.schoolId,
      campusId: application.campusId,
      academicYearId: application.academicYearId,
      admissionCycleId: application.admissionCycleId,
      reviewerId: reviewer.id,
      status: "assigned" as const,
      decision: existingReview?.decision ?? "hold" as const,
      score: existingReview?.score,
      remarks: existingReview?.remarks,
      assignedAt: now,
      startedAt: existingReview?.startedAt,
      completedAt: existingReview?.completedAt,
      reviewedAt: existingReview?.reviewedAt,
      createdAt: existingReview?.createdAt ?? now,
      updatedAt: now,
    };
    reviewRecords = existingReview
      ? reviewRecords.map((record) => (record.id === existingReview.id ? nextReview : record))
      : [nextReview, ...reviewRecords];
    updateApplicationRecord({ ...application, assignedReviewerId: reviewer.id, updatedAt: now });
    auditApplication(parsedInput, "reviewer_assigned", undefined, undefined, `Assigned to ${reviewer.name}`);
    return nextReview;
  },

  async unassignReviewer(input: AdmissionReviewAssignmentInput) {
    const parsedInput = admissionReviewAssignmentSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    const now = new Date().toISOString();
    const existingReview = getLatestReview(application.id, parsedInput);
    if (existingReview) {
      reviewRecords = reviewRecords.map((record) => (
        record.id === existingReview.id
          ? { ...record, reviewerId: record.reviewerId, status: "unassigned", updatedAt: now }
          : record
      ));
    }
    updateApplicationRecord({ ...application, assignedReviewerId: undefined, updatedAt: now });
    auditApplication(parsedInput, "reviewer_unassigned");
    return toApplicationSummary({ ...application, assignedReviewerId: undefined, updatedAt: now });
  },

  async startReview(input: AdmissionReviewAssignmentInput) {
    const parsedInput = admissionReviewAssignmentSchema.required({ reviewerId: true }).parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    getReviewerOrThrow(parsedInput, parsedInput.reviewerId, "admission.review");
    const review = getLatestReview(application.id, parsedInput);
    if (!review || review.reviewerId !== parsedInput.reviewerId) throw new ApiError(422, "Assign the selected reviewer before starting review.");
    if (review.status === "completed") throw new ApiError(422, "Completed reviews cannot be restarted.");

    const now = new Date().toISOString();
    const nextReview = { ...review, status: "in_progress" as const, startedAt: review.startedAt ?? now, updatedAt: now };
    reviewRecords = reviewRecords.map((record) => (record.id === review.id ? nextReview : record));
    if (application.status === "submitted") setApplicationStatus(application, "under_review", parsedInput, "Review started");
    auditApplication(parsedInput, "review_started");
    return nextReview;
  },

  async completeReview(input: AdmissionReviewCompletionInput) {
    const parsedInput = admissionReviewCompletionSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    getReviewerOrThrow(parsedInput, parsedInput.reviewerId, "admission.review");
    const review = getLatestReview(application.id, parsedInput);
    if (!review || review.reviewerId !== parsedInput.reviewerId) throw new ApiError(422, "Only the assigned reviewer can complete this review.");

    const now = new Date().toISOString();
    const nextReview = {
      ...review,
      status: "completed" as const,
      decision: parsedInput.decision,
      score: parsedInput.score,
      remarks: parsedInput.remarks,
      completedAt: now,
      reviewedAt: now,
      updatedAt: now,
    };
    reviewRecords = reviewRecords.map((record) => (record.id === review.id ? nextReview : record));
    if (parsedInput.decision === "reject" && application.status !== "rejected") {
      setApplicationStatus(application, "rejected", parsedInput, parsedInput.remarks);
    } else if (application.status === "submitted") {
      setApplicationStatus(application, "under_review", parsedInput, "Review completed");
    }
    auditApplication(parsedInput, "review_completed", undefined, undefined, parsedInput.decision);
    return nextReview;
  },

  async getEvaluationQueue(scope: AdmissionScope, filters: AdmissionEvaluationQueueFilters = {}): Promise<AdmissionEvaluationQueueResponse> {
    const parsedScope = admissionScopeSchema.parse(scope);
    const parsedFilters = admissionEvaluationQueueFiltersSchema.parse(filters);
    const query = parsedFilters.query?.toLowerCase().trim();
    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;

    const filtered = evaluationRecords
      .map((evaluation) => toEvaluationQueueItem(evaluation, parsedScope))
      .filter((item): item is AdmissionEvaluationQueueItem => Boolean(item))
      .filter((item) => !parsedFilters.type || item.type === parsedFilters.type)
      .filter((item) => !parsedFilters.status || item.status === parsedFilters.status)
      .filter((item) => !parsedFilters.evaluatorId || item.evaluatorId === parsedFilters.evaluatorId)
      .filter((item) => !parsedFilters.classId || item.appliedClassId === parsedFilters.classId)
      .filter((item) => !parsedFilters.sectionId || item.appliedSectionId === parsedFilters.sectionId)
      .filter((item) => !parsedFilters.result || item.result === parsedFilters.result)
      .filter((item) => isInDateRange(item.scheduledAt ?? item.updatedAt, parsedFilters.dateFrom, parsedFilters.dateTo))
      .filter((item) => filterEvaluationView(item, parsedFilters.view, parsedFilters.evaluatorId))
      .filter((item) => {
        if (!query) return true;
        return [item.applicationNumber, item.applicantName, item.title, item.type, item.status].filter(Boolean).join(" ").toLowerCase().includes(query);
      })
      .sort((first, second) => sortEvaluationQueue(first, second, parsedFilters.sortBy, parsedFilters.sortDirection));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages };
  },

  async createEvaluation(input: AdmissionEvaluationInput) {
    const parsedInput = admissionEvaluationInputSchema.required({ type: true }).parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    if (parsedInput.evaluatorId) getReviewerOrThrow(parsedInput, parsedInput.evaluatorId, "admission.schedule");
    const now = new Date().toISOString();
    const evaluation: AdmissionEvaluation = {
      id: createEvaluationId(),
      applicationId: application.id,
      tenantId: application.tenantId,
      schoolId: application.schoolId,
      campusId: application.campusId,
      academicYearId: application.academicYearId,
      admissionCycleId: application.admissionCycleId,
      type: parsedInput.type,
      title: parsedInput.title ?? formatEvaluationType(parsedInput.type),
      scheduledAt: parsedInput.scheduledAt,
      durationMinutes: parsedInput.durationMinutes,
      location: parsedInput.location,
      mode: parsedInput.mode,
      evaluatorId: parsedInput.evaluatorId,
      evaluatorIds: parsedInput.evaluatorId ? [parsedInput.evaluatorId] : [],
      maxScore: parsedInput.maxScore ?? 100,
      status: parsedInput.scheduledAt ? "scheduled" : "planned",
      createdAt: now,
      updatedAt: now,
    };
    evaluationRecords = [evaluation, ...evaluationRecords];
    if (evaluation.status === "scheduled" && application.status === "shortlisted") setApplicationStatus(application, "interview_scheduled", parsedInput, "Evaluation scheduled");
    auditApplication(parsedInput, "evaluation_created", undefined, undefined, evaluation.title);
    return evaluation;
  },

  async scheduleEvaluation(input: AdmissionEvaluationInput) {
    const parsedInput = admissionEvaluationInputSchema.required({ evaluationId: true, scheduledAt: true }).parse(input);
    const evaluation = getEvaluationOrThrow(parsedInput, parsedInput.applicationId, parsedInput.evaluationId);
    if (parsedInput.evaluatorId) getReviewerOrThrow(parsedInput, parsedInput.evaluatorId, "admission.schedule");
    const now = new Date().toISOString();
    const next = {
      ...evaluation,
      scheduledAt: parsedInput.scheduledAt,
      durationMinutes: parsedInput.durationMinutes ?? evaluation.durationMinutes,
      location: parsedInput.location ?? evaluation.location,
      mode: parsedInput.mode ?? evaluation.mode,
      evaluatorId: parsedInput.evaluatorId ?? evaluation.evaluatorId,
      evaluatorIds: parsedInput.evaluatorId ? [parsedInput.evaluatorId] : evaluation.evaluatorIds,
      status: "scheduled" as const,
      updatedAt: now,
    };
    evaluationRecords = evaluationRecords.map((record) => (record.id === next.id ? next : record));
    auditApplication(parsedInput, "evaluation_scheduled", undefined, undefined, parsedInput.scheduledAt);
    return next;
  },

  async startEvaluation(input: AdmissionEvaluationInput) {
    const parsedInput = admissionEvaluationInputSchema.required({ evaluationId: true }).parse(input);
    const evaluation = getEvaluationOrThrow(parsedInput, parsedInput.applicationId, parsedInput.evaluationId);
    if (evaluation.status !== "scheduled") throw new ApiError(422, "Only scheduled evaluations can be started.");
    const now = new Date().toISOString();
    const next = { ...evaluation, status: "in_progress" as const, startedAt: now, updatedAt: now };
    evaluationRecords = evaluationRecords.map((record) => (record.id === next.id ? next : record));
    auditApplication(parsedInput, "evaluation_started");
    return next;
  },

  async recordEvaluationResult(input: AdmissionEvaluationInput) {
    const parsedInput = admissionEvaluationInputSchema.required({ evaluationId: true, result: true }).parse(input);
    const evaluation = getEvaluationOrThrow(parsedInput, parsedInput.applicationId, parsedInput.evaluationId);
    if (evaluation.status !== "scheduled" && evaluation.status !== "in_progress") throw new ApiError(422, "Only scheduled or in-progress evaluations can be completed.");
    const now = new Date().toISOString();
    const next = {
      ...evaluation,
      score: parsedInput.score,
      result: parsedInput.result,
      remarks: parsedInput.remarks,
      status: "completed" as const,
      completedAt: now,
      updatedAt: now,
    };
    evaluationRecords = evaluationRecords.map((record) => (record.id === next.id ? next : record));
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    if (application.status === "interview_scheduled") setApplicationStatus(application, "shortlisted", parsedInput, "Evaluation completed");
    auditApplication(parsedInput, "evaluation_completed", undefined, undefined, parsedInput.result);
    return next;
  },

  async cancelEvaluation(input: AdmissionEvaluationInput) {
    const parsedInput = admissionEvaluationInputSchema.required({ evaluationId: true, reason: true }).parse(input);
    const evaluation = getEvaluationOrThrow(parsedInput, parsedInput.applicationId, parsedInput.evaluationId);
    if (evaluation.status === "completed") throw new ApiError(422, "Completed evaluations cannot be cancelled.");
    const now = new Date().toISOString();
    const next = { ...evaluation, status: "cancelled" as const, remarks: parsedInput.reason, updatedAt: now };
    evaluationRecords = evaluationRecords.map((record) => (record.id === next.id ? next : record));
    auditApplication(parsedInput, "evaluation_cancelled", undefined, undefined, parsedInput.reason);
    return next;
  },

  async getDecisionReadiness(scope: AdmissionScope, applicationId: string) {
    const parsedScope = admissionScopeSchema.parse(scope);
    const application = getApplicationOrThrow(parsedScope, applicationId);
    return getDecisionReadinessForApplication(application, parsedScope);
  },

  async shortlistApplication(input: AdmissionDecisionInput) {
    const parsedInput = admissionDecisionInputSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    const readiness = getDecisionReadinessForApplication(application, parsedInput);
    if (!readiness.eligible) throw new ApiError(422, readiness.blockingReasons[0] ?? "Application is not ready for shortlisting.");
    const transitionApplication = application.status === "documents_verified"
      ? setApplicationStatus(application, "under_review", parsedInput, "Ready for shortlisting")
      : application;
    const summary = setApplicationStatus(transitionApplication, "shortlisted", parsedInput, parsedInput.reason);
    auditApplication(parsedInput, "application_shortlisted", application.status, "shortlisted", parsedInput.reason);
    return summary;
  },

  async approveApplication(input: AdmissionDecisionInput) {
    const parsedInput = admissionDecisionInputSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    if (application.status !== "shortlisted" && application.status !== "waitlisted") throw new ApiError(422, "Only shortlisted or waitlisted applications can be approved.");
    const readiness = getDecisionReadinessForApplication(application, parsedInput);
    if (!readiness.eligible) throw new ApiError(422, readiness.blockingReasons[0] ?? "Application is not ready for approval.");
    if (getSeatAvailabilityForApplication(application, parsedInput) <= 0) throw new ApiError(422, "No seat is available for this admission application.");
    const summary = setApplicationStatus(application, "approved", parsedInput, parsedInput.reason);
    recordDecision(application, parsedInput, "approved");
    return summary;
  },

  async waitlistApplication(input: AdmissionDecisionInput) {
    const parsedInput = admissionDecisionInputSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    if (application.status !== "shortlisted") throw new ApiError(422, "Only shortlisted applications can be waitlisted.");
    const summary = setApplicationStatus(application, "waitlisted", parsedInput, parsedInput.reason);
    recordDecision(application, parsedInput, "waitlisted");
    return summary;
  },

  async rejectApplication(input: AdmissionDecisionInput) {
    const parsedInput = admissionDecisionInputSchema.required({ reason: true }).parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    if (!["under_review", "shortlisted", "waitlisted"].includes(application.status)) {
      throw new ApiError(422, "Only reviewed, shortlisted, or waitlisted applications can be rejected in this phase.");
    }
    const summary = setApplicationStatus(application, "rejected", parsedInput, parsedInput.reason);
    recordDecision(application, parsedInput, "rejected");
    return summary;
  },

  async getSeatAvailabilityList(scope: AdmissionScope, filters: AdmissionSeatFilters = {}): Promise<AdmissionSeatAvailabilityResponse> {
    const parsedScope = admissionScopeSchema.parse(scope);
    const parsedFilters = admissionSeatFiltersSchema.parse(filters);
    const page = parsedFilters.page;
    const pageSize = parsedFilters.pageSize;
    const allSeats = await this.getSeatAvailability(parsedScope);
    const filtered = allSeats
      .filter((seat) => !parsedFilters.classId || seat.classId === parsedFilters.classId)
      .filter((seat) => !parsedFilters.sectionId || seat.sectionId === parsedFilters.sectionId)
      .map((seat) => toSeatDetail(seat, parsedScope))
      .sort((first, second) => `${first.className ?? first.classId}${first.sectionName ?? ""}`.localeCompare(`${second.className ?? second.classId}${second.sectionName ?? ""}`, "en-IN", { sensitivity: "base" }));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages };
  },

  async createSeatCapacity(input: AdmissionSeatCapacityInput) {
    const parsedInput = admissionSeatCapacityInputSchema.parse(input);
    getCycleOrThrow(parsedInput, parsedInput.admissionCycleId);
    if (seatCapacityRecords.some((seat) => isInAdmissionScope(seat, parsedInput) && seat.admissionCycleId === parsedInput.admissionCycleId && seat.classId === parsedInput.classId && seat.sectionId === parsedInput.sectionId)) {
      throw new ApiError(409, "Seat capacity already exists for this cycle, class, and section.");
    }
    const capacity: AdmissionSeatCapacity = {
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.academicYearId,
      id: createSeatCapacityId(),
      admissionCycleId: parsedInput.admissionCycleId,
      classId: parsedInput.classId,
      sectionId: parsedInput.sectionId,
      capacity: parsedInput.capacity,
    };
    seatCapacityRecords = [capacity, ...seatCapacityRecords];
    auditApplication(parsedInput, "seat_capacity_created", undefined, undefined, `${capacity.classId}: ${capacity.capacity}`);
    return toSeatDetail({ ...capacity, approved: 0, enrolled: 0, reserved: 0, available: capacity.capacity }, parsedInput);
  },

  async updateSeatCapacity(input: AdmissionSeatCapacityInput) {
    const parsedInput = admissionSeatCapacityInputSchema.required({ id: true }).parse(input);
    const existing = seatCapacityRecords.find((seat) => seat.id === parsedInput.id && isInAdmissionScope(seat, parsedInput));
    if (!existing) throw new ApiError(404, "Seat capacity could not be found in the current context.");
    const next = { ...existing, capacity: parsedInput.capacity };
    seatCapacityRecords = seatCapacityRecords.map((seat) => (seat.id === existing.id ? next : seat));
    auditApplication(parsedInput, "seat_capacity_updated", undefined, undefined, `${next.classId}: ${next.capacity}`);
    return toSeatDetail((await this.getSeatAvailability(parsedInput)).find((seat) => seat.id === next.id) ?? { ...next, approved: 0, enrolled: 0, reserved: 0, available: next.capacity }, parsedInput);
  },

  async getEnrollmentReadiness(scope: AdmissionScope, applicationId: string): Promise<AdmissionEnrollmentReadiness> {
    const parsedScope = admissionScopeSchema.parse(scope);
    const application = getApplicationOrThrow(parsedScope, applicationId);
    return getEnrollmentReadinessForApplication(application, parsedScope);
  },

  async getEnrollmentByApplication(scope: AdmissionScope, applicationId: string) {
    const parsedScope = admissionScopeSchema.parse(scope);
    getApplicationOrThrow(parsedScope, applicationId);
    return enrollmentRecords.find((enrollment) => enrollment.applicationId === applicationId && isInAdmissionScope(enrollment, parsedScope)) ?? null;
  },

  async confirmAdmission(input: AdmissionEnrollmentInput) {
    const parsedInput = admissionEnrollmentInputSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    const existingEnrollment = enrollmentRecords.find((enrollment) => enrollment.applicationId === application.id && isInAdmissionScope(enrollment, parsedInput));
    if (existingEnrollment) return existingEnrollment;

    const readiness = await getEnrollmentReadinessForApplication(application, parsedInput);
    if (!readiness.eligible) throw new ApiError(422, readiness.blockingReasons[0] ?? "Admission is not ready for confirmation.");
    const placement = await resolveEnrollmentPlacement(parsedInput, application, parsedInput.classId, parsedInput.sectionId);
    const now = new Date().toISOString();
    const confirmedApplication = application.status === "approved"
      ? setApplicationStatus(setApplicationStatus(application, "fee_pending", parsedInput, "Finance cleared"), "confirmed", parsedInput, "Admission confirmed")
      : setApplicationStatus(application, "confirmed", parsedInput, "Admission confirmed");
    const enrollment: AdmissionEnrollment = {
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.academicYearId,
      id: createEnrollmentId(),
      applicationId: confirmedApplication.id,
      admissionCycleId: confirmedApplication.admissionCycleId,
      classId: placement.classId,
      sectionId: placement.sectionId,
      admissionNumber: createAdmissionNumberForApplication(confirmedApplication),
      confirmedAt: now,
      confirmedBy: parsedInput.actorId,
      status: "confirmed",
      createdAt: now,
      updatedAt: now,
    };
    enrollmentRecords = [enrollment, ...enrollmentRecords];
    auditApplication(parsedInput, "admission_confirmed", "approved", "confirmed");
    return enrollment;
  },

  async completeEnrollment(input: AdmissionEnrollmentInput) {
    const parsedInput = admissionEnrollmentInputSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    const enrollment = enrollmentRecords.find((record) => record.applicationId === application.id && isInAdmissionScope(record, parsedInput));
    if (!enrollment) throw new ApiError(422, "Confirm admission before completing enrollment.");
    if (enrollment.status === "enrolled" && enrollment.studentId) return enrollment;
    if (application.status !== "confirmed") throw new ApiError(422, "Admission must be confirmed before enrollment can be completed.");

    const applicant = getApplicantOrThrow(application.applicantId);
    const student = await studentService.createStudent({
      tenantId: parsedInput.tenantId,
      schoolId: parsedInput.schoolId,
      campusId: parsedInput.campusId,
      academicYearId: parsedInput.academicYearId,
      admissionNumber: enrollment.admissionNumber ?? createAdmissionNumberForApplication(application),
      studentCode: `STU-${application.applicationNumber.replace(/[^0-9]/g, "").slice(-4).padStart(4, "0")}`,
      firstName: applicant.firstName,
      middleName: applicant.middleName,
      lastName: applicant.lastName,
      dateOfBirth: applicant.dateOfBirth,
      gender: applicant.gender ?? "not_specified",
      status: "active",
      classId: enrollment.classId,
      sectionId: enrollment.sectionId ?? "",
      admissionDate: new Date().toISOString().slice(0, 10),
      guardians: guardianRelationshipRecords
        .filter((relationship) => relationship.applicantId === applicant.id)
        .map((relationship) => ({
          guardianId: relationship.guardianId,
          relationship: toStudentGuardianRelationship(relationship.relationshipType),
          isPrimary: relationship.isPrimary,
        })),
    });
    const now = new Date().toISOString();
    const nextEnrollment = {
      ...enrollment,
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      enrolledAt: now,
      enrolledBy: parsedInput.actorId,
      status: "enrolled" as const,
      updatedAt: now,
    };
    enrollmentRecords = enrollmentRecords.map((record) => (record.id === enrollment.id ? nextEnrollment : record));
    setApplicationStatus(application, "enrolled", parsedInput, "Enrollment completed");
    auditApplication(parsedInput, "enrollment_completed", "confirmed", "enrolled", student.id);
    return nextEnrollment;
  },

  async sendAdmissionCommunication(input: AdmissionCommunicationInput) {
    const parsedInput = admissionCommunicationInputSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    const recipients = guardianRelationshipRecords
      .filter((relationship) => relationship.applicantId === application.applicantId && relationship.canReceiveCommunication)
      .map((relationship) => relationship.guardianId);
    const subject = formatCommunicationSubject(parsedInput.event, application);
    const intent = await admissionCommunicationService.createIntent({
      ...parsedInput,
      recipientGuardianIds: recipients,
      subject,
      message: parsedInput.message ?? formatCommunicationMessage(parsedInput.event, application),
    });
    const dispatched = await admissionCommunicationService.dispatchIntent(parsedInput, intent.id);
    auditApplication(parsedInput, "communication_sent", undefined, undefined, parsedInput.event);
    return dispatched;
  },

  async transitionApplicationStatus(input: AdmissionStatusTransitionInput) {
    const parsedInput = admissionStatusTransitionSchema.parse(input);
    const application = getApplicationOrThrow(parsedInput, parsedInput.applicationId);
    const transition = validateAdmissionTransition(application.status, parsedInput.nextStatus);
    if (!transition.valid) throw new ApiError(422, transition.message);

    const now = new Date().toISOString();
    const next: AdmissionApplication = {
      ...application,
      status: parsedInput.nextStatus,
      submittedAt: parsedInput.nextStatus === "submitted" ? now : application.submittedAt,
      updatedAt: now,
    };
    applicationRecords = applicationRecords.map((record) => (record.id === next.id ? next : record));
    auditRecords = [
      {
        tenantId: parsedInput.tenantId,
        schoolId: parsedInput.schoolId,
        campusId: parsedInput.campusId,
        academicYearId: parsedInput.academicYearId,
        id: `admission-audit-${Date.now()}`,
        applicationId: next.id,
        actorId: parsedInput.actorId,
        action: "status_changed",
        previousStatus: application.status,
        newStatus: next.status,
        reason: parsedInput.reason,
        occurredAt: now,
      },
      ...auditRecords,
    ];

    return toApplicationSummary(next);
  },
};

function toApplicationSummary(application: AdmissionApplication): AdmissionApplicationSummary {
  const applicant = getApplicantOrThrow(application.applicantId);
  const documents = getApplicationDocuments(application.id, application);
  const latestReview = reviewRecords
    .filter((review) => review.applicationId === application.id)
    .sort((first, second) => (second.reviewedAt ?? second.createdAt).localeCompare(first.reviewedAt ?? first.createdAt))[0];
  const latestEvaluation = evaluationRecords
    .filter((evaluation) => evaluation.applicationId === application.id)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))[0];

  return {
    ...application,
    applicantName: applicant.displayName,
    applicantPhone: applicant.phone,
    applicantEmail: applicant.email,
    guardianNames: guardianRelationshipRecords
      .filter((relationship) => relationship.applicantId === applicant.id)
      .map((relationship) => relationship.guardianId),
    appliedClassName: formatClassName(application.appliedClassId),
    appliedSectionName: application.appliedSectionId ? formatSectionName(application.appliedSectionId) : undefined,
    documentSummary: summarizeAdmissionDocuments(documents),
    latestReviewDecision: latestReview?.decision,
    evaluationStatus: latestEvaluation?.status ?? "not_scheduled",
    paymentStatus: ["fee_pending", "confirmed", "enrolled"].includes(application.status) ? "invoice_pending" : "not_started",
  };
}

function getApplicationDocuments(applicationId: string, scope: AdmissionScope) {
  return documentRecords.filter((document) => document.applicationId === applicationId && isInAdmissionScope(document, scope));
}

function toDocumentQueueItem(document: AdmissionDocument, scope: AdmissionScope): AdmissionDocumentQueueItem | null {
  const application = applicationRecords.find((record) => record.id === document.applicationId && isInAdmissionScope(record, scope));
  if (!application) return null;
  const applicant = getApplicantOrThrow(application.applicantId);

  return {
    ...document,
    applicantName: applicant.displayName,
    applicationNumber: application.applicationNumber,
    appliedClassId: application.appliedClassId,
    appliedClassName: formatClassName(application.appliedClassId),
    appliedSectionId: application.appliedSectionId,
    appliedSectionName: application.appliedSectionId ? formatSectionName(application.appliedSectionId) : undefined,
    admissionCycleId: application.admissionCycleId,
    assignedReviewerId: application.assignedReviewerId,
  };
}

function getApplicationReviews(applicationId: string, scope: AdmissionScope) {
  return reviewRecords.filter((review) => review.applicationId === applicationId && isOptionalScopedRecordInScope(review, scope));
}

function getApplicationEvaluations(applicationId: string, scope: AdmissionScope) {
  return evaluationRecords.filter((evaluation) => evaluation.applicationId === applicationId && isOptionalScopedRecordInScope(evaluation, scope));
}

function getApplicationDecisions(applicationId: string, scope: AdmissionScope) {
  return decisionRecords.filter((decision) => decision.applicationId === applicationId && isOptionalScopedRecordInScope(decision, scope));
}

function getLatestReview(applicationId: string, scope: AdmissionScope) {
  return getApplicationReviews(applicationId, scope)
    .sort((first, second) => (second.updatedAt ?? second.createdAt).localeCompare(first.updatedAt ?? first.createdAt))[0];
}

function toReviewQueueItem(application: AdmissionApplication, scope: AdmissionScope): AdmissionReviewQueueItem {
  const summary = toApplicationSummary(application);
  const review = getLatestReview(application.id, scope);
  const reviewer = review ? admissionReviewerRecords.find((record) => record.id === review.reviewerId && isInAdmissionScope(record, scope)) : undefined;
  const reviewStatus = review?.status ?? (application.assignedReviewerId ? "assigned" : "unassigned");
  return {
    ...summary,
    reviewStatus,
    reviewerId: review?.reviewerId ?? application.assignedReviewerId,
    reviewerName: reviewer?.name,
    assignedAt: review?.assignedAt,
    startedAt: review?.startedAt,
    completedAt: review?.completedAt ?? review?.reviewedAt,
    recommendation: review?.status === "completed" || review?.reviewedAt ? review.decision : undefined,
  };
}

function toEvaluationQueueItem(evaluation: AdmissionEvaluation, scope: AdmissionScope): AdmissionEvaluationQueueItem | null {
  const application = applicationRecords.find((record) => record.id === evaluation.applicationId && isInAdmissionScope(record, scope));
  if (!application) return null;
  const applicant = getApplicantOrThrow(application.applicantId);
  return {
    ...evaluation,
    applicantName: applicant.displayName,
    applicationNumber: application.applicationNumber,
    applicationStatus: application.status,
    appliedClassId: application.appliedClassId,
    appliedClassName: formatClassName(application.appliedClassId),
    appliedSectionId: application.appliedSectionId,
    appliedSectionName: application.appliedSectionId ? formatSectionName(application.appliedSectionId) : undefined,
  };
}

function getReviewerOrThrow(scope: AdmissionScope, reviewerId: string, permission: Permission) {
  const reviewer = admissionReviewerRecords.find((record) => record.id === reviewerId && isInAdmissionScope(record, scope));
  if (!reviewer || reviewer.status !== "active") throw new ApiError(404, "Admission reviewer could not be found in the current context.");
  if (!reviewer.permissions.includes(permission)) throw new ApiError(403, "Reviewer does not have permission for this admission operation.");
  return reviewer;
}

function getEvaluationOrThrow(scope: AdmissionScope, applicationId: string, evaluationId: string) {
  getApplicationOrThrow(scope, applicationId);
  const evaluation = evaluationRecords.find((record) => record.id === evaluationId && record.applicationId === applicationId && isOptionalScopedRecordInScope(record, scope));
  if (!evaluation) throw new ApiError(404, "Admission evaluation could not be found in the current context.");
  return evaluation;
}

function isOptionalScopedRecordInScope(record: Partial<TenantScopedQuery> & { admissionCycleId?: string }, scope: AdmissionScope) {
  if (!record.tenantId) return true;
  return (
    record.tenantId === scope.tenantId &&
    record.schoolId === scope.schoolId &&
    record.campusId === scope.campusId &&
    record.academicYearId === scope.academicYearId &&
    (!scope.admissionCycleId || record.admissionCycleId === scope.admissionCycleId)
  );
}

function getSeatAvailabilityForApplication(application: AdmissionApplication, scope: AdmissionScope) {
  const seats = seatCapacityRecords.filter((seat) => isInAdmissionScope(seat, scope) && seat.admissionCycleId === application.admissionCycleId && seat.classId === application.appliedClassId);
  const exactSeat = seats.find((seat) => seat.sectionId === application.appliedSectionId);
  const fallbackSeat = seats.find((seat) => !seat.sectionId);
  const capacity = exactSeat ?? fallbackSeat;
  if (!capacity) return 0;
  const matchingApplications = applicationRecords.filter(
    (record) =>
      isInAdmissionScope(record, scope) &&
      record.admissionCycleId === capacity.admissionCycleId &&
      record.appliedClassId === capacity.classId &&
      (!capacity.sectionId || record.appliedSectionId === capacity.sectionId),
  );
  return deriveSeatAvailability(capacity.capacity, {
    approved: matchingApplications.filter((record) => ["approved", "fee_pending", "confirmed"].includes(record.status)).length,
    enrolled: matchingApplications.filter((record) => record.status === "enrolled").length,
    reserved: matchingApplications.filter((record) => record.status === "shortlisted").length,
  });
}

function getDecisionReadinessForApplication(application: AdmissionApplication, scope: AdmissionScope) {
  return getAdmissionDecisionReadiness({
    application,
    documents: getApplicationDocuments(application.id, scope),
    reviews: getApplicationReviews(application.id, scope),
    evaluations: getApplicationEvaluations(application.id, scope),
    seatAvailable: getSeatAvailabilityForApplication(application, scope),
  });
}

async function getEnrollmentReadinessForApplication(application: AdmissionApplication, scope: AdmissionScope): Promise<AdmissionEnrollmentReadiness> {
  const decisionReadiness = getDecisionReadinessForApplication(application, scope);
  const finance = await admissionFinanceService.getApplicationFinancialSummary(scope, application.id);
  const seatAvailable = getSeatAvailabilityForApplication(application, scope);
  const hasConfirmedOrEnrolled = enrollmentRecords.some((enrollment) => enrollment.applicationId === application.id && ["confirmed", "enrolled"].includes(enrollment.status) && isInAdmissionScope(enrollment, scope));
  const checks = [
    {
      label: "Application approved",
      passed: application.status === "approved" || application.status === "fee_pending" || application.status === "confirmed",
      message: "Application must be approved before confirmation.",
    },
    ...decisionReadiness.checks.filter((check) => check.label !== "Application is in review workflow"),
    {
      label: "Financial clearance complete",
      passed: finance.financialClearanceStatus === "cleared",
      message: finance.financialClearanceStatus === "cleared" ? "Admission fee is financially cleared." : "Finance must verify full admission payment.",
    },
    {
      label: "Seat available",
      passed: seatAvailable > 0 || application.status === "confirmed",
      message: seatAvailable > 0 || application.status === "confirmed" ? "Seat is available for confirmation." : "No admission seat is available for this class or section.",
    },
    {
      label: "No duplicate enrollment",
      passed: !hasConfirmedOrEnrolled,
      message: hasConfirmedOrEnrolled ? "This application already has an active enrollment." : "No existing enrollment is active for this application.",
    },
  ];
  const blockingReasons = checks.filter((check) => !check.passed).map((check) => check.message);
  return {
    eligible: blockingReasons.length === 0,
    checks,
    blockingReasons,
    warnings: finance.dueDate && finance.financialClearanceStatus !== "cleared" ? [`Admission fee is due on ${finance.dueDate}.`] : [],
  };
}

async function resolveEnrollmentPlacement(scope: AdmissionScope, application: AdmissionApplication, classId?: string, sectionId?: string) {
  const placements = await studentService.getAcademicPlacements(scope);
  const selectedClassId = classId ?? application.appliedClassId;
  const selectedSectionId = sectionId ?? application.appliedSectionId ?? placements.find((placement) => placement.classId === selectedClassId)?.sectionId;
  const placement = placements.find((item) => item.classId === selectedClassId && item.sectionId === selectedSectionId);
  if (!placement) throw new ApiError(422, "Enrollment class and section must belong to the active school, campus, and academic year.");
  return placement;
}

function setApplicationStatus(
  application: AdmissionApplication,
  nextStatus: AdmissionApplication["status"],
  input: Pick<AdmissionStatusTransitionInput, "tenantId" | "schoolId" | "campusId" | "academicYearId" | "actorId">,
  reason?: string,
) {
  const transition = validateAdmissionTransition(application.status, nextStatus);
  if (!transition.valid) throw new ApiError(422, transition.message);
  const now = new Date().toISOString();
  const next: AdmissionApplication = {
    ...application,
    status: nextStatus,
    submittedAt: nextStatus === "submitted" ? now : application.submittedAt,
    updatedAt: now,
  };
  updateApplicationRecord(next);
  auditApplication(input, "status_changed", application.status, nextStatus, reason);
  return next;
}

function updateApplicationRecord(application: AdmissionApplication) {
  applicationRecords = applicationRecords.map((record) => (record.id === application.id ? application : record));
  return application;
}

function recordDecision(application: AdmissionApplication, input: AdmissionDecisionInput, decision: AdmissionDecision["decision"]) {
  const now = new Date().toISOString();
  const record: AdmissionDecision = {
    tenantId: input.tenantId,
    schoolId: input.schoolId,
    campusId: input.campusId,
    academicYearId: input.academicYearId,
    admissionCycleId: application.admissionCycleId,
    id: createDecisionId(),
    applicationId: application.id,
    decision,
    decidedBy: input.actorId,
    reasonCode: input.reasonCode,
    reason: input.reason,
    waitlistPosition: input.waitlistPosition,
    decidedAt: now,
  };
  decisionRecords = [record, ...decisionRecords];
  auditApplication(input, `application_${decision}`, application.status, decision, input.reason);
  return record;
}

function toSeatDetail(seat: AdmissionSeatAvailability, scope: AdmissionScope): AdmissionSeatAvailabilityDetail {
  const matchingApplications = applicationRecords.filter(
    (application) =>
      isInAdmissionScope(application, scope) &&
      application.admissionCycleId === seat.admissionCycleId &&
      application.appliedClassId === seat.classId &&
      (!seat.sectionId || application.appliedSectionId === seat.sectionId),
  );
  const utilizationPercentage = seat.capacity === 0 ? 0 : Math.round(((seat.approved + seat.enrolled + seat.reserved) / seat.capacity) * 100);
  return {
    ...seat,
    pending: matchingApplications.filter((application) => ["submitted", "under_review", "document_pending", "documents_verified"].includes(application.status)).length,
    waitlisted: matchingApplications.filter((application) => application.status === "waitlisted").length,
    utilizationPercentage,
    className: formatClassName(seat.classId),
    sectionName: seat.sectionId ? formatSectionName(seat.sectionId) : undefined,
  };
}

function getCycleOrThrow(scope: AdmissionScope, cycleId: string) {
  const cycle = cycleRecords.find((record) => record.id === cycleId && validateCycleForScope(record, scope).valid);
  if (!cycle) throw new ApiError(404, "Admission cycle could not be found in the current context.");
  return cycle;
}

function getApplicationOrThrow(scope: AdmissionScope, applicationId: string) {
  const application = applicationRecords.find((record) => record.id === applicationId && isInAdmissionScope(record, scope));
  if (!application) throw new ApiError(404, "Admission application could not be found in the current context.");
  return application;
}

function getDocumentOrThrow(scope: AdmissionScope, applicationId: string, documentId: string) {
  getApplicationOrThrow(scope, applicationId);
  const document = documentRecords.find((record) => record.id === documentId && record.applicationId === applicationId && isInAdmissionScope(record, scope));
  if (!document) throw new ApiError(404, "Admission document could not be found in the current context.");
  return document;
}

function getApplicantOrThrow(applicantId: string) {
  const applicant = applicantRecords.find((record) => record.id === applicantId);
  if (!applicant) throw new ApiError(404, "Admission applicant could not be found.");
  return applicant;
}

function sortApplicationSummaries(
  first: AdmissionApplicationSummary,
  second: AdmissionApplicationSummary,
  sortBy: NonNullable<AdmissionApplicationFilters["sortBy"]>,
  direction: NonNullable<AdmissionApplicationFilters["sortDirection"]>,
) {
  const multiplier = direction === "asc" ? 1 : -1;
  const firstValue = String(first[sortBy] ?? "");
  const secondValue = String(second[sortBy] ?? "");
  return firstValue.localeCompare(secondValue, "en-IN", { sensitivity: "base" }) * multiplier;
}

function sortDocumentQueue(
  first: AdmissionDocumentQueueItem,
  second: AdmissionDocumentQueueItem,
  sortBy: NonNullable<AdmissionDocumentQueueFilters["sortBy"]>,
  direction: NonNullable<AdmissionDocumentQueueFilters["sortDirection"]>,
) {
  const multiplier = direction === "asc" ? 1 : -1;
  const firstValue = String(first[sortBy] ?? "");
  const secondValue = String(second[sortBy] ?? "");
  return firstValue.localeCompare(secondValue, "en-IN", { sensitivity: "base" }) * multiplier;
}

function sortReviewQueue(
  first: AdmissionReviewQueueItem,
  second: AdmissionReviewQueueItem,
  sortBy: NonNullable<AdmissionReviewQueueFilters["sortBy"]>,
  direction: NonNullable<AdmissionReviewQueueFilters["sortDirection"]>,
) {
  const multiplier = direction === "asc" ? 1 : -1;
  const firstValue = sortBy === "reviewStatus" ? first.reviewStatus : String(first[sortBy] ?? "");
  const secondValue = sortBy === "reviewStatus" ? second.reviewStatus : String(second[sortBy] ?? "");
  return String(firstValue).localeCompare(String(secondValue), "en-IN", { sensitivity: "base" }) * multiplier;
}

function sortEvaluationQueue(
  first: AdmissionEvaluationQueueItem,
  second: AdmissionEvaluationQueueItem,
  sortBy: NonNullable<AdmissionEvaluationQueueFilters["sortBy"]>,
  direction: NonNullable<AdmissionEvaluationQueueFilters["sortDirection"]>,
) {
  const multiplier = direction === "asc" ? 1 : -1;
  const firstValue = String(first[sortBy] ?? "");
  const secondValue = String(second[sortBy] ?? "");
  return firstValue.localeCompare(secondValue, "en-IN", { sensitivity: "base" }) * multiplier;
}

function filterReviewView(item: AdmissionReviewQueueItem, view: NonNullable<AdmissionReviewQueueFilters["view"]>, reviewerId?: string) {
  if (view === "my") return reviewerId ? item.reviewerId === reviewerId : Boolean(item.reviewerId);
  if (view === "unassigned") return item.reviewStatus === "unassigned";
  if (view === "in_progress") return item.reviewStatus === "in_progress";
  if (view === "completed") return item.reviewStatus === "completed";
  return true;
}

function filterEvaluationView(item: AdmissionEvaluationQueueItem, view: NonNullable<AdmissionEvaluationQueueFilters["view"]>, evaluatorId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (view === "my") return evaluatorId ? item.evaluatorId === evaluatorId : Boolean(item.evaluatorId);
  if (view === "upcoming") return Boolean(item.scheduledAt && item.scheduledAt.slice(0, 10) >= today && ["planned", "scheduled"].includes(item.status));
  if (view === "today") return item.scheduledAt?.slice(0, 10) === today;
  if (view === "completed") return item.status === "completed";
  if (view === "cancelled") return item.status === "cancelled";
  return true;
}

function isApplicationInDocumentFilter(application: AdmissionApplication, documentStatus?: AdmissionApplicationFilters["documentStatus"]) {
  if (!documentStatus) return true;
  const documents = getApplicationDocuments(application.id, application);
  if (documentStatus === "incomplete" || documentStatus === "pending_verification" || documentStatus === "complete") {
    return getAdmissionDocumentCompletionStatus(documents) === documentStatus;
  }
  return documents.some((document) => document.status === documentStatus);
}

function isInDateRange(value: string | undefined, dateFrom?: string, dateTo?: string) {
  if (!value) return !dateFrom && !dateTo;
  const date = value.slice(0, 10);
  return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
}

function auditDocument(
  input: Pick<AdmissionDocumentVerificationInput, "tenantId" | "schoolId" | "campusId" | "academicYearId" | "applicationId" | "actorId">,
  action: string,
  reason?: string,
) {
  auditRecords = [
    {
      tenantId: input.tenantId,
      schoolId: input.schoolId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      id: `admission-audit-${Date.now()}`,
      applicationId: input.applicationId,
      actorId: input.actorId,
      action,
      reason,
      occurredAt: new Date().toISOString(),
    },
    ...auditRecords,
  ];
}

function auditApplication(
  input: Pick<AdmissionStatusTransitionInput, "tenantId" | "schoolId" | "campusId" | "academicYearId" | "actorId"> & { applicationId?: string },
  action: string,
  previousStatus?: AdmissionApplication["status"],
  newStatus?: AdmissionApplication["status"],
  reason?: string,
) {
  auditRecords = [
    {
      tenantId: input.tenantId,
      schoolId: input.schoolId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      id: createAuditId(),
      applicationId: input.applicationId,
      actorId: input.actorId,
      action,
      previousStatus,
      newStatus,
      reason,
      occurredAt: new Date().toISOString(),
    },
    ...auditRecords,
  ];
}

function createDefaultDocumentsForApplication(application: AdmissionApplication, now: string): AdmissionDocument[] {
  const documents: Array<Pick<AdmissionDocument, "documentType" | "required">> = [
    { documentType: "birth_certificate", required: true },
    { documentType: "address_proof", required: true },
    { documentType: "admission_form", required: true },
    { documentType: "previous_school_certificate", required: false },
    { documentType: "medical_certificate", required: false },
  ];

  return documents.map((item, index) => ({
    tenantId: application.tenantId,
    schoolId: application.schoolId,
    campusId: application.campusId,
    academicYearId: application.academicYearId,
    id: `${application.id}-doc-${index + 1}`,
    applicationId: application.id,
    documentType: item.documentType,
    status: "required",
    required: item.required,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }));
}

function formatClassName(classId: string) {
  return classId.replace("class-", "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSectionName(sectionId: string) {
  return sectionId.replace("section-", "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createApplicantId() {
  return `applicant-${Date.now()}`;
}

function createApplicationId() {
  return `admission-app-${Date.now()}`;
}

function createApplicationNumber() {
  return `ADM-2026-${String(applicationRecords.length + 1).padStart(4, "0")}`;
}

function createReviewId() {
  return `admission-review-${Date.now()}`;
}

function createEvaluationId() {
  return `admission-evaluation-${Date.now()}`;
}

function createDecisionId() {
  return `admission-decision-${Date.now()}`;
}

function createSeatCapacityId() {
  return `admission-seat-${Date.now()}`;
}

function createAuditId() {
  return `admission-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEnrollmentId() {
  return `admission-enrollment-${Date.now()}`;
}

function createAdmissionNumberForApplication(application: AdmissionApplication) {
  const base = `SPS-${application.academicYearId.replace(/[^0-9]/g, "").slice(0, 4)}-${application.applicationNumber.replace(/[^0-9]/g, "").slice(-4).padStart(4, "0")}`;
  let candidate = base;
  let suffix = 1;
  const existingNumbers = new Set(enrollmentRecords.map((enrollment) => enrollment.admissionNumber).filter(Boolean));
  while (existingNumbers.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

function formatEvaluationType(type: AdmissionEvaluation["type"]) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCommunicationSubject(event: AdmissionCommunicationInput["event"], application: AdmissionApplication) {
  return `${formatWords(event)} / ${application.applicationNumber}`;
}

function formatCommunicationMessage(event: AdmissionCommunicationInput["event"], application: AdmissionApplication) {
  const applicant = getApplicantOrThrow(application.applicantId);
  return `${applicant.displayName}'s admission application ${application.applicationNumber} has an update: ${formatWords(event)}.`;
}

function formatWords(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toStudentGuardianRelationship(relationship: AdmissionEnrollmentGuardianRelationship): GuardianRelationshipType {
  if (relationship === "father" || relationship === "mother" || relationship === "relative" || relationship === "other") return relationship;
  if (relationship === "grandfather" || relationship === "grandmother") return "grandparent";
  if (relationship === "brother" || relationship === "sister") return "sibling";
  return "guardian";
}

type AdmissionEnrollmentGuardianRelationship = AdmissionEnrollmentCandidateRelationship["relationshipType"];
type AdmissionEnrollmentCandidateRelationship = (typeof guardianRelationshipRecords)[number];
