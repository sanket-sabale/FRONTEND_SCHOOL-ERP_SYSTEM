import "server-only";

// Pure contract types. Persistence is implemented separately; no live routes exist.
export type Context = "PLATFORM" | "TENANT";
export type AuthenticationMethod = "PASSWORD" | "OIDC";

export type PlatformIdentity = {
  context: "PLATFORM";
  accountId: string;
  sessionId: string;
  authenticationAssurance: string;
  roles: readonly string[];
  permissions: readonly string[];
};

export type TenantIdentity = {
  context: "TENANT";
  accountId: string;
  tenantId: string;
  membershipId: string;
  roles: readonly string[];
  permissions: readonly string[];
};

export type VerifiedIdentity = PlatformIdentity | TenantIdentity;

// References address an encrypted, server-only credential envelope, never raw tokens.
export type CredentialReference = { context: Context; envelopeId: string };
export type RefreshAttempt = {
  owner: string;
  fence: number;
  leaseExpiresAt: number;
  phase: "RESERVED" | "DISPATCHED";
};
export type SessionStatus = "ACTIVE" | "REFRESHING" | "LOGGING_OUT" | "INVALID" | "DELETED";
export type SessionRecord = {
  key: string; // Context-bound hash of the opaque ID, not the cookie value.
  context: Context;
  version: number;
  credentialVersion: number;
  status: SessionStatus;
  createdAt: number;
  idleExpiresAt: number;
  absoluteExpiresAt: number;
  authenticationMethod: AuthenticationMethod;
  identityProvider?: string;
  credentials: CredentialReference | null;
  refresh: RefreshAttempt | null;
};

/**
 * Adapter must provide durable linearizable CAS, including tombstones, across workers.
 * TTL is cleanup only: get/each operation must also enforce expiry. Never implement
 * production correctness using a process-local Map. An ambiguous write must be read
 * back before dispatch; no confirmed write means no credential use.
 */
export interface BrowserSessionStore {
  create(record: SessionRecord): Promise<boolean>;
  get(context: Context, key: string): Promise<SessionRecord | null>;
  compareAndSwap(previous: SessionRecord, next: SessionRecord): Promise<boolean>;
  rotate(previous: SessionRecord, replacement: SessionRecord): Promise<boolean>;
  expire(context: Context, key: string, now: number): Promise<void>;
  deleteTombstone(context: Context, key: string, after: number): Promise<void>;
}

// Explicit projection prevents secret envelopes, backend session IDs or auth-method
// metadata from leaking when additional fields are added to server records later.
export function safeSession(identity: VerifiedIdentity, expiresAt: number) {
  const common = {
    authenticated: true as const,
    accountId: identity.accountId,
    roles: [...identity.roles],
    permissions: [...identity.permissions],
    expiresAt: new Date(expiresAt).toISOString(),
  };
  if (identity.context === "PLATFORM") return { ...common, context: "PLATFORM" as const };
  return { ...common, context: "TENANT" as const, tenantId: identity.tenantId, membershipId: identity.membershipId };
}
