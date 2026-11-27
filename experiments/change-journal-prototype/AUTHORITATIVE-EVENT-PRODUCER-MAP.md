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


## 6. Additional engine producer trace (second pass)

The following files were resolved from the actual script list in `index.html` and inspected directly on this branch.

| Engine | Completion producer | Event path | Answer-event finding |
|---|---|---|---|
| Puzzle | `PuzzleEngine.completeActivity()` in `engine/activity/puzzleEngine.js` | Emits `puzzleFinished`, then `activityFinished`; guards the second event against a synchronous listener replacing/resetting the run. | No generic `answer:correct/wrong` event in this engine. It uses puzzle-specific events such as `puzzleWrong`; puzzle handlers update score/state. |
| Memory | `MemoryEngine.finish()` in `engine/activity/memoryEngine.js` | Emits `activityFinished` directly with `activityId`, score and pair counts. | No generic answer event found in this engine. Pair matching is represented in engine state/counters. |
| Matching | `MatchingEngine.finish()` in `engine/activity/matchingEngine.js` | Standalone activity emits `activityFinished`; composite stage emits `compositeMatchingFinished` instead, so the parent owns final completion. | No generic answer event found. Individual matches update pair/move state. |
| Classification | `ClassificationEngine.finish()` in `engine/activity/classificationEngine.js` | Uses `ActivityManager.finish(result)` when available; fallback emits `activityFinished`. | No generic answer event found. Classification outcomes are accumulated in classification state. |
| Composite | `CompositeActivityEngine.finish()` in `engine/activity/compositeActivityEngine.js` | Uses `ActivityManager.finish(result)`; fallback emits `activityFinished`. It is already guarded by `state.finished`. | No generic answer event found in the parent engine. Child matching completion is routed through `compositeMatchingFinished`. |
| Word Puzzle | `WordPuzzleEngine.finish()` in `engine/wordPuzzle/wordPuzzleEngine.js` | Emits `activityFinished` directly. The inspected finish method sets `state.finished` but has no early-return idempotency guard. | No generic answer event found; correct/wrong totals are updated inside the engine before finish. |

### 6.1 Findings that affect safe completion identity

- Completion is emitted through at least three paths: direct `EventManager.emit` in engines, `ActivityManager.finish`, and the composite-only child event. A single wrapper at `ActivityManager.finish` is insufficient.
- Puzzle, Composite and Classification have explicit state guards around completion; Word Puzzle's inspected `finish()` does not. Memory and Matching set terminal state in their finish path, but a repeated-call guard must be verified against their complete call flow before relying on it.
- Matching child-stage completion is intentionally not a student activity completion. A future completion ID must be attached only to the parent composite completion, not to each child stage.
- These engines do not currently emit the shared `answer:correct/wrong` events seen in Quiz and Dictation. Their per-item actions are maintained in engine-specific state/counters; therefore a future answer-event schema cannot assume every activity engine publishes answer attempts.
- The `WordPuzzleEngine` source is loaded from `engine/wordPuzzle/wordPuzzleEngine.js`, not `engine/activity/wordPuzzleEngine.js`. Composite is loaded from `engine/activity/compositeActivityEngine.js`.

### 6.2 Updated producer coverage

The inspected completion producer set now includes Quiz, Dictation, Puzzle, Memory, Matching, Classification, Composite and Word Puzzle. No generic answer-event producer was found in Puzzle, Memory, Matching, Classification, Composite or Word Puzzle in the inspected engine files. This is a source-level trace, not a runtime proof that no other module emits similarly named events.

## 7. Revised next safe step

Do not add the journal to storage writers yet. First define and test a completion envelope at the shared lifecycle boundary that can preserve the existing session identity and handle both direct and ActivityManager emission paths. In parallel, give Word Puzzle a dedicated duplicate-finish test before changing its runtime behavior. Answer tracking should remain source-specific: Quiz question attempts, Dictation character input/spelling completion, and engine-local puzzle/matching/classification actions are different semantic records.

