"use client";

import { AppShell } from "@/components/app-shell";
import { Button, Card, EmptyState } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <AppShell><main className="erp-container"><Card className="p-5"><EmptyState title="Unable to load seat capacity" description="Retry after checking admission capacity permissions." /><Button className="mt-4" onClick={reset} variant="secondary">Retry</Button></Card></main></AppShell>;
}
