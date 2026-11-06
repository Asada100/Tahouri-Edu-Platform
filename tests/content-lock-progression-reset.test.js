"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
    path.resolve(__dirname, "../engine/core/contentLockManager.js"),
    "utf8"
);

function createStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}

async function createManager() {
    const localStorage = createStorage();
    const window = {};
    const context = {
        window,
        localStorage,
        ProfileContext: { key: key => "profile-A:" + key },
        EventManager: { on() {} },
        fetch: async () => ({
            ok: true,
            json: async () => [
                { id: "evenOdd", locked: false },
                { id: "parityTrain", locked: true },
                { id: "matchingManyToOne", locked: true },
                { id: "parityDiscoveryWorkshop", locked: true },
                { id: "evenOddSum", locked: true },
                { id: "animalClassification", locked: false }
            ]
        }),
        console: { log() {}, warn() {}, error() {} }
    };

    vm.runInNewContext(source, context);
    const manager = window.ContentLockManager;
    await manager.waitUntilReady();
    return manager;
}

function unlockedIds(manager) {
    return JSON.parse(JSON.stringify(manager.getProgressionState().unlocked));
}

async function run() {
    const manager = await createManager();

    assert.deepEqual(unlockedIds(manager), ["evenOdd"]);
    assert.equal(manager.isLocked("evenOdd"), false);
    assert.equal(manager.isLocked("parityTrain"), true);

    assert.equal(manager.unlock("matchingManyToOne"), false,
        "A later stage cannot be unlocked before its prerequisite.");
    assert.equal(manager.unlock("parityTrain"), true);
    assert.equal(manager.unlock("matchingManyToOne"), true);
    assert.deepEqual(unlockedIds(manager), ["evenOdd", "parityTrain", "matchingManyToOne"]);

    assert.equal(manager.reset("parityTrain"), true);
    assert.deepEqual(unlockedIds(manager), ["evenOdd"]);
    assert.equal(manager.isLocked("matchingManyToOne"), true);

    assert.equal(manager.unlock("parityTrain"), true);
    assert.equal(manager.unlock("matchingManyToOne"), true);
    assert.equal(manager.lock("parityTrain"), true);
    assert.deepEqual(unlockedIds(manager), ["evenOdd"]);

    assert.equal(manager.unlock("animalClassification"), true);
    assert.equal(manager.isLocked("animalClassification"), false);
    assert.equal(manager.reset("animalClassification"), true);
    assert.equal(manager.isLocked("animalClassification"), true);

    assert.equal(manager.unlock("parityTrain"), true);
    assert.equal(manager.unlock("matchingManyToOne"), true);
    assert.equal(manager.resetAll(), true);
    assert.deepEqual(unlockedIds(manager), ["evenOdd"]);
    assert.equal(manager.isLocked("parityTrain"), true);
    assert.equal(manager.isLocked("matchingManyToOne"), true);
    assert.equal(manager.isLocked("evenOdd"), false);

    console.log("Content lock progression reset checks: PASS");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
