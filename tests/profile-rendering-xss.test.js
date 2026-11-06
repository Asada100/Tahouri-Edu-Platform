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
    return context.window[globalName];
}

for (const [file, name] of [
    ["engine/ui/profileScreen.js", "ProfileScreen"],
    ["engine/ui/dashboardScreen.js", "DashboardScreen"],
    ["engine/ui/screen.js", "Screen"]
]) {
    const component = loadGlobal(file, name);
    assert.equal(component.escapeHTML(payload), escaped, file + " must escape HTML metacharacters.");
}

const profileSource = fs.readFileSync(path.join(root, "engine/ui/profileScreen.js"), "utf8");
const dashboardSource = fs.readFileSync(path.join(root, "engine/ui/dashboardScreen.js"), "utf8");
const screenSource = fs.readFileSync(path.join(root, "engine/ui/screen.js"), "utf8");
const activationSource = fs.readFileSync(path.join(root, "engine/core/activationGate.js"), "utf8");

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

console.log("Profile rendering XSS protections: PASS");
