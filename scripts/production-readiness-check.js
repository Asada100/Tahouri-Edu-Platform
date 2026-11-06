"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const blockers = [];

const configSource = fs.readFileSync(
    path.join(root, "engine/core/tahouriServiceConfig.js"),
    "utf8"
);
const context = {
    window: { location: { hostname: "asada100.github.io" } },
    console: { log() {}, warn() {}, error() {} }
};

try {
    vm.runInNewContext(configSource, context);
} catch (error) {
    blockers.push("Service configuration cannot be evaluated: " + error.message);
}

const config = context.window.TahouriServiceConfig;
if (!config) {
    blockers.push("TahouriServiceConfig is missing.");
} else {
    if (config.mode !== "production") {
        blockers.push("Public Pages configuration is still in test mode.");
    }

    try {
        const api = new URL(config.apiBaseUrl);
        if (api.protocol !== "https:" || api.hostname === "localhost" || api.hostname === "127.0.0.1") {
            blockers.push("Production API URL must be HTTPS and must not point to localhost.");
        }
    } catch {
        blockers.push("Production API URL is missing or invalid.");
    }

    if (typeof config.publicKeyPem !== "string" ||
        !config.publicKeyPem.includes("-----BEGIN PUBLIC KEY-----")) {
        blockers.push("A pinned production entitlement public key is not configured.");
    }
}

const requiredFiles = [
    "services/license-api/worker.js",
    "services/license-api/server.js",
    "services/license-api/wrangler.toml",
    "services/license-api/migrations/0001_initial_schema.sql",
    "services/license-api/migrations/0002_admin_login_attempts.sql",
    "services/license-api/migrations/0003_activation_integrity_indexes.sql",
    "engine/core/tahouriLicenseClient.js",
    "engine/core/tahouriEntitlementStore.js",
    "engine/core/tahouriEntitlementVerifier.js"
];

for (const relative of requiredFiles) {
    if (!fs.existsSync(path.join(root, relative))) {
        blockers.push("Production licensing source or migration is missing from Git: " + relative);
    }
}

const licenseManagerSource = fs.readFileSync(
    path.join(root, "engine/core/licenseManager.js"),
    "utf8"
);
function functionSection(source, signature, nextSignature) {
    const start = source.indexOf(signature);
    if (start < 0) return "";
    const end = source.indexOf(nextSignature, start + signature.length);
    return end > start ? source.slice(start, end) : source.slice(start);
}

const isActivatedBody = functionSection(licenseManagerSource, "function isActivated(", "function isGradeActivated(");
const isGradeActivatedBody = functionSection(licenseManagerSource, "function isGradeActivated(", "function isProfileActivated(");
if (!isActivatedBody.includes("isRemoteProductionMode()")) {
    blockers.push("isActivated does not reject unsigned LocalStorage licenses in production.");
}
if (!isGradeActivatedBody.includes("hasValidRemoteEntitlement(gradeId)") ||
    !isGradeActivatedBody.includes("if (isRemoteProductionMode())") ||
    !isGradeActivatedBody.includes("return false;")) {
    blockers.push("isGradeActivated does not fail closed when remote entitlement validation fails in production.");
}

const workerPath = path.join(root, "services/license-api/worker.js");
if (fs.existsSync(workerPath)) {
    const worker = fs.readFileSync(workerPath, "utf8");
    if (!worker.includes("async function activateLicense") ||
        !worker.includes('url.pathname === "/api/licenses/activate"') ||
        !worker.includes('url.pathname === "/api/licenses/status"') ||
        !worker.includes("async function signEntitlement")) {
        blockers.push("Version-controlled Worker is missing the signed activation/status endpoints.");
    }
    if (!worker.includes("LICENSE_PRIVATE_KEY_PEM") ||
        !worker.includes("licenseActivation: signingReady")) {
        blockers.push("Worker does not require a private signing key before advertising activation readiness.");
    }
}

async function verifyDeployedWorker() {
    const base = String(config.apiBaseUrl).replace(/\/+$/, "");
    const healthResponse = await fetch(base + "/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
    });
    if (!healthResponse.ok) {
        throw new Error("Cloudflare Worker health endpoint returned HTTP " + healthResponse.status + ".");
    }
    const health = await healthResponse.json();
    if (!health.ok || health.database !== "connected" || Number(health.schemaVersion) < 3 ||
        !health.capabilities?.licenseActivation || !health.capabilities?.licenseVerification) {
        throw new Error("Cloudflare Worker is not ready: signing key pair or D1 schema version 3 is unavailable.");
    }

    const keyResponse = await fetch(base + "/public-key", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
    });
    if (!keyResponse.ok) {
        throw new Error("Cloudflare Worker public-key endpoint returned HTTP " + keyResponse.status + ".");
    }
    const keyPayload = await keyResponse.json();
    const normalizePem = value => String(value || "").replace(/\s/g, "");
    if (!keyPayload.publicKeyPem ||
        normalizePem(keyPayload.publicKeyPem) !== normalizePem(config.publicKeyPem)) {
        throw new Error("Pinned Pages public key does not match the public key exposed by the deployed Worker.");
    }
}

(async function main() {
    if (blockers.length === 0) {
        try {
            await verifyDeployedWorker();
        } catch (error) {
            blockers.push(error.message || "Deployed Worker verification failed.");
        }
    }

    if (blockers.length) {
        console.error("PRODUCTION READINESS: BLOCKED");
        for (const blocker of blockers) console.error("- " + blocker);
        console.error("Do not publish until the deployed Worker, D1 schema, and pinned signing key pair are verified.");
        process.exitCode = 1;
    } else {
        console.log("PRODUCTION READINESS: PASS");
    }
})().catch(error => {
    console.error("PRODUCTION READINESS: BLOCKED");
    console.error("- " + (error.message || "Unexpected readiness-check failure."));
    process.exitCode = 1;
});
