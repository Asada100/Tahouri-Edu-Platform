# Completion Identity Acceptance Matrix

**Status:** proposed test specification; not implementation  
**Branch:** `experiment/local-change-journal-prototype`  
**Prerequisite:** extended engine producer audit

This matrix defines the minimum evidence required before a completion ID is added to the Change Journal or any of the eight learning-data writers.

## A. Identity lifecycle

| Case | Setup / action | Required result |
|---|---|---|
| A1 Fresh attempt | Start an activity for profile P | One persisted session ID exists before engine start |
| A2 Resume | Save an in-progress supported session, reload, resume | The resumed attempt retains exactly the same session ID |
| A3 Explicit restart | Start a new attempt after a prior attempt was cleared/completed | A new session ID is generated |
| A4 Same-millisecond starts | Create two fresh attempts for the same activity under a controlled identical clock tick | IDs remain distinct; no timestamp-only collision |
| A5 Profile isolation | Start the same activity for profiles P and Q | Session IDs and storage namespaces are isolated |
| A6 Missing session | Trigger completion without a valid persisted session | Fail closed for journal publication; do not invent a completion ID in a consumer |
| A7 Unsupported resume | Attempt resume for Matching or Composite while validator does not support it | Explicitly reject or implement and test support; never silently claim resume continuity |

## B. Completion publisher coverage

Run each case against the real engine method with deterministic test doubles for EventManager, ActivityManager, ActivityResult, and session storage.

| Engine/path | Trigger | Required assertion |
|---|---|---|
| Quiz | Complete final question | One result with the active persisted session ID |
| Dictation | Complete final target | One result with the active persisted session ID |
| Puzzle | Complete final puzzle question | `puzzleFinished` may fire, then exactly one journal-eligible activity completion |
| Memory | Match all pairs | Exactly one journal-eligible completion |
| Matching standalone | Match all required pairs | Exactly one standalone completion |
| Matching composite stage | Complete child matching stage | Child event only; no parent completion journal entry |
| Classification | Classify all items | Exactly one journal-eligible completion |
| Composite | Complete all parent stages | Exactly one parent completion; child stages are not separate parent completions |
| Word Puzzle | Complete each supported mode | Exactly one journal-eligible completion per attempt |

## C. Duplicate and re-entrancy tests

1. Invoke each engine's terminal method twice; the second call must not create a second completion.
2. Deliver the same `activityFinished` event twice with the same completion ID; the central fan-out must apply it once.
3. Deliver the same completion ID with a different result payload; reject it as an identity/content mismatch.
4. Trigger a synchronous listener that starts or resets another activity during `puzzleFinished`; the old run must not publish a stale completion afterward.
5. Trigger completion while a composite matching child is active; only the parent composite's terminal result may update the platform completion projections.

## D. Dataset fan-out assertions

For one accepted completion ID, assert the expected mutation exactly once in each applicable completion-derived dataset:

- Progress: same activity's projection updated once.
- Statistics: attempts / score aggregates updated once.
- Daily streak: one occurrence appended; no duplicate day/activity occurrence for replay.
- Content locks and parity progression: unlock effects applied once.
- Question and spelling performance: only source-appropriate answer/target records are counted; completion replay must not duplicate them.

Notifications are not automatically completion-derived; test their own mutation identity and deletion/tombstone semantics separately.

## E. Required test outputs

The test job must report:

- number of engine paths tested;
- number of identity lifecycle cases passed/failed;
- duplicate-delivery and payload-mismatch results;
- profile-isolation result;
- whether Matching and Composite resume are supported;
- proof that no real student profile, production storage, API, Worker, or D1 was accessed.

A green test requires all mandatory cases above to pass. A skipped or unsupported case must be reported as **NOT VERIFIED**, not PASS.

## F. Implementation gate

Do not connect journal writes to completion consumers until A, B, and C pass. Do not treat this matrix as proof of implementation; it is an acceptance specification only.

## G. Diagnostic evidence — 2026-11-27

GitHub Actions run [46058593385](https://github.com/Asada100/Tahouri-Edu-Platform/actions/runs/46058593385) completed successfully on the experimental branch. Job `browser-test` completed with conclusion `success`.

Observed outputs from the job logs:

- Change Journal localStorage browser suite: **6/6 PASS**.
- Existing storage writer browser suite: **10/10 PASS**.
- Activity session identity diagnostic: **5/5 diagnostic checks executed**.
- A1: session persisted before engine start — PASS.
- A2: resumed saved session retained its ID — PASS.
- A3: same-tick restart — **BLOCKER CONFIRMED**; timestamp collision reproduced.
- A4: same activity/time across profiles — **BLOCKER CONFIRMED**; profile-independent ID collision reproduced.
- A5: later timestamp produced a different ID — PASS.

**Interpretation:** the diagnostic harness and workflow passed, and successfully reproduced two defects in the current session-ID strategy. This does **not** mean the identity acceptance gate passed. A3/A4 remain blockers; the diagnostic did not implement or validate a collision-resistant ID generator. The broader A6/A7, engine publisher coverage (section B), duplicate/re-entrancy coverage (section C), and dataset fan-out coverage (section D) remain **NOT VERIFIED** by this run.

The diagnostic uses a synthetic browser harness and does not establish correctness with real student profiles, production storage, API, Worker, or D1.

## H. Next required work

1. Propose a collision-resistant session/completion identity strategy (prefer `crypto.randomUUID()` where available, with a carefully specified secure fallback or explicit fail-closed behavior).
2. Define restart, resume, profile-scope, and legacy-session compatibility semantics before touching runtime code.
3. Add deterministic tests for same-tick starts and cross-profile uniqueness; retain the current resume-stability assertion.
4. Only after the proposal and tests are reviewed, request approval before changing runtime identity behavior.

No Change Journal integration into the eight production writers is authorized by this evidence. No production Worker, D1, or deployment was changed by this diagnostic.
