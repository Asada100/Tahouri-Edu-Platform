// =====================================
// Tahouri Student Learning Cloud Sync
// Version 1.0 — profile-scoped, device-authenticated sync
// =====================================
(function (window) {
    "use strict";

    const BASE_KEY = "Tahouri_LearningSync_Base_v1:";
    const DATASET_IDS = [
        "progress", "statistics", "contentLocks", "parityProgression",
        "dailyStreak", "notifications", "spellingPerformance", "questionPerformance"
    ];
    let activeRun = null;
    let scheduledTimer = null;
    let rerunRequested = false;
    let lastStatus = { state: "idle", message: "همگام‌سازی هنوز اجرا نشده است." };

    function canonical(value) {
        if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
        if (value && typeof value === "object") {
            return "{" + Object.keys(value).sort().map(key =>
                JSON.stringify(key) + ":" + canonical(value[key])
            ).join(",") + "}";
        }
        return JSON.stringify(value);
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function same(a, b) {
        return canonical(a) === canonical(b);
    }

    function uniqueUnion(a, b) {
        const result = [];
        const seen = new Set();
        [a, b].forEach(list => (Array.isArray(list) ? list : []).forEach(item => {
            const key = canonical(item);
            if (!seen.has(key)) { seen.add(key); result.push(clone(item)); }
        }));
        return result;
    }

    function mergeTwoWay(base, local, remote, path, datasetId) {
        if (same(local, remote)) return clone(local);
        if (local === undefined) return clone(remote);
        if (remote === undefined) return clone(local);
        if (Array.isArray(local) && Array.isArray(remote)) return uniqueUnion(local, remote);
        if (local && remote && typeof local === "object" && typeof remote === "object" &&
            !Array.isArray(local) && !Array.isArray(remote)) {
            const out = {};
            new Set([...Object.keys(local), ...Object.keys(remote)]).forEach(key => {
                out[key] = mergeTwoWay(undefined, local[key], remote[key], path + "." + key, datasetId);
            });
            return out;
        }
        if (typeof local === "number" && typeof remote === "number") {
            if (datasetId === "statistics" && /(^|\.)(averageScore)$/.test(path)) {
                return Math.max(local, remote);
            }
            return Math.max(local, remote);
        }
        if (typeof local === "boolean" && typeof remote === "boolean") {
            // An unlocked content item (false) is progress and must not be relocked.
            if (datasetId === "contentLocks") return local && remote;
            return local || remote;
        }
        if (datasetId === "dailyStreak" && path.endsWith(".lastCompletedDate")) {
            return String(local) > String(remote) ? local : remote;
        }
        throw new Error("تعارض دادهٔ همگام‌سازی در " + datasetId + " (" + path + "). برای جلوگیری از حذف اطلاعات، هیچ نسخه‌ای جایگزین نشد.");
    }

    function mergeThreeWay(base, local, remote, path, datasetId) {
        if (datasetId === "contentLocks" &&
            typeof local === "boolean" && typeof remote === "boolean") {
            return local && remote;
        }
        if (same(local, remote)) return clone(local);
        if (same(local, base)) return clone(remote);
        if (same(remote, base)) return clone(local);
        if (local === undefined || remote === undefined || base === undefined) {
            return mergeTwoWay(base, local, remote, path, datasetId);
        }
        if (Array.isArray(local) && Array.isArray(remote) && Array.isArray(base)) {
            return uniqueUnion(uniqueUnion(base, local), remote);
        }
        if (local && remote && base &&
            typeof local === "object" && typeof remote === "object" && typeof base === "object" &&
            !Array.isArray(local) && !Array.isArray(remote) && !Array.isArray(base)) {
            const out = {};
            new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]).forEach(key => {
                out[key] = mergeThreeWay(base[key], local[key], remote[key], path + "." + key, datasetId);
            });
            return out;
        }
        if (typeof local === "number" && typeof remote === "number" && typeof base === "number") {
            if (datasetId === "statistics" && /(^|\.)(totalActivities|totalScore|totalCorrect|totalWrong)$/.test(path)) {
                return base + Math.max(0, local - base) + Math.max(0, remote - base);
            }
            return Math.max(local, remote);
        }
        if (typeof local === "boolean" && typeof remote === "boolean" && typeof base === "boolean") {
            if (datasetId === "contentLocks") return local && remote;
            return local || remote;
        }
        if (datasetId === "dailyStreak" && path.endsWith(".lastCompletedDate")) {
            return String(local) > String(remote) ? local : remote;
        }
        throw new Error("تعارض هم‌زمان و غیرقابل‌ادغام در دادهٔ " + datasetId + " (" + path + "). داده‌ها حفظ شدند و چیزی بازنویسی نشد.");
    }

    function normalizeStatistics(value) {
        const result = clone(value);
        const collections = [result.overall, ...Object.values(result.subjects || {}),
            ...Object.values(result.chapters || {}), ...Object.values(result.activities || {})];
        collections.forEach(item => {
            if (!item || typeof item !== "object") return;
            const count = Number(item.totalActivities) || 0;
            const score = Number(item.totalScore) || 0;
            if ("averageScore" in item) item.averageScore = count > 0 ? Math.round(score / count) : 0;
        });
        if (result.activities && Object.keys(result.activities).length) {
            const overall = {
                totalActivities: 0, totalScore: 0, averageScore: 0,
                bestScore: 0, totalCorrect: 0, totalWrong: 0
            };
            Object.values(result.activities).forEach(item => {
                if (!item || typeof item !== "object") return;
                ["totalActivities", "totalScore", "totalCorrect", "totalWrong"].forEach(key => {
                    overall[key] += Number(item[key]) || 0;
                });
                overall.bestScore = Math.max(overall.bestScore, Number(item.bestScore) || 0);
            });
            overall.averageScore = overall.totalActivities > 0
                ? Math.round(overall.totalScore / overall.totalActivities) : 0;
            result.overall = overall;
        }
        return result;
    }

    function mergeDatasets(base, local, remote) {
        const hasBase = !!base;
        const merged = {};
        DATASET_IDS.forEach(id => {
            if (!local || !remote || !Object.prototype.hasOwnProperty.call(local, id) ||
                !Object.prototype.hasOwnProperty.call(remote, id)) {
                throw new Error("بستهٔ همگام‌سازی ناقص است؛ داده‌ها بدون تغییر باقی ماندند.");
            }
            merged[id] = hasBase && Object.prototype.hasOwnProperty.call(base, id)
                ? mergeThreeWay(base[id], local[id], remote[id], id, id)
                : mergeTwoWay(null, local[id], remote[id], id, id);
        });
        merged.statistics = normalizeStatistics(merged.statistics);
        merged.notifications = merged.notifications.slice(-50);
        merged.spellingPerformance.answers = merged.spellingPerformance.answers.slice(-2000);
        merged.spellingPerformance.targetAnswers = merged.spellingPerformance.targetAnswers.slice(-2000);
        if (merged.dailyStreak && merged.dailyStreak.days) {
            merged.dailyStreak.bestStreak = Math.max(
                Number(merged.dailyStreak.bestStreak) || 0,
                Number(merged.dailyStreak.currentStreak) || 0
            );
        }
        return merged;
    }

    function setStatus(state, message, details) {
        lastStatus = { state, message, details: details || null, at: new Date().toISOString() };
        console.log("StudentLearningSync:", lastStatus);
        if (window.EventManager && typeof window.EventManager.emit === "function") {
            window.EventManager.emit("studentLearningSyncStatus", lastStatus);
        }
        return lastStatus;
    }

    function getActiveContext() {
        if (!window.ProfileManager || typeof window.ProfileManager.get !== "function") {
            throw new Error("پروفایل فعال برای همگام‌سازی در دسترس نیست.");
        }
        const profile = window.ProfileManager.get();
        if (!profile || !/^[A-Za-z0-9_-]{1,128}$/.test(String(profile.studentId || "")) ||
            !/^grade[1-6]$/.test(String(profile.grade || ""))) {
            throw new Error("پروفایل فعال برای همگام‌سازی معتبر نیست.");
        }
        if (!window.LicenseManager ||
            typeof window.LicenseManager.hasValidRemoteEntitlement !== "function" ||
            !window.LicenseManager.hasValidRemoteEntitlement(profile.grade)) {
            throw new Error("همگام‌سازی فقط با مجوز آنلاینِ تأییدشده و متصل به همین پروفایل انجام می‌شود.");
        }
        const claims = typeof window.LicenseManager.getVerifiedRemoteEntitlementClaims === "function"
            ? window.LicenseManager.getVerifiedRemoteEntitlementClaims() : null;
        if (!claims || claims.studentId !== profile.studentId ||
            claims.gradeScope !== profile.grade || !claims.licenseId) {
            throw new Error("مجوز تأییدشده با پروفایل فعال مطابقت ندارد.");
        }
        return { profile, studentId: profile.studentId, gradeId: profile.grade, licenseId: claims.licenseId };
    }

    function readBase(studentId) {
        try {
            const raw = localStorage.getItem(BASE_KEY + studentId);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }

    function writeBase(studentId, revision, datasets) {
        localStorage.setItem(BASE_KEY + studentId, JSON.stringify({
            revision, datasets, savedAt: new Date().toISOString()
        }));
    }

    async function call(action, context, revision, datasets) {
        return window.TahouriLicenseClient.syncLearningData({
            action,
            licenseId: context.licenseId,
            studentId: context.studentId,
            expectedRevision: revision,
            ...(action === "push" ? { datasets } : {})
        });
    }

    async function pushMerged(context, base, local, remote) {
        let current = remote;
        for (let attempt = 0; attempt < 2; attempt++) {
            const merged = mergeDatasets(base, local, current.datasets || {});
            if (same(merged, current.datasets || {})) {
                if (!same(local, merged)) {
                    window.StudentDataTransfer.applyProfileData(context.studentId, merged);
                }
                writeBase(context.studentId, Number(current.revision) || 0, merged);
                return { revision: Number(current.revision) || 0, changed: false };
            }
            try {
                const result = await call("push", context, Number(current.revision) || 0, merged);
                window.StudentDataTransfer.applyProfileData(context.studentId, merged);
                writeBase(context.studentId, Number(result.revision), merged);
                return { revision: Number(result.revision), changed: true };
            } catch (error) {
                if (Number(error.status) !== 409 && !/revision_conflict/.test(String(error.message || ""))) throw error;
                const conflict = error.body;
                if (!conflict || !conflict.datasets) throw error;
                current = conflict;
            }
        }
        throw new Error("هم‌زمانی تغییرات دو دستگاه ادامه دارد؛ داده‌ها حفظ شدند. همگام‌سازی دوباره تلاش خواهد کرد.");
    }

    async function runSync() {
        const context = getActiveContext();
        if (!window.StudentDataTransfer ||
            typeof window.StudentDataTransfer.exportProfileData !== "function" ||
            typeof window.StudentDataTransfer.applyProfileData !== "function" ||
            !window.TahouriLicenseClient ||
            typeof window.TahouriLicenseClient.syncLearningData !== "function") {
            throw new Error("اجزای همگام‌سازی هنوز آماده نیستند.");
        }
        const local = window.StudentDataTransfer.exportProfileData(context.studentId);
        const baseRecord = readBase(context.studentId);
        const base = baseRecord && baseRecord.datasets ? baseRecord.datasets : null;
        const remote = await call("pull", context, 0);
        if (!remote || remote.ok !== true) throw new Error("دریافت نسخهٔ سرور تأیید نشد.");

        if (Number(remote.revision) === 0) {
            const firstPush = await call("push", context, 0, local);
            writeBase(context.studentId, Number(firstPush.revision), local);
            return { revision: Number(firstPush.revision), direction: "upload", changed: true };
        }

        const result = await pushMerged(context, base, local, remote);
        return { revision: result.revision, direction: result.changed ? "merge" : "download-or-current", changed: result.changed };
    }

    function syncNow() {
        if (activeRun) { rerunRequested = true; return activeRun; }
        activeRun = runSync().then(result => {
            setStatus("synced", "اطلاعات آموزشی این پروفایل با سرور همگام شد.", result);
            return result;
        }).catch(error => {
            setStatus("pending", error && error.message ? error.message : "همگام‌سازی انجام نشد؛ اطلاعات محلی حفظ شده‌اند.");
            const statusCode = Number(error && error.status);
            const networkFailure = !!error &&
                (error.name === "TypeError" || error.name === "AbortError");
            const retryable = networkFailure ||
                (Number.isFinite(statusCode) &&
                    (statusCode >= 500 || statusCode === 408 || statusCode === 429)) ||
                String(error && error.message || "").includes("هم‌زمانی تغییرات");
            if (retryable && (!window.navigator || window.navigator.onLine !== false)) schedule(30000);
            throw error;
        }).finally(() => {
            activeRun = null;
            if (rerunRequested) {
                rerunRequested = false;
                schedule(1200);
            }
        });
        return activeRun;
    }

    function schedule(delay) {
        if (scheduledTimer) clearTimeout(scheduledTimer);
        scheduledTimer = setTimeout(() => {
            scheduledTimer = null;
            syncNow().catch(() => {
                // Local data remains the retry queue; retry on connectivity and next startup.
            });
        }, Number(delay) >= 0 ? Number(delay) : 2500);
    }

    function initialize() {
        if (window.EventManager && typeof window.EventManager.on === "function") {
            window.EventManager.on("profileChanged", () => schedule(1500));
            window.EventManager.on("activityFinished", () => schedule(2500));
        }
        window.addEventListener("online", () => schedule(1000));
        window.addEventListener("focus", () => schedule(2500));
        window.setInterval(() => {
            if (!window.navigator || window.navigator.onLine !== false) schedule(0);
        }, 60000);
        if (window.ActivationGate && window.ActivationGate.ready &&
            typeof window.ActivationGate.ready.then === "function") {
            window.ActivationGate.ready.then(() => schedule(5000)).catch(() => {});
        } else {
            schedule(7000);
        }
    }

    window.StudentLearningSync = Object.freeze({
        syncNow,
        schedule,
        getStatus: () => ({ ...lastStatus }),
        mergeDatasets
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})(window);
