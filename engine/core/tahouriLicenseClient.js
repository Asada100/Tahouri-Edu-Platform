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

    async function sha256Hex(value) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
        return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    }
    async function signedPayload(payload) {
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const signed = await window.TahouriDeviceIdentity.sign(JSON.stringify(payload));
        if (signed.installationId !== identity.installationId) throw new Error("هویت امضاکننده با دستگاه مطابقت ندارد.");
        return { identity, signature: signed.signature };
    }
    async function requestPairing(payload) {
        const supplied = payload || {};
        const code = String(supplied.code || "").trim().toUpperCase();
        const studentId = String(supplied.studentId || "").trim();
        const gradeId = String(supplied.gradeId || "").trim();
        if (!code || !studentId || !gradeId) throw new Error("کد مجوز، شناسه دانش‌آموز و پایه الزامی است.");
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const deviceType = detectDeviceType();
        const codeHash = await sha256Hex(code);
        const proof = {
            purpose: "tahouri-device-pairing-request-v1",
            installationId: identity.installationId,
            deviceType, studentId, gradeId, codeHash
        };
        const signed = await signedPayload(proof);
        return request("/licenses/pairing/request", { method: "POST", body: JSON.stringify({
            code, studentId, gradeId, installationId: identity.installationId,
            deviceType, devicePublicKeyPem: identity.publicKey, deviceSignature: signed.signature
        }) });
    }
    async function publicKeyFingerprint(pem) {
        const encoded = String(pem || "").replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\\s/g, "");
        const der = Uint8Array.from(atob(encoded), ch => ch.charCodeAt(0));
        const digest = await crypto.subtle.digest("SHA-256", der);
        return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    }
    async function listPendingPairings(licenseId) {
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const approverDeviceType = detectDeviceType();
        const proof = {
            purpose: "tahouri-device-pairing-list-v1",
            licenseId: String(licenseId || "").trim(),
            approverDeviceType,
            approverInstallationId: identity.installationId,
            approverKeyFingerprint: await publicKeyFingerprint(identity.publicKey)
        };
        if (!proof.licenseId) throw new Error("شناسه مجوز مشخص نیست.");
        const signed = await signedPayload(proof);
        return request("/licenses/pairing/pending", { method: "POST", body: JSON.stringify({
            licenseId: proof.licenseId, approverDeviceType,
            approverInstallationId: identity.installationId, approverSignature: signed.signature
        }) });
    }
    async function requestPairingChallenge(pairingId, licenseId) {
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const approverDeviceType = detectDeviceType();
        const proof = {
            purpose: "tahouri-device-pairing-challenge-request-v1",
            pairingId: String(pairingId || "").trim(),
            licenseId: String(licenseId || "").trim(),
            approverDeviceType, approverInstallationId: identity.installationId,
            approverKeyFingerprint: await publicKeyFingerprint(identity.publicKey)
        };
        if (!proof.pairingId || !proof.licenseId) throw new Error("شناسه درخواست و مجوز الزامی است.");
        const signed = await signedPayload(proof);
        return request("/licenses/pairing/challenge", { method: "POST", body: JSON.stringify({
            pairingId: proof.pairingId, approverDeviceType,
            approverInstallationId: identity.installationId, approverSignature: signed.signature
        }) });
    }
    async function decidePairing(challenge, decision) {
        if (!challenge || !["approved", "rejected"].includes(decision)) throw new Error("اطلاعات تصمیم جفت‌سازی معتبر نیست.");
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const approverDeviceType = detectDeviceType();
        const proof = {
            purpose: "tahouri-device-pairing-decision-v1",
            pairingId: challenge.pairingId, licenseId: challenge.licenseId,
            challengeId: challenge.challengeId, nonce: challenge.nonce, decision,
            requesterDeviceType: challenge.requesterDeviceType,
            requesterInstallationId: challenge.requesterInstallationId,
            requesterKeyFingerprint: challenge.requesterKeyFingerprint,
            approverDeviceType, approverInstallationId: identity.installationId,
            approverKeyFingerprint: challenge.approverKeyFingerprint,
            challengeExpiresAt: challenge.expiresAt
        };
        const signed = await signedPayload(proof);
        return request("/licenses/pairing/" + (decision === "approved" ? "approve" : "reject"), {
            method: "POST", body: JSON.stringify({
                pairingId: challenge.pairingId, challengeId: challenge.challengeId,
                nonce: challenge.nonce, approverDeviceType,
                approverInstallationId: identity.installationId, approverSignature: signed.signature
            })
        });
    }
    async function pairingStatus(pairingId, token) {
        return request("/licenses/pairing/status", {
            method: "POST", body: JSON.stringify({ pairingId: String(pairingId || ""), token: String(token || "") })
        });
    }

    async function cancelPairing(pairingId, token) {
        return request("/licenses/pairing/cancel", {
            method: "POST", body: JSON.stringify({ pairingId: String(pairingId || ""), token: String(token || "") })
        });
    }

    async function health() { return request("/health", { method: "GET" }); }
    async function status(licenseId) {
        const value = String(licenseId || "").trim();
        if (!value) throw new Error("شناسه مجوز وارد نشده است.");
        return request("/licenses/status?licenseId=" + encodeURIComponent(value), { method: "GET" });
    }
    window.TahouriLicenseClient = { activate, health, status, requestPairing, requestPairingChallenge, decidePairing, pairingStatus, cancelPairing, listPendingPairings };
    console.log("Tahouri License Client v1.6 Ready");
})();
