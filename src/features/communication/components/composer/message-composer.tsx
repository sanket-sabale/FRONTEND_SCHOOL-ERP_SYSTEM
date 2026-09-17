"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import type { JSONContent } from "@tiptap/core";
import { Button } from "@/components/ui";
import { attachmentService } from "@/features/attachments/adapters/web/attachment-web-adapter";
import { communicationUploadPolicy, formatFileSize } from "@/lib/api/attachments";
import { communicationService } from "@/lib/api/communication";
import { toUserMessage } from "@/lib/api/client";
import { appStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { extractPlainTextFromRichContent, isSafeUrl } from "@/features/communication/components/messages/rich-text-renderer";
import type { AttachmentStatus, CommunicationScope, Conversation, Message, MessageAttachment, RichTextContent } from "@/types/communication";

const maxMessageCharacters = 50000;
const warningThreshold = 1000;
const emptyDocument: RichTextContent = { type: "doc", content: [{ type: "paragraph" }] };

type ComposerAttachment = {
  localId: string;
  file: File;
  status: AttachmentStatus;
  error?: string;
  previewUrl?: string;
  uploaded?: MessageAttachment;
};

const colorOptions = [
  { label: "Default", value: "", className: "bg-slate-400" },
  { label: "Red", value: "red", className: "bg-rose-600" },
  { label: "Orange", value: "orange", className: "bg-amber-600" },
  { label: "Green", value: "green", className: "bg-emerald-600" },
  { label: "Blue", value: "blue", className: "bg-sky-600" },
  { label: "Purple", value: "purple", className: "bg-violet-600" },
  { label: "Gray", value: "gray", className: "bg-slate-600" },
];

export function MessageComposer({
  canSend,
  conversation,
  onMessageSent,
  scope,
}: {
  canSend: boolean;
  conversation: Conversation;
  onMessageSent: (message: Message) => void;
  scope: CommunicationScope;
}) {
  const draftKey = useMemo(
    () => `communication:draft:${scope.tenantId}:${scope.userId}:${conversation.id}`,
    [conversation.id, scope.tenantId, scope.userId],
  );
  const initialContent = useMemo(() => readDraft(draftKey), [draftKey]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [version, setVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<ComposerAttachment[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Link.configure({
        autolink: false,
        linkOnPaste: true,
        openOnClick: false,
        protocols: ["http", "https", "mailto"],
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        "aria-label": "Write a message",
        class:
          "min-h-24 max-h-48 overflow-y-auto px-3 py-3 text-sm leading-6 outline-none prose-communication",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor: updatedEditor }) => {
      appStorage.set(draftKey, JSON.stringify(updatedEditor.getJSON()));
      setSendError("");
      setVersion((value) => value + 1);
    },
    onSelectionUpdate: () => setVersion((value) => value + 1),
  });

  const plainText = editor ? extractPlainTextFromRichContent(editor.getJSON()) : "";
  const remainingCharacters = maxMessageCharacters - plainText.length;
  const showCounter = remainingCharacters <= warningThreshold;
  const hasMeaningfulContent = plainText.length > 0;
  const exceedsLimit = remainingCharacters < 0;
  const hasReadyAttachments = attachments.some((attachment) => attachment.status === "uploaded");
  const attachmentUploadsReady = attachments.every((attachment) => attachment.status === "uploaded");
  const sendDisabled = !editor || !canSend || (!hasMeaningfulContent && !hasReadyAttachments) || !attachmentUploadsReady || exceedsLimit || isSending;

  async function sendMessage() {
    if (!editor || sendDisabled) return;

    setIsSending(true);
    setSendError("");

    try {
      const message = await communicationService.sendMessage(scope, {
        conversationId: conversation.id,
        type: "rich_text",
        content: editor.getJSON() as RichTextContent,
        plainText,
        attachments: attachments.filter((attachment) => attachment.uploaded).map((attachment) => ({ id: attachment.uploaded!.id })),
      });

      editor.commands.setContent(emptyDocument);
      appStorage.remove(draftKey);
      revokeAttachmentPreviews(attachments);
      setAttachments([]);
      setVersion((value) => value + 1);
      onMessageSent(message);
      window.requestAnimationFrame(() => editor.commands.focus());
    } catch (error) {
      setSendError(toUserMessage(error));
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void sendMessage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  attachmentsRef.current = attachments;

  useEffect(() => {
    return () => revokeAttachmentPreviews(attachmentsRef.current);
  }, []);

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const availableSlots = communicationUploadPolicy.maxFilesPerMessage - attachments.length;
    if (files.length > availableSlots) {
      setAttachmentError(`You can attach up to ${communicationUploadPolicy.maxFilesPerMessage} files per message.`);
      return;
    }

    setAttachmentError("");
    const nextAttachments = files.map((file, index): ComposerAttachment => ({
      localId: `local-${Date.now()}-${index}-${file.name}-${file.size}`,
      file,
      status: "pending",
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));

    setAttachments((items) => [...items, ...nextAttachments]);
    await Promise.all(nextAttachments.map(uploadComposerAttachment));
  }

  async function uploadComposerAttachment(item: ComposerAttachment) {
    const validation = attachmentService.validateAttachmentFile(item.file);
    if (!validation.ok) {
      setAttachments((items) =>
        items.map((attachment) =>
          attachment.localId === item.localId ? { ...attachment, status: "failed", error: validation.message } : attachment,
        ),
      );
      return;
    }

    setAttachments((items) => items.map((attachment) => (attachment.localId === item.localId ? { ...attachment, status: "uploading", error: undefined } : attachment)));

    try {
      const { attachment } = await attachmentService.uploadAttachment(scope, {
        conversationId: conversation.id,
        file: item.file,
      });

      communicationService.registerUploadedAttachment(attachment);
      setAttachments((items) =>
        items.map((current) =>
          current.localId === item.localId ? { ...current, status: "uploaded", uploaded: attachment } : current,
        ),
      );
    } catch (error) {
      setAttachments((items) =>
        items.map((attachment) =>
          attachment.localId === item.localId ? { ...attachment, status: "failed", error: toUserMessage(error) } : attachment,
        ),
      );
    }
  }

  function removeAttachment(localId: string) {
    setAttachments((items) => {
      const item = items.find((attachment) => attachment.localId === localId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return items.filter((attachment) => attachment.localId !== localId);
    });
  }

  return (
    <div
      className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-4"
      onDragEnter={(event) => {
        event.preventDefault();
        if (canSend) setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        if (canSend) void addFiles(event.dataTransfer.files);
      }}
      onPaste={(event) => {
        const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length > 0 && canSend) void addFiles(imageFiles);
      }}
    >
      <div className="relative overflow-visible rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {dragActive ? <div className="absolute inset-0 z-20 grid place-items-center rounded-xl border-2 border-dashed border-sky-500 bg-sky-50/95 text-sm font-semibold text-sky-800 dark:bg-sky-950/95 dark:text-sky-200">Drop files to attach</div> : null}
        <input
          accept={communicationUploadPolicy.allowedMimeTypes.join(",")}
          className="sr-only"
          multiple
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = "";
          }}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />
        <EditorToolbar
          editor={editor}
          onAttach={() => fileInputRef.current?.click()}
          version={version}
          canAttach={canSend && attachments.length < communicationUploadPolicy.maxFilesPerMessage}
        />
        <div className="relative border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          {editor?.isEmpty ? (
            <p className="pointer-events-none absolute left-3 top-3 text-sm text-slate-400">Write a message...</p>
          ) : null}
          <EditorContent editor={editor} />
        </div>
        {attachments.length > 0 ? (
          <AttachmentPreviewList attachments={attachments} onRemove={removeAttachment} onRetry={(item) => void uploadComposerAttachment(item)} />
        ) : null}
        <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-xs">
            {!canSend ? <span className="text-amber-700 dark:text-amber-300">You have read-only access to this conversation.</span> : null}
            {exceedsLimit ? <span className="text-rose-700 dark:text-rose-300">Message is over the {maxMessageCharacters.toLocaleString("en-IN")} character limit.</span> : null}
            {sendError ? <span className="text-rose-700 dark:text-rose-300">Unable to send message. {sendError}</span> : null}
            {attachmentError ? <span className="text-rose-700 dark:text-rose-300">{attachmentError}</span> : null}
            {!attachmentUploadsReady ? <span className="text-slate-500">Waiting for attachments to finish uploading.</span> : null}
            {showCounter && !exceedsLimit ? <span className="text-slate-500">{plainText.length.toLocaleString("en-IN")} / {maxMessageCharacters.toLocaleString("en-IN")}</span> : null}
          </div>
          <Button
            aria-label="Send message"
            loading={isSending}
            onClick={() => void sendMessage()}
            variant="primary"
            disabled={sendDisabled}
          >
            {isSending ? "Sending..." : "Send"}
            {!isSending ? <SendIcon /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditorToolbar({ canAttach, editor, onAttach, version }: { canAttach: boolean; editor: Editor | null; onAttach: () => void; version: number }) {
  const [colorOpen, setColorOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  void version;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-950">
      <ToolbarGroup>
        <ToolbarButton active={editor?.isActive("bold")} disabled={!editor} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}>B</ToolbarButton>
        <ToolbarButton active={editor?.isActive("italic")} disabled={!editor} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}><span className="italic">I</span></ToolbarButton>
        <ToolbarButton active={editor?.isActive("underline")} disabled={!editor} label="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()}><span className="underline">U</span></ToolbarButton>
        <ToolbarButton active={editor?.isActive("strike")} className="hidden sm:inline-flex" disabled={!editor} label="Strikethrough" onClick={() => editor?.chain().focus().toggleStrike().run()}><span className="line-through">S</span></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarButton active={editor?.isActive("bulletList")} disabled={!editor} label="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()}>•</ToolbarButton>
        <ToolbarButton active={editor?.isActive("orderedList")} className="hidden sm:inline-flex" disabled={!editor} label="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
      </ToolbarGroup>
      <ToolbarPopover open={colorOpen} onOpenChange={setColorOpen} trigger={<ToolbarButton active={false} disabled={!editor} label="Text color" onClick={() => setColorOpen((value) => !value)}>A</ToolbarButton>}>
        <ColorPicker editor={editor} onClose={() => setColorOpen(false)} />
      </ToolbarPopover>
      <ToolbarPopover open={linkOpen} onOpenChange={setLinkOpen} trigger={<ToolbarButton active={editor?.isActive("link")} disabled={!editor} label="Insert link" onClick={() => setLinkOpen((value) => !value)}><LinkIcon /></ToolbarButton>}>
        <LinkPopover editor={editor} onClose={() => setLinkOpen(false)} />
      </ToolbarPopover>
      <ToolbarGroup>
        <ToolbarButton disabled={!canAttach} label="Attach files" onClick={onAttach}><PaperclipIcon /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarButton disabled={!editor?.can().undo()} label="Undo" onClick={() => editor?.chain().focus().undo().run()}><UndoIcon /></ToolbarButton>
        <ToolbarButton disabled={!editor?.can().redo()} label="Redo" onClick={() => editor?.chain().focus().redo().run()}><RedoIcon /></ToolbarButton>
      </ToolbarGroup>
    </div>
  );
}

function AttachmentPreviewList({
  attachments,
  onRemove,
  onRetry,
}: {
  attachments: ComposerAttachment[];
  onRemove: (localId: string) => void;
  onRetry: (attachment: ComposerAttachment) => void;
}) {
  return (
    <div className="grid gap-2 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-3">
      {attachments.map((attachment) => (
        <AttachmentPreviewItem
          attachment={attachment}
          key={attachment.localId}
          onRemove={() => onRemove(attachment.localId)}
          onRetry={() => onRetry(attachment)}
        />
      ))}
    </div>
  );
}

function AttachmentPreviewItem({
  attachment,
  onRemove,
  onRetry,
}: {
  attachment: ComposerAttachment;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const failed = attachment.status === "failed";

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        {attachment.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full object-cover" src={attachment.previewUrl} />
        ) : (
          <FileIcon />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={attachment.file.name}>
          {attachment.file.name}
        </p>
        <p className={cn("truncate text-xs", failed ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400")}>
          {attachmentStatusLabel(attachment)} / {formatFileSize(attachment.file.size)}
        </p>
      </div>
      {failed ? (
        <button
          aria-label={`Retry ${attachment.file.name}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          onClick={onRetry}
          title={attachment.error ?? "Retry upload"}
          type="button"
        >
          <RetryIcon />
        </button>
      ) : null}
      <button
        aria-label={`Remove ${attachment.file.name}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        onClick={onRemove}
        title="Remove attachment"
        type="button"
      >
        <RemoveIcon />
      </button>
    </div>
  );
}

function attachmentStatusLabel(attachment: ComposerAttachment) {
  if (attachment.status === "failed") return attachment.error ?? "Upload failed";
  if (attachment.status === "uploading") return "Uploading";
  if (attachment.status === "uploaded") return "Ready";
  return "Waiting";
}

function revokeAttachmentPreviews(attachments: ComposerAttachment[]) {
  attachments.forEach((attachment) => {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  });
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 border-r border-slate-200 pr-1 last:border-r-0 dark:border-slate-800">{children}</div>;
}

function ToolbarButton({
  active,
  children,
  className,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active || undefined}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-sky-200 bg-sky-50 text-sky-800 ring-2 ring-sky-100 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-950"
          : "border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolbarPopover({
  children,
  onOpenChange,
  open,
  trigger,
}: {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  trigger: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onOpenChange, open]);

  return (
    <div className="relative" ref={ref}>
      {trigger}
      {open ? (
        <div className="fixed bottom-24 left-3 right-3 z-[120] max-h-[60dvh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:absolute sm:bottom-[calc(100%+8px)] sm:left-0 sm:right-auto sm:max-h-none sm:w-[min(320px,calc(100vw-32px))] sm:overflow-visible">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ColorPicker({ editor, onClose }: { editor: Editor | null; onClose: () => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Text color</p>
      <div className="grid gap-1">
        {colorOptions.map((color) => (
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:text-slate-300 dark:hover:bg-slate-900"
            key={color.label}
            onClick={() => {
              if (color.value) editor?.chain().focus().setColor(color.value).run();
              else editor?.chain().focus().unsetColor().run();
              onClose();
            }}
            type="button"
          >
            <span className={cn("h-3.5 w-3.5 rounded-full", color.className)} />
            {color.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LinkPopover({ editor, onClose }: { editor: Editor | null; onClose: () => void }) {
  const [url, setUrl] = useState(() => editor?.getAttributes("link").href as string | undefined ?? "");
  const [error, setError] = useState("");

  function applyLink() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      onClose();
      return;
    }

    if (!isSafeUrl(trimmedUrl)) {
      setError("Use a safe http, https, or mailto link.");
      return;
    }

    editor?.chain().focus().extendMarkRange("link").setLink({ href: trimmedUrl }).run();
    onClose();
  }

  return (
    <div>
      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Add link</p>
      <label className="mt-3 grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        URL
        <input
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-sky-950"
          onChange={(event) => {
            setUrl(event.target.value);
            setError("");
          }}
          placeholder="https://example.com"
          value={url}
        />
      </label>
      {error ? <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">{error}</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={onClose} size="sm" variant="ghost">Cancel</Button>
        {editor?.isActive("link") ? <Button onClick={() => { editor.chain().focus().unsetLink().run(); onClose(); }} size="sm" variant="outline">Remove</Button> : null}
        <Button onClick={applyLink} size="sm" variant="primary">Apply</Button>
      </div>
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M14 2v5h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function readDraft(key: string): JSONContent {
  if (typeof window === "undefined") return emptyDocument;

  try {
    const parsed = JSON.parse(appStorage.get(key) ?? "");
    return parsed?.type === "doc" ? parsed : emptyDocument;
  } catch {
    return emptyDocument;
  }
}

function SendIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 14-7-4 14-3-6-7-1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M9 7H5v4m0-4 5 5a6 6 0 1 0 4-10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M15 7h4v4m0-4-5 5a6 6 0 1 1-4-10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
