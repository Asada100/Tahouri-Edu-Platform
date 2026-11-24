"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const managerPath = path.resolve(__dirname, "../../engine/core/contentLockManager.js");
const managerSource = fs.readFileSync(managerPath, "utf8");

const LEGACY_KEY = "Tahouri_ContentLocks";
const ARCHIVE_KEY = "Tahouri_ContentLocks_LegacyArchive_v1";
const STATE_KEY = "Tahouri_ContentLocks_LegacyMigrationState_v1";

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

async function testAmbiguousLegacyIsQuarantinedOnce() {
    const legacy = JSON.stringify({
        legacyActivity: true,
        anotherLegacyLock: false
    });
    const harness = createHarness({ [LEGACY_KEY]: legacy }, "student-A");
    await harness.ready();

    assert.equal(harness.values.get(ARCHIVE_KEY), legacy,
        "The original legacy payload must be preserved in the archive.");
    assert.equal(harness.values.get(LEGACY_KEY), legacy,
        "Quarantine must not delete or rewrite the original legacy source.");
    assert.deepEqual(
        JSON.parse(harness.values.get(STATE_KEY)),
        { version: 1, status: "quarantined", reason: "legacy_owner_unverified" },
        "Ambiguous ownership must be recorded as a global quarantine decision."
    );
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-A"), false,
        "The active profile must not receive data with unverified ownership.");

    harness.setActiveStudent("student-B");
    harness.manager.applyProfileLocks();
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-B"), false,
        "A second profile must never consume the same ambiguous legacy source.");

    const reloaded = createHarness(
        Object.fromEntries(harness.values.entries()),
        "student-B"
    );
    await reloaded.ready();
    assert.equal(reloaded.values.get(ARCHIVE_KEY), legacy,
        "The archived source must survive reload.");
    assert.equal(reloaded.values.has("Tahouri_ContentLocks:student-B"), false,
        "Reload must not reassign quarantined data to another profile.");
}

async function testExistingScopedDataIsNeverOverwrittenOrLeaked() {
    const legacy = JSON.stringify({ legacyOwnerActivity: true });
    const existingA = JSON.stringify({ studentAOnlyActivity: false });
    const harness = createHarness({
        [LEGACY_KEY]: legacy,
        "Tahouri_ContentLocks:student-A": existingA
    }, "student-A");
    await harness.ready();

    assert.equal(harness.values.get("Tahouri_ContentLocks:student-A"), existingA,
        "Existing scoped data must remain byte-for-byte unchanged.");
    assert.equal(harness.values.get(ARCHIVE_KEY), legacy,
        "The conflicting legacy source must remain recoverable.");
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-B"), false,
        "A conflict for A must not allow B to consume the legacy source.");

    harness.setActiveStudent("student-B");
    harness.manager.applyProfileLocks();
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-B"), false,
        "Switching profiles must not leak the quarantined source.");
}

async function testMalformedLegacyIsPreserved() {
    const malformed = "{not-valid-json";
    const harness = createHarness({ [LEGACY_KEY]: malformed }, "student-A");
    await harness.ready();

    assert.equal(harness.values.get(ARCHIVE_KEY), malformed,
        "Malformed legacy data must be archived without destructive parsing.");
    assert.equal(harness.values.get(LEGACY_KEY), malformed,
        "Malformed legacy source must remain unchanged.");
    assert.equal(
        JSON.parse(harness.values.get(STATE_KEY)).status,
        "quarantined",
        "Malformed legacy data remains recoverable but is never auto-attributed."
    );
}

async function testArchiveConflictDoesNotOverwriteEitherSource() {
    const legacy = JSON.stringify({ source: "current" });
    const archive = JSON.stringify({ source: "previous-archive" });
    const harness = createHarness({
        [LEGACY_KEY]: legacy,
        [ARCHIVE_KEY]: archive
    }, "student-A");
    await harness.ready();

    assert.equal(harness.values.get(ARCHIVE_KEY), archive,
        "An existing archive must never be overwritten.");
    assert.equal(harness.values.get(LEGACY_KEY), legacy,
        "The current source must remain intact on archive conflict.");
    assert.equal(
        JSON.parse(harness.values.get(STATE_KEY)).status,
        "archive_conflict",
        "Archive conflict must be recorded for supervised recovery."
    );
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-A"), false,
        "No profile may receive data during an archive conflict.");
}

async function main() {
    await testAmbiguousLegacyIsQuarantinedOnce();
    await testExistingScopedDataIsNeverOverwrittenOrLeaked();
    await testMalformedLegacyIsPreserved();
    await testArchiveConflictDoesNotOverwriteEitherSource();
    console.log("Content-lock legacy migration ownership-safety regression: PASS");
    console.log("Verified: quarantine, global one-time decision, reload, conflict preservation, malformed source preservation, and zero cross-profile copies.");
}

main().catch(error => {
    console.error("Content-lock legacy migration ownership-safety regression: FAIL", error);
    process.exitCode = 1;
});
