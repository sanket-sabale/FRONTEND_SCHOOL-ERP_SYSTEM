import type {
  CommunicationScope,
  Conversation,
  ConversationCounts,
  ConversationListResult,
  ConversationQuery,
  ConversationType,
  Message,
  SendMessageInput,
} from "@/types/communication";
import { rolePermissions } from "@/config/navigation";
import { ApiError } from "@/lib/api/client";

type CommunicationRepository = {
  getConversations(scope: CommunicationScope, query?: ConversationQuery): Promise<ConversationListResult>;
  getConversation(scope: CommunicationScope, conversationId: string): Promise<Conversation | null>;
  getMessages(scope: CommunicationScope, conversationId: string): Promise<Message[]>;
  sendMessage(scope: CommunicationScope, input: SendMessageInput): Promise<Message>;
};

const maxMessageCharacters = 50000;
type StoredAttachment = NonNullable<Message["attachments"]>[number];

const uploadedAttachments = new Map<string, StoredAttachment>();

const mockConversations: Conversation[] = [
  {
    id: "conv-priya-sharma",
    type: "direct",
    title: "Priya Sharma",
    description: "Teacher / Grade 8A",
    avatarInitials: "PS",
    lastMessage: { authorName: "Priya", preview: "Please review the homework approval note for tomorrow." },
    lastActivityAt: "2026-08-11T15:15:00+05:30",
    unreadCount: 2,
    isPinned: true,
    tenantId: "tenant-vidyasetu",
    metadata: { roleLabel: "Class Teacher", classContext: "Grade 8A" },
  },
  {
    id: "conv-8a-parents",
    type: "group",
    title: "Grade 8A Parents",
    description: "Parent communication group",
    avatarInitials: "8A",
    lastMessage: { authorName: "Academic Office", preview: "Tomorrow's mathematics test begins at 10:00 AM." },
    lastActivityAt: "2026-08-11T14:40:00+05:30",
    unreadCount: 5,
    tenantId: "tenant-vidyasetu",
    metadata: { classContext: "Grade 8A", audienceLabel: "Parents" },
  },
  {
    id: "conv-academics-channel",
    type: "channel",
    title: "Academics Department",
    description: "Department channel",
    avatarInitials: "AC",
    lastMessage: { authorName: "Coordinator", preview: "Updated weekly timetable has been shared with teachers." },
    lastActivityAt: "2026-08-11T13:25:00+05:30",
    unreadCount: 0,
    tenantId: "tenant-vidyasetu",
    metadata: { department: "Academics" },
  },
  {
    id: "conv-admin-channel",
    type: "channel",
    title: "Administration",
    description: "Operations channel",
    avatarInitials: "AD",
    lastMessage: { authorName: "Office", preview: "Visitor pass process update is ready for review." },
    lastActivityAt: "2026-08-11T12:05:00+05:30",
    unreadCount: 1,
    isMuted: true,
    tenantId: "tenant-vidyasetu",
    metadata: { department: "Administration" },
  },
  {
    id: "conv-fee-reminders",
    type: "broadcast",
    title: "Term 1 Fee Reminders",
    description: "Scheduled parent broadcast",
    avatarInitials: "FR",
    lastMessage: { authorName: "Accounts", preview: "Draft audience includes Grade 9 and Grade 10 overdue accounts." },
    lastActivityAt: "2026-08-10T17:30:00+05:30",
    unreadCount: 0,
    tenantId: "tenant-vidyasetu",
    metadata: { department: "Finance", audienceLabel: "Parents" },
  },
  {
    id: "conv-sports-day-notice",
    type: "notice",
    title: "Annual Sports Day Notice",
    description: "Official school notice",
    avatarInitials: "SN",
    lastMessage: { authorName: "Principal Office", preview: "Notice draft awaits final publishing approval." },
    lastActivityAt: "2026-08-10T10:45:00+05:30",
    unreadCount: 0,
    tenantId: "tenant-vidyasetu",
    metadata: { audienceLabel: "Entire school" },
  },
];

const mockMessages: Record<string, Message[]> = {
  "conv-priya-sharma": [
    {
      id: "msg-priya-1",
      conversationId: "conv-priya-sharma",
      senderId: "system",
      sender: { id: "system", name: "System", role: "System" },
      type: "system",
      content: "Conversation created for Grade 8A academic coordination.",
      createdAt: "2026-08-10T09:00:00+05:30",
    },
    {
      id: "msg-priya-2",
      conversationId: "conv-priya-sharma",
      senderId: "teacher-priya",
      sender: { id: "teacher-priya", name: "Priya Sharma", role: "Class Teacher", avatarInitials: "PS" },
      type: "text",
      content: "Please review the Grade 8 assessment schedule before we share it with parents.",
      createdAt: "2026-08-10T09:18:00+05:30",
    },
    {
      id: "msg-priya-3",
      conversationId: "conv-priya-sharma",
      senderId: "current-user",
      sender: { id: "current-user", name: "User Name", role: "Principal", avatarInitials: "UN" },
      type: "text",
      content: "I will review it this afternoon. Please keep the mathematics and science assessments on separate days.",
      createdAt: "2026-08-10T09:31:00+05:30",
    },
    {
      id: "msg-priya-4",
      conversationId: "conv-priya-sharma",
      senderId: "teacher-priya",
      sender: { id: "teacher-priya", name: "Priya Sharma", role: "Class Teacher", avatarInitials: "PS" },
      type: "text",
      content: "Noted. I will update the draft and add the revised version for approval.\n\nAlso, two parents asked whether the homework submission window can remain open until Friday.",
      createdAt: "2026-08-11T10:12:00+05:30",
    },
    {
      id: "msg-priya-5",
      conversationId: "conv-priya-sharma",
      senderId: "current-user",
      sender: { id: "current-user", name: "User Name", role: "Principal", avatarInitials: "UN" },
      type: "text",
      content: "Friday is fine. Please mention that it is a one-time extension for this week.",
      createdAt: "2026-08-11T10:25:00+05:30",
    },
  ],
  "conv-8a-parents": [
    {
      id: "msg-8a-1",
      conversationId: "conv-8a-parents",
      senderId: "system",
      sender: { id: "system", name: "System", role: "System" },
      type: "system",
      content: "Grade 8A Parents group was updated from the active class roster.",
      createdAt: "2026-08-10T08:30:00+05:30",
    },
    {
      id: "msg-8a-2",
      conversationId: "conv-8a-parents",
      senderId: "parent-rajesh",
      sender: { id: "parent-rajesh", name: "Rajesh Kumar", role: "Parent", avatarInitials: "RK" },
      type: "text",
      content: "Is tomorrow's parent meeting still scheduled for 10 AM?",
      createdAt: "2026-08-10T18:42:00+05:30",
    },
    {
      id: "msg-8a-3",
      conversationId: "conv-8a-parents",
      senderId: "teacher-priya",
      sender: { id: "teacher-priya", name: "Priya Sharma", role: "Class Teacher", avatarInitials: "PS" },
      type: "text",
      content: "Yes, the meeting will begin at 10 AM in Room 204. Please arrive five minutes early so we can start on time.",
      createdAt: "2026-08-10T18:55:00+05:30",
    },
    {
      id: "msg-8a-4",
      conversationId: "conv-8a-parents",
      senderId: "teacher-priya",
      sender: { id: "teacher-priya", name: "Priya Sharma", role: "Class Teacher", avatarInitials: "PS" },
      type: "text",
      content: "Students should bring the signed assessment acknowledgement form by Friday.",
      createdAt: "2026-08-11T08:15:00+05:30",
    },
  ],
  "conv-academics-channel": [
    {
      id: "msg-academics-1",
      conversationId: "conv-academics-channel",
      senderId: "academic-office",
      sender: { id: "academic-office", name: "Academic Office", role: "Department", avatarInitials: "AO" },
      type: "system",
      content: "Academic Department channel created for timetable and assessment coordination.",
      createdAt: "2026-08-09T11:00:00+05:30",
    },
    {
      id: "msg-academics-2",
      conversationId: "conv-academics-channel",
      senderId: "coordinator-meera",
      sender: { id: "coordinator-meera", name: "Meera Iyer", role: "Academic Coordinator", avatarInitials: "MI" },
      type: "text",
      content: "The Grade 8 assessment calendar has been updated. Please verify subject sequencing before final approval.",
      createdAt: "2026-08-11T13:25:00+05:30",
    },
  ],
  "conv-admin-channel": [
    {
      id: "msg-admin-1",
      conversationId: "conv-admin-channel",
      senderId: "office-admin",
      sender: { id: "office-admin", name: "Administration Office", role: "Operations", avatarInitials: "AO" },
      type: "text",
      content: "Visitor pass process update is ready for review. Long reference values and URLs should wrap correctly: https://schoolerp.example/administration/visitor-pass/process-review",
      createdAt: "2026-08-11T12:05:00+05:30",
    },
  ],
  "conv-fee-reminders": [],
  "conv-sports-day-notice": [
    {
      id: "msg-notice-1",
      conversationId: "conv-sports-day-notice",
      senderId: "principal-office",
      sender: { id: "principal-office", name: "Principal Office", role: "Publisher", avatarInitials: "PO" },
      type: "text",
      content: "Annual Sports Day notice draft is ready for final approval. Publishing controls will be connected in the broadcast and notices stage.",
      createdAt: "2026-08-10T10:45:00+05:30",
    },
  ],
};

const mockCommunicationRepository: CommunicationRepository = {
  async getConversations(scope, query = {}) {
    const normalizedSearch = query.search?.trim().toLowerCase() ?? "";

    const conversations = mockConversations
      .filter((conversation) => conversation.tenantId === scope.tenantId)
      .filter((conversation) => matchesSection(conversation, query.section))
      .filter((conversation) => matchesFilter(conversation, query.filter))
      .filter((conversation) => {
        if (!normalizedSearch) return true;

        return [
          conversation.title,
          conversation.description,
          conversation.type,
          conversation.metadata?.roleLabel,
          conversation.metadata?.classContext,
          conversation.metadata?.department,
          conversation.metadata?.audienceLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      });

    return {
      conversations,
      counts: buildCounts(mockConversations.filter((conversation) => conversation.tenantId === scope.tenantId)),
    };
  },
  async getConversation(scope, conversationId) {
    return mockConversations.find((conversation) => conversation.tenantId === scope.tenantId && conversation.id === conversationId) ?? null;
  },
  async getMessages(scope, conversationId) {
    const conversation = await this.getConversation(scope, conversationId);
    if (!conversation) return [];

    return [...(mockMessages[conversationId] ?? [])].sort(
      (first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
    );
  },
  async sendMessage(scope, input) {
    if (!rolePermissions[scope.role].includes("communication.send")) {
      throw new ApiError(403, "You do not have permission to send messages.");
    }

    const conversation = await this.getConversation(scope, input.conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation could not be found.");
    }

    const plainText = normalizePlainText(input.plainText);
    const attachments = (input.attachments ?? []).flatMap((attachmentRef) => {
      const attachment = uploadedAttachments.get(attachmentRef.id);
      return attachment ? [attachment] : [];
    });
    if (!plainText && attachments.length === 0) {
      throw new ApiError(422, "Message cannot be empty.");
    }

    if (plainText.length > maxMessageCharacters) {
      throw new ApiError(422, `Message must be ${maxMessageCharacters.toLocaleString("en-IN")} characters or fewer.`);
    }

    if (input.type !== "rich_text" || input.content.type !== "doc") {
      throw new ApiError(422, "Unsupported message payload.");
    }

    const createdAt = new Date().toISOString();
    const message: Message = {
      id: `msg-${input.conversationId}-${(mockMessages[input.conversationId]?.length ?? 0) + 1}`,
      conversationId: input.conversationId,
      senderId: scope.userId,
      sender: scope.currentUser,
      type: "rich_text",
      content: plainText,
      plainText,
      richContent: input.content,
      createdAt,
      attachments,
      metadata: input.metadata,
    };

    const messages = mockMessages[input.conversationId] ?? [];
    messages.push(message);
    mockMessages[input.conversationId] = messages;

    conversation.lastMessage = { authorName: scope.currentUser.name, preview: plainText || attachmentPreview(attachments) };
    conversation.lastActivityAt = createdAt;

    return message;
  },
};

export const communicationService = {
  getConversations(scope: CommunicationScope, query?: ConversationQuery) {
    return mockCommunicationRepository.getConversations(scope, query);
  },
  getConversation(scope: CommunicationScope, conversationId: string) {
    return mockCommunicationRepository.getConversation(scope, conversationId);
  },
  getMessages(scope: CommunicationScope, conversationId: string) {
    return mockCommunicationRepository.getMessages(scope, conversationId);
  },
  sendMessage(scope: CommunicationScope, input: SendMessageInput) {
    return mockCommunicationRepository.sendMessage(scope, input);
  },
  registerUploadedAttachment(attachment: NonNullable<Message["attachments"]>[number]) {
    uploadedAttachments.set(attachment.id, attachment);
  },
};

function normalizePlainText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function attachmentPreview(attachments: NonNullable<Message["attachments"]>) {
  if (attachments.length === 0) return "Attachment";
  if (attachments.length === 1) return attachments[0]?.name ?? "Attachment";
  return `${attachments.length} attachments`;
}

function matchesSection(conversation: Conversation, section?: ConversationType | "inbox") {
  if (!section || section === "inbox") return true;

  return conversation.type === section;
}

function matchesFilter(conversation: Conversation, filter = "all") {
  if (filter === "unread") return conversation.unreadCount > 0;
  if (filter === "pinned") return Boolean(conversation.isPinned);

  return true;
}

function buildCounts(conversations: Conversation[]): ConversationCounts {
  return conversations.reduce<ConversationCounts>(
    (counts, conversation) => {
      counts.inbox += conversation.unreadCount;
      counts[conversation.type] += conversation.unreadCount;
      return counts;
    },
    { inbox: 0, direct: 0, group: 0, channel: 0, broadcast: 0, notice: 0 },
  );
}
