import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";

export default function Loading() {
  return <AppShell><main className="erp-container"><Card className="h-48 animate-pulse" /></main></AppShell>;
}
