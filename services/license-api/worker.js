/**
 * Tahouri License API — Cloudflare Workers entry point.
 *
 * This is the deployment foundation only. It intentionally does not expose
 * license issuance, activation, payment, or admin mutation endpoints until
 * their Node.js implementations have been ported and security-tested.
 */
const SERVICE_VERSION = "0.1.0-worker-foundation";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = [env.ADMIN_ORIGIN, env.APP_ORIGIN].filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      const origin = allowedOrigin(request, env);
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "Content-Type",
          "access-control-max-age": "600",
          "vary": "Origin",
        },
      });
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      let database = "unavailable";
      let schemaVersion = null;

      try {
        if (!env.DB) throw new Error("D1 binding DB is missing");
        const result = await env.DB
          .prepare("SELECT MAX(version) AS version FROM schema_migrations")
          .first();
        schemaVersion = result?.version ?? null;
        database = schemaVersion === null ? "connected_schema_missing" : "connected";
      } catch {
        database = "unavailable_or_unmigrated";
      }

      const healthy = database === "connected";
      return json({
        status: healthy ? "healthy" : "not_ready",
        service: "tahouri-license-api",
        version: SERVICE_VERSION,
        runtime: "cloudflare-workers",
        database,
        schemaVersion,
        capabilities: {
          licenseActivation: false,
          adminApi: false,
          paymentVerification: false,
        },
        requestId,
      }, healthy ? 200 : 503, { "x-request-id": requestId });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({
        error: "not_implemented",
        message: "این مسیر هنوز برای محیط Cloudflare پیاده‌سازی و آزموده نشده است.",
        requestId,
      }, 501, { "x-request-id": requestId });
    }

    // Static admin UI may be served through the configured Assets binding.
    if (env.ASSETS) return env.ASSETS.fetch(request);

    return new Response("Tahouri License API Worker foundation", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
