import assert from "node:assert/strict";
import crypto from "node:crypto";

const BASE_URL = "https://tahouri-pr141-legacy-migration-e2e-20261122.asadtahouri1986.workers.dev";
const ORIGIN = "https://asada100.github.io";

// This one-time acceptance test intentionally consumes only the dedicated synthetic
// PR141 fixture. It does not touch production Worker or production D1.
const FIXTURE = {
  licenseId: "synthetic-pr141-license-acceptance-20261123",
  studentId: "synthetic-pr141-student-acceptance-20261123",
  gradeId: "grade6",
  academicYear: "1405",
  deviceType: "phone",
  installationId: "synthetic-pr141-phone-acceptance-20261123"
};

const password = process.env.TAHOURI_TEST_ADMIN_PASSWORD;
assert(password && password.length >= 16,
  "Set TAHOURI_TEST_ADMIN_PASSWORD in the environment before running this test.");

async function request(path, { method = "GET", body, cookie } = {}) {
  const headers = { Origin: ORIGIN };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(BASE_URL + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }
  return { response, data };
}

async function main() {
  const health = await request("/api/health");
  assert.equal(health.response.status, 200, "Worker health endpoint must return HTTP 200.");
  assert.equal(health.data.ok, true, "Worker health response must report ok:true.");

  const publicKeyResponse = await request("/api/public-key");
  assert.equal(publicKeyResponse.response.status, 200, "Public-key endpoint must return HTTP 200.");
  assert(publicKeyResponse.data.publicKeyPem, "Worker must expose its entitlement public key.");

  const login = await request("/api/admin/login", {
    method: "POST", body: { password }
  });
  assert.equal(login.response.status, 200, "Admin login must succeed.");
  const setCookie = login.response.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/tahouri_admin_session=[^;]+/);
  assert(cookieMatch, "Admin login did not return the session cookie.");
  const cookie = cookieMatch[0];

  const attestation = await request("/api/admin/legacy-device-migration/attestation", {
    method: "POST", cookie,
    body: {
      ...FIXTURE,
      verificationReason: "Synthetic PR141 acceptance fixture; no real student data.",
      adminPassword: password
    }
  });
  assert.equal(attestation.response.status, 200,
    "Synthetic identity attestation must succeed: " + JSON.stringify(attestation.data));
  assert(attestation.data.identityAttestation,
    "Worker did not return a synthetic identity attestation.");

  const challenge = await request("/api/admin/legacy-device-migration/challenge", {
    method: "POST", cookie,
    body: {
      ...FIXTURE,
      identityAttestation: attestation.data.identityAttestation,
      verificationReason: "Synthetic PR141 acceptance fixture; no real student data.",
      adminPassword: password
    }
  });
  assert.equal(challenge.response.status, 201,
    "Admin challenge issuance must succeed: " + JSON.stringify(challenge.data));
  const issued = challenge.data;
  for (const key of ["challengeId", "nonce", "transferCode", "expiresAt"]) {
    assert(issued[key], "Challenge response is missing " + key + ".");
  }

  const prepared = await request("/api/licenses/legacy-migration/prepare", {
    method: "POST", body: { transferCode: issued.transferCode }
  });
  assert.equal(prepared.response.status, 200,
    "Transfer-code preparation must succeed: " + JSON.stringify(prepared.data));
  const challengeData = prepared.data;

  const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" });
  const publicKeyDer = pair.publicKey.export({ type: "spki", format: "der" });
  const keyFingerprint = crypto.createHash("sha256").update(publicKeyDer).digest("hex");
  const proof = {
    purpose: "tahouri-legacy-device-migration-v1",
    challengeId: challengeData.challengeId,
    nonce: challengeData.nonce,
    licenseId: challengeData.licenseId,
    studentId: challengeData.studentId,
    gradeId: challengeData.gradeId,
    academicYear: challengeData.academicYear,
    deviceType: challengeData.deviceType,
    installationId: challengeData.installationId,
    keyFingerprint,
    expiresAt: challengeData.expiresAt
  };
  const signature = crypto.sign("RSA-SHA256", Buffer.from(JSON.stringify(proof)), pair.privateKey)
    .toString("base64");
  const claimBody = {
    challengeId: challengeData.challengeId,
    nonce: challengeData.nonce,
    devicePublicKeyPem: publicKeyPem,
    deviceSignature: signature
  };

  const claims = await Promise.all([
    request("/api/licenses/legacy-migration/claim", { method: "POST", body: claimBody }),
    request("/api/licenses/legacy-migration/claim", { method: "POST", body: claimBody })
  ]);
  const statuses = claims.map(item => item.response.status).sort((a, b) => a - b);
  assert.deepEqual(statuses, [200, 409],
    "Concurrent claim/replay must yield exactly one success and one conflict: " + statuses.join(","));
  const success = claims.find(item => item.response.status === 200);
  assert.equal(success.data.ok, true);
  assert.equal(success.data.status, "migrated");
  const entitlement = success.data.entitlement;
  assert(entitlement?.claims, "Successful migration must return signed entitlement claims.");
  assert.equal(entitlement.claims.licenseId, FIXTURE.licenseId);
  assert.equal(entitlement.claims.studentId, FIXTURE.studentId);
  assert.equal(entitlement.claims.deviceType, "phone");
  assert.equal(entitlement.claims.installationBinding, FIXTURE.installationId);
  assert.equal(entitlement.claims.deviceKeyFingerprint, keyFingerprint);
  assert(entitlement.claims.offlineLeaseExpiresAt, "Signed entitlement must include an offline lease.");
  assert(entitlement.signature, "Signed entitlement must include a signature.");

  const replay = await request("/api/licenses/legacy-migration/prepare", {
    method: "POST", body: { transferCode: issued.transferCode }
  });
  assert.equal(replay.response.status, 409, "Consumed transfer code must be rejected on replay.");

  console.log("PASS: dedicated Worker HTTP health and public-key endpoints");
  console.log("PASS: authenticated admin challenge issuance and transfer-code preparation");
  console.log("PASS: RSA proof-of-possession and signed offline entitlement");
  console.log("PASS: exactly one concurrent claim succeeded; replay rejected");
  console.log("RESULT: live HTTP migration flow passed.");
  console.log("NEXT: independently inspect the isolated D1 rows to confirm phone key binding and unchanged computer slot.");
}

main().catch(error => {
  console.error("FAIL:", error?.stack || error);
  process.exitCode = 1;
});
