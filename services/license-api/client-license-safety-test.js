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
const indexHtml = read("index.html");
const store = read("engine/core/tahouriEntitlementStore.js");
const manager = read("engine/core/licenseManager.js");
const gate = read("engine/core/activationGate.js");
const appController = read("engine/core/appController.js");
const licenseClient = read("engine/core/tahouriLicenseClient.js");
const learningSync = read("engine/core/studentLearningSync.js");
const studentDataTransfer = read("engine/core/studentDataTransfer.js");
const index = read("index.html");
const profileScreen = read("engine/ui/profileScreen.js");
const licenseScreen = read("engine/ui/licenseScreen.js");

assert(
    serviceConfig.includes('mode: "production"') &&
    serviceConfig.includes('https://tahouri-license-api.asadtahouri1986.workers.dev/api') &&
    serviceConfig.includes("-----BEGIN PUBLIC KEY-----") &&
    !serviceConfig.includes("BEGIN PRIVATE KEY"),
    "The deployed client must pin a public verification key and must never embed a private key."
);

assert(
    indexHtml.includes("tahouriServiceConfig.js?v=1.3") &&
    indexHtml.includes("tahouriEntitlementVerifier.js?v=1.5") &&
    indexHtml.includes("tahouriDeviceIdentity.js?v=1.0") &&
    indexHtml.includes("tahouriLicenseClient.js?v=2.2") &&
    indexHtml.indexOf("tahouriDeviceIdentity.js") < indexHtml.indexOf("tahouriLicenseClient.js") &&
    indexHtml.includes("profileScreen.js?v=5.2") &&
    indexHtml.includes("licenseScreen.js?v=pr141-recovery-1") &&
    indexHtml.includes("licenseManager.js?v=2.2") &&
    indexHtml.includes("activationGate.js?v=8.5") &&
    indexHtml.includes("profilePolish.css?v=2.6"),
    "Pages must bust cached versions of the production service config, verifier, and license client."
);

assert(
    licenseScreen.includes('id="tahouriDeviceSlots"') &&
    licenseScreen.includes('id="tahouriDeviceSlotsList"') &&
    licenseScreen.includes("async function loadBoundDeviceSlots()") &&
    licenseScreen.includes("async function replaceBoundDevice(device,claims,button)") &&
    licenseScreen.includes("requestDeviceRevocationChallenge") &&
    licenseScreen.includes("executeDeviceRevocation"),
    "License UI must expose the authenticated device list and signed replacement flow."
);

assert(
    !licenseClient.includes("registerExistingProfiles") &&
    !licenseClient.includes("registerProfile") &&
    !licenseClient.includes("/students/register") &&
    licenseClient.includes("window.TahouriLicenseClient = { activate, health, status, syncLearningData, requestPairing, requestPairingChallenge, decidePairing, pairingStatus, recoverApprovedPairingEntitlement, claimLegacyMigration, claimLegacyMigrationCode, cancelPairing, listPendingPairings, listBoundDeviceSlots, requestDeviceRevocationChallenge, executeDeviceRevocation };") &&
    licenseClient.includes("async function listBoundDeviceSlots(licenseId)") &&
    licenseClient.includes("async function cancelPairing(pairingId, token)") &&
    licenseClient.includes("devicePublicKeyPem: identity.publicKey") &&
    licenseClient.includes("deviceSignature: signed.signature") &&
    manager.includes("async function getOrCreateRemoteInstallationId()") &&
    manager.includes("await getOrCreateRemoteInstallationId()") &&
    manager.includes("claims.installationBinding !== installationId"),
    "The browser client must not auto-register profiles through a public enrollment endpoint."
);

assert(
    licenseClient.includes("async function syncLearningData(payload)") &&
    licenseClient.includes('purpose: "tahouri-learning-data-sync-v1"') &&
    licenseClient.includes('request("/learning-data/sync"') &&
    licenseClient.includes("payloadHash"),
    "Learning sync requests must be device-signed and bound to a hashed snapshot."
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


// Student learning-data sync must be loaded only after the verified license gate
// and must use the registered device signature rather than a bearer token.
assert(
    index.includes('studentLearningSync.js?v=1.3') &&
    index.indexOf("activationGate.js") < index.indexOf("studentLearningSync.js") &&
    studentDataTransfer.includes("function exportProfileData(studentId)") &&
    studentDataTransfer.includes("function applyProfileData(studentId, incomingData)") &&
    licenseClient.includes("async function syncLearningData(payload)") &&
    licenseClient.includes('request("/learning-data/sync"') &&
    licenseClient.includes("deviceSignature: signed.signature") &&
    learningSync.includes("hasValidRemoteEntitlement(profile.grade)") &&
    learningSync.includes("getVerifiedRemoteEntitlementClaims") &&
    learningSync.includes("window.setInterval") &&
    learningSync.includes("}, 60000)") &&
    learningSync.includes('window.addEventListener("online"') &&
    learningSync.includes('window.EventManager.on("profileChanged"') &&
    learningSync.includes("mergeThreeWay") &&
    learningSync.includes("Number(error.status) !== 409") &&
    learningSync.includes("conflict.datasets"),
    "Student learning-data sync must be device-authenticated, profile-scoped, conflict-aware, and loaded after license verification."
);

const vm = require("vm");
const syncContext = {
    window: { addEventListener() {} },
    document: { readyState: "loading", addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    console: { log() {}, warn() {}, error() {} },
    setTimeout() { return 1; },
    clearTimeout() {}
};
vm.runInNewContext(learningSync, syncContext, { filename: "studentLearningSync.js" });
const merge = syncContext.window.StudentLearningSync.mergeDatasets;
const baseSnapshot = {
    progress: { chapter1: { score: 10, completed: false } },
    statistics: {
        overall: { totalActivities: 2, totalScore: 20, averageScore: 10, bestScore: 10, totalCorrect: 4, totalWrong: 0 },
        subjects: {}, chapters: {},
        activities: { math1: { totalActivities: 2, totalScore: 20, averageScore: 10, bestScore: 10, totalCorrect: 4, totalWrong: 0 } }
    },
    contentLocks: { chapter2: true },
    parityProgression: { unlocked: ["evenOdd"] },
    dailyStreak: { days: { "2026-11-20": true }, currentStreak: 1, bestStreak: 1, lastCompletedDate: "2026-11-20" },
    notifications: [],
    spellingPerformance: { answers: [], targetAnswers: [] },
    questionPerformance: {}
};
const localSnapshot = JSON.parse(JSON.stringify(baseSnapshot));
const remoteSnapshot = JSON.parse(JSON.stringify(baseSnapshot));
localSnapshot.progress.chapter1.score = 12;
remoteSnapshot.progress.chapter1.score = 13;
localSnapshot.statistics.activities.math1.totalActivities = 3;
localSnapshot.statistics.activities.math1.totalScore = 30;
localSnapshot.statistics.activities.math1.totalCorrect = 6;
remoteSnapshot.statistics.activities.math1.totalActivities = 4;
remoteSnapshot.statistics.activities.math1.totalScore = 40;
remoteSnapshot.statistics.activities.math1.totalCorrect = 8;
localSnapshot.contentLocks.chapter2 = false;
remoteSnapshot.parityProgression.unlocked.push("evenOddSum");
remoteSnapshot.notifications.push({ id: "n1" });
const mergedSnapshot = merge(baseSnapshot, localSnapshot, remoteSnapshot);
assert(mergedSnapshot.progress.chapter1.score === 13,
    "Progress merge must preserve the highest locally or remotely achieved value.");
assert(mergedSnapshot.statistics.activities.math1.totalActivities === 5 &&
    mergedSnapshot.statistics.activities.math1.totalScore === 50 &&
    mergedSnapshot.statistics.overall.totalActivities === 5,
    "Three-way statistics merge must add independent post-baseline attempts without dropping either device's progress.");
assert(mergedSnapshot.contentLocks.chapter2 === false,
    "Content already unlocked on one device must not be relocked by the other device.");
const remoteRelock = JSON.parse(JSON.stringify(baseSnapshot));
remoteRelock.contentLocks.chapter2 = false;
const localUnchangedLock = JSON.parse(JSON.stringify(baseSnapshot));
localUnchangedLock.contentLocks.chapter2 = false;
const remoteLockedAgain = JSON.parse(JSON.stringify(baseSnapshot));
remoteLockedAgain.contentLocks.chapter2 = true;
assert(merge(baseSnapshot, localUnchangedLock, remoteLockedAgain).contentLocks.chapter2 === false,
    "A previously unlocked item must remain unlocked even if the other device has stale lock state.");
assert(mergedSnapshot.parityProgression.unlocked.includes("evenOddSum") &&
    mergedSnapshot.notifications.length === 1,
    "Array-backed learning datasets must be merged without duplicate entries.");
let rejectedUnsafeMerge = false;
try {
    const conflictingLocal = JSON.parse(JSON.stringify(baseSnapshot));
    const conflictingRemote = JSON.parse(JSON.stringify(baseSnapshot));
    conflictingLocal.progress.chapter1.label = "تلفن";
    conflictingRemote.progress.chapter1.label = "رایانه";
    merge(baseSnapshot, conflictingLocal, conflictingRemote);
} catch (_) {
    rejectedUnsafeMerge = true;
}
assert(rejectedUnsafeMerge,
    "Conflicting simultaneous edits must stop the merge instead of silently overwriting either device.");

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


assert(
    manager.includes("async function activateRemote(code, gradeId, studentId") &&
    manager.includes("window.TahouriLicenseClient.activate({code, gradeId, studentId: normalizedStudentId") &&
    manager.includes('typeof claims.gradeScope !== "string"') &&
    manager.includes('typeof claims.studentId !== "string"') &&
    manager.includes('typeof claims.installationBinding !== "string"') &&
    manager.includes("claims.gradeScope !== expectedGradeId") &&
    manager.includes("claims.studentId !== expectedStudentId") &&
    manager.includes("claims.installationBinding !== installationId") &&
    manager.indexOf("TahouriEntitlementStore.write(response.entitlement)") >
        manager.indexOf("claims.installationBinding !== installationId"),
    "Remote activation must validate exact profile and installation bindings before persisting the signed entitlement."
);

assert(
    verifier.includes('typeof claims.gradeScope !== "string"') &&
    verifier.includes('typeof claims.studentId !== "string"') &&
    verifier.includes('typeof claims.installationBinding !== "string"') &&
    verifier.includes("validFrom.getTime() >= validUntil.getTime()"),
    "The signed entitlement verifier must reject incomplete bindings and invalid validity windows."
);

assert(
    gate.includes("const studentId =") &&
    gate.includes("getActiveStudentId();") &&
    gate.includes("LicenseManager.activateRemote(code, profileGrade, studentId)"),
    "The activation gate must pass the currently selected profile ID into remote activation."
);


assert(
    gate.includes("let licenseSelectionPending = false;") &&
    gate.includes("ready: ready,") &&
    gate.includes("function revalidateInBackground(studentId, sequence)") &&
    gate.includes("licenseSelectionPending ?") &&
    gate.includes("revalidateInBackground(studentId, sequence);"),
    "Profile entitlement selection must show a neutral checking state and perform server revalidation in the background."
);

const enterGradeStart = gate.indexOf("async function enterGrade(");
const enterGradeEnd = gate.indexOf("// Initialize", enterGradeStart);
const enterGradeSource = gate.slice(enterGradeStart, enterGradeEnd);
assert(
    enterGradeStart >= 0 &&
    enterGradeEnd > enterGradeStart &&
    !enterGradeSource.includes("await revalidateCurrentLicense()") &&
    enterGradeSource.includes("!isCurrentProfileActivated(profileGrade)"),
    "Entering a locally verified profile must not wait for an online status request."
);

const initializeStart = gate.indexOf("async function initialize()");
const initializeEnd = gate.indexOf("// Open", initializeStart);
const initializeSource = gate.slice(initializeStart, initializeEnd);
assert(
    initializeStart >= 0 &&
    initializeEnd > initializeStart &&
    initializeSource.includes("resolveReady(true)") &&
    !initializeSource.includes("await revalidateCurrentLicense()") &&
    initializeSource.includes("revalidateInBackground(studentId, profileSwitchSequence)"),
    "Startup must resolve local entitlement readiness before running server revalidation in the background."
);

assert(
    appController.includes("await ActivationGate.ready;") &&
    appController.indexOf("await ActivationGate.ready;") < appController.indexOf("Screen.showHome();"),
    "The home screen must wait for local entitlement selection, not for the remote API."
);

assert(
    manager.includes("async function getProfileEntitlementStatus(studentId, gradeId)") &&
    manager.includes("verifier.verifyEnvelope(envelope, { allowFuture: true })") &&
    manager.includes('status: "renewal_required"') &&
    manager.includes('status: "expired"'),
    "Profile status must be derived from locally verified, profile-bound signed entitlements and the current academic year."
);

assert(
    profileScreen.includes("await this.refreshSelectedProfileEntitlement();") &&
    profileScreen.includes("selectProfile: async function (studentId, button)") &&
    gate.includes("async function refreshActiveProfileEntitlement()") &&
    gate.includes("refreshActiveProfileEntitlement:") &&
    gate.includes("ProfileScreen.refreshProfileLicenseStatus(getActiveProfile())") &&
    profileScreen.includes("getProfileEntitlementStatus(profile.studentId, profile.grade)") &&
    profileScreen.includes("data-profile-license-status") &&
    profileScreen.includes("data-profile-activate-id") &&
    profileScreen.includes("activateProfile(profile.studentId, profile.grade, activateButton)"),
    "The profile management screen must re-select a profile's local entitlement and expose its activation status and direct action."
);

const createProfileStart = profileScreen.indexOf("showCreate: function ()");
const createProfileEnd = profileScreen.indexOf("// Edit Profile", createProfileStart);
const createProfileSource = profileScreen.slice(createProfileStart, createProfileEnd);
assert(
    createProfileStart >= 0 &&
    createProfileEnd > createProfileStart &&
    createProfileSource.includes("ProfileScreen.show();") &&
    !createProfileSource.includes("ActivationGate.open();") &&
    createProfileSource.includes("ساخت پروفایل به معنی فعال شدن مجوز یادگیری نیست"),
    "Creating a profile must explain the next step and show its license state instead of unexpectedly opening the learning gate."
);

console.log("Tahouri client license safety test: PASS");
