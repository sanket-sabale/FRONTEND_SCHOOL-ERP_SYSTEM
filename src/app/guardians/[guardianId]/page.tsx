import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { GuardianProfile } from "@/features/guardians/components/guardian-profile";
import { GuardianNotFound } from "@/features/guardians/components/guardian-profile-states";
import { guardianService } from "@/lib/api/guardians";
import { currentSessionRole } from "@/lib/current-user";
import { tenantContext } from "@/lib/tenant-context";

export default async function GuardianProfilePage({
  params,
}: {
  params: Promise<{ guardianId: string }>;
}) {
  if (!hasPermission(currentSessionRole, "guardian.view")) redirect("/unauthorized");
  const { guardianId } = await params;
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const guardian = await guardianService.getGuardian(scope, guardianId);
  if (!guardian) {
    return (
      <AppShell>
        <GuardianNotFound />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <GuardianProfile guardian={guardian} role={currentSessionRole} />
    </AppShell>
  );
}
