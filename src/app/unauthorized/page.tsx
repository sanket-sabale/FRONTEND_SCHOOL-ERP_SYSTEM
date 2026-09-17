import { SecurityState } from "@/features/security/components/security-state";

export default function UnauthorizedPage() {
  return <SecurityState title="Access denied" description="Your current role does not include permission for this area. Ask a school administrator to review your access." />;
}
