"use client";

import { useMemo, useState } from "react";
import { SidebarIcon } from "@/components/layout/sidebar-icons";
import { Badge, Button, EmptyState } from "@/components/ui";
import { ConversationView } from "@/features/communication/components/conversation-view";
import { cn } from "@/lib/utils";
import type {
  CommunicationScope,
  Conversation,
  ConversationCounts,
  ConversationFilter,
  ConversationType,
  Message,
} from "@/types/communication";

type CommunicationSection = "inbox" | ConversationType;

const communicationSections: Array<{
  id: CommunicationSection;
  label: string;
  description: string;
}> = [
  { id: "inbox", label: "Inbox", description: "All communication" },
  { id: "direct", label: "Chats", description: "Authorized people" },
  { id: "group", label: "Groups", description: "Classes and teams" },
  { id: "channel", label: "Channels", description: "Departments" },
  { id: "broadcast", label: "Broadcasts", description: "Official audience sends" },
  { id: "notice", label: "Notices", description: "Published school notices" },
];

const filters: Array<{ id: ConversationFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "pinned", label: "Pinned" },
];

export function CommunicationCenter({
  conversations,
  counts,
  currentUserId,
  schoolName,
  scope,
}: {
  conversations: Conversation[];
  counts: ConversationCounts;
  currentUserId: string;
  schoolName: string;
  scope: CommunicationScope;
}) {
  const [activeSection, setActiveSection] = useState<CommunicationSection>("inbox");
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>("all");
  const [conversationItems, setConversationItems] = useState(conversations);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const visibleConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return conversationItems
      .filter((conversation) => activeSection === "inbox" || conversation.type === activeSection)
      .filter((conversation) => {
        if (activeFilter === "unread") return conversation.unreadCount > 0;
        if (activeFilter === "pinned") return Boolean(conversation.isPinned);
        return true;
      })
      .filter((conversation) => {
        if (!normalizedQuery) return true;

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
          .includes(normalizedQuery);
      });
  }, [activeFilter, activeSection, conversationItems, searchQuery]);

  const selectedConversation = conversationItems.find((conversation) => conversation.id === selectedConversationId) ?? null;

  function handleMessageSent(message: Message) {
    setConversationItems((items) =>
      items.map((conversation) =>
        conversation.id === message.conversationId
          ? {
              ...conversation,
              lastActivityAt: message.createdAt,
              lastMessage: {
                authorName: message.sender.name,
                preview: message.plainText ?? message.content,
              },
            }
          : conversation,
      ),
    );
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-112px)] max-w-[1500px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Communication</p>
          <h1 className="responsive-text mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Communication Center
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Stay connected with your school community through a tenant-aware workspace for conversations, groups, channels, broadcasts, and notices.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{schoolName}</Badge>
          <Button aria-disabled="true" disabled variant="secondary">
            New Message
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(300px,360px)_minmax(0,1fr)] xl:grid-cols-[232px_372px_minmax(0,1fr)]">
        <div className={cn(selectedConversation && "hidden lg:block")}>
          <CommunicationNavigation
            activeSection={activeSection}
            counts={counts}
            onSectionChange={(section) => {
              setActiveSection(section);
              setSelectedConversationId(null);
            }}
          />
        </div>
        <div className={cn(selectedConversation && "hidden lg:block")}>
          <ConversationList
            activeFilter={activeFilter}
            conversations={visibleConversations}
            onFilterChange={setActiveFilter}
            onQueryChange={setSearchQuery}
            onSelectConversation={setSelectedConversationId}
            query={searchQuery}
            selectedConversationId={selectedConversationId}
          />
        </div>
        <ConversationView
          conversation={selectedConversation}
          currentUserId={currentUserId}
          onMessageSent={handleMessageSent}
          onBack={() => setSelectedConversationId(null)}
          scope={scope}
        />
      </div>
    </section>
  );
}

function CommunicationNavigation({
  activeSection,
  counts,
  onSectionChange,
}: {
  activeSection: CommunicationSection;
  counts: ConversationCounts;
  onSectionChange: (section: CommunicationSection) => void;
}) {
  return (
    <nav
      aria-label="Communication sections"
      className="scrollbar-hidden flex gap-2 overflow-x-auto border-b border-slate-200 p-3 dark:border-slate-800 lg:block lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r"
    >
      {communicationSections.map((section) => {
        const active = activeSection === section.id;
        const count = counts[section.id];

        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-11 min-w-36 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 lg:mb-1 lg:w-full lg:min-w-0",
              active
                ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
            )}
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-3">
              <CommunicationGlyph type={section.id} />
              <span className="min-w-0">
                <span className="block truncate">{section.label}</span>
                <span className="hidden truncate text-xs font-normal text-slate-500 dark:text-slate-400 lg:block">
                  {section.description}
                </span>
              </span>
            </span>
            {count > 0 ? <UnreadBadge count={count} /> : null}
          </button>
        );
      })}
    </nav>
  );
}

function ConversationList({
  activeFilter,
  conversations,
  onFilterChange,
  onQueryChange,
  onSelectConversation,
  query,
  selectedConversationId,
}: {
  activeFilter: ConversationFilter;
  conversations: Conversation[];
  onFilterChange: (filter: ConversationFilter) => void;
  onQueryChange: (query: string) => void;
  onSelectConversation: (conversationId: string) => void;
  query: string;
  selectedConversationId: string | null;
}) {
  return (
    <section className="flex min-h-[440px] flex-col border-b border-slate-200 dark:border-slate-800 md:min-h-[520px] lg:min-h-0 lg:border-b-0 lg:border-r">
      <div className="shrink-0 border-b border-slate-200 p-3 dark:border-slate-800">
        <label className="sr-only" htmlFor="conversation-search">Search conversations</label>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-900">
          <SearchIcon />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-50"
            id="conversation-search"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search conversations..."
            type="search"
            value={query}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Conversation filters">
          {filters.map((filter) => (
            <button
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700",
                activeFilter === filter.id
                  ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900",
              )}
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-2">
        {conversations.length > 0 ? (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <ConversationListItem
                conversation={conversation}
                key={conversation.id}
                onSelect={() => onSelectConversation(conversation.id)}
                selected={conversation.id === selectedConversationId}
              />
            ))}
          </div>
        ) : (
          <div className="p-3">
            <EmptyState
              description={query ? "Try another title, section, department, or class context." : "Your conversations will appear here once communication is connected."}
              title={query ? "No conversations found" : "No conversations yet"}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ConversationListItem({
  conversation,
  onSelect,
  selected,
}: {
  conversation: Conversation;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700",
        selected
          ? "bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-50"
          : "hover:bg-slate-50 dark:hover:bg-slate-900",
      )}
      onClick={onSelect}
      type="button"
    >
      <Avatar conversation={conversation} />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("truncate text-sm font-semibold", conversation.unreadCount > 0 ? "text-slate-950 dark:text-slate-50" : "text-slate-800 dark:text-slate-200")}>
            {conversation.title}
          </span>
          {conversation.isPinned ? <PinIcon /> : null}
          {conversation.isMuted ? <MutedIcon /> : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
          {typeLabel(conversation.type)}{conversation.description ? ` / ${conversation.description}` : ""}
        </span>
        <span className="mt-1 block truncate text-sm text-slate-600 dark:text-slate-300">
          {conversation.lastMessage?.preview ?? "No recent activity"}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatConversationTime(conversation.lastActivityAt)}</span>
        {conversation.unreadCount > 0 ? <UnreadBadge count={conversation.unreadCount} /> : null}
      </span>
    </button>
  );
}

function Avatar({ conversation }: { conversation: Conversation }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border font-semibold",
        "h-10 w-10 text-xs",
        conversation.type === "direct"
          ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
      )}
      title={typeLabel(conversation.type)}
    >
      {conversation.avatarInitials ?? <CommunicationGlyph type={conversation.type} />}
    </span>
  );
}

function CommunicationGlyph({ type }: { type: CommunicationSection }) {
  if (type === "inbox" || type === "direct") return <SidebarIcon name="communication" />;
  if (type === "group") return <SidebarIcon name="users" />;
  if (type === "channel") return <SidebarIcon name="settings" />;
  if (type === "broadcast") return <SidebarIcon name="reports" />;

  return <SidebarIcon name="audit" />;
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="grid min-h-5 min-w-5 place-items-center rounded-md bg-sky-700 px-1.5 text-[11px] font-semibold leading-none text-white dark:bg-sky-400 dark:text-slate-950">
      {count}
    </span>
  );
}

function typeLabel(type: ConversationType) {
  const labels: Record<ConversationType, string> = {
    direct: "Chat",
    group: "Group",
    channel: "Channel",
    broadcast: "Broadcast",
    notice: "Notice",
  };

  return labels[type];
}

function formatConversationTime(value?: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24">
      <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-label="Pinned" className="h-3.5 w-3.5 shrink-0 text-sky-700 dark:text-sky-300" fill="none" viewBox="0 0 24 24">
      <path d="m14 4 6 6-4 1-4 7-2-2-4 4 4-4-2-2 7-4 1-4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg aria-label="Muted" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24">
      <path d="M4 4l16 16M9 9v6h3l4 4v-5m0-4V5l-2.7 2.7M6 9h2l8-4v4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
