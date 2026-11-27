# Authoritative Activity and Answer Producer Map

**Status:** producer locations identified by direct source inspection
**Branch:** `experiment/local-change-journal-prototype`
**Scope:** read-only source trace; no runtime code changed

## 1. Activity completion producer

### Quiz
File: `engine/activity/quizEngine.js`
- `QuizEngine.finish()` builds the result through `ActivityResult.create(...)`.
- It emits `EventManager.emit("activityFinished", result)`.
- The result includes `activityId`, score, total/correct/wrong counts, percentage and message.
- No completion/session identifier is added to this result in the inspected method.

### Dictation
File: `engine/activity/dictationEngine.js`
- `DictationEngine.finish()` validates that the final question is complete and the engine is at its terminal position.
- It builds a result with `activityId`, score, percentage, answer counts and completion fields; it uses `ActivityResult.create` when available.
- It emits `EventManager.emit("activityFinished", result)`.
- No completion/session identifier is added to the result in the inspected method.

### Shared lifecycle consumer
File: `engine/activity/activityLifecycle.js`
- A single `activityFinished` listener resolves the activity, then calls:
  - `DailyLearningStreak.recordActivity(activity, result)`
  - `ProgressTracker.update(activity.id, result)`
  - `SessionManager.addActivity(result.score)`
  - `StatisticsManager.addResult(activity, result)`
  - and progression unlock logic.
- This is the central fan-out point for completion-derived datasets.
- It currently trusts the result/activity context and has no idempotency guard around the fan-out.

### ActivityManager
File: `engine/activity/activityManager.js`
- `ActivityManager.finish(result)` also emits `activityFinished`, but the inspected Quiz and Dictation engines emit the event directly.
- `ActivityLifecycle` explicitly notes that PuzzleEngine can emit directly and therefore not all completion paths pass through `ActivityManager.finish()`.
- Therefore adding an ID only inside `ActivityManager.finish()` would miss direct engine emitters.

## 2. Existing session identity candidate

File: `engine/activity/activitySessionManager.js`
- `begin(activity)` creates and persists a session object before engine startup.
- The session contains `id`, `profileId`, `activityId`, `activityType`, `startedAt`, and status.
- It preserves an existing active session for the same activity, and `ActivityManager.start()` clears a previous session before a deliberate fresh attempt.
- This is a promising source for a stable per-attempt identity across resume. It is **not yet approved as the completion ID**: the current ID is constructed from activity ID plus `Date.now()`, and collision/restart semantics need explicit tests and a defined migration/compatibility contract.
- If adopted, the completion payload should carry the already-persisted session ID; do not independently generate IDs in each completion consumer.

## 3. Answer producers

### Quiz answers
File: `engine/activity/quizEngine.js`
- `QuizEngine.checkAnswer(answer)` emits either `answer:correct` or `answer:wrong`.
- Both event forms currently pass only the current `question` object.
- Optional questions use the same two event names and the same question-only payload.
- The same question can be answered repeatedly, so question ID/index alone cannot identify an answer attempt.
- A per-engine monotonically increasing attempt sequence combined with the activity session ID is a possible design, but must be verified against every quiz/provider caller before implementation.

### Dictation character input
File: `engine/activity/dictationEngine.js`
- `inputChar(char)` emits `answer:wrong` for each incorrect character, with a payload containing character, expected character and questionIndex.
- It emits `answer:correct` for each correct character, with a similar payload.
- This event stream is character-level, not one event per completed spelling answer. It must not be treated as equivalent to one quiz answer or one spelling record.
- Error-hunt mode also emits a wrong event for selected-word errors and has separate question-completion behavior.
- The stable identity design must distinguish a character attempt from a completed spelling target/answer record.

## 4. Important existing mismatch

`QuestionPerformanceManager` listens globally to both answer event names and treats every event as a generic question attempt unless the current activity is classified as a spelling activity. The Quiz producer sends a question object; Dictation sends a character-result object. Thus the event names are shared, but payload schemas and semantic granularity differ.

A single generic `answerAttemptId` contract can still be used only if the event also declares its source/semantic kind (for example quiz-question-answer vs dictation-character-input). Do not retrofit a shared ID without that distinction, or character keystrokes may be counted as generic question attempts.

## 5. Recommended next safe step

Before code changes:
1. Inspect all engines that emit `activityFinished` and all producers of answer events (Puzzle, Memory, Matching, Classification, Composite, Word Puzzle and Dictation).
2. Decide whether the existing persisted ActivitySessionManager ID can be hardened and used as `completionId`, or whether a new ID field must be added to the session schema.
3. Define two event contracts, not one:
   - completion: `completionId`, `profileId`, `activityId`, result payload;
   - answer attempt: `attemptId`, `sessionId`, `activityId`, `questionIndex`/target identity, `sourceKind`, outcome.
4. Test fresh start, resume, restart, repeated answers, duplicate finish emission, and profile isolation before wiring any storage writer.

## Safety boundary

No code, localStorage, API, PR #141, D1, production worker, or student data was changed. This document records producer locations and current payload contracts only.
