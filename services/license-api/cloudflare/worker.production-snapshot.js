/**
 * Tahouri License API — Cloudflare Workers + D1.
 *
 * Implemented here: health, admin session/login/logout, code management,
 * license/payment/audit read views, license revocation, and admin search.
 * License activation/verification and signed entitlement extension remain
 * disabled until their signing and lifecycle logic is ported and tested.
 */
const SERVICE_VERSION = "0.2.1-worker-admin-login-fix";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const COOKIE_NAME = "tahouri_admin_session";
const PRODUCT_ID = "tahouri-edu";
const MAX_BODY_BYTES = 64 * 1024;

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
function error(message, status = 400, headers = {}) { return json({ ok: false, message }, status, headers); }
function nowIso() { return new Date().toISOString(); }
function cookieHeader(value, maxAge) {
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}
function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const requestOrigin = new URL(request.url).origin;
  const allowed = [requestOrigin, env.ADMIN_ORIGIN, env.APP_ORIGIN].filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
}
function corsHeaders(request, env) {
  const origin = allowedOrigin(request, env);
  return origin ? { "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true", "vary": "Origin" } : {};
}
function parseCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}
async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i % (x.length || 1)] || 0) ^ (y[i % (y.length || 1)] || 0);
  return diff === 0;
}
function randomHex(bytes = 16) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return [...data].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function bodyJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw Object.assign(new Error("حجم درخواست بیش از حد مجاز است."), { status: 413 });
  try { return text ? JSON.parse(text) : {}; }
  catch { throw Object.assign(new Error("JSON درخواست معتبر نیست."), { status: 400 }); }
}
function bounded(value, max, field) {
  const text = String(value ?? "").trim();
  if (!text || text.length > max) throw Object.assign(new Error(field + " معتبر نیست."), { status: 400 });
  return text;
}
function validIdentifier(value, field) {
  const text = bounded(value, 128, field);
  if (!/^[A-Za-z0-9._:-]+$/.test(text)) throw Object.assign(new Error(field + " دارای نویسه نامعتبر است."), { status: 400 });
  return text;
}
function iranianYear(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran", year: "numeric", month: "numeric"
  }).formatToParts(date);
  const p = Object.fromEntries(parts.filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
  return p.month >= 7 ? p.year : p.year - 1;
}
function preview(code) { return code.slice(0, 7) + "…" + code.slice(-6); }
function makeCode(grade, year) {
  return "THR-" + grade.replace(/[^a-z0-9]/gi, "").toUpperCase() + "-" + year + "-" + randomHex(12).toUpperCase();
}
async function audit(env, eventType, actor, values = {}) {
  await env.DB.prepare(`INSERT INTO audit_log
    (event_type, actor, license_id, code_hash, created_at, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(eventType, actor, values.licenseId || null, values.codeHash || null,
      nowIso(), JSON.stringify(values.metadata || {})).run();
}
async function requireAdmin(request, env) {
  const id = parseCookie(request, COOKIE_NAME);
  if (!id) return false;
  const hash = await sha256(id);
  const row = await env.DB.prepare(
    "SELECT expires_at FROM admin_sessions WHERE session_hash = ?"
  ).bind(hash).first();
  if (!row || Number(row.expires_at) <= Date.now()) {
    if (row) await env.DB.prepare("DELETE FROM admin_sessions WHERE session_hash = ?").bind(hash).run();
    return false;
  }
  return true;
}
async function login(request, env, headers) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16) {
    return json({ ok: false, message: "رمز مدیریت در تنظیمات امن Worker تعریف نشده است." }, 503, headers);
  }
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigin(request, env)) return json({ ok: false, message: "مبدأ درخواست مجاز نیست." }, 403, headers);
  const ipHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  const prior = await env.DB.prepare("SELECT attempts, window_started_at, locked_until FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).first();
  if (Number(prior?.locked_until || 0) > Date.now()) {
    return json({ ok: false, message: "ورود موقتاً قفل شده است. بعداً دوباره تلاش کنید." }, 429, headers);
  }
  const body = await bodyJson(request);
  const suppliedHash = await sha256(String(body.password || ""));
  const expectedHash = await sha256(env.ADMIN_PASSWORD);
  if (!constantTimeEqual(suppliedHash, expectedHash)) {
    await env.DB.prepare(`INSERT INTO admin_login_attempts (ip_hash, attempts, window_started_at, locked_until)
      VALUES (?, 1, ?, 0)
      ON CONFLICT(ip_hash) DO UPDATE SET
        attempts = CASE WHEN excluded.window_started_at - admin_login_attempts.window_started_at >= 60000
          THEN 1 ELSE admin_login_attempts.attempts + 1 END,
        window_started_at = CASE WHEN excluded.window_started_at - admin_login_attempts.window_started_at >= 60000
          THEN excluded.window_started_at ELSE admin_login_attempts.window_started_at END,
        locked_until = CASE WHEN admin_login_attempts.attempts + 1 >= 5
          AND excluded.window_started_at - admin_login_attempts.window_started_at < 60000
          THEN excluded.window_started_at + 900000 ELSE admin_login_attempts.locked_until END`)
      .bind(ipHash, Date.now()).run();
    const state = await env.DB.prepare("SELECT attempts, locked_until FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).first();
    await audit(env, "admin.login.failed", "security", { metadata: { ipHash: ipHash.slice(0, 16), attempts: state?.attempts || 1 } });
    return json({ ok: false, message: Number(state?.locked_until || 0) > Date.now()
      ? "ورود موقتاً قفل شده است. بعداً دوباره تلاش کنید." : "رمز مدیریت نادرست است." },
      Number(state?.locked_until || 0) > Date.now() ? 429 : 401, headers);
  }
  const id = randomHex(32);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await env.DB.prepare("INSERT INTO admin_sessions (session_hash, expires_at, created_at) VALUES (?, ?, ?)")
    .bind(await sha256(id), expiresAt, nowIso()).run();
  const successIpHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE ip_hash = ?").bind(successIpHash).run();
  await audit(env, "admin.login.success", "admin");
  return json({ ok: true }, 200, { ...headers, "set-cookie": cookieHeader(id, SESSION_TTL_MS / 1000) });
}
async function listRows(env, sql, ...values) {
  const result = await env.DB.prepare(sql).bind(...values).all();
  return result.results || [];
}
async function adminRoute(request, env, url, headers) {
  const path = url.pathname;
  if (path === "/api/admin/login" && request.method === "POST") return login(request, env, headers);
  if (path === "/api/admin/logout" && request.method === "POST") {
    const id = parseCookie(request, COOKIE_NAME);
    if (id) await env.DB.prepare("DELETE FROM admin_sessions WHERE session_hash = ?").bind(await sha256(id)).run();
    return json({ ok: true }, 200, { ...headers, "set-cookie": cookieHeader("", 0) });
  }
  if (path === "/api/admin/session" && request.method === "GET") {
    return await requireAdmin(request, env) ? json({ ok: true }, 200, headers) : json({ ok: false }, 401, headers);
  }
  if (!await requireAdmin(request, env)) return json({ ok: false, message: "نشست مدیر معتبر نیست." }, 401, headers);

  if (path === "/api/metrics" && request.method === "GET") {
    return json({ ok: true, metrics: { requests: 0, activations: 0, activationFailures: 0,
      licenseRevocations: 0, responses5xx: 0, note: "آمار لحظه‌ای درخواست‌ها در این نسخه نگهداری نمی‌شود." } }, 200, headers);
  }
  if (path === "/api/metrics/alerts" && request.method === "GET") return json({ ok: true, alerts: [] }, 200, headers);
  if (path === "/api/admin/codes" && request.method === "GET") {
    const codes = await listRows(env, `SELECT code_preview AS codePreview, product_id AS productId,
      grade_id AS gradeId, academic_year AS academicYear, renewal_mode AS renewalMode, status,
      created_at AS createdAt, used_at AS usedAt, license_id AS licenseId
      FROM activation_codes ORDER BY created_at DESC LIMIT 500`);
    return json({ ok: true, codes }, 200, headers);
  }
  if (path === "/api/admin/codes" && request.method === "POST") {
    const body = await bodyJson(request);
    const gradeId = validIdentifier(body.gradeId, "gradeId");
    const academicYear = String(body.academicYear || iranianYear()).trim();
    const renewalMode = String(body.renewalMode || "promotion").toLowerCase();
    const currentYear = iranianYear();
    if (!/^[0-9]{4}$/.test(academicYear) || Number(academicYear) < currentYear || Number(academicYear) > currentYear + 1)
      return error("سال تحصیلی باید سال جاری یا سال تحصیلی بعد باشد.", 400, headers);
    if (!["promotion", "repeat"].includes(renewalMode)) return error("نوع رزرو معتبر نیست.", 400, headers);
    if (Number(academicYear) === currentYear && renewalMode === "repeat")
      return error("کد تکرار پایه فقط برای سال تحصیلی بعد قابل ساخت است.", 400, headers);
    const count = Math.min(Math.max(Number(body.count || 1), 1), 100);
    if (!Number.isInteger(count)) return error("تعداد کد نامعتبر است.", 400, headers);
    const created = [];
    const statements = [];
    for (let i = 0; i < count; i++) {
      const code = makeCode(gradeId, academicYear);
      created.push(code);
      statements.push(env.DB.prepare(`INSERT INTO activation_codes
        (code_hash, code_preview, product_id, grade_id, academic_year, renewal_mode, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`)
        .bind(await sha256(code.toUpperCase()), preview(code), PRODUCT_ID, gradeId, academicYear, renewalMode, nowIso()));
    }
    await env.DB.batch(statements);
    await audit(env, "codes.created", "admin", { metadata: { gradeId, academicYear, renewalMode, count } });
    return json({ ok: true, codes: created }, 201, headers);
  }
  if (path === "/api/admin/codes/revoke" && request.method === "POST") {
    const body = await bodyJson(request);
    const code = bounded(body.code, 256, "code").toUpperCase();
    const result = await env.DB.prepare(`UPDATE activation_codes SET status = 'revoked'
      WHERE code_hash = ? AND status = 'active' AND used_at IS NULL`).bind(await sha256(code)).run();
    if (!result.meta?.changes) return error("کد فعال و قابل لغو پیدا نشد.", 404, headers);
    await audit(env, "code.revoked", "admin", { codeHash: await sha256(code) });
    return json({ ok: true }, 200, headers);
  }
  if (path === "/api/admin/licenses" && request.method === "GET") {
    const licenses = await listRows(env, `SELECT license_id AS licenseId, product_id AS productId,
      student_id AS studentId, grade_id AS gradeId, academic_year AS academicYear,
      valid_from AS validFrom, valid_until AS validUntil, installation_binding AS installationBinding,
      status, created_at AS createdAt, revoked_at AS revokedAt FROM licenses
      ORDER BY created_at DESC LIMIT 500`);
    const now = Date.now();
    for (const item of licenses) {
      if (item.status === "revoked") continue;
      const from = Date.parse(item.validFrom), until = Date.parse(item.validUntil);
      item.status = Number.isFinite(from) && from > now ? "future" :
        Number.isFinite(until) && until <= now ? "expired" : item.status;
    }
    return json({ ok: true, licenses }, 200, headers);
  }
  if (path === "/api/admin/licenses/revoke" && request.method === "POST") {
    const body = await bodyJson(request);
    const licenseId = validIdentifier(body.licenseId, "licenseId");
    const result = await env.DB.prepare(`UPDATE licenses SET status = 'revoked', revoked_at = ?
      WHERE license_id = ? AND status = 'active'`).bind(nowIso(), licenseId).run();
    if (!result.meta?.changes) return error("مجوز فعال پیدا نشد.", 404, headers);
    await audit(env, "license.revoked", "admin", { licenseId });
    return json({ ok: true }, 200, headers);
  }
  if (path === "/api/admin/licenses/extend" && request.method === "POST") {
    return error("تمدید تا زمان انتقال و آزمون امضای امن مجوز غیرفعال است.", 501, headers);
  }
  if (path === "/api/admin/payments" && request.method === "GET") {
    const payments = await listRows(env, `SELECT payment_id AS paymentId, provider, authority, status,
      amount, currency, product_id AS productId, grade_id AS gradeId, academic_year AS academicYear,
      license_id AS licenseId, created_at AS createdAt, verified_at AS verifiedAt
      FROM payments ORDER BY created_at DESC LIMIT 500`);
    return json({ ok: true, payments }, 200, headers);
  }
  if (path === "/api/admin/audit" && request.method === "GET") {
    const rows = await listRows(env, `SELECT id, event_type AS eventType, actor,
      license_id AS licenseId, created_at AS createdAt, metadata_json AS metadata
      FROM audit_log ORDER BY id DESC LIMIT 500`);
    return json({ ok: true, audit: rows.map(row => ({ ...row, metadata: parseMetadata(row.metadata) })) }, 200, headers);
  }
  if (path === "/api/admin/search" && request.method === "GET") {
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) return error("عبارت جستجو الزامی است.", 400, headers);
    const like = "%" + q.replace(/[%_]/g, "") + "%";
    const licenses = await listRows(env, `SELECT license_id AS licenseId, student_id AS studentId,
      grade_id AS gradeId, academic_year AS academicYear, valid_from AS validFrom,
      valid_until AS validUntil, status, created_at AS createdAt FROM licenses
      WHERE license_id = ? OR student_id = ? OR grade_id = ? OR LOWER(license_id) LIKE LOWER(?)
      OR LOWER(student_id) LIKE LOWER(?) OR LOWER(grade_id) LIKE LOWER(?) ORDER BY created_at DESC LIMIT 100`,
      q, q, q, like, like, like);
    const codes = await listRows(env, `SELECT code_preview AS codePreview, grade_id AS gradeId,
      academic_year AS academicYear, status, created_at AS createdAt, used_at AS usedAt,
      license_id AS licenseId FROM activation_codes WHERE code_preview LIKE ? OR grade_id LIKE ?
      ORDER BY created_at DESC LIMIT 100`, like, like);
    return json({ ok: true, licenses, codes }, 200, headers);
  }
  if (path === "/api/health" && request.method === "GET") {
    return health(env, headers, requestId);
  }
  return json({ ok: false, error: "not_implemented", message: "این مسیر هنوز پیاده‌سازی نشده است." }, 501, headers);
}
function parseMetadata(value) {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}
async function health(env, headers, requestId) {
  let database = "unavailable", schemaVersion = null;
  try {
    const result = await env.DB.prepare("SELECT MAX(version) AS version FROM schema_migrations").first();
    schemaVersion = result?.version ?? null;
    database = schemaVersion === null ? "connected_schema_missing" : "connected";
  } catch { database = "unavailable_or_unmigrated"; }
  const ready = database === "connected";
  return json({ ok: ready, status: ready ? "healthy" : "not_ready",
    service: "tahouri-license-api", version: SERVICE_VERSION, runtime: "cloudflare-workers",
    database, schemaVersion, capabilities: { adminApi: true, codeManagement: true,
      licenseActivation: false, licenseVerification: false, paymentVerification: false,
      signedEntitlementExtension: false }, requestId }, ready ? 200 : 503,
    { ...headers, "x-request-id": requestId });
}


const ADMIN_HTML = "<!doctype html>\n<html lang=\"fa\" dir=\"rtl\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>پنل مدیریت طهوری</title>\n<link rel=\"stylesheet\" href=\"/admin.css?v=20261030-1\">\n</head>\n<body>\n<main>\n<header class=\"topbar\">\n  <div><h1>پنل مدیریت طهوری</h1><p>مدیریت فعال‌سازی، مجوزها و عملیات سرویس</p></div>\n  <div class=\"status\"><span id=\"healthDot\"></span><span id=\"health\">در حال اتصال...</span></div>\n</header>\n\n<section class=\"card\" id=\"loginCard\">\n  <h2>ورود مدیر</h2>\n  <p class=\"muted\">دسترسی این صفحه فقط برای مدیر سرویس است.</p>\n  <div class=\"form-row\"><input id=\"adminKey\" type=\"password\" autocomplete=\"current-password\" placeholder=\"رمز مدیریت\"><button onclick=\"login()\">ورود</button></div>\n  <div id=\"loginError\" class=\"error\" hidden></div>\n</section>\n\n<section id=\"panel\" hidden>\n  <div class=\"toolbar\">\n    <button onclick=\"loadAll()\">↻ به‌روزرسانی همه</button>\n    <button class=\"secondary\" onclick=\"logout()\">خروج</button>\n  </div>\n\n  <section class=\"stats\" id=\"stats\"></section>\n  <section class=\"card\" id=\"alertsCard\" hidden><h2>هشدارهای عملیاتی</h2><div id=\"alerts\"></div></section>\n\n  <section class=\"grid\">\n    <div class=\"card\">\n      <h2>ساخت کد فعال‌سازی</h2>\n      <div class=\"form-grid\">\n        <label>پایه<input id=\"grade\" value=\"grade6\"></label>\n        <label>سال تحصیلی<input id=\"year\" value=\"1405\"></label>\n        <label>تعداد<input id=\"count\" type=\"number\" min=\"1\" max=\"100\" value=\"5\"></label>\n        <label>نوع کد<select id=\"renewalMode\"><option value=\"promotion\" selected>پایه سال بعد</option><option value=\"repeat\">تکرار پایه (مردودی)</option></select></label>\n      </div>\n      <button onclick=\"createCodes()\">ساخت کدهای جدید</button>\n      <div id=\"newCodes\" class=\"code-box\" hidden></div>\n    </div>\n\n    <div class=\"card\">\n      <h2>لغو کد فعال‌سازی</h2>\n      <p class=\"muted\">کد کامل را وارد کنید. کدهای استفاده‌شده قابل لغو نیستند.</p>\n      <div class=\"form-row\"><input id=\"revokeCode\" placeholder=\"THR-GRADE6-1405-...\"><button class=\"danger\" onclick=\"revokeCode()\">لغو کد</button></div>\n    </div>\n  </section>\n\n  <section class=\"card\">\n    <div class=\"section-head\"><h2>جست‌وجو</h2><button class=\"secondary\" onclick=\"searchAll()\">جست‌وجو</button></div>\n    <div class=\"form-row\"><input id=\"searchQ\" placeholder=\"شناسه مجوز، پروفایل یا پایه\" onkeydown=\"if(event.key==='Enter')searchAll()\"></div>\n    <div id=\"searchResults\"></div>\n  </section>\n\n  <section class=\"card\"><div class=\"section-head\"><h2>کدهای فعال‌سازی</h2><button class=\"secondary\" onclick=\"loadCodes()\">به‌روزرسانی</button></div><div id=\"codes\"></div></section>\n\n  <section class=\"card\">\n    <div class=\"section-head\"><h2>مجوزها</h2><button class=\"secondary\" onclick=\"loadLicenses()\">به‌روزرسانی</button></div>\n    <div id=\"licenses\"></div>\n    <div class=\"action-box\">\n      <input id=\"licenseIdAction\" placeholder=\"License ID\">\n      <input id=\"extendUntil\" type=\"datetime-local\">\n      <button disabled title=\"تا تکمیل و آزمون امضای امن مجوز غیرفعال است\">تمدید (فعلاً غیرفعال)</button>\n      <button class=\"danger\" onclick=\"revokeLicense()\">لغو مجوز</button>\n    </div>\n  </section>\n\n  <section class=\"card\"><div class=\"section-head\"><h2>پرداخت‌ها</h2><button class=\"secondary\" onclick=\"loadPayments()\">به‌روزرسانی</button></div><div id=\"payments\"></div></section>\n  <section class=\"card\"><div class=\"section-head\"><h2>گزارش عملیات</h2><button class=\"secondary\" onclick=\"loadAudit()\">به‌روزرسانی</button></div><div id=\"audit\"></div></section>\n</section>\n</main>\n<script src=\"/admin.js?v=20261030-1\"></script>\n</body>\n</html>";
const ADMIN_CSS = "*{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#18212b;font-family:Tahoma,Arial,sans-serif}main{max-width:1280px;margin:auto;padding:20px}.topbar{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:18px}.topbar h1{margin:0 0 6px}.topbar p,.muted{color:#68737d}.status{display:flex;align-items:center;gap:8px;white-space:nowrap}#healthDot{width:10px;height:10px;border-radius:50%;background:#9aa3aa}#healthDot.ok{background:#2e9b5b}#healthDot.bad{background:#c74b4b}.card{background:#fff;border:1px solid #dfe4e8;border-radius:14px;padding:18px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.03)}h2{font-size:18px;margin:0 0 14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-row{display:flex;gap:8px;align-items:center}.form-row input{flex:1}.form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.form-grid label{display:flex;flex-direction:column;gap:5px;font-size:13px}input,button{font:inherit;padding:10px 12px;border-radius:9px;border:1px solid #ccd3da}input{background:#fff;width:100%}button{cursor:pointer;background:#18212b;color:#fff}button.secondary{background:#eef1f3;color:#18212b}.danger{background:#a83232}.toolbar,.section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}.action-box{display:grid;grid-template-columns:2fr 1fr auto auto;gap:8px;margin-top:12px}.table-wrap{overflow:auto;border:1px solid #e4e8eb;border-radius:9px}table{width:100%;border-collapse:collapse;min-width:760px}th,td{text-align:right;padding:9px;border-bottom:1px solid #e5e8eb;white-space:nowrap;font-size:13px}th{background:#f7f8f9}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}.stat{background:#fff;border:1px solid #dfe4e8;border-radius:12px;padding:14px}.stat strong,.stat span{display:block}.stat strong{font-size:22px;margin-bottom:5px}.stat span{color:#68737d;font-size:12px}.code-box{white-space:pre-wrap;background:#f6f7f8;padding:12px;border-radius:8px;margin-top:10px;direct --- TRUNCATED --- 32,650 chars