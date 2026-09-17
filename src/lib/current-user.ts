import type { CurrentUser, Role } from "@/types/erp";

export const currentSessionRole: Role = "principal";

const roleLabels: Record<Role, string> = {
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  hr: "HR Administrator",
  "system-admin": "System Administrator",
};

export function getCurrentUser(role: Role): CurrentUser {
  return {
    id: "current-user",
    name: "User Name",
    roles: [roleLabels[role]],
  };
}

export function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "UN";

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
