"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { navigation, rolePermissions } from "@/config/navigation";
import { tenantContext } from "@/lib/tenant-context";
import { appStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { NavItem, NavSection, Role } from "@/types/erp";
import { Button } from "@/components/ui";
import { ChevronIcon, CloseIcon, MenuIcon, PanelToggleIcon, SidebarIcon } from "@/components/layout/sidebar-icons";
import { UserProfile } from "@/components/user/user-profile";
import type { CurrentUser } from "@/types/erp";

const collapseStorageKey = "school-erp-sidebar-collapsed";

type SidebarProps = {
  role: Role;
  user: CurrentUser;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function filterNavigationByRole(role: Role, sections: NavSection[] = navigation) {
  const permissions = rolePermissions[role];

  function filterItem(item: NavItem): NavItem | null {
    if (!permissions.includes(item.permission)) return null;

    const children = item.children
      ?.map(filterItem)
      .filter((child): child is NavItem => Boolean(child));

    return {
      ...item,
      children,
    };
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map(filterItem)
        .filter((item): item is NavItem => Boolean(item)),
    }))
    .filter((section) => section.items.length > 0);
}

export function usePersistedSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;

    return appStorage.get(collapseStorageKey) === "true";
  });

  function updateCollapsed(nextCollapsed: boolean) {
    setCollapsed(nextCollapsed);
    appStorage.set(collapseStorageKey, String(nextCollapsed));
  }

  return [collapsed, updateCollapsed] as const;
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button aria-label="Open navigation" className="lg:hidden" onClick={onClick} size="icon" variant="secondary">
      <MenuIcon />
    </Button>
  );
}

export function Sidebar({
  role,
  user,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  const sections = useMemo(() => filterNavigationByRole(role), [role]);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onMobileOpenChange(false);

      if (event.key === "Tab" && mobilePanelRef.current) {
        const focusableElements = Array.from(
          mobilePanelRef.current.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
          ),
        ).filter((element) => element.offsetParent !== null);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) return;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    mobilePanelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [mobileOpen, onMobileOpenChange]);

  return (
    <>
      {mobileOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      ) : null}

      <aside
        aria-label="Primary navigation drawer"
        aria-modal="true"
        className={cn(
          "scrollbar-hidden fixed inset-y-0 left-0 z-50 w-[min(336px,90vw)] transform overflow-hidden border-r border-border bg-surface shadow-2xl transition-transform duration-200 motion-reduce:transition-none lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        ref={mobilePanelRef}
        role="dialog"
      >
        <SidebarFrame collapsed={false} onMobileOpenChange={onMobileOpenChange} sections={sections} user={user} />
      </aside>

      <aside
        className={cn(
          "scrollbar-hidden fixed bottom-0 left-0 top-[65px] z-20 hidden overflow-hidden border-r border-border bg-surface transition-[width] duration-200 motion-reduce:transition-none lg:block",
          collapsed ? "w-[76px]" : "w-[280px]",
        )}
      >
        <SidebarFrame
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
          sections={sections}
          user={user}
        />
      </aside>
    </>
  );
}

function SidebarFrame({
  collapsed,
  onCollapsedChange,
  onMobileOpenChange,
  sections,
  user,
}: {
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onMobileOpenChange?: (open: boolean) => void;
  sections: NavSection[];
  user: CurrentUser;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader collapsed={collapsed} onCollapsedChange={onCollapsedChange} onMobileOpenChange={onMobileOpenChange} />
      <SidebarNavigation collapsed={collapsed} onNavigate={() => onMobileOpenChange?.(false)} sections={sections} />
      <SidebarFooter collapsed={collapsed} user={user} />
    </div>
  );
}

function SidebarHeader({
  collapsed,
  onCollapsedChange,
  onMobileOpenChange,
}: {
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  if (collapsed && onCollapsedChange) {
    return (
      <div className="shrink-0 space-y-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <Link
          aria-label="SchoolERP dashboard"
          className="grid place-items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          href="/#dashboard"
          title="SchoolERP dashboard"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-700 text-sm font-bold text-white shadow-sm">
            SE
          </div>
        </Link>
        <Button
          aria-label="Expand sidebar"
          className="w-full"
          onClick={() => onCollapsedChange(false)}
          size="icon"
          title="Expand sidebar"
          variant="ghost"
        >
          <PanelToggleIcon collapsed={collapsed} />
        </Button>
        <TenantContext collapsed={collapsed} />
      </div>
    );
  }

  return (
    <div className="shrink-0 space-y-3 border-b border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <Link aria-label="SchoolERP dashboard" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" href="/#dashboard">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-700 text-sm font-bold text-white shadow-sm">
            SE
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">SchoolERP</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Institution OS</p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {onCollapsedChange ? (
            <Button
              aria-label="Collapse sidebar"
              onClick={() => onCollapsedChange(true)}
              size="icon"
              title="Collapse sidebar"
              variant="ghost"
            >
              <PanelToggleIcon collapsed={collapsed} />
            </Button>
          ) : null}
          {onMobileOpenChange ? (
            <Button aria-label="Close navigation" onClick={() => onMobileOpenChange(false)} size="icon" variant="ghost">
              <CloseIcon />
            </Button>
          ) : null}
        </div>
      </div>

      <TenantContext collapsed={collapsed} />
    </div>
  );
}

function TenantContext({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <button
        aria-label={`${tenantContext.school}, ${tenantContext.campus}, academic year ${tenantContext.academicYear}`}
        className="group relative grid h-11 w-full place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-sky-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-sky-300"
        type="button"
      >
        SPS
        <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-lg group-hover:block dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {tenantContext.school}
        </span>
      </button>
    );
  }

  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-left">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{tenantContext.school}</span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{tenantContext.campus}</span>
        </span>
        <ChevronIcon open={false} />
      </summary>
      <div className="space-y-3 border-t border-slate-200 px-3 py-3 text-xs dark:border-slate-800">
        <ContextBlock label="Organization" value={tenantContext.group} />
        <ContextBlock label="Academic year" value={tenantContext.academicYear} />
        <p className="text-slate-500">Tenant switching is permission-aware; backend authorization remains authoritative.</p>
      </div>
    </details>
  );
}

function ContextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="responsive-text mt-1 text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  );
}

function SidebarNavigation({
  collapsed,
  onNavigate,
  sections,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  sections: NavSection[];
}) {
  const activePath = useActivePath();
  const activeTree = useMemo(() => getActiveNavigationState(sections, activePath), [activePath, sections]);

  return (
    <nav aria-label="Primary navigation" className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-5">
        {sections.map((section) => (
          <NavigationGroup
            activeTree={activeTree}
            collapsed={collapsed}
            key={section.label}
            onNavigate={onNavigate}
            section={section}
          />
        ))}
      </div>
    </nav>
  );
}

function NavigationGroup({
  activeTree,
  collapsed,
  onNavigate,
  section,
}: {
  activeTree: ActiveNavigationState;
  collapsed: boolean;
  onNavigate?: () => void;
  section: NavSection;
}) {
  return (
    <div>
      {!collapsed ? (
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section.label}</p>
      ) : (
        <p className="sr-only">{section.label}</p>
      )}
      <div className="mt-1 space-y-1">
        {section.items.map((item) => (
          <NavigationItem
            activeTree={activeTree}
            collapsed={collapsed}
            item={item}
            key={`${section.label}-${item.label}`}
            level={0}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function NavigationItem({
  activeTree,
  collapsed,
  item,
  level,
  onNavigate,
}: {
  activeTree: ActiveNavigationState;
  collapsed: boolean;
  item: NavItem;
  level: number;
  onNavigate?: () => void;
}) {
  const children = item.children ?? [];
  const state = activeTree.items.get(item);
  const isCurrent = Boolean(state?.current);
  const hasActiveChild = Boolean(state?.activeDescendant);
  const isActive = isCurrent || hasActiveChild;
  const [manuallyOpen, setManuallyOpen] = useState<boolean | null>(null);
  const open = hasActiveChild || isCurrent || (manuallyOpen ?? false);
  const itemId = `sidebar-${slugify(item.label)}-${level}`;
  const childListId = `${itemId}-children`;

  if (children.length > 0 && !collapsed) {
    return (
      <div>
        <button
          aria-controls={childListId}
          aria-expanded={open}
          className={navItemClasses({ active: isActive, collapsed: false, current: isCurrent, level })}
          onClick={() => setManuallyOpen((value) => !(value ?? open))}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-md text-current">
              <SidebarIcon name={item.icon} />
              {isActive ? <ActiveRail level={level} /> : null}
            </span>
            <span className="truncate">{item.label}</span>
          </span>
          <span className="flex items-center gap-2">
            {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
            <ChevronIcon open={open} />
          </span>
        </button>
        {open ? (
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3 motion-safe:animate-sidebar-group" id={childListId}>
            {children.map((child) => (
              <NavigationItem
                activeTree={activeTree}
                collapsed={collapsed}
                item={child}
                key={`${item.label}-${child.label}`}
                level={level + 1}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      aria-current={isCurrent ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={navItemClasses({ active: isActive, collapsed, current: isCurrent, level })}
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <span className={cn("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
        <span className={cn("relative grid shrink-0 place-items-center rounded-md text-current", collapsed ? "h-9 w-9" : "h-7 w-7")}>
          <SidebarIcon name={item.icon} />
          {isActive ? <ActiveRail level={level} /> : null}
        </span>
        {!collapsed ? <span className="truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
      </span>
      {!collapsed && item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
      {collapsed ? <Tooltip>{item.label}</Tooltip> : null}
    </Link>
  );
}

function ActiveRail({ level }: { level: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary",
        level === 0 ? "-left-3" : "-left-[19px]",
      )}
    />
  );
}

function NavBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      {children}
    </span>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-lg group-hover:block group-focus-visible:block dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      {children}
    </span>
  );
}

function SidebarFooter({ collapsed, user }: { collapsed: boolean; user: CurrentUser }) {
  return (
    <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
      <Link
        className={cn(
          "group relative mb-2 flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
          collapsed && "justify-center px-2",
        )}
        href="/#help"
        title={collapsed ? "Help" : undefined}
      >
        <SidebarIcon name="help" />
        {!collapsed ? <span>Help</span> : <span className="sr-only">Help</span>}
        {collapsed ? <Tooltip>Help</Tooltip> : null}
      </Link>
      <UserProfile collapsed={collapsed} placement="sidebar" user={user} />
    </div>
  );
}

function navItemClasses({
  active,
  collapsed,
  current,
  level,
}: {
  active: boolean;
  collapsed: boolean;
  current: boolean;
  level: number;
}) {
  return cn(
    "group relative flex min-h-10 items-center justify-between gap-3 rounded-lg py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 motion-reduce:transition-none",
    collapsed ? "px-2" : level === 0 ? "px-3" : "px-2.5",
    current && "bg-sky-50 text-sky-800 shadow-[inset_0_0_0_1px_rgb(186_230_253)] dark:bg-sky-950 dark:text-sky-100 dark:shadow-[inset_0_0_0_1px_rgb(12_74_110)]",
    active && !current && "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100",
    !active && "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
  );
}

function useActivePath() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  return `${pathname}${hash}`;
}

type ActiveNavigationState = {
  items: Map<NavItem, { activeDescendant: boolean; current: boolean; ownScore: number; subtreeScore: number }>;
};

function getActiveNavigationState(sections: NavSection[], activePath: string): ActiveNavigationState {
  const location = parseActivePath(activePath);
  const itemScores = new Map<NavItem, { activeDescendant: boolean; current: boolean; ownScore: number; subtreeScore: number }>();
  let bestOwnScore = 0;

  function visit(item: NavItem, depth = 0): number {
    const baseOwnScore = getItemMatchScore(item, location);
    const ownScore = baseOwnScore > 0 ? baseOwnScore + depth : 0;
    bestOwnScore = Math.max(bestOwnScore, ownScore);

    const childScores = item.children?.map((child) => visit(child, depth + 1)) ?? [];
    const bestChildScore = Math.max(0, ...childScores);
    const subtreeScore = Math.max(ownScore, bestChildScore);

    itemScores.set(item, {
      activeDescendant: bestChildScore > 0,
      current: false,
      ownScore,
      subtreeScore,
    });

    return subtreeScore;
  }

  sections.forEach((section) => section.items.forEach((item) => visit(item)));

  itemScores.forEach((state) => {
    state.current = state.ownScore > 0 && state.ownScore === bestOwnScore;
  });

  return { items: itemScores };
}

function parseActivePath(activePath: string) {
  const [rawPathname = "/", rawHash = ""] = activePath.split("#");

  return {
    hash: rawHash ? `#${rawHash}` : "",
    pathname: normalizePath(rawPathname),
  };
}

function getItemMatchScore(item: NavItem, location: { hash: string; pathname: string }) {
  const candidates = [...new Set([...(item.activeMatch ?? []), item.href])];

  return candidates.reduce((bestScore, candidate) => {
    return Math.max(bestScore, getCandidateMatchScore(candidate, location, item.href));
  }, 0);
}

function getCandidateMatchScore(candidate: string, location: { hash: string; pathname: string }, href: string) {
  const { hash: candidateHash, pathname: candidatePathname } = parseHref(candidate);
  const hrefParts = parseHref(href);

  if (candidate.startsWith("#")) {
    return location.hash === candidate ? 500 + candidate.length : 0;
  }

  if (candidateHash && location.hash !== candidateHash) {
    return 0;
  }

  if (candidatePathname === "/") {
    const hrefHashAllowsRoot = hrefParts.hash ? location.hash === hrefParts.hash : location.hash === "";
    return location.pathname === "/" && hrefHashAllowsRoot ? 100 : 0;
  }

  if (location.pathname === candidatePathname) {
    return 10_000 + countPathSegments(candidatePathname) * 100 + (candidateHash ? 20 : 0);
  }

  if (location.pathname.startsWith(`${candidatePathname}/`)) {
    return 1_000 + countPathSegments(candidatePathname) * 100 + (candidateHash ? 20 : 0);
  }

  return 0;
}

function parseHref(href: string) {
  const [pathWithQuery = "/", rawHash = ""] = href.split("#");
  const [pathname = "/"] = pathWithQuery.split("?");

  return {
    hash: rawHash ? `#${rawHash}` : "",
    pathname: normalizePath(pathname || "/"),
  };
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") return "/";

  return pathname.replace(/\/+$/, "") || "/";
}

function countPathSegments(pathname: string) {
  return normalizePath(pathname).split("/").filter(Boolean).length;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
