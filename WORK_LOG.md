# Tahouri Edu Platform — Work Log

This file records the purpose, decisions, changes, tests, and remaining work for the existing-student-profile registry and license integration. Update it in the same commit/branch as meaningful code changes.

## 2026-11-07 — Recovery of PR #93/#95 work and compatibility review

### User goal
Connect the existing student profiles already stored in Tahouri (currently reported as 10 profiles) to the license admin registry. Preserve every existing `studentId` exactly. Do not create replacement IDs, modify student progress/settings, issue activation codes, or touch production data as part of importing profiles.

### Existing work discovered
- **PR #93** — `feat/student-account-registry`; draft, open, not merged. Intended to add a managed student-account registry, stable student IDs, student-bound activation codes, archive/revocation behavior, and profile creation with a registered ID.
- PR #93 CI passed for License API and Worker. Its isolated D1 migration/lifecycle and Worker route tests passed. Its own PR description explicitly says a real end-to-end request against a separately reachable test Worker and a real browser/device profile check had NOT been completed.
- **PR #95** — `fix/student-registry-existing-profiles`; draft, open, not merged; follow-up to PR #93. Adds JSON export of profile identity fields (ID/name/grade), manual and bulk import using exact existing IDs, local Node API/SQLite support, conflict rejection, and idempotent import. Both GitHub Actions workflows passed at head `4ee209cb6d2b7f301f2e4f7293a637688730c3fb`.
- **PR #94** — `audit/platform-full-review-2026-11-06`; draft, open, not merged; based on `master`. It establishes the newer platform/license Worker contract and release gate. Its description explicitly says PR #93 was not merged because its Worker/API contract does not match the current master contract.

### Compatibility findings
- PR #93 is not a small change directly based on current master: its base is `feat/student-bound-activation-codes`, and GitHub compare reports 96 commits ahead of master.
- PR #95 is based on PR #93 and reports 106 commits ahead of master. It must NOT be merged wholesale into master.
- PR #94 uses D1 migration 0003 for activation-integrity indexes. PR #93/#95 use migration 0003 for adding `activation_codes.student_id`. These migrations conflict by version and cannot be copied unchanged.
- PR #95's Worker implementation contains registry/import routes but is the PR #93 Worker lineage, not the newer PR #94 Worker. Its profile export/import and local Node API ideas need to be ported and tested against the PR #94 contract.
- The PR #95 export intentionally includes only `studentId`, `fullName`, and `gradeId`; it excludes scores, settings, and progress.

### Working branch and safety boundary
- Working branch: `feat/import-existing-profiles-master`.
- This branch was fast-forwarded from master to PR #94 head `804df17fecd500ad0b7bc56b0dceffc4c3f0f1d9` as the compatibility baseline.
- No merge to master, no deployment, no production Worker/D1 writes, no student import, and no activation-code issuance have been performed.
- The user's local working tree and local SQLite/backup files are outside this GitHub operation and must remain untouched.

### Next tasks
1. Inspect the PR #94 Node API schema/migration mechanism and current Worker/client routes before editing.
2. Port profile export and authenticated bulk import with exact IDs onto this baseline.
3. Add a new D1 migration number after PR #94's existing migration 0003; do not reuse or overwrite migration history.
4. Ensure import is idempotent for exact ID/name/grade matches and rejects conflicting or archived IDs without overwriting.
5. Bind any newly issued activation code to an existing active student record and reject student/grade mismatches; do not issue real codes during tests.
6. Add regression tests for export shape, 10-profile import, duplicate import, conflicting IDs, archived IDs, authentication, and activation binding.
7. Run local Node API tests, Worker tests, D1 migration checks on an isolated test database, and browser/device export verification. Only report tests actually run and their exact result.
8. Keep this log current after each meaningful change, including commit SHA, test command/result, and unresolved blockers.

### Current status
- Documentation log created; no feature code has yet been ported to this compatibility branch.
- CI results above are historical results for PR #93/#95, not proof that the feature is compatible with PR #94.


## 2026-11-07 — First implementation pass (tests pending)

### Changes committed on the isolated compatibility branch
- Added a profile-screen JSON export action. Export schema is `tahouri-student-profiles` v1 and contains only `studentId`, `fullName`, and `gradeId`.
- Added D1 migration `0004_student_accounts.sql`; migration numbering deliberately follows PR #94's existing migration 0003. It adds `activation_codes.student_id`, the `student_accounts` table, and supporting indexes.
- Added SQLite schema migration v2 for the Node test API, with a version-aware check so an existing schema-v1 database is upgraded only when the service starts.
- Added authenticated list, exact-ID register, bulk-import, and archive endpoints to both Worker and Node API.
- Imports validate all records before writing, preserve supplied IDs, treat identical repeated imports as idempotent, and reject conflicting or archived IDs instead of overwriting/reactivating them.
- Activation-code issuance now requires an active registered profile and stores its exact ID. Activation rejects codes presented by a different profile or by an archived/unregistered profile.
- Added profile import and account selection controls to both Worker and local Node admin panels.
- Added test coverage for Worker profile import, repeated import, conflicting IDs, listing, and bound activation; added Node API integration coverage for import idempotency, conflict rejection, listing, and authentication.
- Updated backup creation/verification/rehearsal to include the student registry in schema v2 while continuing to accept schema-v1 backups. This preserves the user's existing pre-migration encrypted backup compatibility.

### Files changed so far
- `WORK_LOG.md`
- `engine/ui/profileScreen.js`
- `services/license-api/migrations/0004_student_accounts.sql`
- `services/license-api/worker.js`
- `services/license-api/worker-activation-test.js`
- `services/license-api/server.js`
- `services/license-api/admin/admin.js`
- `services/license-api/admin/index.html`
- `services/license-api/integration-test.js`
- `services/license-api/migration-test.js`
- `services/license-api/release-check.js`
- `services/license-api/backup-db.js`
- `services/license-api/verify-backup.js`
- `services/license-api/restore-rehearsal.js`
- `services/license-api/backup-recovery-test.js`

### Test status
- Not yet marked PASS. CI and local test results are pending.
- The Worker test uses an in-memory SQLite-backed D1 adapter and generated test signing keys; it does not connect to Cloudflare production.
- No Cloudflare Worker deployment, D1 migration, production database write, real profile import, or activation-code issuance has been performed.
- The actual 10 existing profile IDs are not present in GitHub and have not been accessed or modified. They will only be read from a user-generated local JSON export when the user chooses to test.

### Immediate next verification
1. Run the full License API CI suite and inspect failures.
2. Confirm profile-screen static checks, admin CSP checks, Worker migration/activation tests, Node integration tests, SQLite migration tests, and backup/recovery tests.
3. Fix failures and repeat until green; only then prepare a draft test PR against PR #94 for review.


## 2026-11-07 — First CI result and corrective test fixture

### CI run 42409103400 (PR #96)
- PASS: release artifact check.
- PASS: Cloudflare Worker module syntax.
- PASS: production admin CSP validation.
- PASS: security test.
- PASS: non-root production Docker image build/check.
- PASS: production Caddy configuration.
- PASS: client license safety test.
- PASS: Worker activation integration test, including import/idempotency/conflict tests.
- FAIL: Node integration test stopped at the existing "Grade mismatch was accepted" assertion.
- Migration and backup/recovery jobs were skipped because the workflow stops after the integration failure.

### Root cause and correction
The grade-mismatch test used a different student ID from the one to which the test code was bound. With the new student-binding guard, the request correctly failed at the identity check (HTTP 409) before reaching the grade-mismatch check (HTTP 400). The test fixture was corrected to use the code's bound test profile so it now tests the intended grade-mismatch rule. No production code was weakened.

### Current validation state
- Corrective test change committed: `b558d0ef484fa0e45174a4b6c518f364636febd7`.
- A fresh full CI run is still required. Do not mark this implementation as tested until integration, migration, and backup/recovery checks complete.


## 2026-11-07 — Full License API CI passed

### Passing runs on the current implementation
- Workflow run `42409368944`: PASS.
- Workflow run `42409369151`: PASS.
- Both runs completed all 14 job steps successfully:
  - release artifact checks;
  - Worker module syntax;
  - profile export module syntax;
  - admin CSP;
  - security tests;
  - non-root Docker build;
  - Caddy config;
  - client license safety;
  - Node API integration (including import/idempotency/conflict/authentication);
  - SQLite migration verification;
  - encrypted backup/recovery verification.
- Worker activation integration test also passed, including D1 migration 0004, import, idempotency, conflicting-ID rejection, and student-bound activation.

### Interpretation
- The first CI attempt failed only because a grade-mismatch test used an ID different from the code's bound test profile. The fixture was corrected; the production identity/grade checks were not weakened.
- The passing CI runs validate the in-memory Worker test harness and temporary SQLite Node API. They do NOT yet validate a deployed Cloudflare test Worker or the user's actual 10 profile records.
- PR #96 remains unmerged and must remain Draft until the isolated live test environment and browser/device export-import test are complete.


## 2026-11-07 — Isolated Cloudflare test environment created

### Test D1
- Created a new, separate EU D1 database: `tahouri-license-student-import-test-20261107`.
- Database ID: `57cb28b2-1aa0-4b90-bcdb-dee74b7a8367`.
- Applied migrations 0001–0004 in order; all four API migration operations succeeded.
- Verified schema versions 1, 2, 3, 4; `student_accounts` exists; `activation_codes.student_id` exists; both new indexes exist.
- Verified initial data counts: 0 student accounts, 0 activation codes, 0 licenses.
- No existing/production D1 database was selected or modified.

### Test Worker
- Deployed a separate Worker: `tahouri-license-api-student-import-test`.
- Public test URL: `https://tahouri-license-api-student-import-test.asadtahouri1986.workers.dev`.
- Bound only to the new test D1; test-only signing keys and a new test-only admin password were installed as Worker secrets.
- Enabled the Worker on its workers.dev subdomain.
- Verified via Cloudflare API that the Worker has the expected D1 binding, test variables, three test secrets, and a 100% deployment.
- Runtime HTTP health/admin smoke test is being added to CI; this execution environment cannot directly fetch workers.dev URLs, so the GitHub Actions runner will perform that check.

### Test package and user guide
- Updated PR preview packaging and static validation workflows to include stacked PRs based on PR #94.
- Added `STUDENT_PROFILE_IMPORT_TEST.md` with the safe test steps. The preview package will preserve the app's localStorage only when served from the same browser origin and port where the existing profiles are stored.
- The test Worker/D1 remain empty. No actual profile export or import has happened.

### Remaining validation
1. Confirm GitHub Actions can reach the isolated Worker and reports `healthy / connected / schemaVersion 4`.
2. Confirm the static validation workflow passes and the preview ZIP artifact is generated.
3. Provide the test ZIP, Worker URL, and test login details to the user.
4. User exports the existing 10 profiles from the same localStorage origin, imports them into the test panel, and confirms the IDs/count. Do not issue activation codes.


## 2026-11-07 — Isolated runtime smoke test and preview package passed

### Final CI runs on branch head `10a7e94302dc392fa1904803cd8f814b7e8a68bc`
- License API CI run `42410058163`: PASS (all steps).
  - Includes release artifact check.
  - Worker module syntax and profile export module syntax.
  - Live HTTP smoke test against the isolated Cloudflare Worker.
  - Admin CSP, security, Docker/Caddy, client safety.
  - Node integration, SQLite migration, encrypted backup/recovery.
- Static validation run `42410058115`: PASS (all validation steps); Pages deploy job was skipped as expected for a pull request.
- PR preview package run `42410058111`: PASS; artifact uploaded.

### Live test Worker result
- GitHub Actions successfully reached the isolated Worker.
- `GET /api/health` returned healthy with database connected and schema version 4.
- `GET /admin` served the admin panel containing the profile import controls.
- Unauthenticated `GET /api/admin/students` returned HTTP 401 as expected.
- After the smoke test, D1 was rechecked: students=0, activation codes=0, licenses=0.

### Preview package
- GitHub artifact ID: `13589061000`.
- Artifact name: `tahouri-student-profile-import-preview`.
- Retention expiry: 2026-11-14.
- Downloaded and verified the inner preview ZIP; it contains the updated `engine/ui/profileScreen.js`, Worker source, and `STUDENT_PROFILE_IMPORT_TEST.md`.
- Local file created for delivery: `/mnt/data/Tahouri-Student-Profile-Import-Preview.zip`.

### Current status and safety
- PR #96 remains Draft and unmerged.
- Separate test Worker and EU D1 are live; production Worker and production D1 are untouched.
- The test D1 is empty. No real student profiles, activation codes, or licenses have been imported/issued.
- The user-side test is now possible: serve the preview ZIP from the same browser origin/port where the existing local profiles are stored, export the 10 profile identities, and import them into the test admin panel. Do not issue activation codes during this test.
