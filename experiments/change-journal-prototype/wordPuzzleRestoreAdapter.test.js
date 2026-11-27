"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { prepareWordPuzzleRestore } = require("./wordPuzzleRestoreAdapter");

const events = [];
const window = {};
const EventManager = { emit: (...args) => events.push(args) };
const source = fs.readFileSync(path.join(__dirname, "../../engine/wordPuzzle/wordPuzzleEngine.js"), "utf8");
vm.runInNewContext(source, { window, EventManager, console });
const engine = window.WordPuzzleEngine;

engine.activity = { id: "prior-activity", title: "Prior" };
engine.state = { started: true, score: 7, foundWords: ["old"] };
engine.round = { type: "wordSearch", words: ["old"] };
const before = JSON.stringify({ activity: engine.activity, state: engine.state, round: engine.round });
const saved = {
  kind: "wordPuzzle",
  activity: { id: "target-activity", title: "Target" },
  state: { started: true, score: 31, foundWords: ["دانش"], mode: "wordSearch" },
  round: { type: "wordSearch", words: ["دانش"], grid: [["د", "ا", "ن", "ش"]] }
};

const prepared = prepareWordPuzzleRestore(engine, saved);
assert.ok(prepared, "valid WordPuzzle snapshot must prepare");
assert.equal(JSON.stringify({ activity: engine.activity, state: engine.state, round: engine.round }), before,
  "preparation must not mutate live engine");
assert.equal(events.length, 0, "preparation must not emit activityReady");
saved.state.score = 999;
assert.equal(prepared.snapshot.state.score, 31, "prepared snapshot must be detached from caller mutation");
console.log("PASS — actual WordPuzzle restoreSession prepares on shadow without live mutation or event");

assert.equal(prepared.commit(), true);
assert.equal(engine.activity.id, "target-activity");
assert.equal(engine.state.score, 31);
assert.equal(engine.round.words[0], "دانش");
assert.equal(events.length, 0, "commit must not emit lifecycle events");
console.log("PASS — prepared WordPuzzle state publishes only on explicit commit");

assert.equal(prepared.rollback(), true);
assert.equal(JSON.stringify({ activity: engine.activity, state: engine.state, round: engine.round }), before,
  "rollback must restore exact prior engine fields");
assert.equal(prepared.commit(), false, "rolled-back preparation cannot be committed later");
console.log("PASS — rollback restores prior engine state and closes the prepared transaction");

assert.equal(prepareWordPuzzleRestore(engine, { kind: "wrong", state: {}, round: {} }), null);
assert.equal(JSON.stringify({ activity: engine.activity, state: engine.state, round: engine.round }), before);
console.log("PASS — invalid snapshot is rejected without changing live engine");
console.log("WORD PUZZLE RESTORE ADAPTER PROTOTYPE: PASS (4/4)");
