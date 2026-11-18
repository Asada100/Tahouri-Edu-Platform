// =====================================
// Tahouri License Client
// Version 1.2 — admin-managed profile enrollment
// =====================================
(function () {
    "use strict";
    function config() { return window.TahouriServiceConfig || {}; }
    async function request(path, options) {
        const cfg = config();
        if (!cfg.enabled) throw new Error("سرویس مجوز غیرفعال است.");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Number(cfg.requestTimeoutMs) || 8000);
        try {
            const response = await fetch(String(cfg.apiBaseUrl).replace(/\/$/, "") + path, {
                ...(options || {}), signal: controller.signal,
                headers: { "Content-Type": "application/json", ...((options && options.headers) || {}) }
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.message || "خطا در ارتباط با سرویس مجوز.");
            return body;
        } finally { clearTimeout(timeout); }
    }
    function detectDeviceType() {
        const ua = String(navigator.userAgent || "");
        return /Android|iPhone|iPod|Mobile|Windows Phone/i.test(ua) ? "phone" : "computer";
    }
    async function activate(payload) {
        const supplied = payload || {};
        const deviceType = detectDeviceType();
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        if (supplied.installationId && supplied.installationId !== identity.installationId) {
            throw new Error("شناسه نصب با هویت رمزنگاری‌شده این دستگاه مطابقت ندارد.");
        }
        const code = String(supplied.code || "").trim().toUpperCase();
        if (!code) throw new Error("کد فعال‌سازی وارد نشده است.");
        const codeDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
        const codeHash = Array.from(new Uint8Array(codeDigest), b => b.toString(16).padStart(2, "0")).join("");
        const proofPayload = JSON.stringify({
            purpose: "tahouri-device-activation-v1",
            installationId: identity.installationId,
            deviceType,
            studentId: String(supplied.studentId || "").trim(),
            gradeId: String(supplied.gradeId || "").trim(),
            codeHash
        });
        const signed = await window.TahouriDeviceIdentity.sign(proofPayload);
        if (signed.installationId !== identity.installationId) {
            throw new Error("هویت امضاکننده با دستگاه فعال‌ساز مطابقت ندارد.");
        }
        const data = {
            ...supplied,
            code,
            installationId: identity.installationId,
            deviceType,
            devicePublicKeyPem: identity.publicKey,
            deviceSignature: signed.signature
        };
        return request("/licenses/activate", { method: "POST", body: JSON.stringify(data) });
    }
    async function health() { return request("/health", { method: "GET" }); }
    async function status(licenseId) {
        const value = String(licenseId || "").trim();
        if (!value) throw new Error("شناسه مجوز وارد نشده است.");
        return request("/licenses/status?licenseId=" + encodeURIComponent(value), { method: "GET" });
    }
    window.TahouriLicenseClient = { activate, health, status };
    console.log("Tahouri License Client v1.2 Ready");
})();
