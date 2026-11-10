"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(
    path.join(root, "engine/core/activationGate.js"),
    "utf8"
);
const start = source.indexOf("async function switchProfile(");
const end = source.indexOf("// Academic Year", start);
assert.notEqual(start, -1, "switchProfile helper not found");
assert.notEqual(end, -1, "switchProfile helper boundary not found");
const helper = source.slice(start, end);

async function main() {
    const events = [];
    const context = {
        console: { error() {} },
        window: {
            ProfileManager: {
                switchProfile(studentId) {
                    events.push("switch:" + studentId);
                    return true;
                }
            },
            LicenseManager: {
                initializeRemoteEntitlement: async () => {
                    events.push("initialize-entitlement");
                    return true;
                },
                refreshRemoteLicenseStatus: async () => {
                    events.push("refresh-status");
                    return { valid: true };
                }
            }
        },
        revalidateCurrentLicense: async () => {
            events.push("revalidate");
            await context.window.LicenseManager.refreshRemoteLicenseStatus();
            return true;
        }
    };
    vm.createContext(context);
    vm.runInContext(helper + "\nglobalThis.__switchProfile = switchProfile;", context);

    assert.equal(await context.__switchProfile("student-B"), true);
    assert.deepEqual(events, [
        "switch:student-B",
        "initialize-entitlement",
        "revalidate",
        "refresh-status"
    ], "Profile switch must resolve and revalidate the new student's entitlement in order.");

    events.length = 0;
    context.window.ProfileManager.switchProfile = studentId => {
        events.push("rejected:" + studentId);
        return false;
    };
    assert.equal(await context.__switchProfile("unknown-student"), false);
    assert.deepEqual(events, ["rejected:unknown-student"],
        "Rejected profile switches must not change entitlement context.");

    console.log("Tahouri profile-switch entitlement refresh test: PASS");
}

main().catch(error => {
    console.error("Tahouri profile-switch entitlement refresh test: FAIL");
    console.error(error);
    process.exitCode = 1;
});
