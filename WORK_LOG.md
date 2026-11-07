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


## 2026-11-07 — Add the phone's active GitHub Pages profile as a third source

### User clarification
The user confirmed there is also one active student profile on their phone, opened through the GitHub Pages version of Tahouri. This is a third independent profile store and must be included in the inventory before any import:
1. Desktop local app at `http://127.0.0.1:5500` (reported earlier to contain 10 profiles; exact count and IDs still require export verification).
2. Desktop GitHub Pages app (contains several test profiles, currently inactive; count and IDs not yet verified).
3. Phone GitHub Pages app (one active profile, per user; exact ID/name/grade not yet exported or verified).

### Storage and origin implications
- Browser localStorage is isolated per device/browser profile. The phone's GitHub Pages profile is not automatically visible on the desktop, even when both devices open the same GitHub Pages URL.
- The desktop local preview at `127.0.0.1:5500` cannot read the phone's GitHub Pages localStorage. It also cannot read desktop GitHub Pages localStorage because that is a different origin.
- Therefore, the current preview ZIP instructions are suitable only for the desktop-local source. They are NOT a valid export method for either GitHub Pages source.
- To export the phone profile safely, the export action must execute in the phone browser under the exact GitHub Pages origin that owns that localStorage. A local preview or a different host/subdomain will not work.

### Revised safety plan
- Treat all three sources as separate inventories and separate JSON exports. Never combine them before checking exact student IDs, names, grades, and duplicates.
- First complete and verify the desktop-local export from `127.0.0.1:5500`.
- Separately design and validate a no-production-change way to run/export the identity-only JSON from the desktop GitHub Pages origin and the phone GitHub Pages origin. Do not assume the Draft PR preview ZIP can do this; it has a different origin and is not deployed to Pages.
- Any temporary Pages deployment, merge, or change to the live GitHub Pages app requires explicit user approval. Prefer a non-deploy method if technically sound.
- For the phone, verify the exported list contains the single active profile the user described. Do not request or expose passwords, activation codes, or student progress data.
- Only after all three inventories are separately reviewed should we create a deduplicated import plan. Exact duplicate IDs with matching identity data may be treated as the same profile; same ID with differing name/grade is a conflict requiring user review.
- Keep test D1 empty until the user approves importing the reviewed combined inventory. Do not issue activation codes or touch production.

### Current verification status
- Confirmed from user: one active profile exists on the phone's GitHub Pages app.
- Confirmed by architecture: phone and desktop browser localStorage are device-local; same Pages URL does not synchronize them.
- Not yet verified: phone profile ID/name/grade; desktop Pages test profile IDs; actual desktop-local export count.
- No phone data has been read, exported, imported, or modified.
- No production Pages deployment or production D1 write has been performed.

### Next engineering task
Inspect the current profile persistence and export code paths, then implement/validate a safe export route that runs within the exact GitHub Pages origin on both desktop and phone without merging/deploying PR #96. Update this log and the test guide before asking the user to perform the phone export.


## 2026-11-07 — Inspect exact profile storage and choose a no-deploy export path

### Code inspection
- Confirmed `engine/activity/profileManager.js` uses localStorage keys `Tahouri_Profiles` and `Tahouri_Active_Profile`.
- The stored profile records include `studentId`, `name`, `grade`, `createdAt`, and per-profile `settings`.
- Confirmed `ProfileScreen.exportProfilesForAdmin()` already exports only `studentId`, `name`, and `grade` as `studentId`, `fullName`, and `gradeId`; it intentionally omits progress/settings.
- The export UI exists on the PR #96 branch, but PR #96 is not merged/deployed to the production Pages app. Do not assume the button is available on the user's live GitHub Pages app.

### Safe path under evaluation
- Avoid changing or deploying the production Pages application solely to add an export button.
- Use a temporary same-origin browser bookmarklet (or another same-origin execution method) to read the two known localStorage keys from the currently open GitHub Pages origin and download the same identity-only JSON format.
- This approach does not need an app deployment and reads only the currently open device/browser's own localStorage. It must not send data to a server.
- Before giving device-specific instructions, confirm whether the user's phone opens GitHub Pages in Safari or Chrome. Bookmarklet setup and activation steps differ slightly by browser/device.
- The bookmarklet must validate the collection, active profile, unique/non-empty IDs, names, and grade IDs; it must not modify either localStorage key. If any validation fails, stop and report the issue rather than exporting a misleading list.

### Current status
- Exact storage keys and profile field names verified from source.
- No same-origin export bookmarklet has yet been executed on the user's phone or desktop Pages browser.
- No production Pages code changed or deployed.
- No profile data has been read from the user's devices.
- No D1 import or activation-code issuance.

### Next action
Confirm the phone browser (Safari or Chrome), then prepare exact bookmarklet installation/use steps for that browser. After the user runs it, inspect the downloaded JSON structure/count before any import.
