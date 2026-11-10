"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(
    path.join(root, "engine/core/activationGate.js"),
    "utf8"
);
const start = source.indexOf("function switchProfile(");
const end = source.indexOf("// Academic Year", start);
assert.notEqual(start, -1, "switchProfile helper not found");
assert.notEqual(end, -1, "switchProfile helper boundary not found");
const helper = source.slice(start, end);
assert.ok(helper.includes("ProfileManager.switchProfile(studentId)"),
    "Activation Gate must delegate profile changes to ProfileManager");
assert.ok(!helper.includes("initializeRemoteEntitlement"),
    "Entitlement refresh must be centralized in the profile-context event listener");

console.log("Tahouri profile switch delegation test: PASS");
