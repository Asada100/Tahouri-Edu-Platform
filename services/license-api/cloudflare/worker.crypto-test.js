/**
 * Isolated Cloudflare runtime smoke test for the production crypto module.
 * Uses an ephemeral keypair and read-only D1 introspection; never writes data.
 */
import { signEntitlement, verifyEntitlement } from "./entitlement-crypto.js";

function toPem(label, bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary).match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/_test/crypto" || request.method !== "GET") {
      return new Response("Not found", { status: 404 });
    }
    try {
      const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
      const pair = await crypto.subtle.generateKey(
        { ...algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
        true, ["sign", "verify"]
      );
      const privateDer = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
      const publicDer = await crypto.subtle.exportKey("spki", pair.publicKey);
      const privatePem = toPem("PRIVATE KEY", new Uint8Array(privateDer));
      const publicPem = toPem("PUBLIC KEY", new Uint8Array(publicDer));
      const claims = {
        licenseId: "runtime-smoke-test", productId: "tahouri-edu", academicYear: 1405,
        gradeScope: "grade6", studentId: "test-student",
        validFrom: "2026-10-30T00:00:00.000Z", validUntil: "2027-10-30T00:00:00.000Z",
        installationBinding: "test-installation", entitlementVersion: 1
      };
      const envelope = await signEntitlement(claims, privatePem);
      const valid = await verifyEntitlement(envelope.claims, envelope.signature, publicPem);
      const tamperedAccepted = await verifyEntitlement(
        { ...claims, gradeScope: "grade7" }, envelope.signature, publicPem
      );
      const tables = await env.TEST_DB.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
      ).all();
      const ok = valid && !tamperedAccepted && Array.isArray(tables.results);
      return Response.json({
        ok, runtime: "cloudflare-workers",
        crypto: { module: "entitlement-crypto.js", algorithm: envelope.algorithm,
          signAndVerify: valid, tamperRejected: !tamperedAccepted },
        d1: { readOnly: true, tableCount: tables.results.length,
          tables: tables.results.map(row => row.name) }
      }, { status: ok ? 200 : 500, headers: { "cache-control": "no-store" } });
    } catch {
      return Response.json({ ok: false, error: "runtime_test_failed" }, { status: 500 });
    }
  }
};
