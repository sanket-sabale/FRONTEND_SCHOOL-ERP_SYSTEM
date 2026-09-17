import { Badge } from "@/components/ui";

export function PromotionAuditStatusBadge({ status }: { status: string }) {
  const tone = status === "promoted" || status === "eligible" ? "success" : status === "requires_review" || status === "pending" ? "warning" : status === "transferred" || status === "withdrawn" ? "danger" : "neutral";
  return <Badge tone={tone}>{formatAuditLabel(status)}</Badge>;
}

export function PromotionAuditSourceBadge({ source }: { source: string }) {
  const tone = source === "bulk_preparation" ? "info" : source === "system_proposal" ? "warning" : "neutral";
  return <Badge tone={tone}>{formatAuditLabel(source)}</Badge>;
}

export function PromotionAuditEvidenceBadge({ state }: { state: string }) {
  const tone = state === "available" ? "success" : state === "proposed" ? "warning" : "danger";
  return <Badge tone={tone}>{formatAuditLabel(state)}</Badge>;
}

export function PromotionAuditEventBadge({ status }: { status: "info" | "success" | "warning" | "danger" }) {
  const tone = status === "success" ? "success" : status === "warning" ? "warning" : status === "danger" ? "danger" : "info";
  return <Badge tone={tone}>{formatAuditLabel(status)}</Badge>;
}

export function formatAuditLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatAuditDate(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value.includes("T") ? value : `${value}T00:00:00`));
}

export function formatAuditDateTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
