"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { SidebarIcon } from "@/components/layout/sidebar-icons";
import { Skeleton } from "@/components/shared/skeleton";
import { Badge, Button, EmptyState } from "@/components/ui";
import { AttachmentList } from "@/features/communication/components/messages/attachment-message";
import { RichTextRenderer } from "@/features/communication/components/messages/rich-text-renderer";
import { rolePermissions } from "@/config/navigation";
import { communicationService } from "@/lib/api/communication";
import { cn } from "@/lib/utils";
import type { CommunicationScope, Conversation, ConversationType, Message, MessageType } from "@/types/communication";

type MessageLoadState =
  | { status: "idle"; messages: Message[] }
  | { status: "loading"; messages: Message[] }
  | { status: "loaded"; messages: Message[] }
  | { status: "error"; messages: Message[] };

type MessageRenderContext = {
  message: Message;
  currentUserId: string;
  showSender: boolean;
  conversationType: ConversationType;
};

type MessageRenderer = (context: MessageRenderContext) => React.ReactNode;

const messageRenderers: Partial<Record<MessageType, MessageRenderer>> = {
  attachment: (context) => <RichTextMessage {...context} />,
  text: (context) => <TextMessage {...context} />,
  rich_text: (context) => <RichTextMessage {...context} />,
  system: ({ message }) => <SystemMessage message={message} />,
};

const MessageComposer = dynamic(
  () => import("@/features/communication/components/composer/message-composer").then((module) => module.MessageComposer),
  { loading: () => <ComposerLoadingState />, ssr: false },
);

export function ConversationView({
  conversation,
  currentUserId,
  onMessageSent,
  onBack,
  scope,
}: {
  conversation: Conversation | null;
  currentUserId: string;
  onMessageSent: (message: Message) => void;
  onBack: () => void;
  scope: CommunicationScope;
}) {
  if (!conversation) return <ConversationEmptyState />;

  return (
    <section className="flex min-h-[560px] flex-col bg-slate-50/70 dark:bg-slate-900/20 lg:min-h-0">
      <ConversationHeader conversation={conversation} onBack={onBack} />
      <MessageHistory
        key={conversation.id}
        conversation={conversation}
        currentUserId={currentUserId}
        onMessageSent={onMessageSent}
        scope={scope}
      />
    </section>
  );
}

function MessageHistory({
  conversation,
  currentUserId,
  onMessageSent,
  scope,
}: {
  conversation: Conversation;
  currentUserId: string;
  onMessageSent: (message: Message) => void;
  scope: CommunicationScope;
}) {
  const [loadState, setLoadState] = useState<MessageLoadState>({ status: "loading", messages: [] });
  const latestMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadMessages() {
      try {
        const messages = await communicationService.getMessages(scope, conversation.id);
        if (active) setLoadState({ status: "loaded", messages });
      } catch {
        if (active) setLoadState({ status: "error", messages: [] });
      }
    }

    void loadMessages();

    return () => {
      active = false;
    };
  }, [conversation.id, scope]);

  useEffect(() => {
    if (loadState.status === "loaded") {
      latestMessageRef.current?.scrollIntoView({ block: "end" });
    }
  }, [loadState.status]);

  return (
    <>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 lg:px-5">
        {loadState.status === "loading" ? <MessageSkeleton /> : null}
        {loadState.status === "error" ? <MessageErrorState /> : null}
        {loadState.status === "loaded" ? (
          <MessageList
            conversationType={conversation.type}
            currentUserId={currentUserId}
            latestMessageRef={latestMessageRef}
            messages={loadState.messages}
          />
        ) : null}
      </div>
      <MessageComposer
        canSend={rolePermissions[scope.role].includes("communication.send")}
        conversation={conversation}
        onMessageSent={(message) => {
          setLoadState((state) => ({ status: "loaded", messages: [...state.messages, message] }));
          onMessageSent(message);
        }}
        scope={scope}
      />
    </>
  );
}

function ConversationHeader({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button aria-label="Back to conversations" className="lg:hidden" onClick={onBack} size="icon" variant="ghost">
          <BackIcon />
        </Button>
        <ConversationAvatar conversation={conversation} />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50 sm:text-base">
            {conversation.title}
          </h2>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {conversationSubtitle(conversation)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {conversation.unreadCount > 0 ? <Badge tone="info">{conversation.unreadCount} unread</Badge> : null}
        <Button aria-label="Conversation actions coming later" disabled size="icon" title="Actions coming later" variant="ghost">
          <MoreIcon />
        </Button>
      </div>
    </header>
  );
}

function MessageList({
  conversationType,
  currentUserId,
  latestMessageRef,
  messages,
}: {
  conversationType: ConversationType;
  currentUserId: string;
  latestMessageRef: React.RefObject<HTMLDivElement | null>;
  messages: Message[];
}) {
  const groupedMessages = useMemo(() => groupMessagesByDay(messages), [messages]);

  if (messages.length === 0) {
    return (
      <div className="grid min-h-full place-items-center">
        <EmptyState
          description="Conversation history will appear here when messaging is connected."
          title="No messages yet"
        />
      </div>
    );
  }

  return (
    <div aria-label="Message history" className="mx-auto flex w-full max-w-4xl flex-col gap-4" role="log">
      {groupedMessages.map((group) => (
        <section aria-label={group.label} className="space-y-3" key={group.key}>
          <MessageDayDivider label={group.label} />
          {group.messages.map((message, index) => {
            const previousMessage = group.messages[index - 1];
            const nextMessage = group.messages[index + 1];
            const showSender = shouldShowSender(message, previousMessage, conversationType, currentUserId);
            const isLatest = index === group.messages.length - 1 && group === groupedMessages[groupedMessages.length - 1];

            return (
              <div key={message.id} ref={isLatest ? latestMessageRef : undefined}>
                <MessageItem
                  conversationType={conversationType}
                  currentUserId={currentUserId}
                  message={message}
                  showSender={showSender}
                  tightWithNext={nextMessage?.senderId === message.senderId && nextMessage.type === message.type}
                />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function MessageItem({
  conversationType,
  currentUserId,
  message,
  showSender,
  tightWithNext,
}: {
  conversationType: ConversationType;
  currentUserId: string;
  message: Message;
  showSender: boolean;
  tightWithNext: boolean;
}) {
  const renderer = messageRenderers[message.type] ?? UnsupportedMessage;

  return (
    <article
      aria-label={`${message.sender.name}, ${formatMessageTime(message.createdAt)}: ${messageAriaSummary(message)}`}
      className={cn("transition-colors", tightWithNext ? "mb-1" : "mb-3")}
    >
      {renderer({ conversationType, currentUserId, message, showSender })}
    </article>
  );
}

function TextMessage({ conversationType, currentUserId, message, showSender }: MessageRenderContext) {
  const ownMessage = message.senderId === currentUserId;

  return (
    <div className={cn("flex gap-2", ownMessage ? "justify-end" : "justify-start")}>
      {!ownMessage ? (
        <div className={cn("mt-5 hidden sm:block", showSender ? "visible" : "invisible")}>
          <SenderAvatar senderName={message.sender.name} initials={message.sender.avatarInitials} />
        </div>
      ) : null}
      <div className={cn("max-w-[88%] sm:max-w-[74%]", ownMessage && "items-end")}>
        {showSender && shouldRenderSenderName(conversationType, ownMessage) ? (
          <p className="mb-1 px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{message.sender.name}</p>
        ) : null}
        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-sm leading-6 shadow-sm",
            "whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
            ownMessage
              ? "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-50"
              : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
          )}
        >
          {message.content}
          <AttachmentList attachments={message.attachments} ownMessage={ownMessage} />
          <span className={cn("mt-1 block text-right text-[11px]", ownMessage ? "text-sky-700 dark:text-sky-300" : "text-slate-500")}>
            {formatMessageTime(message.createdAt)}
            {message.updatedAt ? " / edited" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function RichTextMessage({ conversationType, currentUserId, message, showSender }: MessageRenderContext) {
  const ownMessage = message.senderId === currentUserId;

  return (
    <div className={cn("flex gap-2", ownMessage ? "justify-end" : "justify-start")}>
      {!ownMessage ? (
        <div className={cn("mt-5 hidden sm:block", showSender ? "visible" : "invisible")}>
          <SenderAvatar senderName={message.sender.name} initials={message.sender.avatarInitials} />
        </div>
      ) : null}
      <div className={cn("max-w-[88%] sm:max-w-[74%]", ownMessage && "items-end")}>
        {showSender && shouldRenderSenderName(conversationType, ownMessage) ? (
          <p className="mb-1 px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{message.sender.name}</p>
        ) : null}
        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-sm leading-6 shadow-sm",
            "break-words [overflow-wrap:anywhere]",
            ownMessage
              ? "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-50"
              : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
          )}
        >
          {message.richContent && message.plainText ? <RichTextRenderer content={message.richContent} /> : message.plainText ?? message.content}
          <AttachmentList attachments={message.attachments} ownMessage={ownMessage} />
          <span className={cn("mt-1 block text-right text-[11px]", ownMessage ? "text-sky-700 dark:text-sky-300" : "text-slate-500")}>
            {formatMessageTime(message.createdAt)}
            {message.updatedAt ? " / edited" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-center">
      <p className="max-w-[90%] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        {message.content}
      </p>
    </div>
  );
}

function UnsupportedMessage() {
  return (
    <div className="flex justify-center">
      <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        This message type is not supported yet.
      </p>
    </div>
  );
}

function MessageDayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        {label}
      </span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

function ConversationEmptyState() {
  return (
    <section className="grid min-h-[360px] place-items-center bg-slate-50/70 p-4 dark:bg-slate-900/20 lg:min-h-0">
      <div className="max-w-lg text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-slate-200 bg-white text-sky-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-sky-300">
          <SidebarIcon className="h-6 w-6" name="communication" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-950 dark:text-slate-50">
          Stay connected with your school community
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Select a conversation to review its read-only message history. Composer and sending tools will arrive in the messaging stage.
        </p>
      </div>
    </section>
  );
}

function MessageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <Skeleton className="mx-auto h-7 w-24 rounded-full" />
      <Skeleton className="h-16 w-[72%]" />
      <Skeleton className="ml-auto h-16 w-[64%]" />
      <Skeleton className="h-20 w-[78%]" />
      <Skeleton className="ml-auto h-14 w-[58%]" />
    </div>
  );
}

function MessageErrorState() {
  return (
    <div className="grid min-h-full place-items-center">
      <EmptyState description="Please try again after a moment." title="Unable to load this conversation" />
    </div>
  );
}

function ComposerLoadingState() {
  return (
    <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:p-4">
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function ConversationAvatar({ conversation }: { conversation: Conversation }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-xs font-semibold",
        conversation.type === "direct"
          ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
      )}
    >
      {conversation.avatarInitials ?? <SidebarIcon name="communication" />}
    </span>
  );
}

function SenderAvatar({ initials, senderName }: { initials?: string; senderName: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
      title={senderName}
    >
      {initials ?? senderName.slice(0, 2).toUpperCase()}
    </span>
  );
}

function conversationSubtitle(conversation: Conversation) {
  return [
    typeLabel(conversation.type),
    conversation.metadata?.roleLabel,
    conversation.metadata?.classContext,
    conversation.metadata?.department,
    conversation.metadata?.audienceLabel,
  ]
    .filter(Boolean)
    .join(" / ");
}

function typeLabel(type: ConversationType) {
  const labels: Record<ConversationType, string> = {
    direct: "Chat",
    group: "Group",
    channel: "Department Channel",
    broadcast: "Broadcast",
    notice: "Official Notice",
  };

  return labels[type];
}

function groupMessagesByDay(messages: Message[]) {
  const groups = new Map<string, { key: string; label: string; messages: Message[] }>();

  messages.forEach((message) => {
    const key = new Date(message.createdAt).toDateString();
    const group = groups.get(key) ?? { key, label: formatDayLabel(message.createdAt), messages: [] };
    group.messages.push(message);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

function shouldShowSender(
  message: Message,
  previousMessage: Message | undefined,
  conversationType: ConversationType,
  currentUserId: string,
) {
  if (message.type === "system") return false;
  if (!previousMessage || previousMessage.senderId !== message.senderId || previousMessage.type === "system") return true;
  if (conversationType !== "direct" && message.senderId !== currentUserId) return false;

  return false;
}

function shouldRenderSenderName(conversationType: ConversationType, ownMessage: boolean) {
  return !ownMessage && conversationType !== "direct";
}

function messageAriaSummary(message: Message) {
  const text = message.plainText ?? message.content;
  if (text) return text;
  if (message.attachments?.length === 1) return `Attachment ${message.attachments[0]?.name}`;
  if (message.attachments?.length) return `${message.attachments.length} attachments`;
  return "Message";
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function BackIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M15 18 9 12l6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 12h.01M18 12h.01M6 12h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}
