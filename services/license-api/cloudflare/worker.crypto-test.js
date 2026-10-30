/**
 * Isolated Cloudflare runtime smoke test for entitlement crypto.
 * Test-only: generates an ephemeral RSA keypair per request and performs read-only D1 introspection.
 * Never accepts activation requests and never writes to D1.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/_test/crypto" || request.method !== "GET") {
      return new Response("Not found", { status: 404 });
    }
    try {
      const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
      const keys = await crypto.subtle.generateKey(
        { ...algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
        true,
        ["sign", "verify"]
      );
      const claims = {
        licenseId: "runtime-smoke-test",
        productId: "tahouri-edu",
        academicYear: 1405,
        gradeScope: "grade6",
        studentId: "test-student",
        validFrom: "2026-10-30T00:00:00.000Z",
        validUntil: "2027-10-30T00:00:00.000Z",
        installationBinding: "test-installation",
        entitlementVersion: 1
      };
      const payload = new TextEncoder().encode(JSON.stringify(claims));
      const signature = await crypto.subtle.sign(algorithm, keys.privateKey, payload);
      const valid = await crypto.subtle.verify(algorithm, keys.publicKey, signature, payload);
      const altered = { ...claims, gradeScope: "grade7" };
      const tamperedAccepted = await crypto.subtle.verify(
        algorithm, keys.publicKey, signature,
        new TextEncoder().encode(JSON.stringify(altered))
      );
      const tables = await env.TEST_DB.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
      ).all();
      return Response.json({
        ok: valid && !tamperedAccepted && Array.isArray(tables.results),
        runtime: "cloudflare-workers",
        crypto: { rsaSha256SignVerify: valid, tamperRejected: !tamperedAccepted },
        d1: { readOnly: true, tableCount: tables.results.length, tables: tables.results.map(row => row.name) }
      }, { headers: { "cache-control": "no-store" } });
    } catch {
      return Response.json({ ok: false, error: "runtime_test_failed" }, { status: 500 });
    }
  }
};
