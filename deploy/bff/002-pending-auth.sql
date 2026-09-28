-- Same isolated BFF schema and runtime role as 001. No ERP business tables.
BEGIN;
CREATE TABLE schoolerp_bff.pre_auth (
  context text NOT NULL CHECK (context IN ('PLATFORM','TENANT')),
  key text NOT NULL CHECK (key ~ '^[a-f0-9]{64}$'),
  record jsonb NOT NULL,
  PRIMARY KEY (context,key),
  CHECK (record->>'kind' = 'PRE_AUTH' AND record->>'context' = context AND record->>'key' = key),
  CHECK (record->>'status' IN ('ACTIVE','CONSUMING','CONSUMED','REVOKED','EXPIRED')),
  CHECK ((record->>'schemaVersion')::integer = 1 AND (record->>'version')::bigint >= 0),
  CHECK (NOT record ?| ARRAY['password','accessToken','refreshToken','selectionToken','accountId','tenantId','csrfToken'])
);
CREATE TABLE schoolerp_bff.membership_selection (
  context text NOT NULL CHECK (context = 'TENANT'),
  key text NOT NULL CHECK (key ~ '^[a-f0-9]{64}$'),
  pre_auth_key text NOT NULL,
  record jsonb NOT NULL,
  PRIMARY KEY (context,key),
  UNIQUE(context,pre_auth_key),
  FOREIGN KEY(context,pre_auth_key) REFERENCES schoolerp_bff.pre_auth(context,key),
  CHECK (record->>'kind' = 'SELECTION' AND record->>'context' = context AND record->>'key' = key AND record->>'preAuthKey' = pre_auth_key),
  CHECK (record->>'status' IN ('PENDING','CONSUMING','CONSUMED','REVOKED','EXPIRED')),
  CHECK ((record->>'schemaVersion')::integer = 1 AND (record->>'version')::bigint >= 0 AND (record->>'credentialVersion')::integer = 0),
  CHECK (NOT record ?| ARRAY['password','accessToken','refreshToken','selectionToken','accountId','csrfToken'])
);
CREATE INDEX pre_auth_expiry ON schoolerp_bff.pre_auth (((record->>'expiresAt')::bigint));
CREATE INDEX selection_expiry ON schoolerp_bff.membership_selection (((record->>'expiresAt')::bigint));
CREATE INDEX pre_auth_cleanup ON schoolerp_bff.pre_auth (((record->>'tombstoneExpiresAt')::bigint));
CREATE INDEX selection_cleanup ON schoolerp_bff.membership_selection (((record->>'tombstoneExpiresAt')::bigint));
COMMIT;
