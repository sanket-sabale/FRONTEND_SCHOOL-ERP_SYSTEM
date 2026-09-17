import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { GuardianDirectory } from "@/features/guardians/components/guardian-directory";
import { guardianStatuses, guardianVerificationStatuses } from "@/features/guardians/types/guardian";
import { guardianService } from "@/lib/api/guardians";
import { currentSessionRole } from "@/lib/current-user";
import { readEnumQueryParam } from "@/lib/query-params";
import { tenantContext } from "@/lib/tenant-context";

export default async function GuardiansPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; verificationStatus?: string }>;
}) {
  if (!hasPermission(currentSessionRole, "guardian.view")) redirect("/unauthorized");
  const query = await searchParams;
  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
  };
  const data = await guardianService.getGuardians(scope, {
    query: query.search,
    status: readEnumQueryParam(query.status, guardianStatuses),
    verificationStatus: readEnumQueryParam(query.verificationStatus, guardianVerificationStatuses),
  });

  return (
    <AppShell>
      <GuardianDirectory
        context={{
          school: tenantContext.school,
          campus: tenantContext.campus,
          academicYear: tenantContext.academicYear,
        }}
        data={data}
        role={currentSessionRole}
      />
    </AppShell>
  );
}
