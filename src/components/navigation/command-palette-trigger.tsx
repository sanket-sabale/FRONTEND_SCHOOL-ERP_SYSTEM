"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Role } from "@/types/erp";

const CommandPalette = dynamic(
  () => import("@/components/navigation/command-palette").then((module) => module.CommandPalette),
  { ssr: false },
);

export function CommandPaletteTrigger({ role }: { role: Role }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActive(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (active) return <CommandPalette defaultOpen role={role} />;

  return (
    <button
      aria-label="Open global search"
      className="group h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-500 transition hover:bg-white hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-200 sm:min-w-56 lg:w-72"
      onClick={() => setActive(true)}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-current" />
        <span className="block truncate">Search students, pages, actions...</span>
      </span>
    </button>
  );
}
