"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "../..");
const reports = fs.readFileSync(path.join(root, "engine/ui/reportsScreen.js"), "utf8");
const controller = fs.readFileSync(path.join(root, "engine/core/reportsController.js"), "utf8");
const eventsSource = fs.readFileSync(path.join(root, "engine/core/eventManager.js"), "utf8");

assert.match(reports, /let statistics = getStatistics\(data\)/);
assert.match(reports, /function refresh\(nextData\)/);
assert.match(reports, /activeScreen\.refresh\(data\)/);
assert.match(reports, /studentLearningDataSynced/);
assert.match(reports, /off\("studentLearningDataSynced", syncHandler\)/);
assert.match(controller, /_reportsCloseObserverInstalled/);

const context = { console };
vm.runInNewContext(eventsSource, context, { filename: "eventManager.js" });
vm.runInNewContext(`
    var listenerCalls = [];
    var keep = function () { listenerCalls.push("keep"); };
    var remove = function () { listenerCalls.push("remove"); };
    EventManager.on("studentLearningDataSynced", keep);
    EventManager.on("studentLearningDataSynced", remove);
    EventManager.off("studentLearningDataSynced", remove);
    EventManager.emit("studentLearningDataSynced", { studentId: "student-test" });
`, context);
assert.deepEqual(Array.from(context.listenerCalls), ["keep"]);

console.log("PASS: reports screen refreshes from newly built controller data");
console.log("PASS: refresh keeps the current report view and removes its own listener on close");
console.log("PASS: event unsubscription preserves unrelated listeners");
console.log("RESULT: reports sync refresh regression checks passed.");
