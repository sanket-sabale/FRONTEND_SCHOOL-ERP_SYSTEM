import type { StaffStatus } from "@/features/staff/types/staff";

export function formatStaffDate(value?: string) {
  if (!value) return "Not recorded";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function getStaffInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "ST";

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function staffStatusTone(status: StaffStatus) {
  if (status === "active") return "success";
  if (status === "on_leave") return "info";
  if (status === "suspended") return "warning";
  if (status === "resigned" || status === "terminated") return "danger";
  return "neutral";
}
