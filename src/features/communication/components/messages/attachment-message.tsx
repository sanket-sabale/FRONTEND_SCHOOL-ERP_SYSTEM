"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { formatFileSize } from "@/lib/api/attachments";
import { cn } from "@/lib/utils";
import type { MessageAttachment } from "@/types/communication";

export function AttachmentList({
  attachments,
  ownMessage,
}: {
  attachments?: MessageAttachment[];
  ownMessage: boolean;
}) {
  const [viewerAttachment, setViewerAttachment] = useState<MessageAttachment | null>(null);

  useEffect(() => {
    if (!viewerAttachment) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setViewerAttachment(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [viewerAttachment]);

  if (!attachments?.length) return null;

  return (
    <>
      <div className="mt-2 grid gap-2">
        {attachments.map((attachment) => (
          <AttachmentCard
            attachment={attachment}
            key={attachment.id}
            onPreview={() => setViewerAttachment(attachment)}
            ownMessage={ownMessage}
          />
        ))}
      </div>
      {viewerAttachment ? (
        <ImageViewer attachment={viewerAttachment} onClose={() => setViewerAttachment(null)} />
      ) : null}
    </>
  );
}

function AttachmentCard({
  attachment,
  onPreview,
  ownMessage,
}: {
  attachment: MessageAttachment;
  onPreview: () => void;
  ownMessage: boolean;
}) {
  const image = attachment.kind === "image" && Boolean(attachment.thumbnailUrl || attachment.url);
  const accessUrl = attachment.url;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border text-left shadow-sm",
        ownMessage
          ? "border-sky-200 bg-white/70 dark:border-sky-800 dark:bg-sky-950/60"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900",
      )}
    >
      {image ? (
        <button
          aria-label={`Preview image ${attachment.name}`}
          className="block w-full bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-slate-900"
          onClick={onPreview}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={attachment.name}
            className="max-h-52 w-full object-cover"
            src={attachment.thumbnailUrl ?? attachment.url}
          />
        </button>
      ) : null}
      <div className="flex min-w-0 items-center gap-3 p-2.5">
        {!image ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            <AttachmentFileIcon />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={attachment.name}>
            {attachment.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {attachmentLabel(attachment)} / {formatFileSize(attachment.size)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {image ? (
            <Button aria-label={`Open ${attachment.name}`} onClick={onPreview} size="icon" title="Open preview" variant="ghost">
              <OpenIcon />
            </Button>
          ) : null}
          {accessUrl ? (
            <a
              aria-label={`Download ${attachment.name}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:text-slate-200 dark:hover:bg-slate-900"
              download={attachment.name}
              href={accessUrl}
              title="Download"
            >
              <DownloadIcon />
            </a>
          ) : (
            <Button aria-label={`Download ${attachment.name} unavailable in mock storage`} disabled size="icon" title="Secure download endpoint pending" variant="ghost">
              <DownloadIcon />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageViewer({ attachment, onClose }: { attachment: MessageAttachment; onClose: () => void }) {
  return (
    <div
      aria-label={`Image preview for ${attachment.name}`}
      aria-modal="true"
      className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/80 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div className="relative max-h-full w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <Button aria-label="Close image preview" className="absolute right-2 top-2 z-10 bg-white/95 dark:bg-slate-950/95" onClick={onClose} size="icon" variant="outline">
          <CloseIcon />
        </Button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={attachment.name}
          className="mx-auto max-h-[86dvh] max-w-full rounded-xl border border-white/20 object-contain shadow-2xl"
          src={attachment.url ?? attachment.thumbnailUrl}
        />
      </div>
    </div>
  );
}

function attachmentLabel(attachment: MessageAttachment) {
  if (attachment.kind === "pdf") return "PDF";
  if (attachment.kind === "word") return "Word document";
  if (attachment.kind === "excel") return "Spreadsheet";
  if (attachment.kind === "powerpoint") return "Presentation";
  if (attachment.kind === "text") return "Text file";
  if (attachment.kind === "image") return "Image";
  return attachment.mimeType || "File";
}

function AttachmentFileIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M14 2v5h5M8 13h8M8 17h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
