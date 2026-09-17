import type {
  AttendanceRepairAuditEvent,
  AttendanceRepairAuditEventType,
  AttendanceRepairAuditRecord,
  AttendanceRepairAuditSummary,
} from "@/features/attendance/types/attendance-repair-audit";

export function getAuditEventLabel(type: AttendanceRepairAuditEventType) {
  return type.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export function getAuditSourceLabel(value: string) {
  if (value === "bulk_preparation") return "Bulk Preparation";
  if (value === "individual") return "Individual";
  return "Diagnostic";
}

export function buildAuditSummary(records: AttendanceRepairAuditRecord[]): AttendanceRepairAuditSummary {
  return {
    totalRecords: records.length,
    totalIntegrityIssues: records.filter((record) => record.integrityStatus && record.integrityStatus !== "valid" && record.integrityStatus !== "archived_structure_reference").length,
    deterministicCandidates: records.filter((record) => Boolean(record.proposedSnapshot)).length,
    pendingReview: countStatus(records, "pending_review"),
    approved: countStatus(records, "approved"),
    applied: countStatus(records, "applied"),
    rejected: countStatus(records, "rejected"),
    failed: countStatus(records, "failed"),
    manualReview: records.filter((record) => record.integrityStatus === "unresolved" || record.repairStatus === "requires_manual_review").length,
    staleOrSkipped: records.filter((record) => record.events.some((event) => event.eventType === "repair_stale" || event.eventType === "repair_skipped")).length,
    repairedRecords: countStatus(records, "applied"),
    recordsRequiringAttention: records.filter((record) => ["pending_review", "approved", "failed", "requires_manual_review"].includes(record.repairStatus ?? "") || record.integrityStatus === "unresolved").length,
    bulkPreparedRequests: records.filter((record) => record.source === "bulk_preparation").length,
  };
}

export function sortAuditEvents(events: AttendanceRepairAuditEvent[]) {
  return [...events].sort((first, second) => String(first.timestamp ?? "").localeCompare(String(second.timestamp ?? "")));
}

function countStatus(records: AttendanceRepairAuditRecord[], status: string) {
  return records.filter((record) => record.repairStatus === status).length;
}
