"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const base = "https://tahouri-license-api-student-import-test.asadtahouri1986.workers.dev/api";
const origin = "https://asada100.github.io";
const studentId = "e2e-pr109-343162900061";
const code = "THR-GRADE6-1405-F6DD0733C19F";
const installationId = "e2e-installation-pr109-01";

async function request(path, options = {}) {
    const response = await fetch(base + path, {
        ...options,
        headers: {
            origin,
            "content-type": "application/json",
            ...(options.headers || {})
        },
        signal: AbortSignal.timeout(15000)
    });
    const body = await response.json();
    return { status: response.status, body };
}

async function main() {
    const keyResponse = await request("/public-key", { method: "GET" });
    assert.equal(keyResponse.status, 200, "Isolated Worker must serve its public key.");
    assert.match(keyResponse.body.publicKeyPem, /BEGIN PUBLIC KEY/);

    const mismatch = await request("/licenses/activate", {
        method: "POST",
        body: JSON.stringify({
            code,
            gradeId: "grade6",
            studentId: studentId + "-wrong",
            installationId
        })
    });
    assert.equal(mismatch.status, 409, "A code must reject a different student profile.");

    const activation = await request("/licenses/activate", {
        method: "POST",
        body: JSON.stringify({ code, gradeId: "grade6", studentId, installationId })
    });
    assert.equal(activation.status, 200, "The registered test student should activate successfully.");
    assert.equal(activation.body.valid, true);
    assert.equal(activation.body.renewalStored, false);

    const envelope = activation.body.entitlement;
    assert.equal(envelope.claims.studentId, studentId);
    assert.equal(envelope.claims.gradeScope, "grade6");
    assert.equal(envelope.claims.installationBinding, installationId);
    assert.equal(envelope.algorithm, "RSASSA-PKCS1-v1_5-SHA256");

    const publicKey = crypto.createPublicKey(keyResponse.body.publicKeyPem);
    const signatureValid = crypto.verify(
        "RSA-SHA256",
        Buffer.from(JSON.stringify(envelope.claims)),
        publicKey,
        Buffer.from(envelope.signature, "base64")
    );
    assert.equal(signatureValid, true, "The Worker entitlement signature must verify against its public key.");

    const status = await request("/licenses/status?licenseId=" + encodeURIComponent(envelope.claims.licenseId), {
        method: "GET"
    });
    assert.equal(status.status, 200);
    assert.equal(status.body.valid, true);
    assert.equal(status.body.license.studentId, studentId);
    assert.equal(status.body.license.status, "active");

    const replay = await request("/licenses/activate", {
        method: "POST",
        body: JSON.stringify({ code, gradeId: "grade6", studentId, installationId })
    });
    assert.equal(replay.status, 409, "The same one-time code must not activate twice.");

    console.log("Isolated Cloudflare D1-to-Worker activation E2E: PASS");
    console.log("Profile mismatch rejected; valid activation signed and verified; status active; replay rejected.");
}

main().catch(error => {
    console.error("Isolated Cloudflare D1-to-Worker activation E2E: FAIL", error);
    process.exitCode = 1;
});
