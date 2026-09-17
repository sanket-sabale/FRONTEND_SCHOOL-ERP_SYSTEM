import { AppShell } from "@/components/app-shell";
import { PrincipalDashboard } from "@/features/dashboard/components/principal-dashboard";

export default async function Home() {
  return (
    <AppShell>
      <div className="erp-container space-y-4 sm:space-y-5 lg:space-y-6">
        <PrincipalDashboard />
      </div>
    </AppShell>
  );
}
