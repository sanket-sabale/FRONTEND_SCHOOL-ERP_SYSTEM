import { Badge, EmptyState } from "@/components/ui";
import { formatPermissionLabel } from "@/features/staff-accounts/services/staff-account-rules";
import type { Permission } from "@/types/erp";

export function StaffPermissionSummary({ permissions }: { permissions: Permission[] }) {
  if (permissions.length === 0) {
    return <EmptyState description="No role is assigned, so no permissions can be displayed." title="No permissions available" />;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Permission summary">
      {permissions.map((permission) => (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface-muted p-2 text-sm" key={permission}>
          <Badge tone="success">Allowed</Badge>
          <span className="responsive-text text-foreground">{formatPermissionLabel(permission)}</span>
        </div>
      ))}
    </div>
  );
}
