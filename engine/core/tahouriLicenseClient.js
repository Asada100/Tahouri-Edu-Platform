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
    function detectDeviceType() {\n        const ua = String(navigator.userAgent || "");\n        return /Android|iPhone|iPod|Mobile|Windows Phone/i.test(ua) ? "phone" : "computer";\n    }\n    async function activate(payload) {\n        const data = { ...(payload || {}), deviceType: detectDeviceType() };\n        return request("/licenses/activate", { method: "POST", body: JSON.stringify(data) });\n    }
    async function health() { return request("/health", { method: "GET" }); }
    async function status(licenseId) {
        const value = String(licenseId || "").trim();
        if (!value) throw new Error("شناسه مجوز وارد نشده است.");
        return request("/licenses/status?licenseId=" + encodeURIComponent(value), { method: "GET" });
    }
    window.TahouriLicenseClient = { activate, health, status };
    console.log("Tahouri License Client v1.2 Ready");
})();
