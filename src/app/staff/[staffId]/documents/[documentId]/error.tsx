"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StaffDocumentDetailError({ reset }: { reset: () => void }) {
  return <AppShell><div className="erp-container"><PageHeader eyebrow="Staff Documents" title="Unable to load document" description="The staff document detail could not be loaded." /><Card className="p-5"><EmptyState description="Try loading the document again." title="Unable to load document" /><Button className="mt-4" onClick={reset} type="button">Retry</Button></Card></div></AppShell>;
}
