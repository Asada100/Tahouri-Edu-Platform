/**
 * Tahouri License API — Cloudflare Workers + D1.
 *
 * Implemented here: health, admin session/login/logout, code management,
 * signed student-bound activation/status, license/payment/audit read views,
 * license revocation, and admin search. Payment verification and signed
 * entitlement extension remain disabled until separately ported and tested.
 */
const SERVICE_VERSION = "0.3.0-worker-signed-activation";
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

// Signed student-bound license activation. The private key is a Worker secret.
let signingKeyPromise = null;
let signingKeyPem = null;
async function loadSigningKey(env) {
  const pem = String(env.LICENSE_PRIVATE_KEY_PEM || "").trim();
  if (!pem || !pem.includes("-----BEGIN PRIVATE KEY-----") || !pem.includes("-----END PRIVATE KEY-----")) {
    throw Object.assign(new Error("کلید امضای مجوز در سرویس تعریف نشده است."), { status: 503 });
  }
  if (signingKeyPromise && signingKeyPem === pem) return signingKeyPromise;
  signingKeyPem = pem;
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(b64);
  const der = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  signingKeyPromise = crypto.subtle.importKey("pkcs8", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  return signingKeyPromise;
}
let publicKeyPromise = null;
let publicKeyPemCache = null;
async function loadPublicKey(env) {
  const pem = String(env.LICENSE_PUBLIC_KEY_PEM || "").trim();
  if (!pem || !pem.includes("-----BEGIN PUBLIC KEY-----") || !pem.includes("-----END PUBLIC KEY-----")) {
    throw Object.assign(new Error("کلید عمومی مجوز در سرویس تعریف نشده است."), { status: 503 });
  }
  if (publicKeyPromise && publicKeyPemCache === pem) return publicKeyPromise;
  publicKeyPemCache = pem;
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");
  const binary = atob(b64);
  const der = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  publicKeyPromise = crypto.subtle.importKey("spki", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return publicKeyPromise;
}
async function verifySigningPair(env) {
  const privateKey = await loadSigningKey(env);
  const publicKey = await loadPublicKey(env);
  const message = new TextEncoder().encode("tahouri-license-signing-key-pair-check-v1");
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, message);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, message);
  if (!valid) throw Object.assign(new Error("کلید خصوصی و عمومی مجوز با هم مطابقت ندارند."), { status: 503 });
  return true;
}

async function signEntitlement(claims, env) {
  const key = await loadSigningKey(env);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key,
    new TextEncoder().encode(JSON.stringify(claims)));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { claims, signature: btoa(binary), algorithm: "RSASSA-PKCS1-v1_5-SHA256" };
}
function iranianDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran", year: "numeric", month: "numeric", day: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
  return { year: values.year, month: values.month, day: values.day };
}
function findPersianDateUtc(year, month, day) {
  const start = Date.UTC(Number(year) + 621, 2, 1);
  const end = Date.UTC(Number(year) + 621, 8, 30);
  const target = Number(year) * 10000 + Number(month) * 100 + Number(day);
  for (let time = start; time <= end; time += 86400000) {
    const date = new Date(time), p = iranianDateParts(date);
    if (p.year * 10000 + p.month * 100 + p.day === target) return date;
  }
  throw new Error("تاریخ سال تحصیلی قابل محاسبه نیست.");
}
function tehranMidnight(year, month, day) {
  return new Date(findPersianDateUtc(year, month, day).getTime() - 12600000);
}
function academicPeriodForYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1300 || year > 1600) throw Object.assign(new Error("سال تحصیلی نامعتبر است."), { status: 400 });
  const from = tehranMidnight(year, 7, 1);
  const next = tehranMidnight(year + 1, 7, 1);
  return { academicYear: String(year), validFrom: from.toISOString(), validUntil: new Date(next.getTime() - 1).toISOString() };
}
function gradeLevel(gradeId) {
  const match = String(gradeId || "").match(/^(?:grade)?(\d+)$/i);
  return match ? Number(match[1]) : null;
}
async function activateLicense(request, env, headers) {
  if (request.headers.get("Origin") && !allowedOrigin(request, env)) return error("مبدأ درخواست مجاز نیست.", 403, headers);
  const body = await bodyJson(request);
  const code = bounded(body.code, 256, "code").toUpperCase();
  const gradeId = validIdentifier(body.gradeId, "gradeId");
  const studentId = validIdentifier(body.studentId, "studentId");
  const installationId = validIdentifier(body.installationId, "installationId");
  const renewalMode = String(body.renewalMode || "promotion").trim().toLowerCase();
  if (!["promotion", "repeat"].includes(renewalMode)) return error("نوع رزرو سال بعد معتبر نیست.", 400, headers);

  const ipHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  const actor = "activation:" + ipHash;
  const since = new Date(Date.now() - 60000).toISOString();
  const attempts = await env.DB.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'activation.attempt' AND actor = ? AND created_at >= ?").bind(actor, since).first();
  if (Number(attempts?.count || 0) >= 10) {
    return error("تعداد تلاش‌های فعال‌سازی بیش از حد مجاز است.", 429, headers);
  }
  await audit(env, "activation.attempt", actor, { metadata: { gradeId } });

  const codeHash = await sha256(code);
  const codeRecord = await env.DB.prepare("SELECT code_hash AS codeHash, student_id AS studentId, grade_id AS gradeId, academic_year AS academicYear, renewal_mode AS renewalMode, status, used_at AS usedAt FROM activation_codes WHERE code_hash = ?").bind(codeHash).first();
  if (!codeRecord) return error("کد فعال‌سازی معتبر نیست.", 400, headers);
  if (!codeRecord.studentId || codeRecord.studentId !== studentId) return error("این کد برای پروفایل انتخاب‌شده صادر نشده است.", 409, headers);
  const studentAccount = await env.DB.prepare("SELECT status FROM student_accounts WHERE student_id = ?").bind(studentId).first();
  if (!studentAccount || studentAccount.status !== "active") return error("حساب این پروفایل فعال نیست یا در فهرست دانش‌آموزان ثبت نشده است.", 409, headers);
  if (codeRecord.gradeId !== gradeId) return error("این کد مربوط به پایه انتخاب‌شده نیست.", 400, headers);

  const requestedYear = Number(codeRecord.academicYear), activeYear = iranianYear();
  if (!Number.isInteger(requestedYear) || requestedYear < activeYear || requestedYear > activeYear + 1) {
    return error("این کد مربوط به سال تحصیلی مجاز فعلی یا سال تحصیلی بعد است.", 400, headers);
  }
  if (codeRecord.status !== "active" || codeRecord.usedAt) return error("این کد قبلاً استفاده شده یا غیرفعال است.", 409, headers);

  const futureRenewal = requestedYear > activeYear;
  if (futureRenewal && codeRecord.renewalMode !== renewalMode) {
    return error(renewalMode === "repeat" ? "این کد برای رزرو پایه تکراری صادر نشده است." : "این کد برای انتقال به پایه بعدی صادر نشده است.", 409, headers);
  }
  if (futureRenewal) {
    const now = nowIso();
    const current = await env.DB.prepare("SELECT license_id AS licenseId, grade_id AS gradeId FROM licenses WHERE product_id = ? AND student_id = ? AND status = 'active' AND valid_from <= ? AND valid_until > ? ORDER BY valid_until DESC LIMIT 1").bind(PRODUCT_ID, studentId, now, now).first();
    if (!current) return error("رزرو سال بعد فقط برای پروفایلی که مجوز فعال فعلی دارد مجاز است.", 409, headers);
    const currentLevel = gradeLevel(current.gradeId), targetLevel = gradeLevel(gradeId);
    if (currentLevel === null || targetLevel === null) return error("پایه فعلی یا پایه مقصد برای رزرو سال بعد قابل تشخیص نیست.", 409, headers);
    if (renewalMode === "promotion" && targetLevel !== currentLevel + 1) return error("رزرو سال بعد باید برای پایه تحصیلی بعدی انجام شود.", 409, headers);
    if (renewalMode === "repeat" && targetLevel !== currentLevel) return error("تکرار پایه فقط برای همان پایه فعلی مجاز است.", 409, headers);
    const existing = await env.DB.prepare("SELECT license_id AS licenseId FROM licenses WHERE product_id = ? AND student_id = ? AND grade_id = ? AND academic_year = ? AND status = 'future' LIMIT 1").bind(PRODUCT_ID, studentId, gradeId, String(requestedYear)).first();
    if (existing) return error("برای این پروفایل و سال تحصیلی، رزرو قبلاً ثبت شده است.", 409, headers);
  }

  const period = academicPeriodForYear(requestedYear);
  const licenseId = "lic_" + crypto.randomUUID();
  const claims = {
    licenseId, productId: PRODUCT_ID, academicYear: String(period.academicYear),
    gradeScope: gradeId, studentId, validFrom: period.validFrom,
    validUntil: period.validUntil, installationBinding: installationId, entitlementVersion: 1
  };
  const entitlement = await signEntitlement(claims, env);
  const now = nowIso();
  const results = await env.DB.batch([
    env.DB.prepare("UPDATE activation_codes SET status = 'used', used_at = ?, license_id = ? WHERE code_hash = ? AND status = 'active' AND used_at IS NULL").bind(now, licenseId, codeHash),
    env.DB.prepare("INSERT INTO licenses (license_id, code_hash, product_id, student_id, grade_id, academic_year, valid_from, valid_until, installation_binding, status, entitlement_json, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM activation_codes WHERE code_hash = ? AND status = 'used' AND license_id = ?)").bind(licenseId, codeHash, PRODUCT_ID, studentId, gradeId, period.academicYear, period.validFrom, period.validUntil, installationId, futureRenewal ? "future" : "active", JSON.stringify(entitlement), now, codeHash, licenseId),
    env.DB.prepare("INSERT INTO audit_log (event_type, actor, license_id, code_hash, created_at, metadata_json) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM licenses WHERE license_id = ?)").bind(futureRenewal ? "license.renewal_reserved" : "license.activated", "client", licenseId, codeHash, now, JSON.stringify({ gradeId, studentId, academicYear: period.academicYear, validFrom: period.validFrom }), licenseId)
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1) return error("این کد قبلاً استفاده شده یا غیرفعال است.", 409, headers);
  return json({ valid: true, renewalStored: futureRenewal, entitlement }, 200, headers);
}
async function licenseStatus(request, env, url, headers) {
  const licenseId = String(url.searchParams.get("licenseId") || "").trim();
  if (!licenseId) return json({ ok: false, valid: false, message: "licenseId الزامی است." }, 400, headers);
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(licenseId)) return json({ ok: false, valid: false, message: "licenseId نامعتبر است." }, 400, headers);
  const row = await env.DB.prepare("SELECT license_id AS licenseId, student_id AS studentId, grade_id AS gradeId, academic_year AS academicYear, valid_from AS validFrom, valid_until AS validUntil, status FROM licenses WHERE license_id = ?").bind(licenseId).first();
  if (!row) return json({ ok: true, valid: false, reason: "not_found" }, 200, headers);
  if (row.status === "revoked") return json({ ok: true, valid: false, reason: "revoked" }, 200, headers);
  const from = Date.parse(row.validFrom), until = Date.parse(row.validUntil);
  if (!Number.isFinite(from) || !Number.isFinite(until)) return json({ ok: true, valid: false, reason: "invalid_dates" }, 200, headers);
  if (from > Date.now()) return json({ ok: true, valid: false, reason: "future" }, 200, headers);
  if (until <= Date.now()) return json({ ok: true, valid: false, reason: "expired" }, 200, headers);
  if (row.status === "future") await env.DB.prepare("UPDATE licenses SET status = 'active' WHERE license_id = ? AND status = 'future'").bind(licenseId).run();
  else if (row.status !== "active") return json({ ok: true, valid: false, reason: row.status }, 200, headers);
  return json({ ok: true, valid: true, license: { licenseId: row.licenseId, studentId: row.studentId, gradeId: row.gradeId, academicYear: row.academicYear, validFrom: row.validFrom, validUntil: row.validUntil, status: row.status === "future" ? "active" : row.status } }, 200, headers);
}

function normalizeStudentProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.length < 1 || profiles.length > 100) {
    throw Object.assign(new Error("فهرست پروفایل‌ها باید بین ۱ تا ۱۰۰ مورد داشته باشد."), { status: 400 });
  }
  const normalized = new Map();
  for (const item of profiles) {
    const studentId = validIdentifier(item?.studentId, "studentId");
    const fullName = bounded(item?.fullName ?? item?.name, 160, "نام دانش‌آموز");
    const gradeId = validIdentifier(item?.gradeId ?? item?.grade, "gradeId");
    if (!/^grade[1-6]$/.test(gradeId)) throw Object.assign(new Error("پایهٔ دانش‌آموز معتبر نیست."), { status: 400 });
    const prior = normalized.get(studentId);
    if (prior && (prior.fullName !== fullName || prior.gradeId !== gradeId)) {
      throw Object.assign(new Error("یک شناسه در فایل با اطلاعات متفاوت تکرار شده است."), { status: 400 });
    }
    normalized.set(studentId, { studentId, fullName, gradeId });
  }
  return [...normalized.values()];
}

async function importStudentProfiles(env, profiles) {
  const normalized = normalizeStudentProfiles(profiles);
  const imported = [];
  let alreadyRegistered = 0;
  for (const profile of normalized) {
    const existing = await env.DB.prepare("SELECT full_name AS fullName, grade_id AS gradeId, status FROM student_accounts WHERE student_id = ?").bind(profile.studentId).first();
    if (!existing) { imported.push(profile); continue; }
    if (existing.fullName !== profile.fullName || existing.gradeId !== profile.gradeId || existing.status !== "active") {
      throw Object.assign(new Error("این شناسه قبلاً با اطلاعات متفاوت ثبت شده یا بایگانی شده است: " + profile.studentId), { status: 409 });
    }
    alreadyRegistered++;
  }
  if (imported.length) {
    const createdAt = nowIso();
    const statements = [];
    for (const profile of imported) {
      statements.push(env.DB.prepare("INSERT INTO student_accounts (student_id, full_name, grade_id, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)").bind(profile.studentId, profile.fullName, profile.gradeId, createdAt, createdAt));
      statements.push(env.DB.prepare("INSERT INTO audit_log (event_type, actor, license_id, code_hash, created_at, metadata_json) VALUES ('student.imported', 'admin', NULL, NULL, ?, ?)").bind(createdAt, JSON.stringify({ studentId: profile.studentId, gradeId: profile.gradeId })));
    }
    const results = await env.DB.batch(statements);
    if (results.length !== statements.length || results.some(result => Number(result?.meta?.changes || 0) !== 1)) {
      throw Object.assign(new Error("ورود فهرست پروفایل‌ها کامل نشد."), { status: 500 });
    }
  }
  return { imported: imported.length, alreadyRegistered, total: normalized.length };
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
  if (path === "/api/admin/students" && request.method === "GET") {
    const students = await listRows(env, "SELECT student_id AS studentId, full_name AS fullName, grade_id AS gradeId, status, created_at AS createdAt, updated_at AS updatedAt FROM student_accounts ORDER BY created_at DESC LIMIT 1000");
    return json({ ok: true, students }, 200, headers);
  }
  if (path === "/api/admin/students" && request.method === "POST") {
    const body = await bodyJson(request);
    const result = await importStudentProfiles(env, [body]);
    const profile = normalizeStudentProfiles([body])[0];
    const student = await env.DB.prepare("SELECT student_id AS studentId, full_name AS fullName, grade_id AS gradeId, status, created_at AS createdAt, updated_at AS updatedAt FROM student_accounts WHERE student_id = ?").bind(profile.studentId).first();
    return json({ ok: true, student, alreadyRegistered: result.alreadyRegistered === 1 }, result.imported ? 201 : 200, headers);
  }
  if (path === "/api/admin/students/import" && request.method === "POST") {
    const body = await bodyJson(request);
    const result = await importStudentProfiles(env, body.profiles);
    return json({ ok: true, ...result }, 200, headers);
  }
  if (path === "/api/admin/students/archive" && request.method === "POST") {
    const body = await bodyJson(request);
    const studentId = validIdentifier(body.studentId, "studentId");
    const updatedAt = nowIso();
    const results = await env.DB.batch([
      env.DB.prepare("INSERT INTO audit_log (event_type, actor, license_id, code_hash, created_at, metadata_json) SELECT 'student.archived', 'admin', NULL, NULL, ?, ? WHERE EXISTS (SELECT 1 FROM student_accounts WHERE student_id = ? AND status = 'active')").bind(updatedAt, JSON.stringify({ studentId }), studentId),
      env.DB.prepare("UPDATE student_accounts SET status = 'archived', updated_at = ? WHERE student_id = ? AND status = 'active'").bind(updatedAt, studentId),
      env.DB.prepare("UPDATE activation_codes SET status = 'revoked' WHERE student_id = ? AND status = 'active' AND used_at IS NULL").bind(studentId)
    ]);
    if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes) return error("حساب فعال دانش‌آموز پیدا نشد.", 404, headers);
    return json({ ok: true }, 200, headers);
  }
  if (path === "/api/admin/codes" && request.method === "GET") {
    const codes = await listRows(env, `SELECT code_preview AS codePreview, product_id AS productId, student_id AS studentId,
      grade_id AS gradeId, academic_year AS academicYear, renewal_mode AS renewalMode, status,
      created_at AS createdAt, used_at AS usedAt, license_id AS licenseId
      FROM activation_codes ORDER BY created_at DESC LIMIT 500`);
    return json({ ok: true, codes }, 200, headers);
  }
  if (path === "/api/admin/codes" && request.method === "POST") {
    const body = await bodyJson(request);
    const studentId = validIdentifier(body.studentId, "studentId");
    const gradeId = validIdentifier(body.gradeId, "gradeId");
    const student = await env.DB.prepare("SELECT student_id AS studentId, grade_id AS gradeId, status FROM student_accounts WHERE student_id = ?").bind(studentId).first();
    if (!student || student.status !== "active") return error("ابتدا پروفایل موجود را در پنل مدیریت ثبت کنید.", 409, headers);
    const academicYear = String(body.academicYear || iranianYear()).trim();
    const renewalMode = String(body.renewalMode || "promotion").toLowerCase();
    const currentYear = iranianYear();
    if (!/^[0-9]{4}$/.test(academicYear) || Number(academicYear) < currentYear || Number(academicYear) > currentYear + 1)
      return error("سال تحصیلی باید سال جاری یا سال تحصیلی بعد باشد.", 400, headers);
    if (!["promotion", "repeat"].includes(renewalMode)) return error("نوع رزرو معتبر نیست.", 400, headers);
    if (Number(academicYear) === currentYear && renewalMode === "repeat")
      return error("کد تکرار پایه فقط برای سال تحصیلی بعد قابل ساخت است.", 400, headers);
    const currentLevel = gradeLevel(student.gradeId), targetLevel = gradeLevel(gradeId);
    const allowedGrade = Number(academicYear) === currentYear ? targetLevel === currentLevel :
      renewalMode === "promotion" ? targetLevel === currentLevel + 1 : targetLevel === currentLevel;
    if (!Number.isInteger(currentLevel) || !Number.isInteger(targetLevel) ||
        currentLevel < 1 || currentLevel > 6 || targetLevel < 1 || targetLevel > 7 || !allowedGrade) {
      return error("پایهٔ کد با پایهٔ فعلی پروفایل و نوع تمدید سازگار نیست.", 409, headers);
    }
    const count = Math.min(Math.max(Number(body.count || 1), 1), 100);
    if (!Number.isInteger(count)) return error("تعداد کد نامعتبر است.", 400, headers);
    const created = [];
    const statements = [];
    const createdAt = nowIso();
    for (let i = 0; i < count; i++) {
      const code = makeCode(gradeId, academicYear);
      created.push(code);
      statements.push(env.DB.prepare(`INSERT INTO activation_codes
        (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
        .bind(await sha256(code.toUpperCase()), preview(code), PRODUCT_ID, studentId, gradeId, academicYear, renewalMode, createdAt));
    }
    statements.push(env.DB.prepare(`INSERT INTO audit_log
      (event_type, actor, license_id, code_hash, created_at, metadata_json)
      VALUES ('codes.created', 'admin', NULL, NULL, ?, ?)`)
      .bind(createdAt, JSON.stringify({ studentId, gradeId, academicYear, renewalMode, count })));
    const results = await env.DB.batch(statements);
    if (results.length !== count + 1 || results.some(result => Number(result?.meta?.changes || 0) !== 1)) {
      return error("ثبت کدها و گزارش عملیات کامل نشد.", 500, headers);
    }
    return json({ ok: true, codes: created, studentId }, 201, headers);
  }
  if (path === "/api/admin/codes/revoke" && request.method === "POST") {
    const body = await bodyJson(request);
    const code = bounded(body.code, 256, "code").toUpperCase();
    const codeHash = await sha256(code);
    const revokedAt = nowIso();
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO audit_log
        (event_type, actor, license_id, code_hash, created_at, metadata_json)
        SELECT 'code.revoked', 'admin', NULL, ?, ?, '{}'
        WHERE EXISTS (SELECT 1 FROM activation_codes
          WHERE code_hash = ? AND status = 'active' AND used_at IS NULL)`)
        .bind(codeHash, revokedAt, codeHash),
      env.DB.prepare(`UPDATE activation_codes SET status = 'revoked'
        WHERE code_hash = ? AND status = 'active' AND used_at IS NULL`).bind(codeHash)
    ]);
    if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes) {
      return error("کد فعال و قابل لغو پیدا نشد.", 404, headers);
    }
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
    schemaVersion = Number(result?.version || 0);
    const requiredTables = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('activation_codes','licenses','audit_log','payments','admin_sessions','admin_login_attempts','schema_migrations','student_accounts')"
    ).first();
    const requiredIndexes = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'index' AND name IN ('idx_audit_actor_event_created','idx_licenses_code_hash_unique','idx_activation_grade_year_status','idx_student_accounts_grade_status','idx_activation_student_status')"
    ).first();
    database = schemaVersion >= 4 && Number(requiredTables?.count || 0) === 8 &&
      Number(requiredIndexes?.count || 0) === 5
      ? "connected" : "schema_incomplete";
  } catch { database = "unavailable_or_unmigrated"; }
  let signingReady = false;
  try {
    await verifySigningPair(env);
    signingReady = true;
  } catch {
    signingReady = false;
  }
  const ready = database === "connected" && signingReady;
  return json({ ok: ready, status: ready ? "healthy" : "not_ready",
    service: "tahouri-license-api", version: SERVICE_VERSION, runtime: "cloudflare-workers",
    database, schemaVersion, capabilities: { adminApi: true, codeManagement: true,
      licenseActivation: signingReady, licenseVerification: signingReady, paymentVerification: false,
      signedEntitlementExtension: false }, requestId }, ready ? 200 : 503,
    { ...headers, "x-request-id": requestId });
}


const ADMIN_HTML = "<!doctype html>\n<html lang=\"fa\" dir=\"rtl\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>پنل مدیریت طهوری</title>\n<link rel=\"stylesheet\" href=\"/admin.css?v=20261030-1\">\n</head>\n<body>\n<main>\n<header class=\"topbar\">\n  <div><h1>پنل مدیریت طهوری</h1><p>مدیریت فعال‌سازی، مجوزها و عملیات سرویس</p></div>\n  <div class=\"status\"><span id=\"healthDot\"></span><span id=\"health\">در حال اتصال...</span></div>\n</header>\n\n<section class=\"card\" id=\"loginCard\">\n  <h2>ورود مدیر</h2>\n  <p class=\"muted\">دسترسی این صفحه فقط برای مدیر سرویس است.</p>\n  <div class=\"form-row\"><input id=\"adminKey\" type=\"password\" autocomplete=\"current-password\" placeholder=\"رمز مدیریت\"><button data-action=\"login\">ورود</button></div>\n  <div id=\"loginError\" class=\"error\" hidden></div>\n</section>\n\n<section id=\"panel\" hidden>\n  <div class=\"toolbar\">\n    <button data-action=\"loadAll\">↻ به‌روزرسانی همه</button>\n    <button class=\"secondary\" data-action=\"logout\">خروج</button>\n  </div>\n\n  <section class=\"stats\" id=\"stats\"></section>\n  <section class=\"card\" id=\"alertsCard\" hidden><h2>هشدارهای عملیاتی</h2><div id=\"alerts\"></div></section>\n\n  <section class=\"card\">\n    <h2>اتصال پروفایل‌های موجود بازی</h2>\n    <p class=\"muted\">فقط فایل خروجی پروفایل‌های طهوری را وارد کنید؛ شناسه‌ها حفظ می‌شوند و نمره‌ها و تنظیمات منتقل نمی‌شوند.</p>\n    <label>فایل فهرست پروفایل‌ها (JSON)<input id=\"studentProfilesFile\" type=\"file\" accept=\".json,application/json\"></label>\n    <button class=\"secondary\" data-action=\"importStudentsFile\">وارد کردن فهرست پروفایل‌ها</button>\n    <div id=\"students\"></div>\n  </section>\n\n  <section class=\"grid\">\n    <div class=\"card\">\n      <h2>ساخت کد فعال‌سازی</h2>\n      <div class=\"form-grid\">\n        <label>حساب دانش‌آموز<select id=\"studentId\"><option value=\"\">ابتدا فهرست را وارد کنید</option></select></label>\n        <label>پایه<input id=\"grade\" value=\"grade6\"></label>\n        <label>سال تحصیلی<input id=\"year\" value=\"1405\"></label>\n        <label>تعداد<input id=\"count\" type=\"number\" min=\"1\" max=\"100\" value=\"5\"></label>\n        <label>نوع کد<select id=\"renewalMode\"><option value=\"promotion\" selected>پایه سال بعد</option><option value=\"repeat\">تکرار پایه (مردودی)</option></select></label>\n      </div>\n      <button data-action=\"createCodes\">ساخت کدهای جدید</button>\n      <div id=\"newCodes\" class=\"code-box\" hidden></div>\n    </div>\n\n    <div class=\"card\">\n      <h2>لغو کد فعال‌سازی</h2>\n      <p class=\"muted\">کد کامل را وارد کنید. کدهای استفاده‌شده قابل لغو نیستند.</p>\n      <div class=\"form-row\"><input id=\"revokeCode\" placeholder=\"THR-GRADE6-1405-...\"><button class=\"danger\" data-action=\"revokeCode\">لغو کد</button></div>\n    </div>\n  </section>\n\n  <section class=\"card\">\n    <div class=\"section-head\"><h2>جست‌وجو</h2><button class=\"secondary\" data-action=\"searchAll\">جست‌وجو</button></div>\n    <div class=\"form-row\"><input id=\"searchQ\" placeholder=\"شناسه مجوز، پروفایل یا پایه\" data-enter-action=\"searchAll\"></div>\n    <div id=\"searchResults\"></div>\n  </section>\n\n  <section class=\"card\"><div class=\"section-head\"><h2>کدهای فعال‌سازی</h2><button class=\"secondary\" data-action=\"loadCodes\">به‌روزرسانی</button></div><div id=\"codes\"></div></section>\n\n  <section class=\"card\">\n    <div class=\"section-head\"><h2>مجوزها</h2><button class=\"secondary\" data-action=\"loadLicenses\">به‌روزرسانی</button></div>\n    <div id=\"licenses\"></div>\n    <div class=\"action-box\">\n      <input id=\"licenseIdAction\" placeholder=\"License ID\">\n      <input id=\"extendUntil\" type=\"datetime-local\">\n      <button disabled title=\"تا تکمیل و آزمون امضای امن مجوز غیرفعال است\">تمدید (فعلاً غیرفعال)</button>\n      <button class=\"danger\" data-action=\"revokeLicense\">لغو مجوز</button>\n    </div>\n  </section>\n\n  <section class=\"card\"><div class=\"section-head\"><h2>پرداخت‌ها</h2><button class=\"secondary\" data-action=\"loadPayments\">به‌روزرسانی</button></div><div id=\"payments\"></div></section>\n  <section class=\"card\"><div class=\"section-head\"><h2>گزارش عملیات</h2><button class=\"secondary\" data-action=\"loadAudit\">به‌روزرسانی</button></div><div id=\"audit\"></div></section>\n</section>\n</main>\n<script src=\"/admin.js?v=20261030-1\"></script>\n</body>\n</html>";
const ADMIN_CSS = "*{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#18212b;font-family:Tahoma,Arial,sans-serif}main{max-width:1280px;margin:auto;padding:20px}.topbar{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:18px}.topbar h1{margin:0 0 6px}.topbar p,.muted{color:#68737d}.status{display:flex;align-items:center;gap:8px;white-space:nowrap}#healthDot{width:10px;height:10px;border-radius:50%;background:#9aa3aa}#healthDot.ok{background:#2e9b5b}#healthDot.bad{background:#c74b4b}.card{background:#fff;border:1px solid #dfe4e8;border-radius:14px;padding:18px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.03)}h2{font-size:18px;margin:0 0 14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-row{display:flex;gap:8px;align-items:center}.form-row input{flex:1}.form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.form-grid label{display:flex;flex-direction:column;gap:5px;font-size:13px}input,button{font:inherit;padding:10px 12px;border-radius:9px;border:1px solid #ccd3da}input{background:#fff;width:100%}button{cursor:pointer;background:#18212b;color:#fff}button.secondary{background:#eef1f3;color:#18212b}.danger{background:#a83232}.toolbar,.section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}.action-box{display:grid;grid-template-columns:2fr 1fr auto auto;gap:8px;margin-top:12px}.table-wrap{overflow:auto;border:1px solid #e4e8eb;border-radius:9px}table{width:100%;border-collapse:collapse;min-width:760px}th,td{text-align:right;padding:9px;border-bottom:1px solid #e5e8eb;white-space:nowrap;font-size:13px}th{background:#f7f8f9}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}.stat{background:#fff;border:1px solid #dfe4e8;border-radius:12px;padding:14px}.stat strong,.stat span{display:block}.stat strong{font-size:22px;margin-bottom:5px}.stat span{color:#68737d;font-size:12px}.code-box{white-space:pre-wrap;background:#f6f7f8;padding:12px;border-radius:8px;margin-top:10px;direction:ltr;text-align:left;font-family:monospace}.alert{padding:12px;border-radius:9px;margin:7px 0;background:#fff1d6}.alert.critical{background:#ffe0e0}.alert.warning{background:#fff1d6}.alert span{margin-right:10px}.error{color:#a83232;margin-top:10px}@media(max-width:800px){main{padding:12px}.topbar{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.action-box{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.form-row{flex-direction:column;align-items:stretch}.form-row button{width:100%}}";
const ADMIN_JS = "const API=window.location.origin;\nlet loggedIn=false;\nasync function api(p,o={}){const r=await fetch(API+p,{...o,credentials:\"include\",headers:{\"Content-Type\":\"application/json\",...(o.headers||{})}});const d=await r.json().catch(()=>({message:\"پاسخ نامعتبر\"}));if(r.status===401&&p.indexOf('/login')<0){showLogin();throw Error(\"نشست مدیر معتبر نیست.\");}if(!r.ok)throw Error(d.message||\"خطا\");return d}\nfunction e(v){return String(v??\"\").replace(/[&<>\"']/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#39;\"}[c]))}\nfunction showLogin(){loggedIn=false;document.getElementById(\"loginCard\").hidden=false;document.getElementById(\"panel\").hidden=true}\nfunction showPanel(){loggedIn=true;document.getElementById(\"loginCard\").hidden=true;document.getElementById(\"panel\").hidden=false}\nasync function login(){const input=document.getElementById(\"adminKey\"),err=document.getElementById(\"loginError\");err.hidden=true;try{await api(\"/api/admin/login\",{method:\"POST\",body:JSON.stringify({password:input.value})});input.value=\"\";showPanel();await loadAll()}catch(x){err.textContent=x.message;err.hidden=false}}\nasync function logout(){try{await api(\"/api/admin/logout\",{method:\"POST\"})}finally{showLogin()}}\nasync function checkSession(){try{const d=await api(\"/api/admin/session\");if(d.ok){showPanel();await loadAll()}else showLogin()}catch{showLogin()}}\nasync function loadHealth(){try{const d=await fetch(API+\"/api/health\",{cache:\"no-store\"}).then(r=>r.json());document.getElementById(\"health\").textContent=d.ok?\"سرویس سالم\":\"سرویس نیازمند بررسی\";document.getElementById(\"healthDot\").className=d.ok?\"ok\":\"bad\"}catch{document.getElementById(\"health\").textContent=\"عدم اتصال\";document.getElementById(\"healthDot\").className=\"bad\"}}\nasync function loadMetrics(){try{const d=await api(\"/api/metrics\");const m=d.metrics;document.getElementById(\"stats\").innerHTML=[\n[\"درخواست‌ها\",m.requests],[\"فعال‌سازی موفق\",m.activations],[\"خطاهای فعال‌سازی\",m.activationFailures],[\"لغو مجوز\",m.licenseRevocations],[\"خطاهای 5xx\",m.responses5xx]\n].map(x=>\"<div class='stat'><strong>\"+e(x[1])+\"</strong><span>\"+e(x[0])+\"</span></div>\").join(\"\")}catch{}}\nasync function loadAlerts(){try{const d=await api(\"/api/metrics/alerts\"),card=document.getElementById(\"alertsCard\");if(!d.alerts.length){card.hidden=true;return}card.hidden=false;document.getElementById(\"alerts\").innerHTML=d.alerts.map(a=>\"<div class='alert \"+e(a.severity)+\"'><strong>\"+e(a.code)+\"</strong><span>\"+e(a.message)+\"</span></div>\").join(\"\")}catch{}}\nasync function loadStudents(){\n const d=await api(\"/api/admin/students\");\n const active=d.students.filter(x=>x.status===\"active\");\n const select=document.getElementById(\"studentId\");\n const previous=select.value;\n select.innerHTML='<option value=\"\">انتخاب دانش‌آموز ثبت‌شده</option>'+active.map(x=>'<option value=\"'+e(x.studentId)+'\" data-grade=\"'+e(x.gradeId)+'\">'+e(x.fullName)+' — '+e(x.gradeId)+' — '+e(x.studentId)+'</option>').join(\"\");\n if(active.some(x=>x.studentId===previous))select.value=previous;\n select.onchange=()=>{const opt=select.selectedOptions[0];if(opt?.dataset.grade)document.getElementById(\"grade\").value=opt.dataset.grade};\n document.getElementById(\"students\").innerHTML=table([\"نام دانش‌آموز\",\"شناسهٔ حساب\",\"پایه\",\"وضعیت\",\"تاریخ ثبت\"],d.students.map(x=>[x.fullName,x.studentId,x.gradeId,x.status===\"active\"?\"فعال\":\"بایگانی‌شده\",x.createdAt]));\n}\nasync function importStudentsFile(){\n try{\n  const input=document.getElementById(\"studentProfilesFile\");\n  const file=input.files&&input.files[0];\n  if(!file)throw Error(\"ابتدا فایل خروجی پروفایل‌های بازی را انتخاب کنید.\");\n  const data=JSON.parse(await file.text());\n  if(data.format!==\"tahouri-student-profiles\"||data.version!==1||!Array.isArray(data.profiles))throw Error(\"ساختار فایل پروفایل‌های طهوری معتبر نیست.\");\n  const result=await api(\"/api/admin/students/import\",{method:\"POST\",body:JSON.stringify({profiles:data.profiles})});\n  input.value=\"\";\n  await loadStudents();\n  alert(\"ورود فهرست انجام شد. پروفایل جدید: \"+result.imported+\"، قبلاً ثبت‌شده: \"+result.alreadyRegistered+\"، مجموع: \"+result.total);\n }catch(x){alert(x.message)}\n}\nasync function loadCodes(){const d=await api(\"/api/admin/codes\");document.getElementById(\"codes\").innerHTML=table([\"کد\",\"شناسه دانش‌آموز\",\"پایه\",\"سال\",\"نوع رزرو\",\"وضعیت\",\"ساخته‌شده\",\"استفاده‌شده\",\"مجوز\"],d.codes.map(x=>[x.codePreview,x.studentId||\"—\",x.gradeId,x.academicYear,x.renewalMode===\"repeat\"?\"تکرار پایه\":\"پایه سال بعد\",x.status,x.createdAt,x.usedAt||\"—\",x.licenseId||\"—\"]))}\nasync function loadLicenses(){const d=await api(\"/api/admin/licenses\");document.getElementById(\"licenses\").innerHTML=table([\"مجوز\",\"پروفایل\",\"پایه\",\"سال\",\"از\",\"تا\",\"وضعیت\"],d.licenses.map(x=>[x.licenseId,x.studentId,x.gradeId,x.academicYear,x.validFrom,x.validUntil,x.status]))}\nasync function loadPayments(){const d=await api(\"/api/admin/payments\");document.getElementById(\"payments\").innerHTML=table([\"شناسه\",\"درگاه\",\"وضعیت\",\"مبلغ\",\"پایه\",\"سال\",\"مجوز\",\"زمان\"],d.payments.map(x=>[x.paymentId,x.provider,x.status,(x.amount??\"\")+\" \"+(x.currency??\"\"),x.gradeId||\"—\",x.academicYear||\"—\",x.licenseId||\"—\",x.createdAt]))}\nasync function loadAudit(){const d=await api(\"/api/admin/audit\");document.getElementById(\"audit\").innerHTML=table([\"رویداد\",\"عامل\",\"مجوز\",\"زمان\",\"جزئیات\"],d.audit.map(x=>[x.eventType,x.actor,x.licenseId||\"—\",x.createdAt,JSON.stringify(x.metadata||{})]))}\nfunction table(headers,rows){if(!rows.length)return \"<p class='muted'>موردی وجود ندارد.</p>\";return \"<div class='table-wrap'><table><thead><tr>\"+headers.map(h=>\"<th>\"+e(h)+\"</th>\").join(\"\")+\"</tr></thead><tbody>\"+rows.map(r=>\"<tr>\"+r.map(v=>\"<td>\"+e(v)+\"</td>\").join(\"\")+\"</tr>\").join(\"\")+\"</tbody></table></div>\"}\nasync function createCodes(){try{const count=Number(document.getElementById(\"count\").value);if(!Number.isInteger(count)||count<1||count>100)throw Error(\"تعداد باید بین ۱ تا ۱۰۰ باشد.\");const d=await api(\"/api/admin/codes\",{method:\"POST\",body:JSON.stringify({studentId:document.getElementById(\"studentId\").value,gradeId:document.getElementById(\"grade\").value.trim(),academicYear:document.getElementById(\"year\").value.trim(),renewalMode:document.getElementById(\"renewalMode\").value,count})});const box=document.getElementById(\"newCodes\");box.textContent=d.codes.join(\"\\n\");box.hidden=false;await loadCodes();alert(\"کدها ساخته شدند. کد کامل را همین حالا ذخیره کنید.\")}catch(x){alert(x.message)}}\nasync function revokeCode(){try{const code=document.getElementById(\"revokeCode\").value.trim();if(!code)throw Error(\"کد را وارد کنید.\");if(!confirm(\"این کد لغو شود؟\"))return;await api(\"/api/admin/codes/revoke\",{method:\"POST\",body:JSON.stringify({code})});document.getElementById(\"revokeCode\").value=\"\";await loadCodes();alert(\"کد لغو شد.\")}catch(x){alert(x.message)}}\nasync function revokeLicense(){try{const licenseId=document.getElementById(\"licenseIdAction\").value.trim();if(!licenseId)throw Error(\"License ID را وارد کنید.\");if(!confirm(\"این مجوز لغو شود؟\"))return;await api(\"/api/admin/licenses/revoke\",{method:\"POST\",body:JSON.stringify({licenseId})});await loadLicenses();alert(\"مجوز لغو شد.\")}catch(x){alert(x.message)}}\nasync function extendLicense(){try{const licenseId=document.getElementById(\"licenseIdAction\").value.trim(),v=document.getElementById(\"extendUntil\").value;if(!licenseId||!v)throw Error(\"License ID و تاریخ پایان را وارد کنید.\");await api(\"/api/admin/licenses/extend\",{method:\"POST\",body:JSON.stringify({licenseId,validUntil:new Date(v).toISOString()})});await loadLicenses();alert(\"مجوز تمدید شد.\")}catch(x){alert(x.message)}}\nasync function searchAll(){try{const q=document.getElementById(\"searchQ\").value.trim();if(!q)throw Error(\"عبارت جستجو را وارد کنید.\");const d=await api(\"/api/admin/search?q=\"+encodeURIComponent(q));document.getElementById(\"searchResults\").innerHTML=\"<h3>مجوزها</h3>\"+table([\"مجوز\",\"پروفایل\",\"پایه\",\"سال\",\"وضعیت\"],d.licenses.map(v=>[v.licenseId,v.studentId,v.gradeId,v.academicYear,v.status]))+\"<h3>کدها</h3>\"+table([\"کد\",\"پایه\",\"سال\",\"وضعیت\",\"مجوز\"],d.codes.map(v=>[v.codePreview,v.gradeId,v.academicYear,v.status,v.licenseId||\"—\"]))}catch(x){alert(x.message)}}\nasync function loadAll(){await loadHealth();await Promise.all([loadMetrics(),loadAlerts(),loadStudents(),loadCodes(),loadLicenses(),loadPayments(),loadAudit()])}\ndocument.addEventListener(\"click\", event => {\n  const target = event.target.closest(\"[data-action]\");\n  if (!target) return;\n  const action = target.dataset.action;\n  const actions = { login, loadAll, logout, searchAll, loadStudents, importStudentsFile, loadCodes, createCodes, revokeCode, loadLicenses, revokeLicense, loadPayments, loadAudit };\n  if (Object.prototype.hasOwnProperty.call(actions, action)) actions[action]();\n});\ndocument.addEventListener(\"keydown\", event => {\n  if (event.key === \"Enter\" && event.target.dataset.enterAction === \"searchAll\") searchAll();\n});\n\nloadHealth();checkSession();"

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const headers = corsHeaders(request, env);

    try {
      if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
        if (!allowedOrigin(request, env)) return new Response(null, { status: 403 });
        return new Response(null, { status: 204, headers: { ...headers,
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "Content-Type",
          "access-control-max-age": "600" } });
      }
      if (url.pathname === "/api/public-key" && request.method === "GET") {
        const publicKeyPem = String(env.LICENSE_PUBLIC_KEY_PEM || "").trim();
        if (!publicKeyPem) return error("کلید عمومی مجوز تعریف نشده است.", 503, headers);
        return json({ publicKeyPem }, 200, headers);
      }
      if (url.pathname === "/api/health" && request.method === "GET")
        return await health(env, headers, requestId);
      if (url.pathname === "/api/licenses/activate" && request.method === "POST")
        return await activateLicense(request, env, headers);
      if (url.pathname === "/api/licenses/status" && request.method === "GET")
        return await licenseStatus(request, env, url, headers);
      if (url.pathname.startsWith("/api/admin/") || url.pathname === "/api/metrics" || url.pathname === "/api/metrics/alerts")
        return await adminRoute(request, env, url, headers);
      if (url.pathname.startsWith("/api/"))
        return json({ ok: false, error: "not_implemented",
          message: "این مسیر هنوز برای محیط Cloudflare پیاده‌سازی نشده است.", requestId }, 501, headers);
      if (url.pathname === "/admin" || url.pathname === "/admin/") {
        return new Response(ADMIN_HTML, { headers: {
          "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
        } });
      }
      if (url.pathname === "/admin.css") {
        return new Response(ADMIN_CSS, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" } });
      }
      if (url.pathname === "/admin.js") {
        return new Response(ADMIN_JS, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" } });
      }
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response("Tahouri License API Worker", { status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" } });
    } catch (e) {
      const status = Number(e?.status) || 500;
      return json({ ok: false, message: status >= 500 ? "خطای داخلی سرویس." : e.message,
        requestId }, status, { ...headers, "x-request-id": requestId });
    }
  }
};