"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { executeWordPuzzleResumeTransaction } = require("./wordPuzzleResumeTransaction");
const { prepareWordPuzzleRestore } = require("./wordPuzzleRestoreAdapter");

const events = [];
const window = {};
const EventManager = { emit: (...args) => events.push(args) };
vm.runInNewContext(fs.readFileSync("engine/wordPuzzle/wordPuzzleEngine.js", "utf8"),
  { window, EventManager, console });
const engine = window.WordPuzzleEngine;
engine.activity = { id: "before", title: "Before" };
engine.state = { started: true, score: 4, foundWords: ["قدیمی"] };
engine.round = { type: "wordSearch", words: ["قدیمی"] };
const priorEngine = () => JSON.stringify({ activity: engine.activity, state: engine.state, round: engine.round });

const candidate = {
  version: "1.9", schemaVersion: 1, id: "candidate-1", profileId: "profile-a",
  activityId: "target", activityType: "WordPuzzleEngine", status: "resumable",
  engineState: {
    kind: "wordPuzzle",
    activity: { id: "target", title: "Target" },
    state: { started: true, score: 42, foundWords: ["دانش"], mode: "wordSearch" },
    round: { type: "wordSearch", words: ["دانش"], grid: [["د","ا","ن","ش"]] }
  }
};
const validate = s => !!s && s.profileId === "profile-a" &&
  s.activityType === "WordPuzzleEngine" && s.engineState?.kind === "wordPuzzle";
const storageValues = new Map([["session", "legacy raw value"]]);
const storage = {
  readRaw: key => storageValues.has(key) ? storageValues.get(key) : null,
  writeRaw: (key, value) => { storageValues.set(key, value); return true; },
  restoreRaw: (key, value) => { if (value === null) storageValues.delete(key); else storageValues.set(key, value); return true; }
};
const originalRaw = storageValues.get("session");

async function execute(publishFails) {
  const engineBefore = priorEngine();
  const runtime = { screen: "dashboard" };
  const result = await executeWordPuzzleResumeTransaction({
    storage, storageKey: "session", candidateSession: structuredClone(candidate), validate,
    prepareHost: async saved => {
      const prepared = prepareWordPuzzleRestore(engine, saved);
      if (!prepared) return null;
      return {
        commit: async () => prepared.commit(),
        dispose: async () => prepared.rollback()
      };
    },
    publication: {
      capture: () => ({ ...runtime }),
      publish: () => { runtime.screen = "game"; return !publishFails; },
      restore: snapshot => { runtime.screen = snapshot.screen; return true; }
    },
    emitResumed: () => events.push(["activityResumed"])
  });
  return { result, engineBefore, runtime, engineAfter: priorEngine() };
}

(async () => {
  let r = await execute(false);
  assert.equal(r.result.ok, true);
  assert.equal(engine.state.score, 42);
  assert.equal(engine.activity.id, "target");
  assert.equal(r.runtime.screen, "game");
  assert.equal(events.filter(e => e[0] === "activityResumed").length, 1);
  console.log("PASS — coordinator commits actual WordPuzzleEngine restore and publishes once");

  engine.activity = { id: "before", title: "Before" };
  engine.state = { started: true, score: 4, foundWords: ["قدیمی"] };
  engine.round = { type: "wordSearch", words: ["قدیمی"] };
  storageValues.set("session", originalRaw);
  const before = priorEngine();
  const eventCount = events.length;
  r = await execute(true);
  assert.equal(r.result.ok, false);
  assert.equal(r.result.rollbackOk, true);
  assert.equal(priorEngine(), before, "failed publication must roll back real engine fields");
  assert.equal(storageValues.get("session"), originalRaw, "failed publication must restore exact raw storage");
  assert.equal(r.runtime.screen, "dashboard");
  assert.equal(events.length, eventCount, "failed transaction must not emit activityResumed");
  console.log("PASS — publication failure rolls back real engine, runtime and exact storage");
  console.log("ACTUAL WORDPUZZLE ENGINE + RESUME TRANSACTION: 2/2 scenarios PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
