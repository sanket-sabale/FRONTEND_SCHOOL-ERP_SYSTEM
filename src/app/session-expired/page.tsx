import { SecurityState } from "@/features/security/components/security-state";

export default function SessionExpiredPage() {
  return <SecurityState title="Session expired" description="For security, your session needs to be refreshed before you continue working with school data." />;
}
