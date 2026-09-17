"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button } from "@/components/ui";

const initialNotifications = [
  { id: "n-1", category: "Finance", title: "Refund approval required", detail: "₹28,400 refund for INV-2026-1178 requires principal confirmation.", unread: true },
  { id: "n-2", category: "Attendance", title: "Grade 9 attendance below threshold", detail: "Grade 9 B is at 84% for today. Class teacher has been notified.", unread: true },
  { id: "n-3", category: "Academic", title: "Report card publishing ready", detail: "Grade 10 pre-board report cards passed validation.", unread: false },
];

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-label={`Open notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative"
        onClick={() => setOpen((value) => !value)}
        size="icon"
        title="Notifications"
        variant="secondary"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border border-white bg-rose-700 px-1 text-[10px] font-semibold leading-none text-white dark:border-slate-950">
            {unreadCount}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="fixed left-3 right-3 top-20 z-40 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[360px]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold">Notification Center</p>
            <button
              className="text-xs font-medium text-sky-700 dark:text-sky-300"
              onClick={() => setNotifications((items) => items.map((item) => ({ ...item, unread: false })))}
              type="button"
            >
              Mark all read
            </button>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {notifications.map((notification) => (
              <button
                className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
                key={notification.id}
                onClick={() =>
                  setNotifications((items) =>
                    items.map((item) => (item.id === notification.id ? { ...item, unread: false } : item)),
                  )
                }
                type="button"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="responsive-text font-medium">{notification.title}</span>
                  <Badge tone={notification.unread ? "info" : "neutral"}>{notification.category}</Badge>
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{notification.detail}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M15 17H9m10-2.5c-.83-.9-1.5-1.58-1.5-4.5a5.5 5.5 0 0 0-11 0c0 2.92-.67 3.6-1.5 4.5-.34.37-.08 1 .43 1h13.14c.51 0 .77-.63.43-1ZM14 19a2 2 0 0 1-4 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
