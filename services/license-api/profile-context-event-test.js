"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const profileSource = fs.readFileSync(
    path.join(root, "engine/activity/profileManager.js"), "utf8"
);
const gateSource = fs.readFileSync(
    path.join(root, "engine/core/activationGate.js"), "utf8"
);

const mutationReasons = [
    "profile-created",
    "profile-switched",
    "grade-changed",
    "profile-grade-updated",
    "active-profile-deleted",
    "profiles-cleared"
];
for (const reason of mutationReasons) {
    assert.ok(
        profileSource.includes('notifyActiveProfileContextChanged("' + reason + '")'),
        "Missing active profile context notification for " + reason
    );
}

assert.ok(
    gateSource.includes('addEventListener("tahouri:active-profile-context-changed"'),
    "Activation Gate must listen for active profile context changes"
);
const listenerStart = gateSource.indexOf('addEventListener("tahouri:active-profile-context-changed"');
const listenerEnd = gateSource.indexOf("window.__tahouriProfileContextListenerInstalled = true", listenerStart);
assert.notEqual(listenerStart, -1);
assert.notEqual(listenerEnd, -1);
const listener = gateSource.slice(listenerStart, listenerEnd);
assert.ok(
    listener.indexOf("await LicenseManager.initializeRemoteEntitlement()") <
    listener.indexOf("await revalidateCurrentLicense()"),
    "New active student's entitlement must be resolved before remote status revalidation"
);
assert.ok(
    listener.includes("renderGate()"),
    "Gate must rerender after active profile context refresh"
);

assert.ok(
    profileSource.includes("window.dispatchEvent(new CustomEvent"),
    "Profile Manager must dispatch a context-change event"
);
assert.ok(
    profileSource.includes('this.notifyActiveProfileContextChanged("profile-switched")'),
    "Profile switching must notify the context listener"
);

console.log("Tahouri active-profile mutation context test: PASS");
