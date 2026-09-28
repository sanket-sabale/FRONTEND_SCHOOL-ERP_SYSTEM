# Deployment inputs — no infrastructure applied

There is no existing IaC system in this frontend repository. These are a SQL
migration and runtime input template, not a second IaC system or fake GCP resources.
See [deployment decisions](../../docs/frontend/BFF-DEPLOYMENT-DECISIONS.md).

Milestone 2B: apply `002-pending-auth.sql` after 001 using the migration owner.
Extend existing isolated runtime grants to `schoolerp_bff.pre_auth` and
`schoolerp_bff.membership_selection`, never ERP tables. This is additive; do not
drop pending records during rolling deployment. Existing session envelope AAD
remains compatible. Runtime performs no DDL.

Run `npm run test:bff:pending` and `npm run test:bff:pending:postgres` with the
disposable fixture below. Run database suites sequentially because each resets
its owned schema. `PostgresPendingAuthStore.cleanup()` is bounded to 100 expiry
transitions and 100 terminal deletions per table/transaction. Production scheduling
is a release gate; expiry rejects even without cleanup. Restored old credentials
must be invalidated after database rollback.

The sibling backend's test-only `Milestone2bLocalContractTests` launches an optional
real HTTP harness using its existing Testcontainers fixture. It never seeds the
running development database. Commands and qualification limits are documented in
[Milestone 2B evidence](../../docs/phase-12b-milestone-2b.md).

1. Provision separate development, staging and production resources and runtime
   identities. Use Cloud Run in `asia-south1`; Next ingress
   `internal-and-cloud-load-balancing`, Spring ingress `internal`.
2. Configure a global external HTTPS Application Load Balancer, serverless NEG,
   certificate, explicit host routing and Cloud Armor policy. Reject unknown hosts.
   Disable caching for BFF traffic. Verify public default `run.app` bypass fails.
3. Configure Direct VPC egress, subnet capacity, private Google access and firewall
   rules. For Cloud Run-to-Cloud Run internal requests, route traffic through the
   VPC as required by Google's internal-ingress rules; merely sharing a region
   does not establish private connectivity. Do not expose Spring publicly.
4. Provision a dedicated Cloud SQL PostgreSQL **17+ HA** database and
   `schoolerp_bff` schema. No business data or ERP role grants. Require verified
   TLS to the private SQL endpoint. Apply `001-session-store.sql` using a separate
   migration owner. Grant runtime only schema USAGE and table
   SELECT/INSERT/UPDATE/DELETE. Disable SQL bind-parameter logging. Runtime does
   not migrate, provision, or silently fall back to memory.
5. Provision environment-specific symmetric KMS keys in `asia-south1`. Pin a
   version in `BFF_KMS_KEY_VERSION`; runtime uses workload identity/ADC, never a
   service-account JSON key. Grant encrypt/decrypt only on that environment's key.
6. Inject required runtime values from `runtime.env.template`; database credentials
   belong in Secret Manager. Preserve PEM newlines in the trusted database CA.
   No URL `sslmode` override is accepted. Staging must explicitly use
   `BFF_ENVIRONMENT=staging`, `BFF_WEB_ORIGIN=https://staging.schoolerp.com`.
7. Verify private Spring IAM invocation with an audience-bound Google ID token
   in `X-Serverless-Authorization`, leaving Spring's `Authorization` for its own
   bearer token. The server-only provider now obtains this token through Google
   ADC. Supply `BFF_SERVICE_AUTH_MODE=cloud-run` and the approved explicit
   `BFF_CLOUD_RUN_AUDIENCE`; origin and audience remain empty in the template.
   Live identity, Invoker grants and ingress are unverified. No permissive IAM
   grant is an acceptable workaround. Do not enable authentication handlers yet.
8. Run the verification checklist and security review in the decision document.
   Check startup rejection with missing configuration before enabling traffic.

Milestone 2 adds required pool capacity/idle/lifetime inputs. Their production
template values are intentionally empty: size them against Cloud SQL connections
and maximum instance count. KMS composition must pass
`config.limits.KMS_OPERATION_TIMEOUT_MS` to `CloudKmsKeyWrapper`. Safe observer
callbacks are available for store/KMS metrics; deployment exporters and alerts
remain unqualified. See [Milestone 2 evidence](../../docs/phase-12b-milestone-2.md).

## Local tests

`npm test` and `npm run test:bff` need no database or cloud credentials. A local
loopback HTTP fixture tests the actual Node HTTP client with an explicitly injected
`local-test` service provider; it does not exercise Cloud Run IAM. Run
`npm run test:bff:http` for the focused HTTP suite. Encryption tests use a
test-only KEK; no development key is embedded in production code.

To run actual persistence tests, create a disposable PostgreSQL 17 container:

```powershell
docker run --detach --rm --name schoolerp-bff-contract-tests -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=bff_contract_tests -p 127.0.0.1:55439:5432 postgres:17
$env:BFF_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55439/bff_contract_tests'
npm run test:bff:postgres
npm run test:bff:qualification
npm run test:bff:multiprocess
docker stop --time 60 schoolerp-bff-contract-tests
```

Trust authentication is limited to this disposable loopback test container. It
is not deployment configuration. The test rejects non-loopback hosts or any
database name other than `bff_contract_tests`; it drops/recreates only that
database's `schoolerp_bff` schema. Never point it at a retained session database.
Run the two PostgreSQL suites sequentially: each recreates the disposable schema.
The multi-process suite also restarts only this exact validated container; Docker
must be available. It verifies two actual Node processes, 2/10/50 contenders,
owner termination, ciphertext persistence, deadlocks and recovery. It is not GCP
qualification. A separate test migration pool permits bounded DDL without changing
the runtime one-second transaction policy. Graceful restart allows a 60-second
shutdown window; per-request limits remain unchanged.

An unconfigured `npm run dev` continues to serve the existing mock UI. To validate
local BFF configuration explicitly, use `BFF_ENVIRONMENT=development`,
`BFF_COOKIE_MODE=local-http`, origin `http://localhost:3000`, an explicit loopback
Spring origin/database and a separate development KMS resource. Local numerical
defaults are exported from `config.ts`; no local secret default exists.
`NODE_ENV=production` rejects this local profile. `npm run build` creates an
artifact without runtime secrets; `npm start` validates required production
configuration through Next instrumentation before serving requests.
