"use client";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";

export default function TimetableError() {
  return <AppShell><div className="erp-container"><EmptyState title="Unable to load timetable" description="Please retry. If this continues, ask an administrator to review timetable access." /></div></AppShell>;
}
