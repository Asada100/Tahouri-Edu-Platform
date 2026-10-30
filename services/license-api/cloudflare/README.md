# Cloudflare Worker deployment baseline

This directory preserves the Worker script currently deployed as `tahouri-license-api`.

- Snapshot: `worker.production-snapshot.js`
- Captured from Cloudflare Worker script content on 2026-10-30.
- Deployed version label at capture: `0.2.1-worker-admin-login-fix`.
- This is a review baseline, not an instruction to deploy this file.
- Do not deploy automatically. Review changes and test against an isolated D1 database first.
- Worker secret values are not included and must remain managed in Cloudflare.

The deployed script supports health checks and admin operations. License activation, entitlement verification, signed entitlement extension, and payment verification are not implemented in this snapshot.


## Activation transaction prototype (not enabled)

- `activation-transaction.js` contains a D1 batch persistence primitive for the future activation route.
- It atomically claims an unused activation code, inserts the license, and writes the activation audit event.
- Future reservations additionally require the exact current active license to still exist and be within its validity window.
- The unique future-reservation index is enforced by the database; a conflict aborts the whole D1 batch.
- Tests: `node --test services/license-api/cloudflare/tests/*.test.mjs`.
- This helper is deliberately not imported by the deployed Worker snapshot. It does not validate request policy, verify/sign entitlements, or expose an activation endpoint.
- Do not enable activation until the caller performs the complete grade progression, academic-year, installation-binding, identity, and cryptographic checks and the end-to-end Worker integration is reviewed.
- The isolated D1 database `tahouri-license-db-migration-test` was used for live batch behavior checks. Production database and Worker were not modified.
