import { AppShell } from "@/components/app-shell";
import { CommunicationSkeleton } from "@/features/communication/components/communication-skeleton";

export default function CommunicationLoading() {
  return (
    <AppShell>
      <CommunicationSkeleton />
    </AppShell>
  );
}
