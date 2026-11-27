# Change Journal — storage write-path audit

Audit date: 2026-11-27
Audited ref: `experiment/local-change-journal-prototype`
Base application code: `implementation/one-phone-one-pc` at `df382b68c5faf2a0e5aa5700c5c40a65b15fafec`
Scope: the eight datasets currently exported by StudentDataTransfer / StudentLearningSync.
This is a read-only code audit. No production data, runtime storage, API, or D1 database was changed.

## Findings by dataset

| Dataset | Primary writer / key | Mutation paths observed | Important risk |
|---|---|---|---|
| progress | `engine/progress/progressTracker.js`; `Tahouri_Progress` via ProfileContext | `update(activityId, result)` mutates in-memory object then `save()` writes directly to localStorage | Save has no direct StudentLearningSync scheduling. Activity-finished event is the current broad sync trigger. |
| statistics | `engine/core/statisticsManager.js`; `Tahouri_Statistics` via ProfileContext | update overall/subject/chapter/activity, then SaveManager.save; successful save explicitly schedules sync after 2500ms | Counters are incrementing aggregates; naive replay can double count. |
| contentLocks | `engine/core/contentLockManager.js`; `Tahouri_ContentLocks` via ProfileContext | `saveLocks()` writes localStorage; lock/unlock and progression paths call it | Must preserve open/unlocked semantics; direct writer does not schedule sync. |
| parityProgression | Same manager; `Tahouri_EvenOddProgression_v2` via ProfileContext | `recordProgressionResult()` appends next unlocked activity and writes localStorage directly | Set/union-like mutation; direct writer does not schedule sync. |
| dailyStreak | `engine/core/dailyLearningStreak.js`; `tahouri_daily_learning_streak:<studentId>` | `recordActivity()` appends an activity occurrence, increments counts/scores, then `save()` | Replaying an append or increment duplicates activity/counts. Records have timestamps but no dedicated immutable event ID. |
| notifications | `engine/core/notificationStore.js`; `tahouri_notifications:<studentId>` | add, markRead, markAllRead save whole array; clear calls localStorage.removeItem | Clear is a physical deletion with no tombstone. Mutations do not explicitly schedule sync. |
| spellingPerformance | `engine/question/spellingPerformanceStore.js`; `Tahouri_Spelling_Performance` via ProfileContext + SaveManager | `recordSession()` appends answer and target-answer records on activityFinished; clear removes the scoped key | Appended records have recordedAt but no stable answerId; retries/replay can duplicate. |
| questionPerformance | `engine/question/questionPerformanceManager.js`; `Tahouri_QuestionPerformance` via ProfileContext | `record()` increments attempts/correct/wrong and overwrites last-answer fields, then direct localStorage save | Increment is not replay-safe; stable mutation ID / idempotent event ledger is required. |

## Current sync scheduling observed

`engine/core/studentLearningSync.js` registers:
- `profileChanged` → schedule after 1500ms
- `activityFinished` → schedule after 2500ms
- browser `online` → 1000ms
- browser `focus` → 2500ms
- initial sync / activation-ready scheduling
- periodic polling (60 seconds; see initialization code)

Only StatisticsManager.save has an explicit dataset-save-to-sync scheduling call in its own writer. The other writers rely on broader lifecycle events, focus/online, or polling. Therefore an edit/clear outside an activity-finished lifecycle may not reach the remote snapshot immediately.

## Change Journal integration blockers

1. The prototype only supports replay-safe `set` and `delete`. It must not wrap current counter/append operations as naive increments or appends.
2. Required operation identities are missing from daily-streak occurrences, spelling answer records, and question-answer mutations.
3. Notification clear needs a transferable tombstone or versioned deletion record; physical removeItem alone is invisible to a later merge.
4. Writes are spread across multiple modules and both direct localStorage and SaveManager. Hooking SaveManager alone will miss direct writes.
5. Profile namespace resolution must be consistent for ProfileContext-based keys and DailyLearningStreak / NotificationStore studentId keys.
6. Sync currently exports and merges a complete eight-dataset snapshot. A journal must be designed with that contract and revision/conflict handling, not introduced as a client-only replacement.

## Recommended next step

Build a non-invasive write-path inventory/test harness before integration:
- enumerate each public mutation method and its callers;
- capture before/after localStorage values in isolated test profiles;
- verify that each mutation maps to an idempotent journal operation or explicitly requires an eventId/tombstone;
- add tests for profile switching, retries, duplicate delivery, and delete propagation.

Do not connect the prototype to production writers until all eight datasets pass this contract.
