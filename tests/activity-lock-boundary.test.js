"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
    path.resolve(__dirname, "../engine/activity/activityManager.js"),
    "utf8"
);

function createManager({ lockedIds = [], progressionIds = [], withLockManager = true } = {}) {
    const events = [];
    const context = {
        window: {},
        document: { getElementById: () => null },
        console: { log() {}, warn() {}, error() {}, trace() {} },
        EventManager: {
            emit(name) { events.push(name); }
        }
    };

    if (withLockManager) {
        const locked = new Set(lockedIds);
        const progression = new Set(progressionIds);
        context.ContentLockManager = {
            isLocked(id) { return locked.has(id); },
            isProgressionActivity(id) { return progression.has(id); }
        };
    }

    vm.runInNewContext(source, context);
    const manager = context.window.ActivityManager;
    manager.start = async () => "started";
    return { manager, events };
}

async function run() {
    {
        const { manager, events } = createManager({ lockedIds: ["locked"] });
        const result = await manager.load({ id: "locked", locked: true, type: "quiz", engine: "QuizEngine" });
        assert.equal(result, null);
        assert.deepEqual(events, []);
    }

    {
        const { manager, events } = createManager({
            lockedIds: ["parity-next"],
            progressionIds: ["parity-next"]
        });
        const result = await manager.load({ id: "parity-next", locked: false, type: "quiz", engine: "QuizEngine" });
        assert.equal(result, null, "Progression rules must override stale unlocked catalog flags.");
        assert.deepEqual(events, []);
    }

    {
        const { manager, events } = createManager({ lockedIds: ["explicit-open"] });
        const result = await manager.load({ id: "explicit-open", locked: false, type: "quiz", engine: "QuizEngine" });
        assert.equal(result, "started", "Explicitly open catalog activities should remain accessible.");
        assert.deepEqual(events, ["activityLoaded"]);
    }

    {
        const { manager, events } = createManager({ lockedIds: ["unknown-lock"] });
        const result = await manager.load({ id: "unknown-lock", type: "quiz", engine: "QuizEngine" });
        assert.equal(result, null, "Unknown activities must fail closed when lock data exists.");
        assert.deepEqual(events, []);
    }

    {
        const { manager } = createManager({ withLockManager: false });
        const result = await manager.load({ id: "locked-without-manager", locked: true, type: "quiz", engine: "QuizEngine" });
        assert.equal(result, null);
    }

    console.log("Activity lock entry-boundary checks: PASS");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
