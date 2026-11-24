"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const managerPath = path.resolve(__dirname, "../../engine/core/contentLockManager.js");
const managerSource = fs.readFileSync(managerPath, "utf8");

function createHarness(seed, initialStudentId) {
    const values = new Map(Object.entries(seed || {}));
    let activeStudentId = initialStudentId;
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
    const context = {
        console: { log() {}, warn() {}, error() {} },
        localStorage,
        ProfileContext: {
            key(baseKey) {
                return activeStudentId
                    ? String(baseKey) + ":" + activeStudentId
                    : null;
            }
        },
        fetch: async () => ({ ok: true, status: 200, json: async () => [] }),
        JSON, Math, Number, String, Date, Object, Array, Promise
    };
    context.window = context;
    vm.runInNewContext(managerSource, context, { filename: managerPath });

    return {
        manager: context.ContentLockManager,
        values,
        setActiveStudent(studentId) { activeStudentId = studentId; },
        async ready() { await context.ContentLockManager.waitUntilReady(); }
    };
}

async function reproduceCrossProfileCopy() {
    const legacy = { legacyActivity: true, anotherLegacyLock: false };
    const store = {
        Tahouri_ContentLocks: JSON.stringify(legacy)
    };
    const harness = createHarness(store, "student-A");
    await harness.ready();

    assert.deepEqual(
        JSON.parse(harness.values.get("Tahouri_ContentLocks:student-A")),
        legacy,
        "The first active profile receives the legacy dataset."
    );
    assert.equal(
        harness.values.get("Tahouri_ContentLocks_ProfileMigration_v1:Tahouri_ContentLocks:student-A"),
        "true",
        "The first profile receives its own migration marker."
    );

    harness.setActiveStudent("student-B");
    harness.manager.applyProfileLocks();

    assert.deepEqual(
        JSON.parse(harness.values.get("Tahouri_ContentLocks:student-B")),
        legacy,
        "REPRODUCED BUG: the second profile also receives the same unscoped legacy dataset."
    );

    // A reload preserves both per-profile markers, but cannot undo the duplicate attribution.
    const reloaded = createHarness(
        Object.fromEntries(harness.values.entries()),
        "student-B"
    );
    await reloaded.ready();
    assert.deepEqual(
        JSON.parse(reloaded.values.get("Tahouri_ContentLocks:student-B")),
        legacy,
        "The duplicate copy remains after reload."
    );
}

async function reproduceConflictThenLeak() {
    const legacy = { legacyOwnerActivity: true };
    const existingA = { studentAOnlyActivity: false };
    const harness = createHarness({
        Tahouri_ContentLocks: JSON.stringify(legacy),
        "Tahouri_ContentLocks:student-A": JSON.stringify(existingA)
    }, "student-A");
    await harness.ready();

    assert.deepEqual(
        JSON.parse(harness.values.get("Tahouri_ContentLocks:student-A")),
        existingA,
        "Existing profile-scoped data must not be overwritten."
    );
    assert.equal(
        harness.values.get("Tahouri_ContentLocks_ProfileMigration_v1:Tahouri_ContentLocks:student-A"),
        "true",
        "The conflict profile is marked as handled."
    );

    harness.setActiveStudent("student-B");
    harness.manager.applyProfileLocks();

    assert.deepEqual(
        JSON.parse(harness.values.get("Tahouri_ContentLocks:student-B")),
        legacy,
        "REPRODUCED BUG: after a scoped-data conflict for A, B still consumes the ambiguous legacy source."
    );
}

async function main() {
    await reproduceCrossProfileCopy();
    await reproduceConflictThenLeak();
    console.log("Content-lock legacy migration bug reproduction: PASS (the current cross-profile leak was reproduced).");
    console.log("This is a reproducer, not a no-leak regression guard. Convert its assertions after the ownership-safe production fix.");
}

main().catch(error => {
    console.error("Content-lock legacy migration bug reproduction: FAIL", error);
    process.exitCode = 1;
});
