"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StaffAccountError({ reset }: { reset: () => void }) {
  return <AppShell><div className="erp-container"><PageHeader eyebrow="Account & Access" title="Unable to load account access" description="Staff account access could not be loaded." /><Card className="p-5"><EmptyState description="Try loading the account page again." title="Unable to load account access" /><Button className="mt-4" onClick={reset} type="button">Retry</Button></Card></div></AppShell>;
}
