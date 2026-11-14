// =====================================
// Tahouri License Client
// Version 1.1 — automatic profile registration
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
            const response = await fetch(String(cfg.apiBaseUrl).replace(/\\/$/, "") + path, {
                ...(options || {}), signal: controller.signal,
                headers: { "Content-Type": "application/json", ...((options && options.headers) || {}) }
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.message || "خطا در ارتباط با سرویس مجوز.");
            return body;
        } finally { clearTimeout(timeout); }
    }
    async function registerProfile(profile) {
        if (!profile || !profile.studentId || !profile.name || !profile.grade) throw new Error("اطلاعات شناسه، نام و پایهٔ پروفایل کامل نیست.");
        return request("/students/register", { method: "POST", credentials: "omit", body: JSON.stringify({ studentId: profile.studentId, fullName: profile.name, gradeId: profile.grade }) });
    }
    async function registerExistingProfiles() {
        const manager = window.ProfileManager;
        if (!manager || typeof manager.getAll !== "function") return { registered: 0, failed: 0 };
        let registered = 0, failed = 0;
        for (const profile of manager.getAll()) {
            try { await registerProfile(profile); registered++; }
            catch (error) { failed++; console.warn("Profile registration sync failed:", profile.studentId, error.message); }
        }
        console.log("Profile registration sync:", { registered, failed });
        return { registered, failed };
    }
    async function activate(payload) { return request("/licenses/activate", { method: "POST", body: JSON.stringify(payload) }); }
    async function health() { return request("/health", { method: "GET" }); }
    async function status(licenseId) {
        const value = String(licenseId || "").trim();
        if (!value) throw new Error("شناسه مجوز وارد نشده است.");
        return request("/licenses/status?licenseId=" + encodeURIComponent(value), { method: "GET" });
    }
    window.TahouriLicenseClient = { activate, health, status, registerProfile, registerExistingProfiles };
    registerExistingProfiles().catch(error => console.warn("Initial profile registration sync failed:", error));
    console.log("Tahouri License Client v1.1 Ready");
})();
