# Completion and Answer Event Source Trace

**Status:** partial source trace; no runtime changes
**Branch:** `experiment/local-change-journal-prototype`
**Purpose:** identify where stable event identity can be created before Change Journal integration.

## Verified event consumers

### Activity lifecycle

- `engine/core/eventManager.js` exposes a synchronous `emit(eventName, data)` dispatcher. It logs a stack trace when `activityFinished` is emitted, but does not create an event ID or normalize the payload.
- `engine/question/questionPerformanceManager.js` listens to `activityStarted`, `answer:correct`, `answer:wrong`, and `activityFinished`. The answer listeners receive only the question object and immediately call `record(question, isCorrect)`. The finish listener receives no result argument and only clears `currentActivityId`.
- `engine/question/spellingPerformanceStore.js` listens to `activityFinished(result)`, reads the active DictationEngine session, and calls `recordSession({ activityId, answers, targetAnswers })`. The event result is used only as an optional activityId mismatch guard. No stable session/completion ID is passed into the records.
- `engine/core/statisticsManager.js` exposes `addResult(activity, result)`; each call increments overall, subject, chapter, and activity aggregates. The method does not accept or persist a completion ID.
- `engine/core/dailyLearningStreak.js` exposes `recordActivity(activity, result)`; each call appends an occurrence and increments counters. Its stored occurrence has a generated timestamp but no stable occurrence ID.
- `engine/progress/progressTracker.js` exposes `update(activityId, result)`; it updates the activity's progress projection. The inspected method signature has no completion identity parameter.

## Verified answer-event limitation

The generic question-performance listeners receive only `question` in both answer events. The correctness value is implicit in the event name. No attempt ID, activity/session ID, source sequence, or timestamp is supplied by this listener contract. The question key is not a valid attempt identity because the same question can be answered more than once.

## Source-producer trace status

The exact call sites that emit `activityStarted`, `activityFinished`, `answer:correct`, and `answer:wrong` were not reliably identified in this inspection. A repository code-search attempt did not return usable matches, and the known `ActivityManager` path could not be fetched at the guessed locations. Therefore this report does **not** claim to have found the authoritative completion boundary.

This is the key unresolved dependency. Do not generate IDs independently inside each storage writer: that would create unrelated identities for one logical completion and would not make cross-dataset replay atomic.

## Safe design direction (not implemented)

1. Locate the actual activity lifecycle coordinator and the engine-level answer producers.
2. At the authoritative completion boundary, create one durable `completionId` and include it in the completion context passed to all completion consumers.
3. At each answer producer, create one `answerAttemptId` per submitted answer and pass it as event metadata alongside the question.
4. Ensure retry/re-entry reuses the original ID; a newly submitted answer gets a new ID even if the question is identical.
5. Propagate IDs first through an isolated compatibility layer and tests. Do not change existing localStorage writers until all call sites and event payload compatibility are mapped.

## Safety boundary

No production writer, event producer, sync API, D1 database, PR #141, or real student data was changed. This document records verified consumer-side facts and explicitly marks the producer-side trace as incomplete.
