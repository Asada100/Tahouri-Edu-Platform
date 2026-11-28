"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { executeWordPuzzleResumeTransaction } = require("./wordPuzzleResumeTransaction");

const values = new Map();
let failGet = false;
let failSet = false;
let mutateThenFailSet = false;
const localStorage = {
  getItem(key) { if (failGet) throw new Error("read blocked"); return values.has(key) ? values.get(key) : null; },
  setItem(key, value) {
    if (mutateThenFailSet) { values.set(key, String(value)); throw new Error("write failed after mutation"); }
    if (failSet) throw new Error("write blocked");
    values.set(key, String(value));
  },
  removeItem(key) { values.delete(key); }
};
const window = {};
vm.runInNewContext(fs.readFileSync("engine/core/saveManager.js", "utf8"), { window, localStorage, console });
const adapterModule = { exports: {} };
vm.runInNewContext(fs.readFileSync("experiments/change-journal-prototype/saveManagerRawStorageAdapter.js", "utf8"),
  { module: adapterModule });
const storage = adapterModule.exports.createSaveManagerRawStorageAdapter(window.SaveManager);
const candidate = {
  version: "1.9", schemaVersion: 1, id: "session-new", profileId: "profile-a",
  activityId: "word-puzzle", activityType: "WordPuzzleEngine", status: "resumable",
  engineState: { kind: "wordPuzzle", state: { score: 2 }, round: { index: 1 } }
};
const validate = value => !!value && value.profileId === "profile-a" &&
  value.activityType === "WordPuzzleEngine" && value.engineState?.kind === "wordPuzzle";

async function run(initialValue, fault) {
  values.clear();
  if (initialValue !== undefined) values.set("session", initialValue);
  let runtime = { activity: "previous", screen: "dashboard" };
  const beforeRuntime = structuredClone(runtime);
  let events = 0;
  const result = await executeWordPuzzleResumeTransaction({
    storage, storageKey: "session", candidateSession: structuredClone(candidate), validate,
    prepareHost: async () => ({
      commit: async () => true,
      dispose: async () => true
    }),
    publication: {
      capture: () => structuredClone(runtime),
      publish: () => { runtime = { activity: "word-puzzle", screen: "game" }; return fault !== "publish-fail"; },
      restore: snapshot => { runtime = structuredClone(snapshot); return true; }
    },
    emitResumed: () => { events++; }
  });
  return { result, runtime, beforeRuntime, events };
}

(async () => {
  const malformedLegacy = ' {not-json: keep whitespace and bytes} ';
  let r = await run(malformedLegacy);
  assert.equal(r.result.ok, true);
  assert.equal(r.events, 1);
  assert.equal(JSON.parse(values.get("session")).status, "active");
  console.log("PASS — SaveManager raw adapter commits active session");

  r = await run(malformedLegacy, "publish-fail");
  assert.equal(r.result.ok, false);
  assert.equal(r.result.rollbackOk, true);
  assert.equal(values.get("session"), malformedLegacy, "rollback must restore exact original bytes");
  assert.deepEqual(r.runtime, r.beforeRuntime);
  assert.equal(r.events, 0);
  console.log("PASS — failed publication restores exact malformed legacy bytes and runtime");

  r = await run(undefined, "publish-fail");
  assert.equal(r.result.ok, false);
  assert.equal(r.result.rollbackOk, true);
  assert.equal(values.has("session"), false, "rollback must restore key absence");
  console.log("PASS — rollback restores original key absence");

  values.clear();
  values.set("session", "original");
  mutateThenFailSet = true;
  r = await run("original");
  mutateThenFailSet = false;
  assert.equal(r.result.ok, false);
  assert.equal(r.result.rollbackOk, true);
  assert.equal(values.get("session"), "original", "partial write must be rolled back");
  assert.equal(r.events, 0);
  console.log("PASS — failed write after mutation is rolled back byte-for-byte");

  values.clear();
  failGet = true;
  let readFailed = false;
  try { storage.readRaw("session"); } catch (_) { readFailed = true; }
  failGet = false;
  assert.equal(readFailed, true, "storage read failure must not be mistaken for missing key");
  console.log("PASS — storage read failure is distinct from absent key");
  console.log("SAVEMANAGER + WORDPUZZLE TRANSACTION INTEGRATION: 5/5 scenarios PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
