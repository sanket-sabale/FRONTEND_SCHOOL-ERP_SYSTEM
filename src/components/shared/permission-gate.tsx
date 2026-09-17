import { rolePermissions } from "@/config/navigation";
import type { Permission, Role } from "@/types/erp";

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function PermissionGate({
  role,
  permission,
  children,
  fallback = null,
}: {
  role: Role;
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!hasPermission(role, permission)) return fallback;

  return children;
}
