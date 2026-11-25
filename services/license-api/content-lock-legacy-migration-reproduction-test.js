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

async function testAmbiguousLegacyIsQuarantinedAcrossProfiles() {
    const legacy = JSON.stringify({ legacyActivity: true, anotherLegacyLock: false });
    const harness = createHarness({ [LEGACY_KEY]: legacy }, "student-A");
    await harness.ready();

    assert.equal(harness.values.get(ARCHIVE_KEY), legacy,
        "The original legacy payload must be preserved byte-for-byte.");
    assert.equal(harness.values.get(LEGACY_KEY), legacy,
        "Quarantine must not delete or rewrite the original legacy source.");
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-A"), false,
        "An active profile is not proof of historical ownership.");
    assert.deepEqual(JSON.parse(harness.values.get(STATE_KEY)), {
        version: 1,
        status: "quarantined",
        reason: "legacy_owner_unverified"
    }, "Ambiguous legacy data must be globally quarantined.");

    harness.manager.applyProfileLocks();
    harness.setActiveStudent("student-B");
    harness.manager.applyProfileLocks();
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-B"), false,
        "A second profile must never receive the ambiguous legacy records.");

    const reloaded = createHarness(Object.fromEntries(harness.values.entries()), "student-B");
    await reloaded.ready();
    assert.equal(reloaded.values.has("Tahouri_ContentLocks:student-B"), false,
        "Reload must not assign quarantined data to another profile.");
    assert.equal(reloaded.values.get(ARCHIVE_KEY), legacy,
        "The archived source must remain available after reload.");
}
async function testQuarantinePreservesExistingProfileValues() {
    const legacy = JSON.stringify({ legacyOwnerActivity: true, sharedActivity: true });
    const existingA = JSON.stringify({ studentAOnlyActivity: false, sharedActivity: false });
    const harness = createHarness({
        [LEGACY_KEY]: legacy,
        "Tahouri_ContentLocks:student-A": existingA
    }, "student-A");
    await harness.ready();

    assert.equal(harness.values.get("Tahouri_ContentLocks:student-A"), existingA,
        "Existing profile data must remain byte-for-byte unchanged.");
    assert.equal(harness.values.get(ARCHIVE_KEY), legacy,
        "The original legacy source must remain archived.");
    assert.equal(harness.values.get(LEGACY_KEY), legacy,
        "The original legacy source must remain unchanged.");
    assert.deepEqual(JSON.parse(harness.values.get(STATE_KEY)), {
        version: 1,
        status: "quarantined",
        reason: "legacy_owner_unverified"
    }, "Existing scoped data does not prove ownership of the unscoped source.");

    harness.setActiveStudent("student-B");
    harness.manager.applyProfileLocks();
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-B"), false,
        "Quarantined legacy data must not leak to another profile.");
}
async function testMalformedLegacyIsPreservedAndNotAssigned() {
    const malformed = "{not-valid-json";
    const harness = createHarness({ [LEGACY_KEY]: malformed }, "student-A");
    await harness.ready();

    assert.equal(harness.values.get(ARCHIVE_KEY), malformed,
        "Malformed legacy data must be archived without destructive parsing.");
    assert.equal(harness.values.get(LEGACY_KEY), malformed,
        "Malformed legacy source must remain unchanged.");
    assert.deepEqual(JSON.parse(harness.values.get(STATE_KEY)), {
        version: 1,
        status: "invalid_legacy_data",
        reason: "legacy_payload_is_not_valid_json"
    }, "Malformed legacy data must be explicitly rejected.");
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-A"), false,
        "Malformed data must not be written to the active profile.");
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
    assert.deepEqual(JSON.parse(harness.values.get(STATE_KEY)), {
        version: 1,
        status: "archive_conflict",
        reason: "existing_archive_differs_from_legacy_source"
    }, "Archive conflict must be recorded for recovery.");
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-A"), false,
        "No profile may receive data during an archive conflict.");
}

async function testInvalidExistingProfileDataIsNotOverwritten() {
    const legacy = JSON.stringify({ legacyActivity: true });
    const existing = "{broken-profile-json";
    const harness = createHarness({
        [LEGACY_KEY]: legacy,
        "Tahouri_ContentLocks:student-A": existing
    }, "student-A");
    await harness.ready();

    assert.equal(harness.values.get("Tahouri_ContentLocks:student-A"), existing,
        "Invalid existing profile data must remain byte-for-byte unchanged.");
    assert.equal(harness.values.get(ARCHIVE_KEY), legacy,
        "Legacy source must remain recoverable.");
    assert.deepEqual(JSON.parse(harness.values.get(STATE_KEY)), {
        version: 1,
        status: "quarantined",
        reason: "legacy_owner_unverified"
    }, "The ambiguous legacy source must be quarantined, not merged into the active profile.");

    harness.setActiveStudent("student-B");
    harness.manager.applyProfileLocks();
    assert.equal(harness.values.has("Tahouri_ContentLocks:student-B"), false,
        "A later profile must not claim quarantined data.");
}
async function main() {
    await testAmbiguousLegacyIsQuarantinedAcrossProfiles();
    await testQuarantinePreservesExistingProfileValues();
    await testMalformedLegacyIsPreservedAndNotAssigned();
    await testArchiveConflictDoesNotOverwriteEitherSource();
    await testInvalidExistingProfileDataIsNotOverwritten();
    console.log("Content-lock legacy migration ownership-safety regression: PASS");
    console.log("Verified: no automatic owner assignment, global quarantine, existing-data preservation, reload/re-entry, archive preservation, malformed payload rejection, and zero cross-profile copies.");
}

main().catch(error => {
    console.error("Content-lock legacy migration ownership-safety regression: FAIL", error);
    process.exitCode = 1;
});
