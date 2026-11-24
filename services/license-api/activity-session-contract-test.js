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
    ActivityState: { set() {} },
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
            restoreSession(data) { this.restored = data; return true; },
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
    const rejectedSessions = [
        { ...validStoredSession, version: "999.0" },
        { ...validStoredSession, profileId: "student-B" },
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

    const transferSource = read("engine/core/studentDataTransfer.js");
    assert.equal(transferSource.includes('key: "Tahouri_ActivitySession:'), false);

    console.log("PASS: six engine snapshot/restore contracts, JSON serialization, and profile-scoped local session storage");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
