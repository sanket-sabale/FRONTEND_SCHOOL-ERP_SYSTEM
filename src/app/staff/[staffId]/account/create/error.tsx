"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StaffAccountCreateError({ reset }: { reset: () => void }) {
  return <AppShell><div className="erp-container"><PageHeader eyebrow="Account & Access" title="Unable to load invite form" description="The account invitation form could not be loaded." /><Card className="p-5"><EmptyState description="Try loading the invite form again." title="Unable to load invite form" /><Button className="mt-4" onClick={reset} type="button">Retry</Button></Card></div></AppShell>;
}
