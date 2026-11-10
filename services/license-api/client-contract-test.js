"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const clientSource = fs.readFileSync(
    path.join(root, "engine/core/tahouriLicenseClient.js"),
    "utf8"
);

const calls = [];
const context = {
    window: {
        TahouriServiceConfig: {
            enabled: true,
            apiBaseUrl: "https://isolated-test.example.workers.dev/api",
            requestTimeoutMs: 8000
        }
    },
    AbortController,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    console: { log() {}, error() {} },
    fetch: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, valid: true })
        };
    }
};

vm.runInNewContext(clientSource, context, {
    filename: "tahouriLicenseClient.js"
});

async function main() {
    const client = context.window.TahouriLicenseClient;
    assert(client, "License client did not initialize.");

    const activationPayload = {
        code: "TEST-CODE",
        gradeId: "grade6",
        studentId: "student-A",
        installationId: "shared-device",
        renewalMode: "promotion"
    };

    await client.activate(activationPayload);
    assert.equal(
        calls[0].url,
        "https://isolated-test.example.workers.dev/api/activate",
        "Activation route must match the student-bound Worker contract."
    );
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(
        JSON.parse(calls[0].options.body),
        activationPayload,
        "Activation must preserve student and installation identifiers."
    );

    await client.status("license-A", "student-A", "shared-device");
    const statusUrl = new URL(calls[1].url);
    assert.equal(
        statusUrl.pathname,
        "/api/licenses/status",
        "Status route must match the student-bound Worker contract."
    );
    assert.equal(statusUrl.searchParams.get("licenseId"), "license-A");
    assert.equal(statusUrl.searchParams.get("studentId"), "student-A");
    assert.equal(statusUrl.searchParams.get("installationId"), "shared-device");

    await client.health();
    assert.equal(
        calls[2].url,
        "https://isolated-test.example.workers.dev/api/health"
    );

    console.log("Tahouri student-bound client contract test: PASS");
}

main().catch(error => {
    console.error("Tahouri student-bound client contract test: FAIL");
    console.error(error);
    process.exitCode = 1;
});
