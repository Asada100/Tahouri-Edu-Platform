"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const payload = '<img src=x onerror="alert(1)">';
const escaped = "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;";

function loadGlobal(relativePath, globalName) {
    const context = {
        window: {},
        console: { log() {}, warn() {}, error() {} }
    };
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    vm.runInNewContext(source, context);
    return context.window[globalName] || vm.runInNewContext(globalName, context);
}

for (const [file, name] of [
    ["engine/ui/profileScreen.js", "ProfileScreen"],
    ["engine/ui/dashboardScreen.js", "DashboardScreen"],
    ["engine/ui/screen.js", "Screen"],
    ["engine/ui/notificationScreen.js", "NotificationScreen"]
]) {
    const component = loadGlobal(file, name);
    assert.equal(component.escapeHTML(payload), escaped, file + " must escape HTML metacharacters.");
}

const profileSource = fs.readFileSync(path.join(root, "engine/ui/profileScreen.js"), "utf8");
const dashboardSource = fs.readFileSync(path.join(root, "engine/ui/dashboardScreen.js"), "utf8");
const screenSource = fs.readFileSync(path.join(root, "engine/ui/screen.js"), "utf8");
const activationSource = fs.readFileSync(path.join(root, "engine/core/activationGate.js"), "utf8");
const licenseSource = fs.readFileSync(path.join(root, "engine/ui/licenseScreen.js"), "utf8");
const notificationSource = fs.readFileSync(path.join(root, "engine/ui/notificationScreen.js"), "utf8");

assert.match(profileSource, /this\.escapeHTML\(profile\.name/);
assert.match(profileSource, /ProfileScreen\.escapeHTML\(profile\.name/);
assert.match(profileSource, /box\.textContent = message;/);
assert.match(dashboardSource, /this\.escapeHTML\(profile\.name/);
assert.match(dashboardSource, /this\.escapeHTML\(continueLearning\.activityTitle/);
assert.match(screenSource, /this\.escapeHTML\(profile\.name/);
assert.match(screenSource, /this\.escapeHTML\(dailyMessage\.text/);
assert.ok(activationSource.includes('escapeHTML(item.name || "دانش‌آموز")'));
assert.ok(activationSource.includes('escapeHTML(item.studentId || "")'));
assert.ok(activationSource.includes("escapeHTML(licenseNotice)"));
assert.ok(licenseSource.includes('escapeHTML(profile.name || "دانش‌آموز")'));
assert.ok(licenseSource.includes('escapeHTML(profile.studentId || "")'));
assert.ok(notificationSource.includes("NotificationScreen.escapeHTML(item.title || \"اعلان طهوری\")"));
assert.ok(notificationSource.includes('NotificationScreen.escapeHTML(item.body || "")'));
const notificationScreen = loadGlobal("engine/ui/notificationScreen.js", "NotificationScreen");
const notificationHtml = notificationScreen.renderItems([{ id: payload, title: payload, body: payload, createdAt: "2026-11-06T10:00:00.000Z", read: false }]);
assert.ok(notificationHtml.includes(escaped));
assert.doesNotMatch(notificationHtml, /<img src=x onerror=/);

console.log("Profile rendering XSS protections: PASS");
