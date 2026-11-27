// =====================================
// Tahouri License Client
// Version 2.0 — device-bound migration and pairing
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
            if (!response.ok) { const failure = new Error(body.message || "خطا در ارتباط با سرویس مجوز."); failure.status = response.status; failure.code = body.code || null; failure.body = body; throw failure; }
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
    async function recoverApprovedPairingEntitlement() {
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const deviceType = detectDeviceType();
        const keyFingerprint = await publicKeyFingerprint(identity.publicKey);
        const proof = {
            purpose: "tahouri-device-pairing-recovery-v1",
            deviceType, installationId: identity.installationId, keyFingerprint
        };
        const signed = await signedPayload(proof);
        return request("/licenses/pairing/recover", {
            method: "POST",
            body: JSON.stringify({
                deviceType, installationId: identity.installationId,
                keyFingerprint, deviceSignature: signed.signature
            })
        });
    }

    async function claimLegacyMigration(challenge) {
        if (!challenge || !challenge.challengeId || !challenge.nonce || !challenge.expiresAt) {
            throw new Error("اطلاعات چالش مهاجرت معتبر نیست.");
        }
        if (Date.parse(challenge.expiresAt) <= Date.now()) throw new Error("مهلت چالش مهاجرت پایان یافته است.");
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const deviceType = detectDeviceType();
        if (challenge.installationId !== identity.installationId || challenge.deviceType !== deviceType) {
            throw new Error("این چالش برای همین نصب و نوع دستگاه صادر نشده است.");
        }
        const keyFingerprint = await publicKeyFingerprint(identity.publicKey);
        const proof = {
            purpose: "tahouri-legacy-device-migration-v1",
            challengeId: challenge.challengeId,
            nonce: challenge.nonce,
            licenseId: challenge.licenseId,
            studentId: challenge.studentId,
            gradeId: challenge.gradeId,
            academicYear: challenge.academicYear,
            deviceType,
            installationId: identity.installationId,
            keyFingerprint,
            expiresAt: challenge.expiresAt
        };
        const signed = await signedPayload(proof);
        const result = await request("/licenses/legacy-migration/claim", {
            method: "POST",
            body: JSON.stringify({
                challengeId: challenge.challengeId,
                nonce: challenge.nonce,
                devicePublicKeyPem: identity.publicKey,
                deviceSignature: signed.signature
            })
        });
        const verifier = window.TahouriEntitlementVerifier;
        const store = window.TahouriEntitlementStore;
        if (!result || !result.entitlement || !verifier ||
            typeof verifier.verifyEnvelope !== "function" || !store ||
            typeof store.write !== "function") {
            throw new Error("مجوز مهاجرت دریافت شد، اما امکان بررسی یا ذخیره امن آن وجود ندارد.");
        }
        const verification = await verifier.verifyEnvelope(result.entitlement);
        const claims = verification && verification.claims;
        if (!verification || !verification.valid || !claims ||
            claims.licenseId !== challenge.licenseId ||
            claims.studentId !== challenge.studentId ||
            claims.gradeScope !== challenge.gradeId ||
            String(claims.academicYear) !== String(challenge.academicYear) ||
            claims.installationBinding !== identity.installationId ||
            claims.deviceType !== deviceType ||
            claims.deviceKeyFingerprint !== keyFingerprint ||
            !claims.offlineLeaseExpiresAt || !claims.deviceSlotId) {
            throw new Error("مجوز امضاشده با هویت این دستگاه یا چالش مهاجرت مطابقت ندارد.");
        }
        if (!store.write(result.entitlement)) throw new Error("ذخیره مجوز مهاجرت روی این دستگاه انجام نشد.");
        return { ...result, entitlementStored: true };
    }

    async function claimLegacyMigrationCode(transferCode) {
        const code = String(transferCode || "").trim();
        if (!/^[a-f0-9]{64}$/i.test(code)) throw new Error("کد انتقال باید معتبر و کامل باشد.");
        const challenge = await request("/licenses/legacy-migration/prepare", {
            method: "POST",
            body: JSON.stringify({ transferCode: code })
        });
        return claimLegacyMigration(challenge);
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



    async function listBoundDeviceSlots(licenseId) {
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const deviceType = detectDeviceType();
        const keyFingerprint = await publicKeyFingerprint(identity.publicKey);
        const proof = { purpose: "tahouri-device-slots-list-v1", licenseId: String(licenseId || "").trim(),
            deviceType, installationId: identity.installationId, keyFingerprint };
        if (!proof.licenseId) throw new Error("شناسه مجوز مشخص نیست.");
        const signed = await signedPayload(proof);
        return request("/licenses/device-slots", { method: "POST", body: JSON.stringify({
            licenseId: proof.licenseId, deviceType, installationId: identity.installationId,
            keyFingerprint, deviceSignature: signed.signature
        }) });
    }

    async function requestDeviceRevocationChallenge(licenseId, targetDeviceType, targetInstallationId, targetKeyFingerprint) {
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const approverDeviceType = detectDeviceType();
        if (!licenseId || !targetInstallationId || !targetKeyFingerprint ||
            !["phone", "computer"].includes(targetDeviceType) || targetDeviceType === approverDeviceType) {
            throw new Error("اطلاعات دستگاه مقصد برای تعویض معتبر نیست.");
        }
        const approverKeyFingerprint = await publicKeyFingerprint(identity.publicKey);
        const proof = {
            purpose: "tahouri-device-revocation-challenge-v1",
            licenseId: String(licenseId).trim(),
            targetDeviceType,
            targetInstallationId: String(targetInstallationId).trim(),
            targetKeyFingerprint: String(targetKeyFingerprint).trim(),
            approverDeviceType,
            approverInstallationId: identity.installationId,
            approverKeyFingerprint
        };
        const signed = await signedPayload(proof);
        return request("/licenses/device-revocation/challenge", {
            method: "POST",
            body: JSON.stringify({
                licenseId: proof.licenseId, targetDeviceType,
                targetInstallationId: proof.targetInstallationId,
                approverDeviceType, approverInstallationId: identity.installationId,
                approverSignature: signed.signature
            })
        });
    }
    async function executeDeviceRevocation(challenge) {
        if (!challenge || !challenge.challengeId || !challenge.nonce) throw new Error("چالش لغو دستگاه معتبر نیست.");
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const approverDeviceType = detectDeviceType();
        if (challenge.approverInstallationId !== identity.installationId ||
            challenge.approverDeviceType !== approverDeviceType) {
            throw new Error("این چالش برای دستگاه تأییدکنندهٔ فعلی صادر نشده است.");
        }
        const proof = {
            purpose: "tahouri-device-revocation-v1",
            challengeId: challenge.challengeId, nonce: challenge.nonce,
            licenseId: challenge.licenseId,
            targetDeviceType: challenge.targetDeviceType,
            targetInstallationId: challenge.targetInstallationId,
            targetKeyFingerprint: challenge.targetKeyFingerprint,
            approverDeviceType,
            approverInstallationId: identity.installationId,
            approverKeyFingerprint: challenge.approverKeyFingerprint,
            expiresAt: challenge.expiresAt
        };
        const signed = await signedPayload(proof);
        return request("/licenses/device-revocation/execute", {
            method: "POST",
            body: JSON.stringify({ challengeId: challenge.challengeId, nonce: challenge.nonce, approverSignature: signed.signature })
        });
    }

    async function syncLearningData(payload) {
        const supplied = payload || {};
        const action = String(supplied.action || "").trim().toLowerCase();
        const licenseId = String(supplied.licenseId || "").trim();
        const studentId = String(supplied.studentId || "").trim();
        const expectedRevision = Number(supplied.expectedRevision);
        if (!["pull", "push"].includes(action) || !licenseId || !studentId ||
            !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
            throw new Error("مشخصات همگام‌سازی داده‌های آموزشی معتبر نیست.");
        }
        const datasets = action === "push" ? supplied.datasets : null;
        if (action === "push" && (!datasets || typeof datasets !== "object" || Array.isArray(datasets))) {
            throw new Error("بستهٔ داده‌های آموزشی برای ارسال معتبر نیست.");
        }
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const deviceType = detectDeviceType();
        const keyFingerprint = await publicKeyFingerprint(identity.publicKey);
        const payloadHash = action === "push"
            ? await sha256Hex(JSON.stringify(datasets))
            : "";
        const proof = {
            purpose: "tahouri-learning-data-sync-v1",
            action, licenseId, studentId, deviceType,
            installationId: identity.installationId,
            keyFingerprint, expectedRevision, payloadHash
        };
        const signed = await signedPayload(proof);
        return request("/learning-data/sync", {
            method: "POST",
            body: JSON.stringify({
                ...proof,
                ...(action === "push" ? { datasets } : {}),
                deviceSignature: signed.signature
            })
        });
    }
    async function health() { return request("/health", { method: "GET" }); }
    async function status(licenseId) {
        const value = String(licenseId || "").trim();
        if (!value) throw new Error("شناسه مجوز وارد نشده است.");
        const identity = await window.TahouriDeviceIdentity.getOrCreate();
        const deviceType = detectDeviceType();
        const keyFingerprint = await publicKeyFingerprint(identity.publicKey);
        const proof = {
            purpose: "tahouri-device-bound-license-status-v1",
            licenseId: value,
            deviceType,
            installationId: identity.installationId,
            keyFingerprint
        };
        const signed = await signedPayload(proof);
        return request("/licenses/device-status", {
            method: "POST",
            body: JSON.stringify({
                licenseId: value,
                deviceType,
                installationId: identity.installationId,
                keyFingerprint,
                deviceSignature: signed.signature
            })
        });
    }
    window.TahouriLicenseClient = { activate, health, status, syncLearningData, requestPairing, requestPairingChallenge, decidePairing, pairingStatus, recoverApprovedPairingEntitlement, claimLegacyMigration, claimLegacyMigrationCode, cancelPairing, listPendingPairings, listBoundDeviceSlots, requestDeviceRevocationChallenge, executeDeviceRevocation };
    console.log("Tahouri License Client v2.1 Ready");
})();
