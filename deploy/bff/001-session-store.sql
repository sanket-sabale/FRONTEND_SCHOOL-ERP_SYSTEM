-- PostgreSQL 17+. Apply with a dedicated migration owner in a dedicated BFF DB.
-- Runtime role gets only SELECT/INSERT/UPDATE/DELETE on this table and schema USAGE.
-- No ERP tables or business database grants. No runtime DDL permission.
BEGIN;
CREATE SCHEMA IF NOT EXISTS schoolerp_bff;
REVOKE ALL ON SCHEMA schoolerp_bff FROM PUBLIC;
CREATE TABLE schoolerp_bff.sessions (
  record jsonb NOT NULL,
  session_id_hash text GENERATED ALWAYS AS (record->>'key') STORED,
  context text GENERATED ALWAYS AS (record->>'context') STORED,
  status text GENERATED ALWAYS AS (record->>'status') STORED,
  schema_version integer GENERATED ALWAYS AS ((record->>'schemaVersion')::integer) STORED,
  row_version bigint GENERATED ALWAYS AS ((record->>'version')::bigint) STORED,
  credential_version bigint GENERATED ALWAYS AS ((record->>'credentialVersion')::bigint) STORED,
  created_at bigint GENERATED ALWAYS AS ((record->>'createdAt')::bigint) STORED,
  last_accessed_at bigint GENERATED ALWAYS AS ((record->>'lastAccessedAt')::bigint) STORED,
  idle_expires_at bigint GENERATED ALWAYS AS ((record->>'idleExpiresAt')::bigint) STORED,
  absolute_expires_at bigint GENERATED ALWAYS AS ((record->>'absoluteExpiresAt')::bigint) STORED,
  access_expires_at bigint GENERATED ALWAYS AS ((record->>'accessExpiresAt')::bigint) STORED,
  identity_binding jsonb GENERATED ALWAYS AS (record->'identity') STORED,
  credential_envelope jsonb GENERATED ALWAYS AS (record->'envelope') STORED,
  credential_reference jsonb GENERATED ALWAYS AS (record->'credentials') STORED,
  csrf_verifier text GENERATED ALWAYS AS (record->>'csrfVerifier') STORED,
  csrf_version bigint GENERATED ALWAYS AS ((record->>'csrfVersion')::bigint) STORED,
  refresh_attempt jsonb GENERATED ALWAYS AS (record->'refresh') STORED,
  tombstone_expires_at bigint GENERATED ALWAYS AS ((record->>'tombstoneExpiresAt')::bigint) STORED,
  PRIMARY KEY (context, session_id_hash),
  CHECK (context IN ('PLATFORM','TENANT')),
  CHECK (session_id_hash ~ '^[a-f0-9]{64}$'),
  CHECK (schema_version = 1 AND row_version >= 0 AND credential_version >= 0),
  CHECK (status IN ('ACTIVE','REFRESHING','LOGGING_OUT','INVALID','DELETED')),
  CHECK (idle_expires_at <= absolute_expires_at),
  CHECK (NOT record ?| ARRAY['accessToken','refreshToken','password','sessionId'])
);
CREATE INDEX sessions_cleanup ON schoolerp_bff.sessions (tombstone_expires_at) WHERE tombstone_expires_at IS NOT NULL;
COMMIT;
