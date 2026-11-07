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
