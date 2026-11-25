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
const document = {
    visibilityState: "visible",
    body: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) }, appendChild() {} },
    addEventListener() {},
    getElementById() { return null; },
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
    MemoryScreen: { show() {} }, PuzzleScreen: { show() {} },
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

    engines.WordPuzzleEngine = { restoreSession() { return false; } };
    assert.equal(await manager.restoreEngine(
        { id: "failed-word", engine: "WordPuzzleEngine" },
        { activityType: "WordPuzzleEngine", engineState: { kind: "wordPuzzle" } }
    ), false, "wordPuzzle false restore is rejected");
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "failed wordPuzzle restore preserves current activity");
    assert.equal(activityState, priorState, "failed wordPuzzle restore preserves ActivityState");
    assert.equal(manager.currentSession, priorSession, "failed wordPuzzle restore preserves current session");
    assert.equal(manager.gameplayActive, true, "failed wordPuzzle restore preserves gameplay flag");
    assert.deepEqual([...classes], ["pre-existing-class"], "failed wordPuzzle restore preserves body classes");
    assert.deepEqual([...storage], [...storageBeforeFailure], "failed wordPuzzle restore preserves stored session");

    engines.WordPuzzleEngine = { restoreSession() { throw new Error("synthetic restore failure"); } };
    await assert.rejects(
        manager.restoreEngine(
            { id: "throwing-word", engine: "WordPuzzleEngine" },
            { activityType: "WordPuzzleEngine", engineState: { kind: "wordPuzzle" } }
        ),
        /synthetic restore failure/
    );
    assert.equal(context.ActivityManager.currentActivity, priorActivity, "throwing restore preserves current activity");
    assert.equal(activityState, priorState, "throwing restore preserves ActivityState");

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

    const transferSource = read("engine/core/studentDataTransfer.js");
    assert.equal(transferSource.includes('key: "Tahouri_ActivitySession:'), false);

    console.log("PASS: six engine snapshot/restore contracts, JSON serialization, and profile-scoped local session storage");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
