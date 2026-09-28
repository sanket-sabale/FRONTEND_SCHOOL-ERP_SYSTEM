import "server-only";

export type SecurityEvent = Readonly<{
  boundary: "session-store" | "kms";
  operation: "transaction" | "wrap" | "unwrap";
  outcome: "success" | "unavailable";
  latencyMs: number;
}>;
export type SecurityObserver = (event: SecurityEvent) => void;
// Only fixed labels and a duration cross this boundary. Never pass errors,
// identifiers, rows, tokens, resource names or driver arguments to telemetry.
export function observe(observer: SecurityObserver | undefined, event: SecurityEvent) {
  try { observer?.(Object.freeze(event)); } catch { /* telemetry cannot grant or deny authority */ }
}
