# Dataset Mutation Contracts — Change Journal Prototype

**Status:** design specification only; not implemented  
**Scope:** the eight existing profile-scoped learning datasets  
**Baseline:** `experiment/local-change-journal-prototype`  
**Safety:** this document does not modify runtime writers, the sync API, D1, PR #141, or production data.

## 1. Purpose and non-negotiable rules

The current journal safely replays only deterministic `set` and `delete` operations. A learning action must not be represented as a blind counter increment or an append without a stable identity: replay after a crash or delivery retry could otherwise count the same action twice.

Every future journal mutation must satisfy all of these rules:

1. It is scoped to one validated `studentId`; never infer ownership from an unscoped legacy key.
2. It has a stable `mutationId` created once at the source action and reused for retries on that device.
3. Reusing a `mutationId` with the same canonical operation is a no-op; reusing it with different content is a hard collision error.
4. A mutation is durably journaled before its dataset projection is changed.
5. Cross-device merge is deterministic and preserves independent valid actions.
6. Deletion is represented explicitly; absence alone is not a portable deletion signal.
7. Existing data remains readable during migration. No destructive conversion is permitted until legacy compatibility and rollback are tested.

A timestamp is useful ordering metadata, but is not a unique mutation identity.

## 2. Dataset contract matrix

| Dataset | Current writer behavior observed | Required identity / operation contract | Merge and projection rule | Unresolved decision |
|---|---|---|---|---|
| `progress` | `ProgressTracker.update(activityId, result)` overwrites latest attempt fields and keeps best values using maxima. | Source completion must carry a stable `completionId`. Model the latest-attempt projection as a deterministic set keyed by activity, and retain best-score fields as max projections. | Same completion replay must not create a second logical completion. Different completions for the same activity remain distinct; choose latest by a deterministic source sequence, not wall-clock alone. | The current record does not retain completion history or a source sequence. Decide whether history belongs in this dataset or whether only latest + best state is a product requirement. |
| `statistics` | `StatisticsManager.addResult` increments overall, subject, chapter and activity aggregates on every call. | Each completed activity result needs a stable `completionId`; aggregate application must be guarded by a per-completion dedupe ledger. | Apply each completion once. Prefer deriving/rebuilding aggregates from a deduplicated completion ledger for new-format data. Never replay raw aggregate increments. | Existing aggregate-only records do not contain per-attempt scores/IDs, so historical ledgers cannot be reconstructed exactly. Define a versioned legacy baseline plus forward-only ledger; do not fabricate old events. |
| `contentLocks` | `lock`, `unlock`, `reset`, and `ensureLocked` write booleans; explicit open defaults override stale saved locks. | A state change needs a stable mutation ID and a version/order token. Treat each activity's lock state as a versioned assignment, not an increment. | Resolve competing assignments by a documented deterministic ordering while preserving the existing authority of explicitly open defaults. | Define precedence between a teacher/content-default change and a student's local lock state; do not let generic last-write-wins bypass open-by-default rules. |
| `parityProgression` | `recordProgressionResult` adds the next allowed activity to `unlocked` after an 80% result. | Unlock is an idempotent set-membership grant keyed by the qualifying completion ID; activity IDs are from the manager's allowlist. | Union valid unlocked IDs; repeated grant is a no-op. Keep `evenOdd` as the mandatory initial activity. | If a future reset/relock is supported, union alone is insufficient; it will need a versioned reset/tombstone contract. Current writer only grants progression. |
| `dailyStreak` | `recordActivity` appends an occurrence and increments day/subject counts and total score. Repeating one activity on the same day is allowed. | Every occurrence needs its own stable `activityOccurrenceId` generated at the activity completion boundary. Do not derive it from `activityId + date`. | Deduplicate by occurrence ID, then derive day activity counts, subject counts and total score from the unique occurrences. Streak completion transitions must also be derived idempotently from daily state. | Current lifecycle result does not visibly provide a stable completion ID; confirm the authoritative completion boundary and timezone/day-key policy before implementation. |
| `notifications` | `add` creates a timestamp/random ID; read state mutates records; `clear` removes the whole key. | Notification creation needs a stable ID supplied/reused by its source. Read/unread is a versioned state assignment. Clear must create tombstones for each known notification (or a versioned clear marker with a defined causal boundary). | Merge by notification ID and version; a tombstone wins over older copies. New notifications created after the clear boundary must survive. | Current `clear()` has no return value and physically removes storage. Define whether clear means delete-all-existing or clear-only-read, and how concurrent new notifications are treated. |
| `spellingPerformance` | `recordSession` appends answer and target-answer records; records have `recordedAt` but no stable answer ID; arrays are capped at 2,000. | Each answer occurrence needs a stable `answerId` (or session ID + stable per-session answer key) reused on retry. Target-answer records need the same guarantee independently. | Union by stable ID, reject same-ID/different-content collisions, and apply retention only after dedupe/ack policy is defined. | Confirm whether `questionIndex` is stable within a session and add a stable session identity at the dictation-session source. |
| `questionPerformance` | `record(question, isCorrect)` increments attempts/correct/wrong on a question-keyed aggregate; events arrive through `answer:correct` and `answer:wrong`. | Every answer event needs a stable `answerAttemptId`; question key is not an attempt ID because the same question may be answered repeatedly. | Deduplicate attempts by ID, then derive attempts/correct/wrong and latest-answer fields. Keep question metadata keyed by the existing question key. | EventManager currently passes the question object only in the observed handlers. Identify a stable attempt ID at the answer producer before changing this writer. |

## 3. Profile namespace contract

The current writers do not all resolve profile identity through one identical helper:

- Progress, statistics, content locks, parity progression, spelling, and question performance use `ProfileContext.key(baseKey)`.
- Daily streak and notifications use `ProfileManager.getStudentId()` and construct the profile suffix themselves.
- Student data transfer constructs the same eight key prefixes directly from its validated `studentId`.

Before journal integration, define one shared resolver contract:

- Input: a validated student ID, plus a known dataset base key.
- Output: the exact existing profile-scoped storage key; no fallback to `anonymous` or `no-profile` for journal writes.
- The active-profile convenience path must resolve the active ID once per mutation and verify it has not changed before commit.
- Transfer/import must use the explicitly supplied target student ID, not whichever profile happens to be active.
- Legacy unscoped keys remain migration/quarantine inputs only; never journal destinations.

Do not rename the existing storage keys as part of the first integration.

## 4. Mutation envelope (proposed)

This is a logical contract, not an implemented API:

```js
{
  schemaVersion: 1,
  mutationId: "stable-source-generated-id",
  studentId: "validated-profile-id",
  dataset: "dailyStreak",
  operation: "record-occurrence",
  entityId: "stable-domain-entity-id",
  occurredAt: "ISO-8601 timestamp",
  sourceDeviceId: "stable-device-id",
  sourceSequence: 123,
  payload: {}
}
```

Requirements:

- `mutationId` is globally unique within a student namespace and stable across retries.
- `entityId` identifies the domain object/occurrence; it is not necessarily the same as `mutationId`.
- `sourceSequence` is monotonic for the source device and is used with device ID for deterministic ordering where ordering is required.
- Server revision remains the snapshot concurrency mechanism; it is not a replacement for mutation identity.
- The exact ID generator, persistence boundary, collision policy and clock-skew behavior require tests before the envelope is adopted.

## 5. Cross-dataset completion boundary

A single activity completion can update progress, statistics, parity progression, daily streak and question/spelling performance. Those changes are not currently one atomic write: separate modules listen to events or are called independently.

Therefore, journal integration must not independently mint unrelated IDs in each dataset. The preferred design candidate is one completion context created at the authoritative activity-finished boundary and propagated to every participating writer. Each dataset may derive a dataset-specific mutation ID from that stable completion context plus a stable sub-record key.

This is a design candidate only. First inspect all activity-finished and answer-event producers/consumers and prove that the completion context is unique, durable across retries, and available to all writers. If that cannot be proven, do not integrate.

## 6. Migration and compatibility constraints

1. Preserve all eight current dataset top-level shapes until a versioned migration is designed and tested.
2. For statistics, retain old aggregate totals as a legacy baseline; only new deduplicated completion records are replayable.
3. For progress, do not silently reinterpret existing `lastPlayed` timestamps as unique completion IDs.
4. For daily streak and spelling history, legacy array entries without IDs remain legacy records; do not invent IDs from non-unique fields.
5. For notifications, a missing key in an old snapshot is ambiguous and must not be treated as a clear operation.
6. For question performance, existing aggregate counters remain a baseline; never infer individual answer attempts from counts.
7. Retention/compaction must not remove unacknowledged mutations or tombstones still needed by another device.
8. Sync API currently accepts a complete eight-dataset snapshot. Any journal transport or delta protocol requires a separate coordinated API/revision design; client-only partial payloads are forbidden.

## 7. Required tests before any writer integration

- Duplicate delivery of the same completion/answer/notification mutation is a no-op.
- Same ID with different canonical content is rejected.
- Two distinct completions of the same activity on the same day are both retained.
- Two devices completing different activities merge without loss.
- Statistics aggregates equal the sum of the unique post-migration completion ledger plus the preserved legacy baseline.
- Notification clear tombstone deletes an older remote copy but does not delete a later notification.
- Lock state merge cannot override an explicitly open content default.
- Profile switching during a pending write cannot place data in the next active profile.
- Crash after journal persistence but before dataset projection recovers exactly once.
- Crash after projection but before journal status update recovers exactly once.
- Old-format snapshots still import/export and sync without data loss.
- All tests run in isolated synthetic profiles; no real student profile or production database is used.

## 8. Current decision

**Not ready for Change Journal integration.** The existing writer tests prove the current public methods write their expected localStorage keys, but they do not supply the stable identities and deletion semantics required for replay-safe mutations.

Next implementation work, if approved by tests: trace the authoritative activity completion and answer-event producers, then add stable IDs at those source boundaries in an isolated experiment. Do not patch the eight production writers first.
