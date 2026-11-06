"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../service-worker.js"), "utf8");
const origin = "https://school.example";
const appRoot = origin + "/Tahouri-Edu-Platform/";
const scriptUrl = appRoot + "service-worker.js";

function loadWorker(windowClients) {
    const listeners = new Map();
    const openedUrls = [];
    const scope = {
        location: { origin, href: scriptUrl },
        registration: { showNotification: async () => undefined },
        clients: {
            claim: async () => undefined,
            matchAll: async () => windowClients,
            openWindow: async url => {
                openedUrls.push(url);
                return { url };
            }
        },
        skipWaiting: async () => undefined,
        addEventListener(name, handler) {
            listeners.set(name, handler);
        }
    };

    vm.runInNewContext(source, { self: scope, URL, console });
    return { listeners, openedUrls };
}

async function clickNotification(worker, url) {
    let pending;
    let closed = false;
    const event = {
        notification: {
            data: { url },
            close() { closed = true; }
        },
        waitUntil(promise) { pending = promise; }
    };

    worker.listeners.get("notificationclick")(event);
    await pending;
    assert.equal(closed, true, "The clicked notification should close.");
}

async function run() {
    let navigatedTo = null;
    let focused = false;
    const existingClient = {
        url: appRoot,
        async navigate(url) { navigatedTo = url; },
        async focus() { focused = true; }
    };
    const existingWorker = loadWorker([existingClient]);

    await clickNotification(existingWorker, "./grade6/math/chapter1");
    assert.equal(navigatedTo, appRoot + "grade6/math/chapter1");
    assert.equal(focused, true);
    assert.deepEqual(existingWorker.openedUrls, []);

    const noClientWorker = loadWorker([]);
    await clickNotification(noClientWorker, "https://evil.example/phishing");
    assert.deepEqual(noClientWorker.openedUrls, [appRoot]);

    console.log("Service worker notification navigation: PASS");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
