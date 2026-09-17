"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StaffDocumentsError({ reset }: { reset: () => void }) {
  return <AppShell><div className="erp-container"><PageHeader eyebrow="Staff Documents" title="Unable to load documents" description="Staff documents could not be loaded." /><Card className="p-5"><EmptyState description="Try loading the document workspace again." title="Unable to load documents" /><Button className="mt-4" onClick={reset} type="button">Retry</Button></Card></div></AppShell>;
}
