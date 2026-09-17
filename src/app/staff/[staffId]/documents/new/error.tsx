"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function NewStaffDocumentError({ reset }: { reset: () => void }) {
  return <AppShell><div className="erp-container"><PageHeader eyebrow="Staff Documents" title="Unable to load upload form" description="The staff document upload form could not be loaded." /><Card className="p-5"><EmptyState description="Try loading the upload form again." title="Unable to load upload form" /><Button className="mt-4" onClick={reset} type="button">Retry</Button></Card></div></AppShell>;
}
