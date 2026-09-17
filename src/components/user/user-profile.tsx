"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SidebarIcon } from "@/components/layout/sidebar-icons";
import { getInitials } from "@/lib/current-user";
import { tenantContext } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types/erp";

type UserProfileProps = {
  user: CurrentUser;
  collapsed?: boolean;
  placement?: "header" | "sidebar";
};

const menuActions = [
  { label: "My Profile", href: "/profile", icon: "users" },
  { label: "Account Settings", href: "/#admin", icon: "settings" },
  { label: "Notifications", href: "/#notifications", icon: "communication" },
  { label: "Preferences", href: "/#preferences", icon: "settings" },
  { label: "Security", href: "/#security", icon: "audit" },
] as const;

export function UserProfile({ user, collapsed = false, placement = "header" }: UserProfileProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const initials = getInitials(user.name);
  const roleLabel = user.roles.join(" / ");
  const menuId = `user-profile-menu-${placement}`;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("a, button")?.focus());

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function signOut() {
    closeMenu();
    router.push("/login");
  }

  return (
    <div className="relative">
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Open account menu for ${user.name}`}
        className={cn(
          "group flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 text-left transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800",
          placement === "header" && "h-9 min-h-9 w-auto rounded-lg border-0 bg-slate-900 p-0 dark:bg-slate-100",
          collapsed && "justify-center",
        )}
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        <UserAvatar initials={initials} name={user.name} size={placement === "header" ? "sm" : "md"} />
        {!collapsed && placement !== "header" ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</span>
            <span className="block truncate text-xs text-slate-500">{roleLabel}</span>
          </span>
        ) : null}
        {collapsed ? <span className="sr-only">{user.name}, {roleLabel}</span> : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className={cn(
                "fixed z-[110] w-[min(340px,calc(100vw-24px))] animate-command-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950",
                placement === "sidebar"
                  ? "bottom-4 left-3 lg:left-[calc(var(--sidebar-profile-left,0px)+12px)]"
                  : "right-3 top-16 sm:right-4 lg:right-6",
              )}
              id={menuId}
              ref={menuRef}
              role="menu"
            >
              <UserIdentity user={user} initials={initials} roleLabel={roleLabel} />
              <MenuGroup label="User">
                {menuActions.map((action) => (
                  <MenuLink href={action.href} icon={action.icon} key={action.label} onClick={closeMenu}>
                    {action.label}
                  </MenuLink>
                ))}
              </MenuGroup>
              <MenuGroup label="Support">
                <MenuLink href="/#help" icon="help" onClick={closeMenu}>Help & Support</MenuLink>
              </MenuGroup>
              <div className="border-t border-slate-200 p-2 dark:border-slate-800">
                <button
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-rose-300 dark:hover:bg-rose-950"
                  onClick={signOut}
                  role="menuitem"
                  type="button"
                >
                  <LogoutIcon />
                  Sign Out
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function UserAvatar({ initials, name, size }: { initials: string; name: string; size: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-9 w-9 text-sm",
    md: "h-8 w-8 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  return (
    <span
      aria-label={name}
      className={cn("grid shrink-0 place-items-center rounded-lg bg-slate-900 font-semibold text-white dark:bg-slate-100 dark:text-slate-950", sizes[size])}
      role="img"
    >
      {initials}
    </span>
  );
}

function UserIdentity({ initials, roleLabel, user }: { initials: string; roleLabel: string; user: CurrentUser }) {
  return (
    <div className="border-b border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <UserAvatar initials={initials} name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="responsive-text text-sm font-semibold text-slate-950 dark:text-slate-50">{user.name}</p>
          <p className="responsive-text mt-0.5 text-xs text-slate-500">{roleLabel}</p>
          {user.email ? <p className="responsive-text mt-2 text-xs text-slate-500">{user.email}</p> : null}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
        <p className="font-medium text-slate-900 dark:text-slate-100">{tenantContext.school}</p>
        <p className="mt-1 text-slate-500">{tenantContext.campus} / {tenantContext.academicYear}</p>
      </div>
    </div>
  );
}

function MenuGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="border-b border-slate-200 p-2 dark:border-slate-800">
      <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function MenuLink({
  children,
  href,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  href: string;
  icon: Parameters<typeof SidebarIcon>[0]["name"];
  onClick: () => void;
}) {
  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:bg-slate-900"
      href={href}
      onClick={onClick}
      role="menuitem"
    >
      <SidebarIcon name={icon} />
      {children}
    </Link>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path d="M10 17 5 12l5-5M5 12h12m-5 8h5a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
