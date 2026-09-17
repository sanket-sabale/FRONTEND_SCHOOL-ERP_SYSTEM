import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/components/shared/permission-gate";
import { CommunicationCenter } from "@/features/communication/components/communication-center";
import { communicationService } from "@/lib/api/communication";
import { currentSessionRole, getCurrentUser, getInitials } from "@/lib/current-user";
import { tenantContext } from "@/lib/mock-data";

export default async function CommunicationPage() {
  const currentUser = getCurrentUser(currentSessionRole);

  if (!hasPermission(currentSessionRole, "communication.view")) {
    redirect("/unauthorized");
  }

  const scope = {
    tenantId: tenantContext.tenantId,
    schoolId: tenantContext.schoolId,
    campusId: tenantContext.campusId,
    academicYearId: tenantContext.academicYearId,
    userId: currentUser.id,
    role: currentSessionRole,
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.roles[0] ?? "User",
      avatarInitials: getInitials(currentUser.name),
    },
  };
  const { conversations, counts } = await communicationService.getConversations(scope);

  return (
    <AppShell>
      <CommunicationCenter
        conversations={conversations}
        counts={counts}
        currentUserId={currentUser.id}
        schoolName={tenantContext.school}
        scope={scope}
      />
    </AppShell>
  );
}
