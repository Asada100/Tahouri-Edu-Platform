"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const transferSource = fs.readFileSync(path.join(__dirname, "../../engine/core/studentDataTransfer.js"), "utf8");

function makeHarness(seed, profiles, activeId) {
    const values = new Map(Object.entries(seed || {}));
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
    const ProfileManager = {
        profiles: (profiles || []).map(p => ({ ...p, settings: { ...p.settings } })),
        activeProfileId: activeId || null,
        getAll() { return this.profiles.map(p => ({ ...p, settings: { ...p.settings } })); },
        importProfiles(items) {
            let imported = 0;
            for (const item of items) {
                if (this.profiles.some(p => p.studentId === item.studentId)) continue;
                this.profiles.push({
                    studentId: item.studentId,
                    name: item.fullName,
                    grade: item.gradeId,
                    createdAt: item.createdAt || "2026-01-01T00:00:00.000Z",
                    settings: { theme: "light", music: true, programSound: true, notifications: true, soundFeedback: true, ...(item.settings || {}) }
                });
                imported++;
            }
            if (!this.activeProfileId && this.profiles.length) this.activeProfileId = this.profiles[0].studentId;
            this.save();
            return { imported, alreadyPresent: items.length - imported, total: items.length };
        },
        save() {
            localStorage.setItem("Tahouri_Profiles", JSON.stringify(this.profiles));
            if (this.activeProfileId) localStorage.setItem("Tahouri_Active_Profile", this.activeProfileId);
            return true;
        }
    };
    const window = { ProfileManager };
    const context = { window, ProfileManager, localStorage, console, Date, JSON, Object, Array, Map, Set, Number, String, Error };
    vm.runInNewContext(transferSource, context);
    return { transfer: window.StudentDataTransfer, values, manager: ProfileManager };
}

const settingsA = { theme: "dark", music: false, programSound: true, notifications: false, soundFeedback: true };
const settingsB = { theme: "light", music: true, programSound: false, notifications: true, soundFeedback: false };
const dataA = {
    progress: { mathOne: { played: true, bestScore: 95, stars: 5, bestStars: 5, completed: true } },
    statistics: { overall: { totalActivities: 1, totalScore: 95, averageScore: 95, bestScore: 95, totalCorrect: 9, totalWrong: 1 }, subjects: {}, chapters: {}, activities: {} },
    contentLocks: { mathTwo: true, mathOne: false },
    parityProgression: { unlocked: ["evenOdd", "parityTrain"] },
    dailyStreak: { days: { "2026-11-20": { activityCount: 1, activities: ["mathOne"], subjects: {}, totalScore: 95 } }, currentStreak: 3, bestStreak: 5, lastCompletedDate: "2026-11-20" },
    notifications: [{ id: "n-a", title: "A", body: "خبر", read: true }],
    spellingPerformance: { answers: [{ activityId: "spell", correct: true }], targetAnswers: [] },
    questionPerformance: { skills: { fraction: { correct: 3, wrong: 1 } } }
};
const dataB = {
    progress: { persianOne: { played: true, bestScore: 80, stars: 4, bestStars: 4, completed: true } },
    contentLocks: { persianTwo: true },
    notifications: [{ id: "n-b", title: "B", body: "اعلان", read: false }]
};

function seedProfile(values, studentId, data) {
    const prefixes = {
        progress: "Tahouri_Progress:",
        statistics: "Tahouri_Statistics:",
        contentLocks: "Tahouri_ContentLocks:",
        parityProgression: "Tahouri_EvenOddProgression_v2:",
        dailyStreak: "tahouri_daily_learning_streak:",
        notifications: "tahouri_notifications:",
        spellingPerformance: "Tahouri_Spelling_Performance:",
        questionPerformance: "Tahouri_QuestionPerformance:"
    };
    Object.entries(data).forEach(([id, value]) => values.set(prefixes[id] + studentId, JSON.stringify(value)));
}

function makeProfiles() {
    return [
        { studentId: "student-A", name: "دانش‌آموز الف", grade: "grade6", createdAt: "2026-01-01T00:00:00.000Z", settings: settingsA },
        { studentId: "student-B", name: "دانش‌آموز ب", grade: "grade5", createdAt: "2026-01-02T00:00:00.000Z", settings: settingsB }
    ];
}

function testExportCapturesAllStudentOwnedLearningStores() {
    const seed = new Map();
    seedProfile(seed, "student-A", dataA);
    seedProfile(seed, "student-B", dataB);
    seed.set("Tahouri_ActivityHistory", JSON.stringify({ id: "device-current-activity" }));
    seed.set("Tahouri_Signed_Entitlement_v1", JSON.stringify([{ claims: { licenseId: "device-bound" } }]));
    seed.set("tahouri_push_subscription:student-A", JSON.stringify({ endpoint: "device-endpoint" }));
    seed.set("tahouri_reminder_state", JSON.stringify({ date: "2026-11-20" }));
    const harness = makeHarness(Object.fromEntries(seed), makeProfiles(), "student-A");

    const payload = harness.transfer.exportAll();
    assert.equal(payload.format, "tahouri-student-learning-data");
    assert.equal(payload.version, 1);
    assert.equal(payload.profiles.length, 2);
    assert.deepEqual(JSON.parse(JSON.stringify(payload.profiles[0].settings)), settingsA);
    assert.deepEqual(Object.keys(payload.profiles[0].data).sort(), Object.keys(dataA).sort());
    assert.deepEqual(Object.keys(payload.profiles[1].data).sort(), Object.keys(dataB).sort());
    assert.deepEqual(JSON.parse(JSON.stringify(payload.profiles[0].data.progress)), dataA.progress);
    assert.equal(JSON.stringify(payload).includes("device-bound"), false);
    assert.equal(JSON.stringify(payload).includes("device-endpoint"), false);
    assert.equal(JSON.stringify(payload).includes("device-current-activity"), false);
    assert.equal(JSON.stringify(payload).includes("tahouri_reminder_state"), false);
}

function testImportRestoresEveryProfileAndIsIdempotent() {
    const sourceSeed = new Map();
    seedProfile(sourceSeed, "student-A", dataA);
    seedProfile(sourceSeed, "student-B", dataB);
    const source = makeHarness(Object.fromEntries(sourceSeed), makeProfiles(), "student-A");
    const payload = source.transfer.exportAll();

    const target = makeHarness({}, [], null);
    const first = target.transfer.importAll(payload, JSON.stringify(payload).length);
    assert.equal(first.profiles, 2);
    assert.equal(first.newProfiles, 2);
    assert.ok(first.dataItemsRestored >= 8);
    assert.equal(target.manager.profiles.length, 2);
    assert.deepEqual(JSON.parse(target.values.get("Tahouri_Progress:student-A")), dataA.progress);
    assert.deepEqual(JSON.parse(target.values.get("Tahouri_Statistics:student-A")), dataA.statistics);
    assert.deepEqual(JSON.parse(target.values.get("Tahouri_ContentLocks:student-A")), dataA.contentLocks);
    assert.deepEqual(JSON.parse(target.values.get("Tahouri_Progress:student-B")), dataB.progress);
    assert.deepEqual(JSON.parse(target.values.get("tahouri_notifications:student-B")), dataB.notifications);
    assert.deepEqual(target.manager.profiles.find(p => p.studentId === "student-A").settings, settingsA);

    const snapshot = Object.fromEntries(target.values.entries());
    const second = target.transfer.importAll(payload, JSON.stringify(payload).length);
    assert.equal(second.newProfiles, 0);
    assert.equal(second.dataItemsRestored, 0);
    assert.deepEqual(Object.fromEntries(target.values.entries()), snapshot);
}

function testExistingEmptyDefaultsCanBeRestoredWithoutOverwritingRealData() {
    const targetSeed = {
        "Tahouri_Progress:student-A": "{}",
        "Tahouri_ContentLocks:student-A": "{}",
        "tahouri_notifications:student-A": "[]"
    };
    const target = makeHarness(targetSeed, [makeProfiles()[0]], "student-A");
    const sourceSeed = new Map();
    seedProfile(sourceSeed, "student-A", dataA);
    const source = makeHarness(Object.fromEntries(sourceSeed), [makeProfiles()[0]], "student-A");
    const payload = source.transfer.exportAll();

    const result = target.transfer.importAll(payload, JSON.stringify(payload).length);
    assert.equal(result.newProfiles, 0);
    assert.deepEqual(JSON.parse(target.values.get("Tahouri_Progress:student-A")), dataA.progress);
    assert.deepEqual(JSON.parse(target.values.get("Tahouri_ContentLocks:student-A")), dataA.contentLocks);
    assert.deepEqual(JSON.parse(target.values.get("tahouri_notifications:student-A")), dataA.notifications);
}

function testConflictRejectsWholeImportWithoutPartialWrites() {
    const sourceSeed = new Map();
    seedProfile(sourceSeed, "student-A", dataA);
    seedProfile(sourceSeed, "student-B", dataB);
    const source = makeHarness(Object.fromEntries(sourceSeed), makeProfiles(), "student-A");
    const payload = source.transfer.exportAll();

    const targetSeed = {
        "Tahouri_Progress:student-A": JSON.stringify({ localOnly: { bestScore: 10 } })
    };
    const target = makeHarness(targetSeed, [], null);
    const before = Object.fromEntries(target.values.entries());
    assert.throws(() => target.transfer.importAll(payload, JSON.stringify(payload).length), /تعارض/);
    assert.deepEqual(Object.fromEntries(target.values.entries()), before,
        "Preflight conflicts must stop before writing profile B or any other dataset.");
    assert.equal(target.manager.profiles.length, 0);
}

function testInvalidEnvelopeAndOversizeAreRejected() {
    const target = makeHarness({}, [], null);
    assert.throws(() => target.transfer.importAll({ format: "wrong", version: 1, profiles: [] }, 10), /ساختار/);
    assert.throws(() => target.transfer.importAll({ format: "tahouri-student-learning-data", version: 1, profiles: [] }, 10), /ساختار/);
    assert.throws(() => target.transfer.importAll({}, target.transfer.maxBytes + 1), /۲۰ مگابایت/);
    assert.equal(target.values.size, 0);
}

function main() {
    testExportCapturesAllStudentOwnedLearningStores();
    testImportRestoresEveryProfileAndIsIdempotent();
    testExistingEmptyDefaultsCanBeRestoredWithoutOverwritingRealData();
    testConflictRejectsWholeImportWithoutPartialWrites();
    testInvalidEnvelopeAndOversizeAreRejected();
    console.log("Student learning data portability regression: PASS");
    console.log("Verified: multi-profile export, all declared learning stores, settings, device-bound exclusions, lossless restore, idempotency, empty-default restore, and atomic conflict preflight.");
}
main();
