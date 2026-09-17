"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";

export function DiscardChangesDialog({
  confirmLabel = "Discard Changes",
  description = "You have unsaved changes. If you leave this page, your changes will be lost.",
  onCancel,
  onConfirm,
  title = "Discard changes?",
}: {
  confirmLabel?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      aria-describedby="discard-changes-dialog-description"
      aria-labelledby="discard-changes-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-slate-950/45 p-3"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
        <h2 className="text-lg font-semibold text-foreground" id="discard-changes-dialog-title">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-foreground-muted" id="discard-changes-dialog-description">
          {description}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button onClick={onCancel} ref={cancelRef} type="button" variant="secondary">
            Keep Editing
          </Button>
          <Button onClick={onConfirm} type="button" variant="destructive">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
