"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { navigation } from "@/config/navigation";
import { SidebarIcon } from "@/components/layout/sidebar-icons";
import { Button } from "@/components/ui";
import { hasPermission } from "@/components/shared/permission-gate";
import { appStorage } from "@/lib/storage";
import { tenantContext } from "@/lib/tenant-context";
import { cn } from "@/lib/utils";
import type { NavItem, NavigationIcon, Permission, Role } from "@/types/erp";

type CommandCategory = "recent" | "navigation" | "student" | "action";

type CommandResult = {
  id: string;
  title: string;
  description: string;
  category: CommandCategory;
  icon: NavigationIcon;
  href: string;
  permission: Permission;
  shortcut?: string;
  storeRecent?: boolean;
};

type CommandGroup = {
  category: CommandCategory;
  label: string;
  results: CommandResult[];
};

const recentStorageKey = "school-erp-command-recent";
const maxRecentItems = 5;

const categoryLabels: Record<CommandCategory, string> = {
  recent: "Recent",
  navigation: "Navigation",
  student: "Students",
  action: "Actions",
};

const quickActions: CommandResult[] = [
  {
    id: "action-my-profile",
    title: "My Profile",
    description: "View your account, role, and school context",
    category: "action",
    icon: "users",
    href: "/profile",
    permission: "dashboard.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-communication",
    title: "Open Communication",
    description: "Open conversations, groups, channels, broadcasts, and notices",
    category: "action",
    icon: "communication",
    href: "/communication",
    permission: "communication.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-student-directory",
    title: "Open Student Directory",
    description: "Review student records, filters, and directory results",
    category: "action",
    icon: "students",
    href: "/students",
    permission: "student.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-add-student",
    title: "Add Student",
    description: "Start a new student admission record",
    category: "action",
    icon: "students",
    href: "/students/new",
    permission: "student.create",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-guardians",
    title: "Open Guardians",
    description: "Review guardian records and student relationships",
    category: "action",
    icon: "parents",
    href: "/guardians",
    permission: "guardian.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-add-guardian",
    title: "Add Guardian",
    description: "Create a guardian or parent record",
    category: "action",
    icon: "parents",
    href: "/guardians/new",
    permission: "guardian.create",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff",
    title: "Open Staff",
    description: "Review staff directory, filters, profiles, and lifecycle status",
    category: "action",
    icon: "users",
    href: "/staff",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-add-staff",
    title: "Add Staff",
    description: "Create a staff record in the current school context",
    category: "action",
    icon: "users",
    href: "/staff/new",
    permission: "hr.manage",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff-departments",
    title: "Open Staff Departments",
    description: "Manage staff departments and active staff counts",
    category: "action",
    icon: "users",
    href: "/staff/departments",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff-designations",
    title: "Open Staff Designations",
    description: "Manage staff designations and category mapping",
    category: "action",
    icon: "users",
    href: "/staff/designations",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff-attendance",
    title: "Open Staff Attendance",
    description: "Mark and review staff attendance in the current school context",
    category: "action",
    icon: "attendance",
    href: "/staff/attendance",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff-leave",
    title: "Open Staff Leave",
    description: "Submit and review staff leave requests and balances",
    category: "action",
    icon: "users",
    href: "/staff/leave",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff-documents",
    title: "Open Staff Documents",
    description: "Review staff HR documents, verification, and expiry tracking",
    category: "action",
    icon: "users",
    href: "/staff/documents",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff-performance",
    title: "Open Staff Performance",
    description: "Review staff performance cycles, goals, training, and HR development",
    category: "action",
    icon: "users",
    href: "/staff/performance",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff-academic-assignments",
    title: "Open Staff Academic Assignments",
    description: "Assign teachers to academic year, class, section, and subject responsibilities",
    category: "action",
    icon: "users",
    href: "/staff/academic-assignments",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-staff-workload",
    title: "Open Staff Workload",
    description: "Review teaching load, readiness gaps, and scheduling conflicts",
    category: "action",
    icon: "users",
    href: "/staff/workload",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-hr-operations",
    title: "Open HR Operations",
    description: "Review protected HR notes, records, and staff HR timeline",
    category: "action",
    icon: "users",
    href: "/staff/hr-operations",
    permission: "hr.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-attendance",
    title: "Open Attendance",
    description: "Review daily student attendance records and summaries",
    category: "action",
    icon: "attendance",
    href: "/attendance",
    permission: "attendance.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-academic-years",
    title: "Open Academic Years",
    description: "Manage academic year lifecycle and current-year status",
    category: "action",
    icon: "academics",
    href: "/academics/academic-years",
    permission: "academic.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-add-academic-year",
    title: "Add Academic Year",
    description: "Create an academic year in the current campus scope",
    category: "action",
    icon: "academics",
    href: "/academics/academic-years#create-academic-year",
    permission: "academic.manage",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-academic-classes",
    title: "Open Academic Classes",
    description: "Manage classes from Academic Structure",
    category: "action",
    icon: "academics",
    href: "/academics/classes",
    permission: "academic.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-add-academic-class",
    title: "Add Academic Class",
    description: "Create a class for a valid academic year",
    category: "action",
    icon: "academics",
    href: "/academics/classes#create-class",
    permission: "academic.manage",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-academic-sections",
    title: "Open Sections",
    description: "Manage sections from Academic Structure",
    category: "action",
    icon: "academics",
    href: "/academics/sections",
    permission: "academic.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-add-academic-section",
    title: "Add Section",
    description: "Create a section under an active class",
    category: "action",
    icon: "academics",
    href: "/academics/sections/new",
    permission: "academic.manage",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-student-placements",
    title: "Open Student Placements",
    description: "Review academic placement history by student, class, and section",
    category: "action",
    icon: "academics",
    href: "/academics/student-placements",
    permission: "academic.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-academic-promotions",
    title: "Open Promotions",
    description: "Review academic year transition and individual student promotion planning",
    category: "action",
    icon: "academics",
    href: "/academics/promotions",
    permission: "academic.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-bulk-promotion-preview",
    title: "Open Bulk Promotion Preview",
    description: "Preview selected promotion candidates without applying promotions",
    category: "action",
    icon: "academics",
    href: "/academics/promotions/bulk-preview",
    permission: "academic.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-promotion-audit",
    title: "Open Promotion Audit",
    description: "Review read-only promotion evidence, lifecycle history, and batch correlation",
    category: "action",
    icon: "audit",
    href: "/academics/promotions/audit",
    permission: "academic.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-mark-attendance",
    title: "Mark Attendance",
    description: "Open the student attendance-taking workspace",
    category: "action",
    icon: "attendance",
    href: "/attendance/mark",
    permission: "attendance.mark",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-attendance-history",
    title: "Open Attendance History",
    description: "Review corrected records and attendance correction timelines",
    category: "action",
    icon: "attendance",
    href: "/attendance/history",
    permission: "attendance.history.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-attendance-reports",
    title: "Open Attendance Reports",
    description: "Analyze attendance trends, distribution, and students requiring attention",
    category: "action",
    icon: "reports",
    href: "/attendance/reports",
    permission: "attendance.report",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-attendance-export",
    title: "Open Attendance Export",
    description: "Configure attendance export requests and report packs",
    category: "action",
    icon: "reports",
    href: "/attendance/export",
    permission: "attendance.report",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-attendance-integrity",
    title: "Open Snapshot Integrity",
    description: "Review attendance snapshot diagnostics and migration readiness",
    category: "action",
    icon: "audit",
    href: "/attendance/integrity",
    permission: "attendance.integrity.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-attendance-repair-queue",
    title: "Open Repair Queue",
    description: "Review controlled attendance snapshot repair requests",
    category: "action",
    icon: "audit",
    href: "/attendance/integrity/repairs",
    permission: "attendance.manage",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-open-attendance-repair-audit",
    title: "Open Attendance Integrity Audit",
    description: "Review read-only repair evidence, lifecycle history, and before/after snapshots",
    category: "action",
    icon: "audit",
    href: "/attendance/integrity/audit",
    permission: "attendance.integrity.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-record-payment",
    title: "Record Payment",
    description: "Go to payments and receipts",
    category: "action",
    icon: "finance",
    href: "/#payments",
    permission: "fees.view",
    shortcut: "Enter",
    storeRecent: true,
  },
  {
    id: "action-generate-report",
    title: "Generate Report",
    description: "Create an academic, attendance, finance, or HR report",
    category: "action",
    icon: "reports",
    href: "/#reports",
    permission: "dashboard.view",
    shortcut: "Enter",
    storeRecent: true,
  },
];

const communicationShortcuts: CommandResult[] = [
  {
    id: "communication-inbox",
    title: "Inbox",
    description: "Open the communication inbox",
    category: "navigation",
    icon: "communication",
    href: "/communication",
    permission: "communication.view",
    storeRecent: true,
  },
  {
    id: "communication-chats",
    title: "Chats",
    description: "Open communication chats",
    category: "navigation",
    icon: "communication",
    href: "/communication",
    permission: "communication.view",
    storeRecent: true,
  },
  {
    id: "communication-groups",
    title: "Groups",
    description: "Open communication groups",
    category: "navigation",
    icon: "communication",
    href: "/communication",
    permission: "communication.view",
    storeRecent: true,
  },
  {
    id: "communication-channels",
    title: "Channels",
    description: "Open communication channels",
    category: "navigation",
    icon: "communication",
    href: "/communication",
    permission: "communication.view",
    storeRecent: true,
  },
  {
    id: "communication-broadcasts",
    title: "Broadcasts",
    description: "Open communication broadcasts",
    category: "navigation",
    icon: "communication",
    href: "/communication",
    permission: "communication.broadcast",
    storeRecent: true,
  },
  {
    id: "communication-notices",
    title: "Notices",
    description: "Open communication notices",
    category: "navigation",
    icon: "communication",
    href: "/communication",
    permission: "communication.view",
    storeRecent: true,
  },
];

export function CommandPalette({ defaultOpen = false, role }: { defaultOpen?: boolean; role: Role }) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    return readRecentIds();
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resultRefs = useRef(new Map<string, HTMLElement>());

  const shortcut = useMemo(() => getShortcutLabel(), []);
  const searchableResults = useMemo(() => buildSearchableResults(role), [role]);
  const groups = useMemo(
    () => buildGroups(searchableResults, recentIds, query),
    [query, recentIds, searchableResults],
  );
  const flatResults = useMemo(() => groups.flatMap((group) => group.results), [groups]);
  const activeIndex = flatResults.length === 0 ? -1 : Math.min(selectedIndex, flatResults.length - 1);
  const activeResult = activeIndex >= 0 ? flatResults[activeIndex] : undefined;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => {
          if (value) triggerRef.current?.focus();
          return !value;
        });
      }

      if (event.key === "Escape") {
        closePalette();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function handlePointerDown(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        closePalette();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("pointerdown", handlePointerDown);
    window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!activeResult) return;

    resultRefs.current.get(activeResult.id)?.scrollIntoView({
      block: "nearest",
    });
  }, [activeResult]);

  function closePalette() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function executeResult(result: CommandResult) {
    if (result.storeRecent) {
      const nextRecentIds = [result.id, ...recentIds.filter((id) => id !== result.id)].slice(0, maxRecentItems);
      setRecentIds(nextRecentIds);
      appStorage.set(recentStorageKey, JSON.stringify(nextRecentIds));
    }

    window.location.href = result.href;
    closePalette();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => (flatResults.length === 0 ? 0 : (index + 1) % flatResults.length));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => (flatResults.length === 0 ? 0 : (index - 1 + flatResults.length) % flatResults.length));
    }

    if (event.key === "Enter" && activeResult) {
      event.preventDefault();
      executeResult(activeResult);
    }
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open global search"
        className="group h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-500 transition hover:bg-white hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-200 sm:min-w-56 lg:w-72"
        onClick={() => {
          setOpen(true);
          setSelectedIndex(0);
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          <SearchIcon className="h-4 w-4 shrink-0" />
          <span className="block truncate">Search students, pages, actions...</span>
        </span>
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div
          aria-describedby="command-palette-description"
          aria-labelledby="command-palette-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] overflow-hidden bg-slate-950/35 p-2 sm:p-4"
          role="dialog"
        >
          <div
            className="mx-auto flex h-[calc(100vh-16px)] max-w-2xl animate-command-panel flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:mt-14 sm:h-auto sm:max-h-[72vh] sm:rounded-2xl"
            ref={panelRef}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:hidden">
              <h2 className="text-sm font-semibold">Search</h2>
              <Button aria-label="Close search" onClick={closePalette} size="icon" variant="ghost">
                <CloseIcon />
              </Button>
            </div>

            <div className="border-b border-slate-200 p-3 dark:border-slate-800 sm:p-4">
              <h2 className="sr-only sm:not-sr-only sm:text-sm sm:font-semibold" id="command-palette-title">Global search and commands</h2>
              <p className="sr-only" id="command-palette-description">
                Search navigation, available actions, and authorized school records for {tenantContext.school}.
              </p>
              <label className="sr-only" htmlFor="command-search">Search students, staff, pages, actions</label>
              <div className="mt-0 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-900 sm:mt-3">
                <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  aria-activedescendant={activeResult ? `command-result-${activeResult.id}` : undefined}
                  aria-autocomplete="list"
                  aria-controls="command-results"
                  aria-expanded="true"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-50"
                  id="command-search"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search students, staff, pages, actions..."
                  ref={inputRef}
                  role="combobox"
                  value={query}
                />
                {query ? (
                  <Button
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("");
                      setSelectedIndex(0);
                      inputRef.current?.focus();
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <CloseIcon />
                  </Button>
                ) : (
                  <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950 sm:inline-flex">
                    {shortcut}
                  </kbd>
                )}
              </div>
            </div>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-2" id="command-results" role="listbox">
              {groups.length === 0 ? (
                <CommandEmptyState query={query} />
              ) : (
                groups.map((group) => (
                  <CommandResultGroup
                    activeResultId={activeResult?.id}
                    group={group}
                    key={group.category}
                    onExecute={executeResult}
                    onHover={(result) => setSelectedIndex(flatResults.findIndex((item) => item.id === result.id))}
                    query={query}
                    resultRefs={resultRefs}
                  />
                ))
              )}
            </div>

            <div className="hidden shrink-0 items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 sm:flex">
              <span className="responsive-text">Results are scoped to {tenantContext.school} / {tenantContext.academicYear}</span>
              <span className="flex items-center gap-3">
                <span><kbd className="command-kbd">↑↓</kbd> Navigate</span>
                <span><kbd className="command-kbd">Enter</kbd> Open</span>
                <span><kbd className="command-kbd">Esc</kbd> Close</span>
              </span>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function CommandResultGroup({
  activeResultId,
  group,
  onExecute,
  onHover,
  query,
  resultRefs,
}: {
  activeResultId?: string;
  group: CommandGroup;
  onExecute: (result: CommandResult) => void;
  onHover: (result: CommandResult) => void;
  query: string;
  resultRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}) {
  return (
    <section className="py-2">
      <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {group.label}
      </div>
      <div className="space-y-1">
        {group.results.map((result) => {
          const active = activeResultId === result.id;

          return (
            <a
              aria-selected={active}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                active
                  ? "bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
              )}
              href={result.href}
              id={`command-result-${result.id}`}
              key={result.id}
              onClick={(event) => {
                event.preventDefault();
                onExecute(result);
              }}
              onMouseEnter={() => onHover(result)}
              ref={(node) => {
                if (node) resultRefs.current.set(result.id, node);
                else resultRefs.current.delete(result.id);
              }}
              role="option"
            >
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border", active ? "border-sky-200 bg-white dark:border-sky-900 dark:bg-slate-950" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950")}>
                <SidebarIcon name={result.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="responsive-text block text-sm font-semibold">
                  <HighlightedText query={query} text={result.title} />
                </span>
                <span className="responsive-text mt-0.5 block text-xs leading-5 text-slate-500">
                  <HighlightedText query={query} text={result.description} />
                </span>
              </span>
              {result.shortcut ? (
                <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950 sm:inline-flex">
                  {result.shortcut}
                </kbd>
              ) : null}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function CommandEmptyState({ query }: { query: string }) {
  return (
    <div className="grid min-h-56 place-items-center px-6 py-10 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <SearchIcon className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {query ? "No results found" : "Search students, pages, and actions"}
        </p>
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {query ? "Try a different student name, module, action, or page." : "Start typing to search the ERP workspace for permitted navigation and quick actions."}
        </p>
      </div>
    </div>
  );
}

function HighlightedText({ query, text }: { query: string; text: string }) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;

  const index = text.toLowerCase().indexOf(trimmedQuery.toLowerCase());
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-sky-100 px-0.5 text-inherit dark:bg-sky-900">{text.slice(index, index + trimmedQuery.length)}</mark>
      {text.slice(index + trimmedQuery.length)}
    </>
  );
}

function buildGroups(results: CommandResult[], recentIds: string[], query: string): CommandGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredResults = normalizedQuery
    ? results.filter((result) => searchTarget(result).includes(normalizedQuery))
    : results;

  const recentResults = !normalizedQuery
    ? recentIds
        .map((id) => results.find((result) => result.id === id && result.storeRecent))
        .filter((result): result is CommandResult => Boolean(result))
    : [];

  const orderedGroups: CommandCategory[] = normalizedQuery
    ? ["navigation", "student", "action"]
    : ["recent", "navigation", "action"];

  return orderedGroups
    .map((category) => ({
      category,
      label: categoryLabels[category],
      results: category === "recent"
        ? recentResults
        : filteredResults.filter((result) => result.category === category).slice(0, category === "navigation" ? 10 : 6),
    }))
    .filter((group) => group.results.length > 0);
}

function buildSearchableResults(role: Role): CommandResult[] {
  return [
    ...flattenNavigation(role),
    ...buildStudentResults(role),
    ...communicationShortcuts.filter((shortcut) => hasPermission(role, shortcut.permission)),
    ...quickActions.filter((action) => hasPermission(role, action.permission)),
  ];
}

function flattenNavigation(role: Role) {
  const results: CommandResult[] = [];

  function visitItem(item: NavItem, parent?: string) {
    if (!hasPermission(role, item.permission)) return;

    results.push({
      id: `nav-${item.label.toLowerCase().replaceAll(" ", "-")}-${item.href}`,
      title: item.label,
      description: parent ? `${parent} / ${item.label}` : "Open ERP module",
      category: "navigation",
      icon: item.icon ?? "dashboard",
      href: item.href,
      permission: item.permission,
      storeRecent: true,
    });

    item.children?.forEach((child) => visitItem(child, item.label));
  }

  navigation.forEach((section) => section.items.forEach((item) => visitItem(item, section.label)));
  return results;
}

function buildStudentResults(role: Role): CommandResult[] {
  if (!hasPermission(role, "student.view")) return [];

  return [];
}

function searchTarget(result: CommandResult) {
  return `${result.title} ${result.description} ${categoryLabels[result.category]}`.toLowerCase();
}

function readRecentIds() {
  try {
    const parsed = JSON.parse(appStorage.get(recentStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, maxRecentItems) : [];
  } catch {
    return [];
  }
}

function getShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl K";

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "Cmd K" : "Ctrl K";
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
