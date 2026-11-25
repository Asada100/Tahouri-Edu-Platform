"use strict";

// Contract tests for activity-session snapshots and restore dispatch.
// This does not claim cross-device browser compatibility.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = relative => fs.readFileSync(path.join(__dirname, "../..", relative), "utf8");
const source = read("engine/activity/activitySessionManager.js");
const classes = new Set();
const storage = new Map();
const appContainer = { innerHTML: "" };
const document = {
    visibilityState: "visible",
    body: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) }, appendChild() {} },
    addEventListener() {},
    getElementById(id) { return id === "app" ? appContainer : null; },
    createElement() { return { setAttribute() {}, appendChild() {}, remove() {} }; }
};
const window = { addEventListener() {} };
const engines = {};
let activityState = "idle";
const context = {
    window, document, console: { log() {}, warn() {}, error() {} },
    EventManager: { on() {}, emit() {} },
    EngineManager: { getEngine(name) { return engines[name] || null; } },
    ProfileContext: { key: key => key + ":student-A", getStudentId: () => "student-A" },
    SaveManager: {
        save(key, value) { storage.set(key, JSON.parse(JSON.stringify(value))); return true; },
        load(key) { return storage.get(key) || null; },
        remove(key) { storage.delete(key); }
    },
    ActivityState: { set(value) { activityState = value; } },
    ActivityManager: {
        currentActivity: null,
        getCurrent() { return this.currentActivity; },
        async loadActivityConfig(activity) { return { ...activity, classification: activity.classification || {} }; }
    },
    ScoreManager: { score: 7, correct: 2, wrong: 1 },
    DictationScreen: { render() {} }, QuizScreen: { reset() {}, show() {} },
    MemoryScreen: { show() { return true; } }, PuzzleScreen: { show() { appContainer.innerHTML = "<div class=\"screen puzzleScreen\">restored puzzle</div>"; } },
    ClassificationScreen: { show() {} },
    App: { resolveActivityById(id) { return { id, title: id, classification: {} }; } },
    JSON, Date, Number, Array, Object, Set, Map
};
vm.runInNewContext(source, context);
const manager = window.ActivitySessionManager;

const cases = [
    {
        name: "dictation", engineName: "DictationEngine", kind: "dictation",
        activity: { id: "dictation-1", engine: "DictationEngine" },
        engine: {
            activity: { id: "dictation-1" }, content: { questions: [{ prompt: "q1", answer: "a1" }] },
            state: { currentIndex: 1 },
            getSessionState() { return this.state; },
            restoreSession(state) { this.state = state; return true; },
            getState() { return this.state; }
        }
    },
    {
        name: "wordPuzzle", engineName: "WordPuzzleEngine", kind: "wordPuzzle",
        activity: { id: "words-1", engine: "WordPuzzleEngine" },
        engine: {
            getSessionState() { return { kind: "wordPuzzle", words: ["alpha"], selected: 0 }; },
            restoreSession(data) { this.restored = data; return true; }
        }
    },
    {
        name: "quiz", engineName: "QuizEngine", kind: "quiz",
        activity: { id: "quiz-1", engine: "QuizEngine" },
        engine: {
            activity: { id: "quiz-1" }, state: { currentQuestion: 1 },
            questions: [{ question: "2+2", answers: [4] }], currentQuestion: 0,
            getQuestion() { return this.questions[this.currentQuestion]; }
        }
    },
    {
        name: "memory", engineName: "MemoryEngine", kind: "memory",
        activity: { id: "memory-1", engine: "MemoryEngine" },
        engine: {
            activity: { id: "memory-1" }, cards: [{ id: "c1", value: "x" }],
            matchedPairs: 1, moves: 2, totalPairs: 3, finished: false
        }
    },
    {
        name: "puzzle", engineName: "PuzzleEngine", kind: "puzzle",
        activity: { id: "puzzle-1", engine: "PuzzleEngine" },
        engine: {
            activity: { id: "puzzle-1" }, state: { moves: 2 },
            puzzle: { type: "grid", rows: 2, cols: 2 }, items: ["a", "b"],
            userAnswer: ["b", "a"], moves: 2, getState() { return this.state; }
        }
    },
    {
        name: "classification", engineName: "ClassificationEngine", kind: "classification",
        activity: { id: "classification-1", engine: "ClassificationEngine", classification: {} },
        engine: {
            getSessionState() { return { items: [{ id: "i1" }], categories: [{ id: "c1" }], placed: { i1: "c1" } }; },
            activityData: null, content: null, handler: null,
            restoreSession(data) {
                if (!this.activityData) return false;
                this.restored = data;
                return true;
            },
            getState() { return { placed: { i1: "c1" } }; }
        }
    }
];

async function main() {
    for (const item of cases) {
        engines[item.engineName] = item.engine;
        const snapshot = manager.snapshot(item.activity);
        assert.ok(snapshot, item.name + ": snapshot exists");
        if (item.name === "classification") {
            // ClassificationEngine.getSessionState() returns its payload directly;
            // restore dispatch is selected by activityType, not a snapshot.kind tag.
            assert.ok(Array.isArray(snapshot.items), "classification: snapshot items");
            assert.ok(Array.isArray(snapshot.categories), "classification: snapshot categories");
        } else {
            assert.equal(snapshot.kind, item.kind, item.name + ": snapshot kind");
        }
        const portable = JSON.parse(JSON.stringify(snapshot));
        assert.deepEqual(JSON.parse(JSON.stringify(portable)), JSON.parse(JSON.stringify(snapshot)));

        const restored = await manager.restoreEngine(item.activity, {
            activityType: item.engineName, engineState: portable
        });
        assert.equal(restored, true, item.name + ": restore dispatch");
    }

    const activity = { id: "profile-bound", engine: "QuizEngine" };
    context.ActivityManager.currentActivity = activity;
    engines.QuizEngine = cases.find(item => item.name === "quiz").engine;
    manager.currentSession = null;
    const started = manager.begin(activity);
    assert.equal(started.profileId, "student-A");
    assert.equal(manager.storageKey(), "Tahouri_ActivitySession:student-A");
    assert.equal(manager.capture("resumable"), true);
    assert.equal(manager.getResumable("profile-bound").profileId, "student-A");

    const validStoredSession = storage.get(manager.storageKey());
    assert.equal(validStoredSession.schemaVersion, 1, "new sessions carry explicit schema version 1");
    const legacySchemaOne = { ...validStoredSession };
    delete legacySchemaOne.schemaVersion;
    storage.set(manager.storageKey(), legacySchemaOne);
    assert.equal(manager.load("profile-bound").activityId, "profile-bound", "known pre-schemaVersion v1 sessions remain readable");
    const rejectedSessions = [
        { ...validStoredSession, version: "999.0" },
        { ...validStoredSession, schemaVersion: 999 },
        { ...validStoredSession, profileId: "student-B" },
        { ...validStoredSession, activityType: "WordPuzzleEngine", engineState: { kind: "wordPuzzle" } },
        { ...validStoredSession, activityType: "UnknownEngine" },
        { ...validStoredSession, engineState: { kind: "quiz", questions: "not-an-array" } }
    ];
    for (const invalid of rejectedSessions) {
        storage.set(manager.storageKey(), JSON.parse(JSON.stringify(invalid)));
        assert.equal(manager.load(), null, "unsupported or malformed session is rejected");
        assert.equal(storage.has(manager.storageKey()), true, "rejected session remains stored");
    }
    storage.set(manager.storageKey(), validStoredSession);
    assert.equal(manager.load("profile-bound").activityId, "profile-bound", "valid current-version session loads");

    // Failed restore must not publish a half-started global activity.
    const priorActivity = { id: "already-running" };
    const priorSession = { activityId: "prior-session" };
    const priorState = "dashboard";
    context.ActivityManager.currentActivity = priorActivity;
    activityState = priorState;
    manager.currentSession = priorSession;
    manager.gameplayActive = true;
    classes.clear();
    classes.add("pre-existing-class");
    const storageBeforeFailure = new Map(storage);

    const priorWordPuzzleFields = {
        activity: { id: "prior-word" },
        state: { prior: true },
        round: { prior: true }
    };
    engines.WordPuzzleEngine = {
        ...priorWordPuzzleFields,
        restoreSession() {
            this.activity = { id: "partially-restored" };
            this.state = { partial: true };
            this.round = { partial: true };
            return false;
        }
    };
    assert.equal(await manager.restoreEngine(
        { id: "failed-word", engine: "WordPuzzleEngine" },
        { activityType: "WordPuzzleEngine", engineState: { kind: "wordPuzzle" } }
    ), false, "wordPuzzle false restore is rejected");
    assert.equal(engines.WordPuzzleEngine.activity, priorWordPuzzleFields.activity, "failed wordPuzzle restore rolls back activity");
    assert.equal(engines.WordPuzzleEngine.state, priorWordPuzzleFields.state, "failed wordPuzzle restore rolls back state");
    assert.equal(engines.WordPuzzleEngine.round, priorWordPuzzleFields.round, "failed wordPuzzle restore rolls back round");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "failed wordPuzzle restore preserves current activity");
    assert.equal(activityState, priorState, "failed wordPuzzle restore preserves ActivityState");
    assert.equal(manager.currentSession, priorSession, "failed wordPuzzle restore preserves current session");
    assert.equal(manager.gameplayActive, true, "failed wordPuzzle restore preserves gameplay flag");
    assert.deepEqual([...classes], ["pre-existing-class"], "failed wordPuzzle restore preserves body classes");
    assert.deepEqual([...storage], [...storageBeforeFailure], "failed wordPuzzle restore preserves stored session");

    engines.WordPuzzleEngine = {
        ...priorWordPuzzleFields,
        restoreSession() {
            this.activity = { id: "partially-restored-before-throw" };
            this.state = { partial: true };
            this.round = { partial: true };
            throw new Error("synthetic restore failure");
        }
    };
    await assert.rejects(
        manager.restoreEngine(
            { id: "throwing-word", engine: "WordPuzzleEngine" },
            { activityType: "WordPuzzleEngine", engineState: { kind: "wordPuzzle" } }
        ),
        /synthetic restore failure/
    );
    assert.equal(engines.WordPuzzleEngine.activity, priorWordPuzzleFields.activity, "throwing wordPuzzle restore rolls back activity");
    assert.equal(engines.WordPuzzleEngine.state, priorWordPuzzleFields.state, "throwing wordPuzzle restore rolls back state");
    assert.equal(engines.WordPuzzleEngine.round, priorWordPuzzleFields.round, "throwing wordPuzzle restore rolls back round");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "throwing restore preserves current activity");
    assert.equal(activityState, priorState, "throwing restore preserves ActivityState");

    engines.DictationEngine = {
        activity: { id: "prior-dictation" },
        content: { questions: [{ prompt: "prior" }] },
        state: { prior: true },
        runToken: 4,
        finishAuthorized: true,
        restoreSession() {
            // Match DictationEngine.reset() after a malformed saved state.
            this.runToken += 1;
            this.finishAuthorized = false;
            this.activity = null;
            this.content = null;
            this.state = null;
            return false;
        }
    };
    const priorDictationFields = {
        activity: engines.DictationEngine.activity,
        content: engines.DictationEngine.content,
        state: engines.DictationEngine.state,
        runToken: engines.DictationEngine.runToken,
        finishAuthorized: engines.DictationEngine.finishAuthorized
    };
    assert.equal(await manager.restoreEngine(
        { id: "failed-dictation", engine: "DictationEngine" },
        {
            activityType: "DictationEngine",
            engineState: {
                kind: "dictation",
                activity: { id: "failed-dictation" },
                content: { questions: [{ prompt: "new" }] },
                state: { malformed: true }
            }
        }
    ), false, "dictation false restore is rejected");
    assert.equal(engines.DictationEngine.activity, priorDictationFields.activity, "failed dictation restore rolls back activity");
    assert.equal(engines.DictationEngine.content, priorDictationFields.content, "failed dictation restore rolls back content");
    assert.equal(engines.DictationEngine.state, priorDictationFields.state, "failed dictation restore rolls back state");
    assert.equal(engines.DictationEngine.runToken, priorDictationFields.runToken, "failed dictation restore rolls back run token");
    assert.equal(engines.DictationEngine.finishAuthorized, priorDictationFields.finishAuthorized, "failed dictation restore rolls back finish authorization");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "failed dictation restore preserves current activity");
    assert.equal(activityState, priorState, "failed dictation restore preserves ActivityState");

    // Memory rendering must succeed before publishing the restored activity.
    const memoryActivity = { id: "failed-memory-render", title: "حافظه", engine: "MemoryEngine" };
    const memoryCards = [
        { id: "m1", value: "A", pairId: "A", flipped: false, matched: false },
        { id: "m2", value: "A", pairId: "A", flipped: false, matched: false }
    ];
    const memoryEngine = {
        activity: { id: "prior-memory" },
        cards: [{ id: "prior-card" }],
        firstCard: { id: "prior-first" },
        secondCard: { id: "prior-second" },
        lockBoard: true,
        matchedPairs: 2,
        moves: 8,
        totalPairs: 4,
        finished: true
    };
    engines.MemoryEngine = memoryEngine;
    const memoryFields = [
        "activity", "cards", "firstCard", "secondCard", "lockBoard",
        "matchedPairs", "moves", "totalPairs", "finished"
    ];
    const priorMemoryState = {};
    memoryFields.forEach(key => { priorMemoryState[key] = memoryEngine[key]; });
    const priorMemoryScore = { score: context.ScoreManager.score, correct: context.ScoreManager.correct, wrong: context.ScoreManager.wrong };
    const memoryMarkup = { innerHTML: "<main>prior memory</main>" };
    context.document.getElementById = id => id === "app" ? memoryMarkup : null;
    context.MemoryScreen = {
        show() {
            memoryMarkup.innerHTML = "<main>partial memory render</main>";
            throw new Error("synthetic memory render failure");
        }
    };
    await assert.rejects(
        manager.restoreEngine(memoryActivity, {
            activityType: "MemoryEngine",
            engineState: {
                kind: "memory", activity: memoryActivity, cards: memoryCards,
                matchedPairs: 1, moves: 3, totalPairs: 1, score: 40, correct: 1, wrong: 2
            }
        }),
        /synthetic memory render failure/
    );
    memoryFields.forEach(key => assert.equal(memoryEngine[key], priorMemoryState[key], "failed memory render rolls back " + key));
    assert.deepEqual(
        { score: context.ScoreManager.score, correct: context.ScoreManager.correct, wrong: context.ScoreManager.wrong },
        priorMemoryScore,
        "failed memory render rolls back score counters"
    );
    assert.equal(memoryMarkup.innerHTML, "<main>prior memory</main>", "failed memory render restores prior markup");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "failed memory render does not publish new activity");
    assert.equal(activityState, priorState, "failed memory render preserves ActivityState");
    assert.equal(manager.currentSession, priorSession, "failed memory render preserves current session");
    assert.equal(manager.gameplayActive, true, "failed memory render preserves gameplay flag");

    context.MemoryScreen = { show() { return false; } };
    assert.equal(await manager.restoreEngine(memoryActivity, {
        activityType: "MemoryEngine",
        engineState: {
            kind: "memory", activity: memoryActivity, cards: memoryCards,
            matchedPairs: 0, moves: 0, totalPairs: 1
        }
    }), false, "memory screen false render is rejected");
    memoryFields.forEach(key => assert.equal(memoryEngine[key], priorMemoryState[key], "false memory render rolls back " + key));
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "false memory render does not publish new activity");
    assert.equal(activityState, priorState, "false memory render preserves ActivityState");

    // A quiz screen failure must roll back engine state, score, and partial markup
    // before the restored activity is published globally.
    const quizActivity = { id: "failed-quiz-render", title: "آزمون", engine: "QuizEngine" };
    const quizEngine = {
        activity: { id: "prior-quiz" },
        questions: [{ text: "prior question" }],
        currentQuestion: 0,
        state: { started: true, prior: true },
        getQuestion() { return this.questions[this.currentQuestion] || null; }
    };
    engines.QuizEngine = quizEngine;
    const priorQuizFields = {
        activity: quizEngine.activity,
        questions: quizEngine.questions,
        currentQuestion: quizEngine.currentQuestion,
        state: quizEngine.state
    };
    const priorQuizScore = { score: context.ScoreManager.score, correct: context.ScoreManager.correct, wrong: context.ScoreManager.wrong };
    const appMarkup = { innerHTML: "<main>prior screen</main>" };
    context.document.getElementById = id => id === "app" ? appMarkup : null;
    context.QuizScreen = {
        isLocked: true,
        reset() { this.isLocked = false; },
        show() {
            appMarkup.innerHTML = "<main>partially rendered</main>";
            throw new Error("synthetic quiz render failure");
        }
    };
    await assert.rejects(
        manager.restoreEngine(quizActivity, {
            activityType: "QuizEngine",
            engineState: {
                kind: "quiz",
                activity: quizActivity,
                state: { started: true },
                questions: [{ text: "restored question", options: ["A", "B"] }],
                currentQuestion: 0,
                score: 99,
                correct: 9,
                wrong: 2
            }
        }),
        /synthetic quiz render failure/
    );
    assert.equal(quizEngine.activity, priorQuizFields.activity, "failed quiz render rolls back activity");
    assert.equal(quizEngine.questions, priorQuizFields.questions, "failed quiz render rolls back questions");
    assert.equal(quizEngine.currentQuestion, priorQuizFields.currentQuestion, "failed quiz render rolls back question index");
    assert.equal(quizEngine.state, priorQuizFields.state, "failed quiz render rolls back engine state");
    assert.deepEqual(
        { score: context.ScoreManager.score, correct: context.ScoreManager.correct, wrong: context.ScoreManager.wrong },
        priorQuizScore,
        "failed quiz render rolls back score counters"
    );
    assert.equal(context.QuizScreen.isLocked, true, "failed quiz render restores screen lock");
    assert.equal(appMarkup.innerHTML, "<main>prior screen</main>", "failed quiz render restores prior screen markup");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "failed quiz render does not publish new activity");
    assert.equal(activityState, priorState, "failed quiz render preserves ActivityState");
    assert.equal(manager.currentSession, priorSession, "failed quiz render preserves current session");
    assert.equal(manager.gameplayActive, true, "failed quiz render preserves gameplay flag");

    engines.ClassificationEngine = {
        activityData: { id: "prior-engine-data" },
        content: { prior: true },
        handler: { prior: true },
        state: { prior: true },
        restoreSession() {
            assert.ok(this.activityData && this.activityData.id === "failed-classification");
            this.content = { partiallyPrepared: true };
            this.handler = { partiallyPrepared: true };
            return false;
        }
    };
    const priorClassificationFields = {
        activityData: engines.ClassificationEngine.activityData,
        content: engines.ClassificationEngine.content,
        handler: engines.ClassificationEngine.handler,
        state: engines.ClassificationEngine.state
    };
    const priorActivityData = priorClassificationFields.activityData;
    assert.equal(await manager.restoreEngine(
        { id: "failed-classification", engine: "ClassificationEngine", classification: {} },
        { activityType: "ClassificationEngine", engineState: { items: [{ id: "i" }], categories: [{ id: "c" }] } }
    ), false, "classification false restore is rejected");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "failed classification restore preserves current activity");
    assert.equal(engines.ClassificationEngine.activityData, priorActivityData, "failed classification restore preserves engine activity data");
    assert.equal(engines.ClassificationEngine.content, priorClassificationFields.content, "failed classification restore rolls back prepared content");
    assert.equal(engines.ClassificationEngine.handler, priorClassificationFields.handler, "failed classification restore rolls back handler");
    assert.equal(engines.ClassificationEngine.state, priorClassificationFields.state, "failed classification restore preserves engine state");
    assert.equal(activityState, priorState, "failed classification restore preserves ActivityState");

    // Puzzle restore must roll back engine and Jigsaw core state when rendering fails.
    const puzzleActivity = { id: "failed-puzzle-render", title: "پازل", engine: "PuzzleEngine" };
    const puzzleEngine = {
        activity: { id: "prior-puzzle" }, state: { started: true, prior: true },
        puzzle: { type: "grid", prior: true }, questions: [{ id: "prior-question" }],
        currentQuestion: 2, items: ["prior-item"], userAnswer: "prior-answer", moves: 6,
        transitioning: true, checking: true, finishAcceptedThisCheck: true,
        startRequestId: 11, transitionRequestId: 12,
        getState() { return { type: this.puzzle.type, moves: this.moves }; }
    };
    engines.PuzzleEngine = puzzleEngine;
    const puzzleFields = [
        "activity", "state", "puzzle", "questions", "currentQuestion", "items",
        "userAnswer", "moves", "transitioning", "checking", "finishAcceptedThisCheck",
        "startRequestId", "transitionRequestId"
    ];
    const priorPuzzleState = {};
    puzzleFields.forEach(key => { priorPuzzleState[key] = puzzleEngine[key]; });
    const priorPuzzleScore = { score: context.ScoreManager.score, correct: context.ScoreManager.correct, wrong: context.ScoreManager.wrong };
    appContainer.innerHTML = "<main>prior puzzle screen</main>";
    assert.equal(context.document.getElementById("app").innerHTML, "<main>prior puzzle screen</main>", "puzzle rollback target starts with prior markup");
    context.PuzzleScreen = {
        show() {
            appContainer.innerHTML = "<main class='puzzleScreen'>partial puzzle render</main>";
            throw new Error("synthetic puzzle render failure");
        }
    };
    await assert.rejects(
        manager.restoreEngine(puzzleActivity, {
            activityType: "PuzzleEngine",
            engineState: {
                kind: "puzzle", activity: puzzleActivity,
                state: { started: true }, puzzle: { type: "grid", rows: 2, cols: 2 },
                items: ["a", "b"], userAnswer: "new-answer", moves: 3
            }
        }),
        /synthetic puzzle render failure/
    );
    puzzleFields.forEach(key => assert.equal(puzzleEngine[key], priorPuzzleState[key], "failed puzzle render rolls back " + key));
    assert.deepEqual(
        { score: context.ScoreManager.score, correct: context.ScoreManager.correct, wrong: context.ScoreManager.wrong },
        priorPuzzleScore,
        "failed puzzle render preserves score counters"
    );
    assert.equal(appContainer.innerHTML, "<main>prior puzzle screen</main>", "failed puzzle render restores prior markup");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "failed puzzle render does not publish activity");
    assert.equal(activityState, priorState, "failed puzzle render preserves ActivityState");

    const priorFacadeState = { id: "prior-facade" };
    const priorImageCoreState = { id: "prior-image-core" };
    context.JigsawPuzzle = {
        state: priorFacadeState,
        restoreFromEngine() {
            this.state = { id: "partial-facade" };
            context.JigsawImagePuzzle.state = { id: "partial-image-core" };
            return true;
        }
    };
    context.JigsawImagePuzzle = { state: priorImageCoreState };
    context.JigsawWordPuzzle = { state: null };
    context.PuzzleScreen = {
        show() { return false; }
    };
    appContainer.innerHTML = "<main>prior jigsaw screen</main>";
    const jigsawActivity = { id: "failed-jigsaw-render", title: "جورچین", engine: "PuzzleEngine" };
    assert.equal(await manager.restoreEngine(jigsawActivity, {
        activityType: "PuzzleEngine",
        engineState: {
            kind: "puzzle", activity: jigsawActivity,
            state: { started: true },
            puzzle: { type: "jigsaw", mode: "image", image: "/image.jpg", rows: 2, cols: 2, pieceCount: 4 },
            items: ["piece-1", "piece-0", "piece-2", "piece-3"], userAnswer: null, moves: 4
        }
    }), false, "jigsaw false render is rejected");
    assert.equal(context.JigsawPuzzle.state, priorFacadeState, "failed jigsaw render restores facade state");
    assert.equal(context.JigsawImagePuzzle.state, priorImageCoreState, "failed jigsaw render restores image core state");
    assert.equal(puzzleEngine.puzzle.type, "grid", "failed jigsaw render restores prior engine puzzle");
    assert.equal(appContainer.innerHTML, "<main>prior jigsaw screen</main>", "failed jigsaw render restores prior markup");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "failed jigsaw render does not publish activity");

    const transferSource = read("engine/core/studentDataTransfer.js");
    assert.equal(transferSource.includes('key: "Tahouri_ActivitySession:'), false);

    console.log("PASS: six engine snapshot/restore contracts, JSON serialization, and profile-scoped local session storage");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
