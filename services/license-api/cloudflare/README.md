# Cloudflare Worker deployment baseline

This directory preserves the Worker script currently deployed as `tahouri-license-api`.

- Snapshot: `worker.production-snapshot.js`
- Captured from Cloudflare Worker script content on 2026-10-30.
- Deployed version label at capture: `0.2.1-worker-admin-login-fix`.
- This is a review baseline, not an instruction to deploy this file.
- Do not deploy automatically. Review changes and test against an isolated D1 database first.
- Worker secret values are not included and must remain managed in Cloudflare.

The deployed script supports health checks and admin operations. License activation, entitlement verification, signed entitlement extension, and payment verification are not implemented in this snapshot.
