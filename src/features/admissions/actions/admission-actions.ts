"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/components/shared/permission-gate";
import type { GuardianStudentRelationshipType } from "@/features/guardians/types/guardian";
import type { StudentGender } from "@/features/students/types/student";
import { admissionService } from "@/lib/api/admissions";
import { admissionFinanceService } from "@/lib/api/admission-finance";
import { ApiError } from "@/lib/api/client";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";
import type { AdmissionPriority, AdmissionSource } from "@/features/admissions/types/admission";
import type { AdmissionEvaluation, AdmissionEvaluationType, AdmissionPaymentSummary, AdmissionReviewDecision, AdmissionDecision } from "@/features/admissions/types/admission";
import type { AdmissionCommunicationEvent } from "@/features/admissions/types/admission";

export type AdmissionActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

const initialError = "Please correct the highlighted fields.";

export async function createAdmissionApplicationAction(
  _state: AdmissionActionState,
  formData: FormData,
): Promise<AdmissionActionState> {
  if (!hasPermission(currentSessionRole, "admission.create")) {
    return { status: "error", message: "You do not have permission to create admission applications." };
  }

  let applicationId = "";
  try {
    const guardianId = getOptionalString(formData, "guardianId");
    const relationshipType = getOptionalString(formData, "relationshipType") as GuardianStudentRelationshipType | undefined;
    const application = await admissionService.createApplication({
      ...scope(),
      admissionCycleId: getString(formData, "admissionCycleId"),
      firstName: getString(formData, "firstName"),
      middleName: getOptionalString(formData, "middleName"),
      lastName: getString(formData, "lastName"),
      dateOfBirth: getOptionalString(formData, "dateOfBirth"),
      gender: getOptionalString(formData, "gender") as StudentGender | undefined,
      phone: getOptionalString(formData, "phone"),
      email: getOptionalString(formData, "email"),
      address: {
        address: getOptionalString(formData, "address"),
        city: getOptionalString(formData, "city"),
        state: getOptionalString(formData, "state"),
        country: getOptionalString(formData, "country"),
        postalCode: getOptionalString(formData, "postalCode"),
      },
      previousSchool: getOptionalString(formData, "previousSchool"),
      previousGrade: getOptionalString(formData, "previousGrade"),
      appliedClassId: getString(formData, "appliedClassId"),
      appliedSectionId: getOptionalString(formData, "appliedSectionId"),
      source: getOptionalString(formData, "source") as AdmissionSource | undefined,
      priority: getOptionalString(formData, "priority") as AdmissionPriority | undefined,
      guardians: guardianId && relationshipType
        ? [
            {
              applicantId: "",
              guardianId,
              relationshipType,
              isPrimary: formData.get("isPrimary") === "on",
              isEmergencyContact: formData.get("isEmergencyContact") === "on",
              canReceiveCommunication: formData.get("canReceiveCommunication") === "on",
              canPickup: formData.get("canPickup") === "on",
            },
          ]
        : [],
    });
    applicationId = application.id;
  } catch (error) {
    return toActionError(error, "Unable to create admission application.");
  }

  revalidatePath("/admissions");
  revalidatePath("/admissions/applications");
  redirect(`/admissions/applications/${encodeURIComponent(applicationId)}?created=1`);
}

export async function updateAdmissionApplicationAction(
  _state: AdmissionActionState,
  formData: FormData,
): Promise<AdmissionActionState> {
  if (!hasPermission(currentSessionRole, "admission.edit")) {
    return { status: "error", message: "You do not have permission to edit admission applications." };
  }

  const applicationId = getString(formData, "applicationId");
  try {
    await admissionService.updateApplication({
      ...scope(),
      id: applicationId,
      admissionCycleId: getOptionalString(formData, "admissionCycleId"),
      firstName: getOptionalString(formData, "firstName"),
      middleName: getOptionalString(formData, "middleName"),
      lastName: getOptionalString(formData, "lastName"),
      dateOfBirth: getOptionalString(formData, "dateOfBirth"),
      gender: getOptionalString(formData, "gender") as StudentGender | undefined,
      phone: getOptionalString(formData, "phone"),
      email: getOptionalString(formData, "email"),
      address: {
        address: getOptionalString(formData, "address"),
        city: getOptionalString(formData, "city"),
        state: getOptionalString(formData, "state"),
        country: getOptionalString(formData, "country"),
        postalCode: getOptionalString(formData, "postalCode"),
      },
      previousSchool: getOptionalString(formData, "previousSchool"),
      previousGrade: getOptionalString(formData, "previousGrade"),
      appliedClassId: getOptionalString(formData, "appliedClassId"),
      appliedSectionId: getOptionalString(formData, "appliedSectionId"),
      source: getOptionalString(formData, "source") as AdmissionSource | undefined,
      priority: getOptionalString(formData, "priority") as AdmissionPriority | undefined,
      assignedReviewerId: getOptionalString(formData, "assignedReviewerId"),
    });
  } catch (error) {
    return toActionError(error, "Unable to update admission application.");
  }

  revalidateAdmissionApplication(applicationId);
  return { status: "success", message: "Admission application updated." };
}

export async function submitAdmissionApplicationAction(
  _state: AdmissionActionState,
  formData: FormData,
): Promise<AdmissionActionState> {
  if (!hasPermission(currentSessionRole, "admission.submit")) {
    return { status: "error", message: "You do not have permission to submit admission applications." };
  }

  const applicationId = getString(formData, "applicationId");
  try {
    await admissionService.submitApplication({
      ...scope(),
      applicationId,
      actorId: "current-user",
      reason: getOptionalString(formData, "reason"),
    });
  } catch (error) {
    return toActionError(error, "Unable to submit admission application.");
  }

  revalidateAdmissionApplication(applicationId);
  return { status: "success", message: "Admission application submitted." };
}

export async function uploadAdmissionDocumentAction(
  _state: AdmissionActionState,
  formData: FormData,
): Promise<AdmissionActionState> {
  if (!hasPermission(currentSessionRole, "admission.edit")) {
    return { status: "error", message: "You do not have permission to upload admission documents." };
  }

  const applicationId = getString(formData, "applicationId");
  try {
    await admissionService.uploadDocument({
      ...scope(),
      applicationId,
      documentId: getString(formData, "documentId"),
      actorId: "current-user",
      fileName: getString(formData, "fileName"),
      mimeType: getString(formData, "mimeType"),
      fileSize: getPositiveNumber(formData, "fileSize"),
    });
  } catch (error) {
    return toActionError(error, "Unable to upload admission document.");
  }

  revalidateAdmissionApplication(applicationId);
  return { status: "success", message: "Document metadata uploaded." };
}

export async function startAdmissionDocumentVerificationAction(
  _state: AdmissionActionState,
  formData: FormData,
): Promise<AdmissionActionState> {
  if (!hasPermission(currentSessionRole, "admission.verify_documents")) {
    return { status: "error", message: "You do not have permission to verify admission documents." };
  }

  const applicationId = getString(formData, "applicationId");
  try {
    await admissionService.startDocumentVerification({
      ...scope(),
      applicationId,
      documentId: getString(formData, "documentId"),
      actorId: "current-user",
    });
  } catch (error) {
    return toActionError(error, "Unable to start document verification.");
  }

  revalidateAdmissionApplication(applicationId);
  return { status: "success", message: "Document moved under verification." };
}

export async function verifyAdmissionDocumentAction(
  _state: AdmissionActionState,
  formData: FormData,
): Promise<AdmissionActionState> {
  if (!hasPermission(currentSessionRole, "admission.verify_documents")) {
    return { status: "error", message: "You do not have permission to verify admission documents." };
  }

  const applicationId = getString(formData, "applicationId");
  try {
    await admissionService.verifyDocument({
      ...scope(),
      applicationId,
      documentId: getString(formData, "documentId"),
      actorId: "current-user",
    });
  } catch (error) {
    return toActionError(error, "Unable to verify admission document.");
  }

  revalidateAdmissionApplication(applicationId);
  return { status: "success", message: "Document verified." };
}

export async function rejectAdmissionDocumentAction(
  _state: AdmissionActionState,
  formData: FormData,
): Promise<AdmissionActionState> {
  if (!hasPermission(currentSessionRole, "admission.verify_documents")) {
    return { status: "error", message: "You do not have permission to reject admission documents." };
  }

  const applicationId = getString(formData, "applicationId");
  try {
    await admissionService.rejectDocument({
      ...scope(),
      applicationId,
      documentId: getString(formData, "documentId"),
      actorId: "current-user",
      rejectionReason: getString(formData, "rejectionReason"),
    });
  } catch (error) {
    return toActionError(error, "Unable to reject admission document.");
  }

  revalidateAdmissionApplication(applicationId);
  return { status: "success", message: "Document rejected with reason." };
}

export async function assignAdmissionReviewerAction(formData: FormData) {
  requirePermission("admission.review", "You do not have permission to assign admission reviewers.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.assignReviewer({
    ...scope(),
    applicationId,
    reviewerId: getString(formData, "reviewerId"),
    actorId: "current-user",
  });
  revalidateAdmissionApplication(applicationId);
}

export async function unassignAdmissionReviewerAction(formData: FormData) {
  requirePermission("admission.review", "You do not have permission to unassign admission reviewers.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.unassignReviewer({ ...scope(), applicationId, actorId: "current-user" });
  revalidateAdmissionApplication(applicationId);
}

export async function startAdmissionReviewAction(formData: FormData) {
  requirePermission("admission.review", "You do not have permission to start admission reviews.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.startReview({
    ...scope(),
    applicationId,
    reviewerId: getString(formData, "reviewerId"),
    actorId: "current-user",
  });
  revalidateAdmissionApplication(applicationId);
}

export async function completeAdmissionReviewAction(formData: FormData) {
  requirePermission("admission.review", "You do not have permission to complete admission reviews.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.completeReview({
    ...scope(),
    applicationId,
    reviewerId: getString(formData, "reviewerId"),
    decision: getString(formData, "decision") as AdmissionReviewDecision,
    score: getOptionalNumber(formData, "score"),
    remarks: getOptionalString(formData, "remarks"),
    actorId: "current-user",
  });
  revalidateAdmissionApplication(applicationId);
}

export async function createAdmissionEvaluationAction(formData: FormData) {
  requirePermission("admission.schedule", "You do not have permission to create admission evaluations.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.createEvaluation({
    ...scope(),
    applicationId,
    type: getString(formData, "type") as AdmissionEvaluationType,
    title: getOptionalString(formData, "title"),
    scheduledAt: getOptionalString(formData, "scheduledAt"),
    durationMinutes: getOptionalNumber(formData, "durationMinutes"),
    location: getOptionalString(formData, "location"),
    mode: getOptionalString(formData, "mode") as AdmissionEvaluation["mode"],
    evaluatorId: getOptionalString(formData, "evaluatorId"),
    actorId: "current-user",
  });
  revalidateAdmissionApplication(applicationId);
}

export async function startAdmissionEvaluationAction(formData: FormData) {
  requirePermission("admission.schedule", "You do not have permission to start admission evaluations.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.startEvaluation({
    ...scope(),
    applicationId,
    evaluationId: getString(formData, "evaluationId"),
    actorId: "current-user",
  });
  revalidateAdmissionApplication(applicationId);
}

export async function recordAdmissionEvaluationResultAction(formData: FormData) {
  requirePermission("admission.schedule", "You do not have permission to record admission evaluation results.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.recordEvaluationResult({
    ...scope(),
    applicationId,
    evaluationId: getString(formData, "evaluationId"),
    score: getOptionalNumber(formData, "score"),
    result: getString(formData, "result") as AdmissionEvaluation["result"],
    remarks: getOptionalString(formData, "remarks"),
    actorId: "current-user",
  });
  revalidateAdmissionApplication(applicationId);
}

export async function cancelAdmissionEvaluationAction(formData: FormData) {
  requirePermission("admission.schedule", "You do not have permission to cancel admission evaluations.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.cancelEvaluation({
    ...scope(),
    applicationId,
    evaluationId: getString(formData, "evaluationId"),
    reason: getString(formData, "reason"),
    actorId: "current-user",
  });
  revalidateAdmissionApplication(applicationId);
}

export async function shortlistAdmissionApplicationAction(formData: FormData) {
  requirePermission("admission.shortlist", "You do not have permission to shortlist admission applications.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.shortlistApplication({ ...scope(), applicationId, actorId: "current-user", reason: getOptionalString(formData, "reason") });
  revalidateAdmissionApplication(applicationId);
}

export async function approveAdmissionApplicationAction(formData: FormData) {
  requirePermission("admission.approve", "You do not have permission to approve admission applications.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.approveApplication({
    ...scope(),
    applicationId,
    actorId: "current-user",
    reason: getOptionalString(formData, "reason"),
    reasonCode: getOptionalString(formData, "reasonCode") as AdmissionDecision["reasonCode"],
  });
  revalidateAdmissionApplication(applicationId);
}

export async function waitlistAdmissionApplicationAction(formData: FormData) {
  requirePermission("admission.waitlist", "You do not have permission to waitlist admission applications.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.waitlistApplication({
    ...scope(),
    applicationId,
    actorId: "current-user",
    reason: getOptionalString(formData, "reason"),
    reasonCode: getOptionalString(formData, "reasonCode") as AdmissionDecision["reasonCode"],
    waitlistPosition: getOptionalNumber(formData, "waitlistPosition"),
  });
  revalidateAdmissionApplication(applicationId);
}

export async function rejectAdmissionApplicationDecisionAction(formData: FormData) {
  requirePermission("admission.reject", "You do not have permission to reject admission applications.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.rejectApplication({
    ...scope(),
    applicationId,
    actorId: "current-user",
    reason: getString(formData, "reason"),
    reasonCode: getOptionalString(formData, "reasonCode") as AdmissionDecision["reasonCode"],
  });
  revalidateAdmissionApplication(applicationId);
}

export async function createAdmissionSeatCapacityAction(formData: FormData) {
  requirePermission("admission.manage_capacity", "You do not have permission to manage admission seats.");
  await admissionService.createSeatCapacity({
    ...scope(),
    admissionCycleId: getString(formData, "admissionCycleId"),
    classId: getString(formData, "classId"),
    sectionId: getOptionalString(formData, "sectionId"),
    capacity: getNonNegativeNumber(formData, "capacity"),
    actorId: "current-user",
  });
  revalidateAdmissionQueues();
}

export async function createAdmissionInvoiceAction(formData: FormData) {
  requirePermission("fees.view", "You do not have permission to manage admission fees.");
  const applicationId = getString(formData, "applicationId");
  await admissionFinanceService.createAdmissionInvoice({
    ...scope(),
    applicationId,
    actorId: "current-user",
    amount: getPositiveNumber(formData, "amount"),
    dueDate: getString(formData, "dueDate"),
  });
  revalidateAdmissionApplication(applicationId);
}

export async function recordAdmissionPaymentAction(formData: FormData) {
  requirePermission("fees.view", "You do not have permission to record admission payments.");
  const applicationId = getString(formData, "applicationId");
  await admissionFinanceService.recordPayment({
    ...scope(),
    applicationId,
    actorId: "current-user",
    paidAmount: getPositiveNumber(formData, "paidAmount"),
    method: getString(formData, "method") as AdmissionPaymentSummary["method"],
  });
  revalidateAdmissionApplication(applicationId);
}

export async function verifyAdmissionPaymentAction(formData: FormData) {
  requirePermission("fees.view", "You do not have permission to verify admission payments.");
  const applicationId = getString(formData, "applicationId");
  await admissionFinanceService.verifyPayment({ ...scope(), applicationId, actorId: "current-user" });
  revalidateAdmissionApplication(applicationId);
}

export async function confirmAdmissionAction(formData: FormData) {
  requirePermission("admission.confirm", "You do not have permission to confirm admissions.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.confirmAdmission({
    ...scope(),
    applicationId,
    actorId: "current-user",
    classId: getOptionalString(formData, "classId"),
    sectionId: getOptionalString(formData, "sectionId"),
  });
  revalidateAdmissionApplication(applicationId);
}

export async function completeAdmissionEnrollmentAction(formData: FormData) {
  requirePermission("admission.enroll", "You do not have permission to complete enrollment.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.completeEnrollment({ ...scope(), applicationId, actorId: "current-user" });
  revalidateAdmissionApplication(applicationId);
}

export async function sendAdmissionCommunicationAction(formData: FormData) {
  requirePermission("communication.send", "You do not have permission to send admission communication.");
  const applicationId = getString(formData, "applicationId");
  await admissionService.sendAdmissionCommunication({
    ...scope(),
    applicationId,
    actorId: "current-user",
    event: getString(formData, "event") as AdmissionCommunicationEvent,
    message: getOptionalString(formData, "message"),
  });
  revalidateAdmissionApplication(applicationId);
}

export async function updateAdmissionSeatCapacityAction(formData: FormData) {
  requirePermission("admission.manage_capacity", "You do not have permission to manage admission seats.");
  await admissionService.updateSeatCapacity({
    ...scope(),
    id: getString(formData, "seatId"),
    admissionCycleId: getString(formData, "admissionCycleId"),
    classId: getString(formData, "classId"),
    sectionId: getOptionalString(formData, "sectionId"),
    capacity: getNonNegativeNumber(formData, "capacity"),
    actorId: "current-user",
  });
  revalidateAdmissionQueues();
}

function revalidateAdmissionApplication(applicationId: string) {
  revalidatePath("/admissions");
  revalidatePath("/admissions/applications");
  revalidatePath(`/admissions/applications/${applicationId}`);
  revalidatePath("/admissions/documents");
  revalidatePath("/admissions/reviews");
  revalidatePath("/admissions/evaluations");
  revalidatePath("/admissions/seats");
}

function revalidateAdmissionQueues() {
  revalidatePath("/admissions");
  revalidatePath("/admissions/applications");
  revalidatePath("/admissions/reviews");
  revalidatePath("/admissions/evaluations");
  revalidatePath("/admissions/seats");
}

function requirePermission(permission: Parameters<typeof hasPermission>[1], message: string) {
  if (!hasPermission(currentSessionRole, permission)) {
    throw new ApiError(403, message);
  }
}

function scope() {
  return {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
}

function toActionError(error: unknown, fallback: string): AdmissionActionState {
  if (error instanceof ApiError) {
    return { status: "error", message: error.message };
  }

  if (error instanceof Error && "issues" in error) {
    return { status: "error", message: initialError };
  }

  return { status: "error", message: fallback };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || undefined;
}

function getPositiveNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getNonNegativeNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
