import { communicationService } from "@/lib/api/communication";
import type {
  AdmissionCommunicationEvent,
  AdmissionCommunicationIntent,
} from "@/features/admissions/types/admission";
import { ApiError, type TenantScopedQuery } from "@/lib/api/client";
import { currentSessionRole, getCurrentUser, getInitials } from "@/lib/current-user";

type CreateIntentInput = TenantScopedQuery & {
  applicationId: string;
  event: AdmissionCommunicationEvent;
  recipientGuardianIds: string[];
  subject: string;
  message: string;
  actorId: string;
};

let communicationIntentRecords: AdmissionCommunicationIntent[] = [];

export const admissionCommunicationService = {
  async createIntent(input: CreateIntentInput) {
    if (input.recipientGuardianIds.length === 0) throw new ApiError(422, "Admission communication requires at least one guardian recipient.");
    const now = new Date().toISOString();
    const intent: AdmissionCommunicationIntent = {
      tenantId: input.tenantId,
      schoolId: input.schoolId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      id: createIntentId(),
      applicationId: input.applicationId,
      event: input.event,
      recipientGuardianIds: input.recipientGuardianIds,
      channel: "communication_center",
      status: "queued",
      subject: input.subject,
      message: input.message,
      createdBy: input.actorId,
      createdAt: now,
    };
    communicationIntentRecords = [intent, ...communicationIntentRecords];
    return intent;
  },

  async dispatchIntent(scope: TenantScopedQuery, intentId: string) {
    const intent = communicationIntentRecords.find((record) => record.id === intentId && isInScope(record, scope));
    if (!intent) throw new ApiError(404, "Admission communication intent could not be found.");
    if (intent.status === "sent") return intent;
    const currentUser = getCurrentUser(currentSessionRole);
    const message = await communicationService.sendMessage(
      {
        ...scope,
        role: currentSessionRole,
        userId: intent.createdBy,
        currentUser: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.roles[0] ?? "User",
          avatarInitials: getInitials(currentUser.name),
        },
      },
      {
        conversationId: "conv-fee-reminders",
        type: "rich_text",
        plainText: `${intent.subject}: ${intent.message}`,
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `${intent.subject}: ${intent.message}` }] }] },
        metadata: {
          source: "admissions",
          applicationId: intent.applicationId,
          event: intent.event,
          recipients: intent.recipientGuardianIds,
        },
      },
    );
    const now = new Date().toISOString();
    const next = { ...intent, status: "sent" as const, conversationId: message.conversationId, messageId: message.id, sentAt: now };
    communicationIntentRecords = communicationIntentRecords.map((record) => record.id === intent.id ? next : record);
    return next;
  },

  async getApplicationCommunicationSummary(scope: TenantScopedQuery, applicationId: string) {
    return communicationIntentRecords
      .filter((record) => record.applicationId === applicationId && isInScope(record, scope))
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  },
};

function isInScope(record: TenantScopedQuery, scope: TenantScopedQuery) {
  return record.tenantId === scope.tenantId && record.schoolId === scope.schoolId && record.campusId === scope.campusId && record.academicYearId === scope.academicYearId;
}

function createIntentId() {
  return `admission-communication-${Date.now()}`;
}
