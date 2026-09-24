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

Integration test:
  npm run integration-test

Backup:
  npm run backup

Verify an existing backup:
  npm run verify-backup -- <backup.sqlite>

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
