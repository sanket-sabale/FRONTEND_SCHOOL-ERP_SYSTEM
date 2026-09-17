import type { JSONContent } from "@tiptap/core";
import type { TenantScopedQuery } from "@/lib/api/client";
import type { Role } from "@/types/erp";

export type ConversationType = "direct" | "group" | "channel" | "broadcast" | "notice";

export type ConversationFilter = "all" | "unread" | "pinned";

export type ConversationLastMessage = {
  preview: string;
  authorName?: string;
};

export type ConversationMetadata = {
  roleLabel?: string;
  classContext?: string;
  department?: string;
  audienceLabel?: string;
};

export type Conversation = {
  id: string;
  type: ConversationType;
  title: string;
  description?: string;
  avatarInitials?: string;
  lastMessage?: ConversationLastMessage;
  lastActivityAt?: string;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  tenantId: string;
  metadata?: ConversationMetadata;
};

export type MessageType =
  | "text"
  | "rich_text"
  | "attachment"
  | "image"
  | "document"
  | "system"
  | "homework"
  | "attendance"
  | "fee"
  | "exam"
  | "notice"
  | "event";

export type MessageSender = {
  id: string;
  name: string;
  role: string;
  avatarInitials?: string;
  metadata?: Record<string, unknown>;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: MessageSender;
  type: MessageType;
  content: string;
  richContent?: RichTextContent;
  plainText?: string;
  createdAt: string;
  updatedAt?: string;
  replyToMessageId?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
};

export type RichTextContent = JSONContent & {
  type: "doc";
};

export type SendMessageInput = {
  conversationId: string;
  type: "rich_text";
  content: RichTextContent;
  plainText: string;
  attachments?: Array<{ id: string }>;
  metadata?: Record<string, unknown>;
};

export type AttachmentStatus = "pending" | "uploading" | "uploaded" | "failed" | "cancelled";

export type AttachmentKind = "image" | "pdf" | "word" | "excel" | "powerpoint" | "text" | "file";

export type MessageAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  reference: string;
  url?: string;
  thumbnailUrl?: string;
  storageKey?: string;
  status?: AttachmentStatus;
  kind?: AttachmentKind;
  metadata?: Record<string, unknown>;
};

export type AttachmentValidationCode =
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_FILES"
  | "INVALID_FILENAME";

export type AttachmentValidationResult =
  | { ok: true }
  | { ok: false; code: AttachmentValidationCode; message: string };

export type BroadcastStatus = "draft" | "scheduled" | "published" | "archived";

export type Broadcast = {
  id: string;
  title: string;
  content: string;
  audience: string;
  createdAt: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: BroadcastStatus;
};

export type Notice = {
  id: string;
  title: string;
  content: string;
  publisherId: string;
  audience: string;
  publishedAt: string;
  expiresAt?: string;
  acknowledgementRequired?: boolean;
};

export type CommunicationScope = TenantScopedQuery & {
  userId: string;
  role: Role;
  currentUser: MessageSender;
};

export type ConversationQuery = {
  section?: ConversationType | "inbox";
  search?: string;
  filter?: ConversationFilter;
};

export type ConversationCounts = Record<"inbox" | ConversationType, number>;

export type ConversationListResult = {
  conversations: Conversation[];
  counts: ConversationCounts;
};
