# Extended Activity Producer and Session Identity Audit

**Status:** read-only source trace completed for the listed engines  
**Branch:** `experiment/local-change-journal-prototype`  
**Scope:** Puzzle, Memory, Matching, Classification, Composite Activity, Word Puzzle, and ActivitySessionManager  
**Runtime changes:** none

## 1. Completion producer map

| Engine | Completion method | Publication path | Completion guard | Completion identity in result |
|---|---|---|---|---|
| PuzzleEngine | `completeActivity()` | Direct `activityFinished` after `puzzleFinished` | `state.isFinished`, request/activity identity recheck | No `completionId` observed |
| MemoryEngine | `finish()` | Direct `activityFinished` | `this.finished` | No `completionId` observed |
| MatchingEngine | `finish()` | Standalone: direct `activityFinished`; composite stage: `compositeMatchingFinished` | `state.isFinished` | No `completionId` observed |
| ClassificationEngine | `finish()` | `ActivityManager.finish()`; direct event fallback | `state.finished` | No `completionId` observed |
| CompositeActivityEngine | `finish()` | `ActivityManager.finish()`; direct event fallback | `state.finished` | No `completionId` observed |
| WordPuzzleEngine | `finish()` | Direct `activityFinished` | Sets `state.finished`; no explicit early-return guard observed in the inspected method | No `completionId` observed |

### Important details

- **PuzzleEngine:** `finish()` advances through the question sequence; terminal completion occurs in `completeActivity()`. It emits `puzzleFinished` first, then rechecks that the same run is still active before emitting `activityFinished`. This is a useful re-entrancy safeguard, but it does not create a durable completion identity.
- **MemoryEngine:** emits `activityFinished` directly after setting `finished = true` and building an `ActivityResult`.
- **MatchingEngine:** standalone matching emits `activityFinished`. When `activity.settings.compositeStage === true`, it emits `compositeMatchingFinished` with the child activity ID and result instead; this avoids prematurely finishing the parent activity.
- **ClassificationEngine:** uses `ActivityManager.finish()` when available and falls back to direct event publication.
- **CompositeActivityEngine:** aggregates stage results and uses `ActivityManager.finish()` when available. Matching stages contribute their pair count to the parent total.
- **WordPuzzleEngine:** has multiple interaction modes that call the same `finish()` method. That method publishes `activityFinished` directly. Its inspected implementation sets `state.finished` but does not visibly reject a second invocation before rebuilding and emitting the result; this should be tested before adding a completion journal.

## 2. Answer-event semantics in these engines

The inspected files do not show these engines publishing the generic `answer:correct` / `answer:wrong` event pair:

- PuzzleEngine publishes puzzle-specific events such as `puzzleChanged`, `puzzleWrong`, and `puzzleFinished`.
- MemoryEngine publishes lifecycle events and `activityFinished`; no generic per-card-pair answer event was found in the inspected source.
- MatchingEngine publishes `compositeMatchingFinished` for a composite child, or `activityFinished` for standalone completion. No generic answer event was found.
- ClassificationEngine publishes completion through the shared manager or event fallback; no generic answer event was found.
- CompositeActivityEngine publishes parent completion; matching child completion is handled through the dedicated composite event.
- WordPuzzleEngine publishes completion; its inspected answer/mode handlers do not publish generic answer events.

**Implication:** answer-attempt identity should not be forced onto all game interactions under one generic event contract. A future contract must distinguish at least quiz-question answers, dictation character input, spelling-target completion, puzzle checks, matching pairs, memory pairs, classification placements, and word-puzzle word discoveries. Each has different counting and retry semantics.

## 3. Session identity findings

File: `engine/activity/activitySessionManager.js`

- `ActivitySessionManager.begin(activity)` persists a session before engine startup.
- The session contains `id`, `profileId`, `activityId`, `activityType`, timestamps, status, and engine state.
- The ID is currently generated as:
  `activity-session-<activityId>-<Date.now()>`
- An active session for the same activity is retained; an explicit fresh start clears the previous session before beginning a new one.
- Resume restores the saved session and its engine state where that engine is supported.
- The inspected session validator explicitly recognizes Dictation, Word Puzzle, Quiz, Memory, Puzzle, and Classification. Matching and Composite are not listed as supported resumable session types in this validator.

### Why the existing ID is not yet approved as completionId

1. It is not copied into the completion result by the inspected engine finish methods.
2. It relies on activity ID plus millisecond timestamp; uniqueness under same-millisecond repeated starts is not formally guaranteed.
3. It is not yet proven that every direct and indirect completion path reads the same persisted session before emitting.
4. Matching and Composite have distinct lifecycle behavior and are not listed as supported resumable session types in the validator.
5. No test currently proves duplicate finish delivery is idempotent across all completion consumers.

The persisted session ID remains a candidate, not an approved identity contract.

## 4. Cross-engine risks for the Change Journal

1. **Multiple completion publishers:** a change limited to `ActivityManager.finish()` would miss Puzzle, Memory, Matching standalone, and Word Puzzle direct emitters.
2. **Mixed finish paths:** Classification and Composite may use the manager or a fallback event path depending on runtime availability.
3. **Composite child/parent distinction:** a matching child event must not be journaled as a second full platform activity completion.
4. **Duplicate completion:** Word Puzzle's inspected finish method needs an explicit repeat-call test and likely a guard before any persistence integration.
5. **Different interaction units:** pairs, placements, puzzle checks, discovered words, quiz answers, and dictation characters are not interchangeable event counts.
6. **Session coverage gap:** Matching and Composite are not explicitly accepted by the current session validator for resume.
7. **No completion ID:** none of the inspected completion payloads adds a stable `completionId`.

## 5. Recommended next implementation gate

Do not connect the Change Journal to these writers yet. First create a test matrix that proves:

- a fresh attempt receives a unique session identity;
- a resumed attempt retains the same identity;
- a deliberate restart receives a new identity;
- every engine's terminal result carries the same persisted identity;
- duplicate completion delivery is ignored by the central fan-out;
- a composite matching child is not counted as a parent completion;
- Word Puzzle cannot publish the same completion twice;
- profile switching cannot reuse another profile's session identity;
- unsupported Matching/Composite resume behavior is explicit rather than silently assumed.

Only after those tests pass should a single central completion envelope be introduced and connected to the eight dataset writers. Answer-level journal events should remain a separate design task with engine-specific source kinds.

## Safety boundary

No production files, runtime code, localStorage, API, D1 database, production Worker, student data, or PR merge state were changed. This document records source inspection only.
