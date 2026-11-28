"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const values = new Map();
let failGet = false;
let failSet = false;
let failRemove = false;
const localStorage = {
  getItem(key) { if (failGet) throw new Error("read blocked"); return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { if (failSet) throw new Error("write blocked"); values.set(key, String(value)); },
  removeItem(key) { if (failRemove) throw new Error("remove blocked"); values.delete(key); }
};
const window = {};
const source = fs.readFileSync("engine/core/saveManager.js", "utf8");
vm.runInNewContext(source, { window, localStorage, console });
const save = window.SaveManager;

assert.deepEqual(JSON.parse(JSON.stringify(save.readRaw("missing"))), { ok: true, exists: false, value: null });
const malformed = "{not-json: preserved exactly";
values.set("session", malformed);
assert.equal(save.readRaw("session").value, malformed, "raw read must not parse or normalize bytes");
assert.equal(save.writeRaw("session", "{  \"x\" : 1 }"), true);
assert.equal(values.get("session"), "{  \"x\" : 1 }", "raw write must preserve whitespace");
const original = { ok: true, exists: true, value: malformed };
assert.equal(save.writeRaw("session", "partial"), true);
assert.equal(save.restoreRaw("session", original), true);
assert.equal(values.get("session"), malformed, "rollback must restore exact prior bytes");

assert.equal(save.restoreRaw("session", { ok: true, exists: false, value: null }), true);
assert.equal(values.has("session"), false, "rollback must restore prior key absence");
assert.equal(save.restoreRaw("session", { ok: false, exists: false, value: null }), false);
assert.equal(save.writeRaw("", "x"), false);
assert.equal(save.writeRaw("x", { value: 1 }), false);

failGet = true;
assert.equal(save.readRaw("blocked").ok, false, "storage read failure must not look like missing key");
assert.equal(save.writeRaw("blocked", "x"), false, "write must fail closed when readback fails");
failGet = false;
failSet = true;
assert.equal(save.writeRaw("blocked", "x"), false);
assert.equal(save.restoreRaw("blocked", { ok: true, exists: true, value: "old" }), false);
failSet = false;
failRemove = true;
assert.equal(save.restoreRaw("blocked", { ok: true, exists: false, value: null }), false);
console.log("SAVE MANAGER RAW STORAGE CONTRACT: PASS (15 assertions)");
