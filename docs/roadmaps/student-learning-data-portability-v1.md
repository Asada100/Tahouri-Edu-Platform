# Student learning-data portability v1

## Purpose

Provide a versioned, local JSON backup that moves student learning records between a phone and a Windows computer without moving device identity or license credentials. This is separate from the existing identity-only profile export used by the license administrator.

## Envelope

- Format: `tahouri-student-learning-data`
- Version: `1`
- One file contains up to 100 profiles.
- Each profile carries its stable `studentId`, name, grade, creation date, profile settings, and an optional `data` object.
- Restore is limited to 20 MiB and validates the complete envelope before writing.

## Included profile-owned data

| Dataset | Storage key |
|---|---|
| Activity progress, scores and stars | `Tahouri_Progress:<studentId>` |
| Overall, subject, chapter and activity statistics | `Tahouri_Statistics:<studentId>` |
| Per-student content locks | `Tahouri_ContentLocks:<studentId>` |
| Even/odd progression unlocks | `Tahouri_EvenOddProgression_v2:<studentId>` |
| Daily learning streak and day records | `tahouri_daily_learning_streak:<studentId>` |
| In-app notifications | `tahouri_notifications:<studentId>` |
| Spelling answer and target-answer records | `Tahouri_Spelling_Performance:<studentId>` |
| Adaptive question/skill performance | `Tahouri_QuestionPerformance:<studentId>` |
| Personal profile settings | Embedded in `Tahouri_Profiles` |

## Deliberately excluded

- Installation ID, device keys and device fingerprints.
- Signed entitlement envelopes, activation-code cache, license history and server-side license state.
- Push subscription endpoints and browser notification permission.
- Device-level reminder state.
- Unscoped `Tahouri_ActivityHistory`, which is currently a device/browser continue-learning pointer rather than authoritative student history.
- Global daily-message selection; it is not student learning progress.

These exclusions are intentional: restoring them could copy a device identity, expose credentials, or make one browser's state appear to belong to another device.

## Restore safety

1. Validate format, version, profile identities, settings and every supplied dataset before writing.
2. Match each dataset only to the exact stable student ID. Never import one student's data into another student's key.
3. If the target key is absent, restore it.
4. If the target contains only an empty/default dataset, restore the non-empty backup.
5. If both target and backup contain different non-empty data, reject the entire import. Do not silently merge or overwrite.
6. Identical data is a no-op. Re-importing the same file is idempotent.
7. Stage writes and retain previous values. If a storage write or profile import fails, roll back staged data and profile metadata.
8. Preserve existing profile settings during identity-only profile imports; full backups carry settings for newly restored profiles.

## Tests

`services/license-api/student-data-transfer-test.js` covers:
- Two-profile export and strict student-key separation.
- Inclusion of all eight learning datasets and settings.
- Exclusion of device-bound credentials and unscoped activity pointer.
- Full restore and repeat-import idempotency.
- Restoring over empty/default target datasets.
- Conflict preflight with no partial writes.
- Rollback after a simulated localStorage write failure.
- Profile settings preservation and profile-screen wiring.

## Acceptance still required

CI tests are not a substitute for a real phone + Windows round trip. Before production release:
1. Create two synthetic student profiles with distinct progress, stars, locks, streaks, spelling records, statistics and settings.
2. Export on one device and restore on the other.
3. Confirm both profiles retain their own records after reload and A → B → A switching.
4. Re-import the same backup and confirm no duplication or overwrite.
5. Create a conflicting non-empty target record and confirm restore stops without changing any profile.
6. Confirm license activation remains device-specific and is not transferred by the backup.

This feature is a local file backup/restore, not cloud synchronization or server-side account backup.
