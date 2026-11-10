TAHOURI LICENSE API — DEVELOPMENT / PRODUCTION RUNBOOK

1. DEVELOPMENT

  cd services/license-api
  npm install
  npm run generate-key
  npm start

Default:
  http://localhost:8787

For the browser app:
  npx serve -l 5500

Smoke test:
  npm run smoke-test

Operational diagnostics:
  /api/live
  Liveness only; does not depend on database readiness.

/api/health                 public health/status diagnostics
  /api/ready                  public readiness check for load balancers
  /api/metrics                admin-session protected metrics
  /api/metrics/alerts         admin-session protected alerts

Database schema:
  The service maintains a versioned SQLite schema via PRAGMA user_version.
  Startup applies supported migrations automatically and refuses a database
  schema newer than the running service.

Integration test:
  npm run integration-test

Release security test:
  npm run security-test

Release check:
  npm run release-check

Backup:
  npm run backup

Verify an existing backup:
  npm run verify-backup -- <backup.sqlite>

Run an isolated restore rehearsal (never touches the live database):
  npm run restore-rehearsal -- <backup.sqlite>

Development test codes are enabled only when the server is not running in
production. Never use test codes for real customers.

2. REQUIRED PRODUCTION SECRETS

Production must provide secret storage for:

  NODE_ENV=production
  TAHOURI_LICENSE_PRIVATE_KEY_FILE=<secret/private-key-path>
  TAHOURI_ADMIN_PASSWORD=<strong-random-secret>
  TAHOURI_PAYMENT_PROVIDER=<real-provider-name>
  TAHOURI_ADMIN_ORIGIN=https://<admin-origin>

Never commit:
  - private signing keys
  - admin passwords
  - gateway secrets
  - database credentials
  - production database files

3. PRODUCTION SECURITY

Use HTTPS in front of the API and admin panel.
Keep the private signing key only on the server.
The application receives/verifies the public key only.
Do not put gateway credentials or admin credentials in the browser.

Production blocks:
  - seeded TEST activation codes
  - manual payment verification
  - missing production payment provider
  - missing admin password
  - missing private signing key
  - missing approved admin origin

4. DATABASE

The service uses SQLite for the current single-instance deployment model.
Keep the database on persistent storage.

For a multi-instance deployment, move sessions/database handling to shared
infrastructure before scaling horizontally.

5. BACKUP / RECOVERY

Create a backup:
  npm run backup

The backup is integrity-checked and must be copied to storage outside the
application host.

Verify a backup:
  npm run verify-backup -- <backup.sqlite>

A successful verification checks SQLite integrity, required tables and record
counts. Periodically perform a full restore rehearsal on an isolated copy.

6. PAYMENT

The current development provider is manual.

Production requires a real provider adapter implementing server-side
verification. A callback parameter claiming "verified" is never sufficient
for production authorization.

Do not enable production payments until the selected gateway's official API
verification flow is implemented and tested.

7. DEPLOYMENT ORDER

  1. Provision HTTPS and persistent storage.
  2. Generate/store production signing key.
  3. Configure production secrets.
  4. Configure the real payment provider adapter.
  5. Start the API.
  6. Run health/smoke checks.
  7. Create a controlled test license.
  8. Verify activation, status, expiry, revoke and renewal.
  9. Verify backup and restore.
  10. Only then open customer activation.

8. IMPORTANT ARCHITECTURE RULE

License != Activation Code != Payment != Profile.

Do not move licensing logic into the activity engines.


9. PRODUCTION READINESS CHECKLIST

READY IN CODE
  [x] Persistent SQLite license database
  [x] Hashed activation codes
  [x] Signed entitlements
  [x] Profile binding
  [x] Expiry and revocation checks
  [x] Server-side license status endpoint
  [x] Persistent hashed admin sessions
  [x] Admin login rate limiting
  [x] API rate limiting
  [x] Production configuration guards
  [x] Backup and backup verification tools
  [x] Payment provider boundary

BLOCKED UNTIL REAL DEPLOYMENT CONFIGURATION
  [ ] HTTPS certificate and reverse proxy
  [ ] Persistent production storage
  [ ] Production signing private key stored outside Git
  [ ] Production admin password stored in a secret manager/environment
  [ ] APP_ORIGIN and ADMIN_ORIGIN configured
  [ ] Real payment provider selected
  [ ] Official provider server-to-server verification adapter implemented
  [ ] Production payment callback tested with the selected provider
  [ ] Restore rehearsal on the actual deployment environment
  [ ] Monitoring and alerting
  [ ] DNS/domain configuration

DO NOT RELEASE
  - if any item in the BLOCKED section is missing
  - if manual payment verification is enabled in production
  - if test activation codes are enabled in production
  - if the signing private key is present in Git


10. DEPLOYMENT CONFIGURATION TEMPLATE

Example production environment variables (values must be supplied by deployment):

  NODE_ENV=production
  TAHOURI_LICENSE_PRIVATE_KEY_FILE=/secure/path/tahouri-license-private.pem
  TAHOURI_ADMIN_PASSWORD=<secret>
  TAHOURI_PAYMENT_PROVIDER=<selected-provider>
  TAHOURI_ADMIN_ORIGIN=https://admin.example
  TAHOURI_APP_ORIGIN=https://app.example
  TAHOURI_LICENSE_DB_FILE=/persistent/data/license.sqlite
  TAHOURI_LICENSE_BACKUP_DIR=/persistent/backups

Secrets must be injected by the hosting environment or secret manager.
Do not place real values in .env files committed to Git.

11. DEPLOYMENT VERIFICATION ORDER

  1. Start service with production configuration.
  2. Confirm the process starts without configuration errors.
  3. Confirm /api/health.
  4. Confirm /api/public-key.
  5. Confirm admin login over HTTPS.
  6. Confirm a controlled payment flow using the selected provider.
  7. Confirm activation creates a signed, profile-bound entitlement.
  8. Confirm status detects active, expired and revoked licenses.
  9. Create and verify an external backup.
  10. Perform an isolated restore rehearsal.
  11. Review audit events and server logs.
  12. Enable customer access only after all checks pass.

12. OPERATIONAL MONITORING

At minimum monitor:
  - API availability and health failures
  - activation failures and unusual spikes
  - admin login failures / lockouts
  - payment verification failures
  - license revocations
  - backup failures
  - disk/storage capacity
  - unexpected process restarts

Do not log:
  - activation codes
  - admin passwords
  - private signing keys
  - payment gateway secrets
  - raw admin session tokens

13. RELEASE GATE

Before customer release, all of the following must be verified on the real deployment:
  [ ] HTTPS certificate is valid and auto-renewal is working
  [ ] API is reachable only through the intended public origin
  [ ] APP_ORIGIN and ADMIN_ORIGIN are exact production origins
  [ ] production signing key is outside Git and backed up securely
  [ ] production database is on persistent storage
  [ ] backup job runs on schedule and copies backups off-host
  [ ] a backup has been restored successfully on an isolated environment
  [ ] admin login works over HTTPS and session survives an API restart
  [ ] activation creates a profile-bound signed entitlement
  [ ] status detects active, expired and revoked licenses
  [ ] renewal/extension creates a new valid signed entitlement
  [ ] selected payment provider performs official server-side verification
  [ ] successful payment cannot be forged by editing the callback payload
  [ ] failed/cancelled payment does not create a license
  [ ] audit trail records activation, payment and license lifecycle events
  [ ] rate limits and production security headers are present
  [ ] monitoring and alerting are active
  [ ] no secrets or test codes are present in the deployment

If any gate is unchecked, do not open customer activation.


Production deployment variables:
  TAHOURI_API_DOMAIN=api.example.com
  TAHOURI_APP_ORIGIN=https://app.example
  TAHOURI_ADMIN_ORIGIN=https://admin.example

DNS:
  Create an A/AAAA record for TAHOURI_API_DOMAIN pointing to the production server.
  Caddy will terminate HTTPS and proxy the API to the internal License API container.


Final production verification:
  1. npm run release-check
  2. TAHOURI_RELEASE_API=https://api.your-domain.example npm run release-smoke-test
  3. npm run backup
  4. npm run verify-backup -- <backup.sqlite>
  5. npm run restore-rehearsal -- <backup.sqlite>

The release smoke test verifies the public HTTPS path, liveness, readiness,
health, public signing key, and required security headers. It does not create
or activate a customer license and must not be treated as payment verification.


CI release gate is active on push/PR:
GitHub Actions runs the production release artifact check, security test,
and integration test for changes under services/license-api.
The production release smoke test is intentionally separate because it
requires a deployed HTTPS API and must be run against the real deployment.


14. CLOUDFLARE WORKER + D1 ACTIVATION API

The version-controlled Cloudflare Worker implementation is:
  services/license-api/worker.js

Its deployment configuration is:
  services/license-api/wrangler.toml

SAFE TEST CONFIGURATION (AUDIT BRANCH)

The audit branch's services/license-api/wrangler.toml is deliberately configured
with:
  Worker name: tahouri-license-api-audit-test
  D1 name: tahouri-license-db-audit-test
  D1 ID: 00000000-0000-0000-0000-000000000000 (non-deployable placeholder)

This is a safety lock. It must not be replaced with the production D1 ID.
Before any test deployment, create a separate, empty Cloudflare D1 database
for testing, apply migrations 0001–0003 to that test database, and replace
the placeholder with that test database's ID only on this audit branch.

Never deploy this audit branch to the production Worker or production D1.
Never use production signing keys or production activation codes in tests.
Use a test-only RSA key pair and a separately named test Worker.

The production D1 database is a separate resource. The historical production
migration state is documented in deployment records; this audit task does not
authorize further production D1 changes, production Worker deployment, or
Pages production release.

Worker activation routes implemented in source:
  POST /api/licenses/activate
  GET  /api/licenses/status?licenseId=<license-id>
  GET  /api/public-key
  GET  /api/health

The Worker signs profile-bound entitlements with RSASSA-PKCS1-v1_5-SHA256.
A test-only PKCS#8 private key belongs in the isolated test Worker's secret
LICENSE_PRIVATE_KEY_PEM. Its matching SPKI public PEM is configured as the
non-secret LICENSE_PUBLIC_KEY_PEM variable.

The health endpoint signs and verifies a challenge and remains not-ready if
the key pair does not match. The public-key endpoint exposes only the public
key so a test client can compare it with the pinned test key.

For the audit branch, do not run wrangler secret put or wrangler deploy until:
  1. An isolated test D1 exists and its ID replaces the placeholder.
  2. A test-only RSA key pair has been generated.
  3. The Cloudflare API token is restricted to the test resources.
  4. The audit-test Worker name and test origins have been reviewed.

CURRENT RELEASE BLOCKERS
  - The audit Worker source has not been deployed to an isolated test Worker.
  - The Cloudflare API token secret CLOUDFLARE_API_TOKEN was not configured
    when the previous test deployment was attempted.
  - The live Worker remains the earlier admin-only version.
  - The production application configuration remains in test mode and points
    to localhost; it has no pinned production public key.
  - Production signing-key configuration and migration of existing local
    licenses have not been approved or verified.
  - Payment verification and signed entitlement extension remain disabled.
  - Real browser/device activation and status tests remain outstanding.

Do not announce customer activation as ready until isolated Worker/D1 tests,
production key and data-migration decisions, release-gate verification, and
real-browser tests have all passed. Production deployment is a separate,
explicitly approved task and is not part of this audit-branch work.
