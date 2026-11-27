"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../engine/core/studentLearningSync.js"), "utf8");

function createHarness({ validEntitlement }) {
    const events = [];
    const storage = new Map();
    const profile = { studentId: "sync-diagnostics-student", grade: "grade6" };
    const datasets = {
        progress: {}, statistics: { overall: {}, subjects: {}, chapters: {}, activities: {} },
        contentLocks: {}, parityProgression: { unlocked: [] },
        dailyStreak: { days: {}, currentStreak: 0, bestStreak: 0 },
        notifications: [], spellingPerformance: { answers: [], targetAnswers: [] },
        questionPerformance: {}
    };
    const window = {
        navigator: { onLine: true },
        addEventListener() {},
        setInterval() {},
        EventManager: { on() {}, emit(name, value) { events.push({ name, value }); } },
        ProfileManager: { get() { return profile; } },
        LicenseManager: {
            hasValidRemoteEntitlement() { return validEntitlement; },
            getVerifiedRemoteEntitlementClaims() {
                return validEntitlement
                    ? { studentId: profile.studentId, gradeScope: profile.grade, licenseId: "license-test" }
                    : null;
            }
        },
        StudentDataTransfer: {
            exportProfileData() { return datasets; },
            applyProfileData() {}
        },
        TahouriLicenseClient: {
            async syncLearningData(payload) {
                return payload.action === "pull"
                    ? { ok: true, revision: 0 }
                    : { ok: true, revision: 1 };
            }
        }
    };
    const document = { readyState: "loading", addEventListener() {} };
    const localStorage = {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, String(value)); }
    };
    const context = {
        window, document, localStorage, console, Date, JSON, Object, Array, Map, Set,
        Number, String, Error, Promise, setTimeout, clearTimeout
    };
    vm.runInNewContext(source, context, { filename: "studentLearningSync.js" });
    return { sync: window.StudentLearningSync, events };
}

async function testMissingVerifiedEntitlementIsVisible() {
    const harness = createHarness({ validEntitlement: false });
    await assert.rejects(harness.sync.syncNow(), /مجوز آنلاین/);
    const status = harness.sync.getStatus();
    assert.equal(status.state, "error");
    assert.match(status.message, /مجوز آنلاین/);
    assert.ok(harness.events.some(event =>
        event.name === "studentLearningSyncStatus" && event.value.state === "error"));
}

async function testSuccessfulFirstSyncExposesConfirmedRevision() {
    const harness = createHarness({ validEntitlement: true });
    const result = await harness.sync.syncNow();
    const status = harness.sync.getStatus();
    assert.equal(result.revision, 1);
    assert.equal(status.state, "synced");
    assert.equal(status.details.revision, 1);
    assert.ok(harness.events.some(event =>
        event.name === "studentLearningSyncStatus" && event.value.state === "synced"));
}

function streakDataset(status, completedAt) {
    return {
        progress: {},
        statistics: { overall: {}, subjects: {}, chapters: {}, activities: {} },
        contentLocks: {},
        parityProgression: { unlocked: [] },
        dailyStreak: {
            days: {
                "2026-11-26": {
                    date: "2026-11-26", subjects: {}, activities: [],
                    activityCount: 1, totalScore: 60, status, completedAt
                }
            },
            currentStreak: 0, bestStreak: 0, lastCompletedDate: null
        },
        notifications: [],
        spellingPerformance: { answers: [], targetAnswers: [] },
        questionPerformance: {}
    };
}

function testDailyStreakStatusMergesMonotonically() {
    const harness = createHarness({ validEntitlement: true });
    const base = streakDataset("empty", null);
    const local = streakDataset("partial", null);
    const remote = streakDataset("completed", "2026-11-26T10:15:00.000Z");

    const threeWay = harness.sync.mergeDatasets(base, local, remote);
    assert.equal(threeWay.dailyStreak.days["2026-11-26"].status, "completed");
    assert.equal(threeWay.dailyStreak.days["2026-11-26"].completedAt, "2026-11-26T10:15:00.000Z");

    const twoWay = harness.sync.mergeDatasets(null, local, remote);
    assert.equal(twoWay.dailyStreak.days["2026-11-26"].status, "completed");
    assert.equal(twoWay.dailyStreak.days["2026-11-26"].completedAt, "2026-11-26T10:15:00.000Z");
}

(async () => {
    await testMissingVerifiedEntitlementIsVisible();
    await testSuccessfulFirstSyncExposesConfirmedRevision();
    testDailyStreakStatusMergesMonotonically();
    console.log("PASS: missing verified entitlement is visible to the profile UI");
    console.log("PASS: successful sync exposes only the server-confirmed revision");
    console.log("PASS: daily streak status and completion timestamp merge in two-way and three-way sync");
    console.log("RESULT: student learning sync diagnostics tests passed.");
})().catch(error => {
    console.error("FAIL:", error);
    process.exitCode = 1;
});
