# Student learning-data cloud sync v1

## Scope and separation

This is a separate feature from the local JSON backup in
`student-learning-data-portability-v1.md`. It stores only the eight
profile-owned learning datasets for one stable `studentId`.

It never transfers device private keys, installation IDs, fingerprints,
signed entitlements, activation codes, license caches, push endpoints, or
device-level state. The existing one-phone/one-computer device binding remains
the authorization boundary.

## Server contract

Endpoint: `POST /api/learning-data/sync`

Every request is signed by the registered device key. The signature covers the
JSON proof object in this exact property order:

- `purpose`: `tahouri-learning-data-sync-v1`
- `action`: `pull` or `push`
- `licenseId`, `studentId`
- `deviceType`, `installationId`, `keyFingerprint`
- `expectedRevision`
- `payloadHash`: SHA-256 of `JSON.stringify(datasets)` for push; empty for pull

The Worker verifies the active, non-revoked device slot, the device signature,
the active license, and the exact student/grade association before reading or
writing data.

The server stores one versioned snapshot per stable student ID. A push uses
compare-and-swap on `expectedRevision`; stale writes receive HTTP 409 and the
current server revision/snapshot. The server never silently applies last-write-
wins and never overwrites a newer snapshot with an older device revision.
Snapshots remain associated with the student across license renewals.

The eight required dataset keys are `progress`, `statistics`,
`contentLocks`, `parityProgression`, `dailyStreak`, `notifications`,
`spellingPerformance`, and `questionPerformance`. The request body is
bounded to 256 KiB and the serialized dataset snapshot to 192 KiB.

## Current implementation boundary

The Worker endpoint, D1 migration 14, and Worker regression coverage
implement the authenticated server storage contract. The browser client now
collects the eight profile-scoped datasets, signs requests with the registered
device key, pulls before pushing, merges post-baseline numeric statistics
deltas, unions append-only arrays, preserves unlocked content, and rejects
ambiguous scalar conflicts instead of silently overwriting either device. A
local per-student base snapshot supports three-way merges. Sync is scheduled
after statistics saves, profile changes, startup, focus return, and network
restoration; local data remains the retry queue while offline.

The implementation is wired into the PR141 preview and automated tests pass.
A physical phone + Windows round trip remains mandatory before release. The
first sync between devices with independent pre-existing histories uses a
conservative merge (maximum counters per matching activity) because those
older histories have no common server baseline; future concurrent updates use
three-way delta merging.

## Safety and release gates

- Keep this work in PR 141 and keep the PR Draft.
- Apply migration 14 only to the isolated PR141 D1 environment for E2E tests.
- Do not deploy the Worker or Pages to production and do not modify production D1.
- A successful API test is not a substitute for a physical two-device test.
