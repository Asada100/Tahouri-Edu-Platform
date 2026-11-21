"use strict";

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const sourcePath = path.join(__dirname, "../../engine/ui/licenseScreen.js");
const source = fs.readFileSync(sourcePath, "utf8");
const start = source.indexOf("function renderAddForm(");
assert.notEqual(start, -1, "renderAddForm must exist");

const activationMarker = source.indexOf("// Activation", start);
assert.notEqual(activationMarker, -1, "renderAddForm activation binding section must exist");
const formSection = source.slice(start, activationMarker);

assert.match(
    formSection,
    /getElementById\(["']tahouriPairingPollButton["']\)/,
    "pairing result button must be located inside renderAddForm"
);
assert.match(
    formSection,
    /pairingPollButton\.addEventListener\(["']click["'],\s*pollPairingRequest\)/,
    "pairing result button must invoke pollPairingRequest"
);
assert.match(
    formSection,
    /if\s*\(pendingPairing\)\s*\{[\s\S]*?pairingPollButton\.style\.display\s*=\s*["']block["']/,
    "reopening the form in the same page session must reveal an existing pending poll"
);

console.log("PASS: pairing result button is bound inside the form");
assert.match(formSection, /getElementById\(["']tahouriPairingRecoverButton["']\)/,
    "the device recovery button must be present in the license form");
assert.match(formSection, /pairingRecoverButton\.addEventListener\(["']click["'],\s*recoverApprovedPairingEntitlement\)/,
    "the recovery button must invoke the signed recovery flow");
assert.match(source, /async function recoverApprovedPairingEntitlement\(\)[\s\S]*?recoverApprovedPairingEntitlement\(\)/,
    "the UI must implement an approved-entitlement recovery action");
console.log("PASS: existing in-memory pairing request remains pollable after reopening the form");
console.log("PASS: approved entitlement recovery control is rendered and bound");
