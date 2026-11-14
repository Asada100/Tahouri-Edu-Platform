"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

function read(file) {
    return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const verifier = read("engine/core/tahouriEntitlementVerifier.js");
const serviceConfig = read("engine/core/tahouriServiceConfig.js");
const store = read("engine/core/tahouriEntitlementStore.js");
const manager = read("engine/core/licenseManager.js");
const gate = read("engine/core/activationGate.js");

assert(
    serviceConfig.includes('mode: "production"') &&
    serviceConfig.includes('https://tahouri-license-api.asadtahouri1986.workers.dev/api') &&
    serviceConfig.includes('publicKeyPem: ""'),
    "The deployed client must use the production License API without embedding a private key."
);

assert(
    verifier.includes('config.mode === "production" && !/^https:\\/\\//i.test(apiBaseUrl)') &&
    verifier.includes('redirect: "error"') &&
    verifier.includes('credentials: "omit"') &&
    verifier.includes('apiBaseUrl + "/public-key"'),
    "Production public-key discovery must use HTTPS, reject redirects, and omit credentials."
);

assert(
    verifier.includes("const allowFuture = options.allowFuture === true;") &&
    verifier.includes("if (!allowFuture)") &&
    verifier.includes("claims.validFrom"),
    "Future-entitlement verification guard is incomplete."
);

assert(
    store.includes("function readAll()") &&
    store.includes("function writeAll(entitlements)") &&
    store.includes("all.findIndex"),
    "Multi-entitlement store support is incomplete."
);

const futureBlock = manager.match(
    /if \(isFutureRenewal\) \{([\s\S]*?)\n\s*\}/
);

assert(futureBlock, "Future renewal branch is missing.");
assert(
    futureBlock[1].includes("await initializeRemoteEntitlement()"),
    "Future renewal must re-select the currently active entitlement."
);
assert(
    !futureBlock[1].includes("verifiedRemoteEntitlement = claims"),
    "Future renewal must not replace the active entitlement."
);

assert(
    manager.includes("function isRemoteProductionMode()") &&
    manager.includes("if (isRemoteProductionMode())") &&
    manager.includes("فعال‌سازی محلی در نسخه production مجاز نیست."),
    "Production local-license fallback guard is incomplete."
);

assert(
    manager.includes("let entitlementSelectionSequence = 0;") &&
    manager.includes("normalizeStudentId(claims.studentId) !== activeStudentId") &&
    manager.includes("!claims.gradeScope || claims.gradeScope !== activeGradeId") &&
    manager.includes("selectionSequence !== entitlementSelectionSequence"),
    "Signed entitlements must be selected only for the active student and exact grade, with stale selections ignored."
);

assert(
    gate.includes("async function () {") &&
    gate.includes("manager.initializeRemoteEntitlement()") &&
    gate.includes("await selection") &&
    gate.includes("if (sequence !== profileSwitchSequence) return;"),
    "Profile switching must re-select the active profile entitlement and ignore stale switch operations."
);


assert(
    gate.includes('const productionMode = serviceConfig.mode === "production";') &&
    gate.includes("THR-GRADE[1-6]") &&
    gate.includes("if (!result && managedCode)") &&
    gate.includes("if (!result && !productionMode && !managedCode)"),
    "Activation gate managed-code and production fallback guards are incomplete."
);

console.log("Tahouri client license safety test: PASS");
