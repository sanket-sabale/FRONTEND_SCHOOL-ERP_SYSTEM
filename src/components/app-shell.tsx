"use client";

import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { CommandPaletteTrigger } from "@/components/navigation/command-palette-trigger";
import { NotificationCenter } from "@/components/navigation/notification-center";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { MobileMenuButton, Sidebar, usePersistedSidebarState } from "@/components/layout/sidebar";
import { MenuIcon } from "@/components/layout/sidebar-icons";
import { Button, Select } from "@/components/ui";
import { UserProfile } from "@/components/user/user-profile";
import { currentSessionRole, getCurrentUser } from "@/lib/current-user";
import { tenantContext } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/erp";
import { useState } from "react";

const currentRole: Role = currentSessionRole;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedSidebarState();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const currentUser = getCurrentUser(currentRole);

  return (
    <div className="app-shell min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="app-header-grid min-h-16 px-3 py-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileMenuButton onClick={() => setMobileSidebarOpen(true)} />
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-700 text-sm font-bold text-white lg:hidden">
              SE
            </div>
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-sm font-semibold">SchoolERP OS</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Institution operations platform</p>
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-semibold">{tenantContext.school}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{tenantContext.campus} / {tenantContext.academicYear}</p>
            </div>
          </div>

          <div className="hidden min-w-0 grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2 md:grid lg:col-span-1 xl:grid-cols-4">
            <Select aria-label="Education group" defaultValue={tenantContext.group}>
              <option>{tenantContext.group}</option>
            </Select>
            <Select aria-label="School" defaultValue={tenantContext.school}>
              <option>{tenantContext.school}</option>
            </Select>
            <Select aria-label="Campus" defaultValue={tenantContext.campus}>
              <option>{tenantContext.campus}</option>
            </Select>
            <Select aria-label="Academic year" defaultValue={tenantContext.academicYear}>
              <option>{tenantContext.academicYear}</option>
            </Select>
          </div>

          <div className="app-header-actions justify-start sm:col-span-2 lg:col-span-1 lg:justify-end">
            <CommandPaletteTrigger role={currentRole} />
            <NotificationCenter />
            <ThemeToggle />
            <Button className="hidden sm:inline-flex" variant="ghost">Help</Button>
            <UserProfile placement="header" user={currentUser} />
          </div>
        </div>
      </header>

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCollapsedChange={setSidebarCollapsed}
        onMobileOpenChange={setMobileSidebarOpen}
        role={currentRole}
        user={currentUser}
      />

      <div className={cn("grid transition-[grid-template-columns] duration-200 motion-reduce:transition-none", sidebarCollapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[280px_minmax(0,1fr)]")}>
        <div aria-hidden="true" className="hidden lg:block" />
        <main className="min-w-0 px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-4 lg:hidden">
            <Breadcrumbs items={[tenantContext.group, tenantContext.school, tenantContext.campus, tenantContext.academicYear]} />
            <Button className="mobile-full-action" onClick={() => setMobileSidebarOpen(true)} variant="secondary">
              <MenuIcon />
              Browse Modules
            </Button>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
