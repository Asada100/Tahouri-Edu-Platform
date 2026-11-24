// =====================================
// Tahouri Student Data Transfer v1.0
// Versioned, profile-scoped learning backup
// =====================================
(function (window) {
    "use strict";

    const FORMAT = "tahouri-student-learning-data";
    const VERSION = 1;
    const MAX_PROFILES = 100;
    const MAX_BYTES = 20 * 1024 * 1024;

    // Only student-owned learning data is portable. Device identity,
    // signed entitlements, license caches/history, push endpoints,
    // reminder state, active-profile selection and ActivityHistory
    // are intentionally excluded.
    const DATASETS = [
        { id: "progress", key: "Tahouri_Progress:", validate: isObject },
        { id: "statistics", key: "Tahouri_Statistics:", validate: validStatistics },
        { id: "contentLocks", key: "Tahouri_ContentLocks:", validate: isBooleanMap },
        { id: "parityProgression", key: "Tahouri_EvenOddProgression_v2:", validate: validParity },
        { id: "dailyStreak", key: "tahouri_daily_learning_streak:", validate: validStreak },
        { id: "notifications", key: "tahouri_notifications:", validate: validNotifications },
        { id: "spellingPerformance", key: "Tahouri_Spelling_Performance:", validate: validSpelling },
        { id: "questionPerformance", key: "Tahouri_QuestionPerformance:", validate: isObject }
    ];

    const SETTINGS_KEYS = ["theme", "music", "programSound", "notifications", "soundFeedback"];

    function isObject(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
    }

    function isBooleanMap(value) {
        return isObject(value) && Object.keys(value).every(key => typeof value[key] === "boolean");
    }

    function validStatistics(value) {
        return isObject(value) &&
            isObject(value.overall) &&
            isObject(value.subjects) &&
            isObject(value.chapters) &&
            isObject(value.activities);
    }

    function validParity(value) {
        return isObject(value) && Array.isArray(value.unlocked) &&
            value.unlocked.every(id => typeof id === "string");
    }

    function validStreak(value) {
        return isObject(value) && isObject(value.days) &&
            Number.isFinite(Number(value.currentStreak)) &&
            Number.isFinite(Number(value.bestStreak));
    }

    function validNotifications(value) {
        return Array.isArray(value) && value.length <= 50 &&
            value.every(item => isObject(item));
    }

    function validSpelling(value) {
        return isObject(value) &&
            Array.isArray(value.answers) &&
            Array.isArray(value.targetAnswers) &&
            value.answers.length <= 2000 &&
            value.targetAnswers.length <= 2000;
    }

    function normalizeSettings(settings) {
        if (!isObject(settings)) throw new Error("تنظیمات یکی از پروفایل‌ها معتبر نیست.");
        const result = {};
        SETTINGS_KEYS.forEach(key => {
            if (key === "theme") {
                const theme = settings[key] === undefined ? "light" : settings[key];
                if (typeof theme !== "string" || theme.length > 32) {
                    throw new Error("قالب نمایشی یکی از پروفایل‌ها معتبر نیست.");
                }
                result[key] = theme;
            } else {
                const value = settings[key] === undefined ? true : settings[key];
                if (typeof value !== "boolean") {
                    throw new Error("تنظیمات صوتی یا اعلان یکی از پروفایل‌ها معتبر نیست.");
                }
                result[key] = value;
            }
        });
        return result;
    }

    function canonical(value) {
        if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
        if (isObject(value)) {
            return "{" + Object.keys(value).sort().map(key =>
                JSON.stringify(key) + ":" + canonical(value[key])
            ).join(",") + "}";
        }
        return JSON.stringify(value);
    }

    function parseStored(raw, label, validator) {
        let value;
        try { value = JSON.parse(raw); }
        catch (_) { throw new Error("دادهٔ ذخیره‌شدهٔ «" + label + "» خراب است؛ خروجی/ورود متوقف شد."); }
        if (!validator(value)) throw new Error("ساختار دادهٔ «" + label + "» معتبر نیست.");
        return value;
    }

    function isEmptyDataset(id, value) {
        if (id === "notifications") return value.length === 0;
        if (id === "spellingPerformance") return value.answers.length === 0 && value.targetAnswers.length === 0;
        if (id === "progress" || id === "contentLocks" || id === "questionPerformance") {
            return Object.keys(value).length === 0;
        }
        if (id === "parityProgression") {
            return value.unlocked.every(item => item === "evenOdd");
        }
        if (id === "dailyStreak") {
            return Object.keys(value.days).length === 0 &&
                Number(value.currentStreak) === 0 &&
                Number(value.bestStreak) === 0 &&
                !value.lastCompletedDate;
        }
        if (id === "statistics") {
            const overall = value.overall || {};
            const allZero = Object.keys(overall).every(key => Number(overall[key]) === 0);
            return allZero &&
                Object.keys(value.subjects).length === 0 &&
                Object.keys(value.chapters).length === 0 &&
                Object.keys(value.activities).length === 0;
        }
        return false;
    }

    function getProfileManager() {
        if (!window.ProfileManager ||
            typeof window.ProfileManager.getAll !== "function" ||
            typeof window.ProfileManager.importProfiles !== "function") {
            throw new Error("مدیریت پروفایل برای پشتیبان‌گیری آماده نیست.");
        }
        return window.ProfileManager;
    }

    function exportAll() {
        const manager = getProfileManager();
        const profiles = manager.getAll();
        if (!Array.isArray(profiles) || !profiles.length || profiles.length > MAX_PROFILES) {
            throw new Error("تعداد پروفایل‌ها برای تهیهٔ پشتیبان معتبر نیست.");
        }

        const exportedProfiles = profiles.map(profile => {
            const studentId = String(profile.studentId || "").trim();
            const name = String(profile.name || "").trim();
            const grade = String(profile.grade || "").trim();
            if (!studentId || !/^[A-Za-z0-9_-]{1,128}$/.test(studentId)) {
                throw new Error("شناسهٔ یکی از پروفایل‌ها معتبر نیست.");
            }
            if (!name || name.length > 160 || !/^grade[1-6]$/.test(grade)) {
                throw new Error("نام یا پایهٔ یکی از پروفایل‌ها معتبر نیست؛ خروجی ناقص صادر نشد.");
            }
            const data = {};
            DATASETS.forEach(dataset => {
                const raw = localStorage.getItem(dataset.key + studentId);
                if (raw === null) return;
                data[dataset.id] = parseStored(raw, dataset.id, dataset.validate);
            });
            return {
                studentId,
                name: name,
                grade: grade,
                createdAt: profile.createdAt || null,
                settings: normalizeSettings(profile.settings || {}),
                data
            };
        });

        return {
            format: FORMAT,
            version: VERSION,
            exportedAt: new Date().toISOString(),
            profiles: exportedProfiles
        };
    }

    function validateEnvelope(payload) {
        if (!isObject(payload) || payload.format !== FORMAT || payload.version !== VERSION ||
            !Array.isArray(payload.profiles) || !payload.profiles.length ||
            payload.profiles.length > MAX_PROFILES) {
            throw new Error("ساختار یا نسخهٔ فایل پشتیبان طهوری معتبر نیست.");
        }

        const seen = new Set();
        return payload.profiles.map(profile => {
            if (!isObject(profile)) throw new Error("ساختار یکی از پروفایل‌ها معتبر نیست.");
            const studentId = String(profile.studentId || "").trim();
            const name = String(profile.name || "").trim();
            const grade = String(profile.grade || "").trim();
            if (!/^[A-Za-z0-9_-]{1,128}$/.test(studentId) || !name || name.length > 160 ||
                !/^grade[1-6]$/.test(grade)) {
                throw new Error("شناسه، نام یا پایهٔ یکی از پروفایل‌ها معتبر نیست.");
            }
            if (seen.has(studentId)) throw new Error("شناسهٔ تکراری در فایل پشتیبان وجود دارد.");
            seen.add(studentId);
            const settings = normalizeSettings(profile.settings);
            if (!isObject(profile.data)) throw new Error("بخش اطلاعات یادگیری یک پروفایل معتبر نیست.");

            const data = {};
            Object.keys(profile.data).forEach(id => {
                const dataset = DATASETS.find(item => item.id === id);
                if (!dataset) throw new Error("نوع دادهٔ ناشناخته در فایل پشتیبان: " + id);
                if (!dataset.validate(profile.data[id])) {
                    throw new Error("ساختار دادهٔ «" + id + "» در فایل پشتیبان معتبر نیست.");
                }
                data[id] = profile.data[id];
            });
            return { studentId, name, grade, createdAt: profile.createdAt || null, settings, data };
        });
    }

    function importAll(payload, serializedSize) {
        if (Number(serializedSize) > MAX_BYTES) throw new Error("حجم فایل پشتیبان بیش از ۲۰ مگابایت است.");
        const manager = getProfileManager();
        const incoming = validateEnvelope(payload);
        const existingProfiles = manager.getAll();
        const existingById = new Map(existingProfiles.map(profile => [String(profile.studentId), profile]));
        const stagedWrites = [];
        const profileImports = [];

        incoming.forEach(profile => {
            const existing = existingById.get(profile.studentId);
            if (existing) {
                if (String(existing.name || "").trim() !== profile.name ||
                    String(existing.grade || "") !== profile.grade ||
                    canonical(normalizeSettings(existing.settings || {})) !== canonical(profile.settings)) {
                    throw new Error("اطلاعات هویتی یا تنظیمات این پروفایل روی دستگاه با فایل پشتیبان متفاوت است: " + profile.name);
                }
            } else {
                profileImports.push({
                    studentId: profile.studentId,
                    fullName: profile.name,
                    gradeId: profile.grade,
                    settings: profile.settings,
                    createdAt: profile.createdAt
                });
            }

            DATASETS.forEach(dataset => {
                if (!Object.prototype.hasOwnProperty.call(profile.data, dataset.id)) return;
                const targetKey = dataset.key + profile.studentId;
                const incomingValue = profile.data[dataset.id];
                const currentRaw = localStorage.getItem(targetKey);
                if (currentRaw === null) {
                    stagedWrites.push({ key: targetKey, value: JSON.stringify(incomingValue) });
                    return;
                }

                const currentValue = parseStored(currentRaw, dataset.id, dataset.validate);
                if (canonical(currentValue) === canonical(incomingValue)) return;
                if (isEmptyDataset(dataset.id, currentValue) && !isEmptyDataset(dataset.id, incomingValue)) {
                    stagedWrites.push({ key: targetKey, value: JSON.stringify(incomingValue) });
                    return;
                }
                if (isEmptyDataset(dataset.id, incomingValue)) return;
                throw new Error("تعارض در دادهٔ «" + dataset.id + "» برای پروفایل «" + profile.name +
                    "» وجود دارد. برای جلوگیری از بازنویسی، هیچ داده‌ای وارد نشد.");
            });
        });

        const snapshots = new Map();
        stagedWrites.forEach(item => snapshots.set(item.key, localStorage.getItem(item.key)));
        const profilesRaw = localStorage.getItem("Tahouri_Profiles");
        const activeRaw = localStorage.getItem("Tahouri_Active_Profile");
        const oldProfiles = manager.getAll();
        const oldActive = manager.activeProfileId;

        try {
            stagedWrites.forEach(item => localStorage.setItem(item.key, item.value));
            if (profileImports.length) {
                const result = manager.importProfiles(profileImports);
                if (!result || result.imported !== profileImports.length ||
                    !manager.save()) {
                    throw new Error("ذخیرهٔ فهرست پروفایل‌ها تأیید نشد.");
                }
            }
        } catch (error) {
            snapshots.forEach((value, key) => {
                try {
                    if (value === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, value);
                } catch (_) {}
            });
            try {
                if (profilesRaw === null) localStorage.removeItem("Tahouri_Profiles");
                else localStorage.setItem("Tahouri_Profiles", profilesRaw);
                if (activeRaw === null) localStorage.removeItem("Tahouri_Active_Profile");
                else localStorage.setItem("Tahouri_Active_Profile", activeRaw);
            } catch (_) {}
            manager.profiles = oldProfiles;
            manager.activeProfileId = oldActive;
            throw error;
        }

        return {
            profiles: incoming.length,
            newProfiles: profileImports.length,
            dataItemsRestored: stagedWrites.length,
            conflicts: 0
        };
    }

    window.StudentDataTransfer = {
        format: FORMAT,
        version: VERSION,
        datasets: DATASETS.map(item => item.id),
        exportAll,
        importAll,
        maxBytes: MAX_BYTES
    };
})(window);
