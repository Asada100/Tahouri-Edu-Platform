# Storage write-path browser test results

Date: 2026-11-27
Branch: `experiment/local-change-journal-prototype`
Tested commit: `69125fb09b861a55c20db7cb148b235474743f08`
GitHub Actions run: https://github.com/Asada100/Tahouri-Edu-Platform/actions/runs/46045711935

## Result

**PASS — 10/10 real-writer browser checks.** The existing Change Journal prototype suite also passed **6/6** in the same CI run.

The test page loads the platform's actual writer modules in a fresh, isolated Chromium context. It uses synthetic profile IDs beginning `__CJ_AUDIT_`, an in-memory stub for the profile/event services, and a stubbed content-lock fetch. It does not connect the Change Journal, call the learning-sync API, use real student profiles, or touch production data.

## Checks passed

1. ProgressTracker.update writes profile-scoped progress.
2. StatisticsManager.addResult writes updated activity aggregates.
3. ContentLockManager lock/unlock writes the lock state.
4. ContentLockManager.recordProgressionResult writes the next unlocked parity activity.
5. DailyLearningStreak.recordActivity appends a daily activity occurrence.
6. NotificationStore.add and markRead persist notification changes.
7. NotificationStore.clear physically removes the storage key; no deletion tombstone is emitted.
8. SpellingPerformanceStore.recordSession appends an answer record; no stable answerId/id is present.
9. QuestionPerformanceManager.record increments attempts/correct counters.
10. Switching the synthetic profile ID causes ProgressTracker to write to a separate profile-scoped key without changing the first profile.

## What this proves — and what it does not

- It proves that the current public mutation methods reach the expected localStorage keys in a real browser runtime.
- It confirms that writes are distributed across direct localStorage and SaveManager paths; SaveManager alone is not a complete integration point.
- It confirms concrete replay/idempotency blockers: question counters are increments, daily streak is an append/count mutation, spelling answer records lack stable IDs, and notification clear is a physical key removal.
- It does **not** prove that all call sites in the full application were exercised, that cross-device conflict resolution is correct, or that the prototype can safely replay these mutations.
- It does **not** connect or enable Change Journal in the application.

## Next implementation-design gate

Before connecting the journal, define and test per-dataset mutation contracts:
- immutable event IDs for daily streak and spelling answers;
- idempotency keys for question/statistics counter updates;
- explicit deletion tombstones for notifications and any other deletable records;
- a single, documented profile namespace resolver;
- an integration boundary covering both direct localStorage writers and SaveManager writers.

Keep this work isolated. Do not alter production writers or sync API until these contracts have tests for duplicate delivery, crash/recovery, profile switching, and concurrent-device merges.
