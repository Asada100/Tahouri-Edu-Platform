// =====================================
// Tahouri Edu Platform
// License Manager
// Version 2.1
// =====================================
//
// License Binding:
// studentId + gradeId + academicYear
//
// هر کد فعال‌سازی فقط به یک پروفایل
// در یک پایه و یک سال تحصیلی متصل می‌شود.
// =====================================

(function () {

    "use strict";


    // =====================================
    // Configuration
    // =====================================

    const STORAGE_KEY =
        "Tahouri_Activation_Licenses";


    // =====================================
    // Grades
    // =====================================

    let verifiedRemoteEntitlement = null;
    let entitlementSelectionSequence = 0;
    let remoteStatusSequence = 0;

    const OFFLINE_CLOCK_HIGH_WATER_KEY = "Tahouri_Offline_Clock_High_Water_v1";
    const OFFLINE_CLOCK_ROLLBACK_TOLERANCE_MS = 2 * 60 * 1000;
    let offlineClockAnchorWall = null;
    let offlineClockAnchorMonotonic = null;
    let offlineClockRollbackDetected = false;

    // This is a conservative rollback detector, not a trusted clock.
    // localStorage can be modified and browser monotonic time does not survive
    // a restart; a detected rollback therefore requires online revalidation.
    function getOfflineClockState() {
        const wallNow = Date.now();
        const monotonicNow = window.performance &&
            typeof window.performance.now === "function"
            ? Number(window.performance.now())
            : NaN;

        if (!Number.isFinite(wallNow)) {
            offlineClockRollbackDetected = true;
            return { safe: false, now: wallNow };
        }

        let storedHighWater = 0;
        try {
            const stored = Number(window.localStorage &&
                window.localStorage.getItem(OFFLINE_CLOCK_HIGH_WATER_KEY));
            if (Number.isFinite(stored) && stored > 0) storedHighWater = stored;
        } catch (error) {
            // The in-session monotonic check remains available when storage is blocked.
        }

        if (offlineClockAnchorWall === null) {
            if (storedHighWater > 0 &&
                wallNow + OFFLINE_CLOCK_ROLLBACK_TOLERANCE_MS < storedHighWater) {
                offlineClockRollbackDetected = true;
            }
            offlineClockAnchorWall = wallNow;
            offlineClockAnchorMonotonic = Number.isFinite(monotonicNow)
                ? monotonicNow
                : null;
        }

        if (storedHighWater > 0 &&
            wallNow + OFFLINE_CLOCK_ROLLBACK_TOLERANCE_MS < storedHighWater) {
            offlineClockRollbackDetected = true;
        }

        let monotonicFloor = offlineClockAnchorWall;
        if (offlineClockAnchorMonotonic !== null && Number.isFinite(monotonicNow)) {
            const elapsed = monotonicNow - offlineClockAnchorMonotonic;
            if (elapsed < 0) {
                offlineClockRollbackDetected = true;
            } else {
                monotonicFloor = offlineClockAnchorWall + elapsed;
                if (wallNow + OFFLINE_CLOCK_ROLLBACK_TOLERANCE_MS < monotonicFloor) {
                    offlineClockRollbackDetected = true;
                }
            }
        }

        const highWater = Math.max(storedHighWater, wallNow);
        try {
            if (window.localStorage && typeof window.localStorage.setItem === "function") {
                window.localStorage.setItem(OFFLINE_CLOCK_HIGH_WATER_KEY, String(highWater));
            }
        } catch (error) {
            // Storage is a best-effort signal only; it is not tamper-resistant.
        }

        return {
            safe: !offlineClockRollbackDetected,
            now: Math.max(wallNow, monotonicFloor)
        };
    }


    const GRADES = {

        grade1: "پایه اول",
        grade2: "پایه دوم",
        grade3: "پایه سوم",
        grade4: "پایه چهارم",
        grade5: "پایه پنجم",
        grade6: "پایه ششم"

    };


    // =====================================
    // Demo Codes
    // =====================================
    //
    // فقط برای تست داخلی پروژه.
    //
    // هر کد می‌تواند فقط یک بار به یک
    // studentId متصل شود.
    //
    // در نسخه نهایی عمومی نباید کدهای
    // واقعی داخل فایل JavaScript قرار بگیرند.
    //
    // =====================================

    const DEMO_CODES = {

        "GRADE1-1405-TEST": "grade1",

        "GRADE2-1405-TEST": "grade2",

        "GRADE3-1405-TEST": "grade3",

        "GRADE4-1405-TEST": "grade4",

        "GRADE5-1405-TEST": "grade5",

        // ---------------------------------
        // Grade 6 Test Codes
        // ---------------------------------

        "GRADE6-1405-TEST": "grade6",

        "GRADE6-1405-TEST-A": "grade6",

        "GRADE6-1405-TEST-B": "grade6",

        "GRADE6-1405-TEST-C": "grade6"

    };


    // =====================================
    // Helpers
    // =====================================

    function safeText(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value);

    }


    function normalizeCode(code) {

        return safeText(code)
            .trim()
            .toUpperCase();

    }


    function normalizeStudentId(studentId) {

        return safeText(studentId)
            .trim();

    }


    function toPersianDigits(value) {

        return String(value)
            .replace(
                /\d/g,
                function (digit) {

                    return "۰۱۲۳۴۵۶۷۸۹"[
                        Number(digit)
                    ];

                }
            );

    }


    // =====================================
    // Active Profile
    // =====================================

    async function refreshRemoteLicenseStatus() {
        const selectedEntitlement = verifiedRemoteEntitlement;
        const claims = selectedEntitlement &&
            (selectedEntitlement.claims || selectedEntitlement);
        if (!claims || !claims.licenseId) {
            return { valid: false, reason: "no_remote_entitlement" };
        }

        if (!window.TahouriLicenseClient ||
            typeof window.TahouriLicenseClient.status !== "function") {
            return { valid: false, reason: "status_client_unavailable" };
        }

        const statusSequence = ++remoteStatusSequence;
        const profile = getActiveProfile();
        const studentId = normalizeStudentId(profile && profile.studentId);
        const gradeId = safeText(profile && (profile.grade || profile.gradeId)).trim();

        const isStillCurrent = () => {
            const currentProfile = getActiveProfile();
            return statusSequence === remoteStatusSequence &&
                verifiedRemoteEntitlement === selectedEntitlement &&
                normalizeStudentId(currentProfile && currentProfile.studentId) === studentId &&
                safeText(currentProfile && (currentProfile.grade || currentProfile.gradeId)).trim() === gradeId &&
                normalizeStudentId(claims.studentId) === studentId &&
                claims.gradeScope === gradeId;
        };

        try {
            const result = await window.TahouriLicenseClient.status(claims.licenseId);
            if (!isStillCurrent()) return { valid: false, reason: "stale_status_check" };

            if (!result || !result.valid) {
                verifiedRemoteEntitlement = null;
                return result || { valid: false, reason: "invalid_status_response" };
            }

            if (!result.entitlement || !window.TahouriEntitlementVerifier ||
                typeof window.TahouriEntitlementVerifier.verifyEnvelope !== "function") {
                verifiedRemoteEntitlement = null;
                return { valid: false, reason: "signed_device_lease_missing" };
            }

            const verification = await window.TahouriEntitlementVerifier.verifyEnvelope(result.entitlement);
            if (!isStillCurrent()) return { valid: false, reason: "stale_status_check" };
            if (!verification || !verification.valid || !verification.claims) {
                verifiedRemoteEntitlement = null;
                return { valid: false, reason: "invalid_refreshed_device_lease" };
            }

            const refreshedClaims = verification.claims;
            const sameBinding =
                refreshedClaims.licenseId === claims.licenseId &&
                normalizeStudentId(refreshedClaims.studentId) === studentId &&
                refreshedClaims.gradeScope === gradeId &&
                refreshedClaims.installationBinding === claims.installationBinding &&
                refreshedClaims.deviceType === claims.deviceType &&
                refreshedClaims.deviceKeyFingerprint === claims.deviceKeyFingerprint &&
                typeof refreshedClaims.offlineLeaseExpiresAt === "string" &&
                typeof refreshedClaims.deviceSlotId === "string";

            if (!sameBinding) {
                verifiedRemoteEntitlement = null;
                return { valid: false, reason: "refreshed_device_binding_mismatch" };
            }

            if (!window.TahouriEntitlementStore ||
                typeof window.TahouriEntitlementStore.write !== "function" ||
                !window.TahouriEntitlementStore.write(result.entitlement)) {
                return { valid: false, reason: "refreshed_device_lease_not_saved" };
            }

            verifiedRemoteEntitlement = refreshedClaims;
            return { ...result, claims: refreshedClaims, refreshed: true };
        } catch (error) {
            console.warn("License Manager: Remote status check failed.", error);
            return { valid: false, reason: "network_error", error: error.message };
        }
    }


    function getActiveProfile() {

        try {

            if (
                window.ProfileManager &&
                typeof window.ProfileManager.get ===
                "function"
            ) {

                return (
                    window.ProfileManager.get() ||
                    null
                );

            }

        }
        catch (error) {

            console.error(
                "License Manager: Cannot read active profile.",
                error
            );

        }

        return null;

    }


    function getActiveStudentId() {

        const profile =
            getActiveProfile();

        if (!profile) {

            return "";

        }

        return normalizeStudentId(
            profile.studentId
        );

    }


    // =====================================
    // Persian Calendar
    // =====================================

    function getPersianParts(date) {

        try {

            const formatter =
                new Intl.DateTimeFormat(
                    "en-US-u-ca-persian",
                    {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric"
                    }
                );

            const parts =
                formatter.formatToParts(date);

            const result = {};

            parts.forEach(
                function (part) {

                    if (
                        part.type === "year" ||
                        part.type === "month" ||
                        part.type === "day"
                    ) {

                        result[part.type] =
                            Number(part.value);

                    }

                }
            );

            if (
                !result.year ||
                !result.month ||
                !result.day
            ) {

                return null;

            }

            return result;

        }
        catch (error) {

            console.error(
                "License Manager: Persian date conversion failed.",
                error
            );

            return null;

        }

    }


    // =====================================
    // Academic Year
    // =====================================

    function getAcademicYear() {

        const now =
            new Date();

        const parts =
            getPersianParts(now);

        if (!parts) {

            console.error(
                "License Manager: Cannot calculate Persian academic year."
            );

            return null;

        }

        let academicStartYear =
            parts.year;

        // قبل از ۱ مهر
        if (
            parts.month < 7
        ) {

            academicStartYear =
                parts.year - 1;

        }

        return academicStartYear;

    }


    // =====================================
    // Academic Year Text
    // =====================================

    function getAcademicYearText() {

        const start =
            getAcademicYear();

        if (
            start === null ||
            start === undefined
        ) {

            return "نامشخص";

        }

        const end =
            start + 1;

        return (
            toPersianDigits(start) +
            "–" +
            toPersianDigits(end)
        );

    }


    // =====================================
    // Persian Date → Gregorian Date
    // =====================================

    function persianToGregorian(
        persianYear,
        persianMonth,
        persianDay
    ) {

        /*
         * Robust conversion for the licensing layer.
         *
         * The previous binary-search implementation depended on
         * millisecond/day arithmetic across local timezone/DST
         * boundaries and could fail even when Intl Persian calendar
         * support was available.
         *
         * We only need exact academic boundary dates here, so use
         * Intl as the source of truth and scan a safe Gregorian window.
         */

        try {

            const target =
                (
                    Number(persianYear) * 10000 +
                    Number(persianMonth) * 100 +
                    Number(persianDay)
                );

            if (
                !Number.isFinite(target) ||
                !persianYear ||
                !persianMonth ||
                !persianDay
            ) {

                return null;

            }

            // Persian year Y is approximately Gregorian Y + 621.
            // Start at the beginning of March and scan the whole year.
            const base =
                new Date(
                    Date.UTC(
                        Number(persianYear) + 621,
                        2,
                        1,
                        12,
                        0,
                        0,
                        0
                    )
                );

            const maxDays = 400;

            for (
                let offset = 0;
                offset < maxDays;
                offset++
            ) {

                const date =
                    new Date(
                        base.getTime() +
                        offset * 86400000
                    );

                const parts =
                    getPersianParts(date);

                if (!parts) {

                    return null;

                }

                const current =
                    (
                        parts.year * 10000 +
                        parts.month * 100 +
                        parts.day
                    );

                if (
                    current === target
                ) {

                    return date;

                }

            }

            return null;

        }
        catch (error) {

            console.error(
                "License Manager: Persian to Gregorian conversion failed.",
                error
            );

            return null;

        }

    }

    // =====================================
    // Academic Period
    // =====================================

    function getAcademicPeriod() {

        const academicStartYear =
            getAcademicYear();

        if (
            academicStartYear === null
        ) {

            return {

                start: null,
                end: null,
                nextStart: null,
                academicStartYear: null,
                academicEndYear: null

            };

        }

        const nextAcademicYear =
            academicStartYear + 1;

        const start =
            persianToGregorian(
                academicStartYear,
                7,
                1
            );

        const nextStart =
            persianToGregorian(
                nextAcademicYear,
                7,
                1
            );

        if (
            !start ||
            !nextStart
        ) {

            console.error(
                "License Manager: Academic period conversion failed."
            );

            return {

                start: null,
                end: null,
                nextStart: null,

                academicStartYear:
                    academicStartYear,

                academicEndYear:
                    nextAcademicYear

            };

        }

        const end =
            new Date(
                nextStart.getTime() - 1
            );

        return {

            start: start,
            end: end,
            nextStart: nextStart,

            academicStartYear:
                academicStartYear,

            academicEndYear:
                nextAcademicYear

        };

    }


    // =====================================
    // Remaining Days
    // =====================================

    function getRemainingDays() {

        const period =
            getAcademicPeriod();

        if (
            !period.start ||
            !period.nextStart
        ) {

            return 0;

        }

        const now =
            new Date();

        if (
            now < period.start
        ) {

            return 0;

        }

        if (
            now >= period.nextStart
        ) {

            return 0;

        }

        const difference =
            period.nextStart.getTime() -
            now.getTime();

        return Math.max(
            0,
            Math.ceil(
                difference /
                86400000
            )
        );

    }


    // =====================================
    // Persian Date
    // =====================================

    function getPersianDate(date) {

        try {

            return new Intl.DateTimeFormat(
                "fa-IR-u-ca-persian",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            ).format(date);

        }
        catch (error) {

            return "";

        }

    }


    // =====================================
    // Gregorian Date
    // =====================================

    function getGregorianDate(date) {

        try {

            const targetDate =
                date instanceof Date
                    ? date
                    : new Date(date);

            if (
                isNaN(
                    targetDate.getTime()
                )
            ) {

                return "";

            }

            return new Intl.DateTimeFormat(
                "en-US",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            ).format(targetDate);

        }
        catch (error) {

            return "";

        }

    }


    // =====================================
    // Storage
    // =====================================

    function loadLicenses() {

        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!raw) {

                return [];

            }

            const data =
                JSON.parse(raw);

            if (
                !Array.isArray(data)
            ) {

                return [];

            }

            return data;

        }
        catch (error) {

            console.error(
                "License Manager: Load failed.",
                error
            );

            return [];

        }

    }


    function saveLicenses(
        licenses
    ) {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    licenses
                )
            );

            return true;

        }
        catch (error) {

            console.error(
                "License Manager: Save failed.",
                error
            );

            return false;

        }

    }


    // =====================================
    // Cleanup
    // =====================================

    function cleanupExpiredLicenses() {

        const currentYear =
            getAcademicYear();

        if (
            currentYear === null
        ) {

            return [];

        }

        const licenses =
            loadLicenses();

        const valid =
            licenses.filter(
                function (license) {

                    if (
                        !license ||
                        license.academicYear ===
                        undefined ||
                        license.academicYear ===
                        null
                    ) {

                        return false;

                    }

                    return (
                        Number(
                            license.academicYear
                        ) ===
                        Number(
                            currentYear
                        )
                    );

                }
            );

        if (
            valid.length !==
            licenses.length
        ) {

            saveLicenses(
                valid
            );

        }

        return valid;

    }


    // =====================================
    // Active Licenses
    // =====================================

    function getActiveLicenses() {

        return cleanupExpiredLicenses();

    }


    // =====================================
    // Profile License
    // =====================================

    function getProfileLicenses(
        studentId
    ) {

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );

        if (!normalizedStudentId) {

            return [];

        }

        return getActiveLicenses()
            .filter(
                function (license) {

                    return (
                        normalizeStudentId(
                            license.studentId
                        ) ===
                        normalizedStudentId
                    );

                }
            );

    }


    function getProfileLicense(
        studentId,
        gradeId
    ) {

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );

        if (
            !normalizedStudentId ||
            !gradeId
        ) {

            return null;

        }

        return getActiveLicenses()
            .find(
                function (license) {

                    return (
                        normalizeStudentId(
                            license.studentId
                        ) ===
                        normalizedStudentId
                        &&
                        license.gradeId ===
                        gradeId
                    );

                }
            ) || null;

    }


    // =====================================
    // Activation Status
    // =====================================

    function isActivated(
        studentId
    ) {

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );

        if (!normalizedStudentId) {

            return false;

        }

        if (isRemoteProductionMode()) {
            const claims = verifiedRemoteEntitlement;
            return Boolean(
                claims &&
                normalizeStudentId(claims.studentId) === normalizedStudentId &&
                hasValidRemoteEntitlement(claims.gradeScope)
            );
        }

        return getActiveLicenses()
            .some(
                function (license) {

                    return (
                        normalizeStudentId(
                            license.studentId
                        ) ===
                        normalizedStudentId
                    );

                }
            );

    }


    function isGradeActivated(
        gradeId,
        studentId
    ) {

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );

        if (
            !normalizedStudentId ||
            !gradeId
        ) {

            return false;

        }

        if (verifiedRemoteEntitlement) {
            if (normalizedStudentId !== getActiveStudentId()) {
                return false;
            }
            if (hasValidRemoteEntitlement(gradeId)) {
                return true;
            }
        }

        // Production must never fall back to unsigned legacy LocalStorage licenses.
        if (isRemoteProductionMode()) {
            return false;
        }

        return getActiveLicenses()
            .some(
                function (license) {
                    return (
                        normalizeStudentId(license.studentId) === normalizedStudentId
                        && license.gradeId === gradeId
                    );
                }
            );

    }


    // =====================================
    // Profile Activation
    // =====================================

    function isProfileActivated(
        studentId,
        gradeId
    ) {

        return isGradeActivated(
            gradeId,
            studentId
        );

    }


    // =====================================
    // Find Code
    // =====================================

    function findLicenseByCode(
        code
    ) {

        const normalized =
            normalizeCode(code);

        if (!normalized) {

            return null;

        }

        return getActiveLicenses()
            .find(
                function (license) {

                    return (
                        normalizeCode(
                            license.code
                        ) ===
                        normalized
                    );

                }
            ) || null;

    }


    // =====================================
    // Validate Code
    // =====================================

    function validateCode(
        code,
        selectedGrade,
        studentId
    ) {

        if (isRemoteProductionMode()) {
            return {
                valid: false,
                message: "اعتبارسنجی کد محلی در نسخه production مجاز نیست."
            };
        }

        const normalized =
            normalizeCode(code);

        if (!normalized) {

            return {

                valid: false,

                message:
                    "لطفاً کد فعال‌سازی را وارد کنید."

            };

        }


        if (!selectedGrade) {

            return {

                valid: false,

                message:
                    "لطفاً پایه تحصیلی را انتخاب کنید."

            };

        }


        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );


        if (!normalizedStudentId) {

            return {

                valid: false,

                message:
                    "پروفایل فعال پیدا نشد."

            };

        }


        const codeGrade =
            DEMO_CODES[
                normalized
            ];


        // =====================================
        // Code must exist
        // =====================================

        if (!codeGrade) {

            return {

                valid: false,

                message:
                    "کد فعال‌سازی معتبر نیست."

            };

        }


        // =====================================
        // Grade Match
        // =====================================

        if (
            codeGrade !==
            selectedGrade
        ) {

            return {

                valid: false,

                message:
                    "این کد مربوط به پایه انتخاب‌شده نیست."

            };

        }


        // =====================================
        // Existing license for this profile
        // =====================================

        const profileLicense =
            getProfileLicense(
                normalizedStudentId,
                selectedGrade
            );

        if (profileLicense) {

            return {

                valid: false,

                message:
                    "این پروفایل قبلاً برای این پایه فعال شده است."

            };

        }


        // =====================================
        // Code already used
        // =====================================

        const existingLicense =
            findLicenseByCode(
                normalized
            );


        if (existingLicense) {

            const ownerStudentId =
                normalizeStudentId(
                    existingLicense.studentId
                );


            // =====================================
            // Legacy license
            // =====================================
            //
            // مجوزهای نسخه 1.3 فاقد studentId
            // هستند.
            //
            // اولین پروفایل استفاده‌کننده مالک
            // آن مجوز خواهد شد.
            //
            // =====================================

            if (!ownerStudentId) {

                return {

                    valid: true,

                    code:
                        normalized,

                    gradeId:
                        codeGrade,

                    studentId:
                        normalizedStudentId,

                    legacy:
                        true

                };

            }


            // =====================================
            // Same owner
            // =====================================

            if (
                ownerStudentId ===
                normalizedStudentId
            ) {

                return {

                    valid: false,

                    message:
                        "این کد قبلاً برای همین پروفایل فعال شده است."

                };

            }


            // =====================================
            // Different owner
            // =====================================

            return {

                valid: false,

                message:
                    "این کد قبلاً برای پروفایل دیگری استفاده شده است."

            };

        }


        // =====================================
        // New Code
        // =====================================

        return {

            valid: true,

            gradeId:
                codeGrade,

            code:
                normalized,

            studentId:
                normalizedStudentId

        };

    }


    // =====================================
    // Activate
    // =====================================

    function activate(
        code,
        gradeId,
        studentId
    ) {

        if (isRemoteProductionMode()) {
            return {
                valid: false,
                message: "فعال‌سازی محلی در نسخه production مجاز نیست."
            };
        }

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );


        const validation =
            validateCode(
                code,
                gradeId,
                normalizedStudentId
            );


        if (
            !validation.valid
        ) {

            return validation;

        }


        const period =
            getAcademicPeriod();


        if (
            !period.start ||
            !period.nextStart
        ) {

            return {

                valid: false,

                message:
                    "تاریخ سال تحصیلی قابل محاسبه نیست."

            };

        }


        const licenses =
            getActiveLicenses();


        // =====================================
        // Legacy License Claim
        // =====================================

        const existingLicense =
            licenses.find(
                function (license) {

                    return (
                        normalizeCode(
                            license.code
                        ) ===
                        validation.code
                    );

                }
            );


        if (
            existingLicense &&
            !normalizeStudentId(
                existingLicense.studentId
            )
        ) {

            existingLicense.studentId =
                normalizedStudentId;

            existingLicense.studentName =
                getActiveProfileName();

            existingLicense.boundAt =
                new Date().toISOString();

            existingLicense.bindingVersion =
                2;

            const saved =
                saveLicenses(
                    licenses
                );

            if (!saved) {

                return {

                    valid: false,

                    message:
                        "ذخیره مالکیت مجوز انجام نشد."

                };

            }

            console.log(
                "Legacy License Bound:",
                existingLicense
            );

            return {

                valid: true,

                license:
                    existingLicense

            };

        }


        // =====================================
        // New License
        // =====================================

        const license = {

            id:
                "license_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2, 8),

            code:
                validation.code,

            gradeId:
                validation.gradeId,

            gradeTitle:
                GRADES[
                    validation.gradeId
                ],

            studentId:
                normalizedStudentId,

            studentName:
                getActiveProfileName(),

            academicYear:
                period.academicStartYear,

            academicYearText:
                getAcademicYearText(),

            activatedAt:
                new Date().toISOString(),

            boundAt:
                new Date().toISOString(),

            validFrom:
                period.start.toISOString(),

            validUntil:
                period.nextStart.toISOString(),

            bindingVersion:
                2

        };


        licenses.push(
            license
        );


        const saved =
            saveLicenses(
                licenses
            );


        if (!saved) {

            return {

                valid: false,

                message:
                    "ذخیره مجوز انجام نشد."

            };

        }


        console.log(
            "License Activated:",
            license
        );


        return {

            valid: true,

            license:
                license

        };

    }


    // =====================================
    // Active Profile Name
    // =====================================

    function getActiveProfileName() {

        const profile =
            getActiveProfile();

        if (!profile) {

            return "";

        }

        return safeText(
            profile.name
        );

    }


    // =====================================
    // Remove License
    // =====================================
    //
    // فعلاً فقط برای تست داخلی.
    // در نسخه نهایی عمومی نباید امکان حذف
    // آزادانه مجوز وجود داشته باشد.
    //
    // =====================================

    function removeLicense(
        licenseId
    ) {

        if (!licenseId) {

            return false;

        }

        const licenses =
            getActiveLicenses();

        const filtered =
            licenses.filter(
                function (license) {

                    return (
                        license.id !==
                        licenseId
                    );

                }
            );

        if (
            filtered.length ===
            licenses.length
        ) {

            return false;

        }

        return saveLicenses(
            filtered
        );

    }


    function isRemoteProductionMode() {
        return Boolean(
            window.TahouriServiceConfig &&
            ["production", "pr141-isolated-test"].includes(window.TahouriServiceConfig.mode)
        );
    }

    // =====================================
    // Remote Activation Bridge
    // =====================================
    async function activateRemote(code, gradeId, studentId, renewalMode = "promotion") {
        if (!window.TahouriLicenseClient || !window.TahouriEntitlementVerifier || !window.TahouriEntitlementStore) return null;
        try {
            const installationId = await getOrCreateRemoteInstallationId();
            const normalizedStudentId = String(studentId || getActiveStudentId() || "").trim();
            const response = await window.TahouriLicenseClient.activate({code, gradeId, studentId: normalizedStudentId, installationId, renewalMode});
            if (!response || !response.valid || !response.entitlement) return response || {valid:false,message:"فعال‌سازی آنلاین انجام نشد."};
            const verified = await window.TahouriEntitlementVerifier.verifyEnvelope(
                response.entitlement,
                { allowFuture: true }
            );
            if (!verified.valid) return {valid:false,message:verified.reason || "مجوز آنلاین معتبر نیست."};
            const claims = verified.claims;
            const expectedStudentId = String(studentId || getActiveStudentId() || "").trim();
            const expectedGradeId = String(gradeId || "").trim();
            const activeProfile = getActiveProfile();
            const activeProfileGrade = safeText(activeProfile && (activeProfile.grade || activeProfile.gradeId)).trim();

            if (
                claims.productId !== "tahouri-edu" ||
                claims.entitlementVersion !== 1 ||
                typeof claims.licenseId !== "string" || !claims.licenseId.trim() ||
                typeof claims.academicYear !== "string" || !claims.academicYear.trim() ||
                typeof claims.validFrom !== "string" || !claims.validFrom.trim() ||
                typeof claims.validUntil !== "string" || !claims.validUntil.trim() ||
                typeof claims.gradeScope !== "string" || !claims.gradeScope.trim() ||
                typeof claims.studentId !== "string" || !claims.studentId.trim() ||
                typeof claims.installationBinding !== "string" || !claims.installationBinding.trim()
            ) {
                return { valid: false, message: "اطلاعات اتصال مجوز به پروفایل یا دستگاه کامل نیست." };
            }
            if (!expectedStudentId || !expectedGradeId ||
                claims.gradeScope !== expectedGradeId || activeProfileGrade !== expectedGradeId) {
                return {valid:false,message:"مجوز مربوط به این پایه یا پروفایل فعال نیست."};
            }
            if (claims.studentId !== expectedStudentId || getActiveStudentId() !== expectedStudentId) {
                return {valid:false,message:"این مجوز متعلق به پروفایل دیگری است."};
            }
            if (claims.installationBinding !== installationId) {
                return {valid:false,message:"این مجوز به دستگاه دیگری متصل است."};
            }

            const validFrom = new Date(claims.validFrom);
            const validUntil = new Date(claims.validUntil);
            if (
                Number.isNaN(validFrom.getTime()) ||
                Number.isNaN(validUntil.getTime()) ||
                validFrom.getTime() >= validUntil.getTime()
            ) {
                return {valid:false,message:"بازه اعتبار مجوز معتبر نیست."};
            }

            // Persist only after every signed claim and active profile/device
            // binding has been validated.
            if (!window.TahouriEntitlementStore.write(response.entitlement)) {
                return {valid:false,message:"ذخیره مجوز امن انجام نشد."};
            }

            const isFutureRenewal = Date.now() < validFrom.getTime();

            if (isFutureRenewal) {
                await initializeRemoteEntitlement();
                return {
                    valid: true,
                    remote: true,
                    renewalStored: true,
                    entitlement: response.entitlement,
                    license: claims,
                    studentId
                };
            }

            verifiedRemoteEntitlement = claims;
            return {valid:true,remote:true,entitlement:response.entitlement,license:claims,studentId};
        } catch (error) {
            console.warn("License Manager: Remote activation unavailable.", error);
            if (isRemoteProductionMode()) {
                return {
                    valid: false,
                    message: "سرویس فعال‌سازی در دسترس نیست. برای فعال‌سازی دوباره بعداً تلاش کنید."
                };
            }
            return null;
        }
    }
    function getOrCreateInstallationId() {
        const key="Tahouri_Installation_Id_v1";
        try { let id=localStorage.getItem(key); if(!id){ id=(window.crypto&&typeof window.crypto.randomUUID==="function")?window.crypto.randomUUID():"install_"+Date.now()+"_"+Math.random().toString(36).slice(2); localStorage.setItem(key,id);} return id; }
        catch(error){ return "ephemeral_"+Date.now(); }
    }
    // Read-only compatibility lookup for an entitlement already signed
    // against this installation's pre-cryptographic LocalStorage ID.
    // This ID preserves local continuity only; it is never device proof.
    function getLegacyInstallationId() {
        try {
            return String(localStorage.getItem("Tahouri_Installation_Id_v1") || "").trim();
        } catch (error) {
            return "";
        }
    }
    async function getRemoteDeviceIdentity() {
        if (window.TahouriDeviceIdentity && typeof window.TahouriDeviceIdentity.getOrCreate === "function") {
            const identity = await window.TahouriDeviceIdentity.getOrCreate();
            const installationId = String(identity && identity.installationId || "").trim();
            if (!installationId || (isRemoteProductionMode() && !identity.publicKey)) {
                throw new Error("هویت رمزنگاری‌شده دستگاه کامل نیست.");
            }
            return { ...identity, installationId };
        }
        if (isRemoteProductionMode()) {
            throw new Error("هویت رمزنگاری‌شده دستگاه در این نسخه بارگذاری نشده است.");
        }
        return { installationId: getOrCreateInstallationId(), publicKey: "" };
    }

    async function getOrCreateRemoteInstallationId() {
        const identity = await getRemoteDeviceIdentity();
        return identity.installationId;
    }

    async function getDevicePublicKeyFingerprint(publicKeyPem) {
        if (!publicKeyPem || !window.crypto || !window.crypto.subtle ||
            typeof window.crypto.subtle.digest !== "function") {
            throw new Error("اثر انگشت کلید عمومی دستگاه قابل محاسبه نیست.");
        }
        const base64 = String(publicKeyPem)
            .replace(/-----BEGIN PUBLIC KEY-----/g, "")
            .replace(/-----END PUBLIC KEY-----/g, "")
            .replace(/\\s+/g, "");
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const digest = await window.crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    }
    function getRemoteEntitlement() {
        try {
            if (!window.TahouriEntitlementStore) return null;
            const all = typeof window.TahouriEntitlementStore.readAll === "function"
                ? window.TahouriEntitlementStore.readAll()
                : [window.TahouriEntitlementStore.read()].filter(Boolean);
            return all.length ? all[0] : null;
        } catch(error) {
            return null;
        }
    }

    async function initializeRemoteEntitlement() {
        const selectionSequence = ++entitlementSelectionSequence;
        verifiedRemoteEntitlement = null;

        const profile = getActiveProfile();
        const activeStudentId = normalizeStudentId(profile && profile.studentId);
        const activeGradeId = safeText(profile && (profile.grade || profile.gradeId)).trim();

        if (!activeStudentId || !activeGradeId ||
            !window.TahouriEntitlementStore || !window.TahouriEntitlementVerifier) {
            return false;
        }

        try {
            const all = typeof window.TahouriEntitlementStore.readAll === "function"
                ? window.TahouriEntitlementStore.readAll()
                : [window.TahouriEntitlementStore.read()].filter(Boolean);
            const deviceIdentity = await getRemoteDeviceIdentity();
            const installationId = deviceIdentity.installationId;
            const localDeviceKeyFingerprint = deviceIdentity.publicKey
                ? await getDevicePublicKeyFingerprint(deviceIdentity.publicKey)
                : "";

            for (const storedEnvelope of all) {
                let envelope = storedEnvelope;
                let claims = envelope && envelope.claims;
                if (!claims ||
                    normalizeStudentId(claims.studentId) !== activeStudentId ||
                    claims.gradeScope !== activeGradeId) continue;

                const legacyInstallationId = getLegacyInstallationId();
                if (claims.installationBinding && claims.installationBinding !== installationId &&
                    claims.installationBinding !== legacyInstallationId) continue;

                let result = await window.TahouriEntitlementVerifier.verifyEnvelope(envelope);
                if (selectionSequence !== entitlementSelectionSequence) return false;

                // An expired signed lease can be renewed only by the same bound device
                // proving possession of its private key to the Worker.
                if (!result || !result.valid) {
                    const leaseExpired = String(result && result.reason || "").includes("مهلت آفلاین");
                    if (!leaseExpired || !window.TahouriLicenseClient ||
                        typeof window.TahouriLicenseClient.status !== "function") continue;

                    const refreshed = await window.TahouriLicenseClient.status(claims.licenseId);
                    if (selectionSequence !== entitlementSelectionSequence) return false;
                    if (!refreshed || !refreshed.valid || !refreshed.entitlement) continue;

                    const refreshedVerification =
                        await window.TahouriEntitlementVerifier.verifyEnvelope(refreshed.entitlement);
                    if (!refreshedVerification || !refreshedVerification.valid ||
                        !refreshedVerification.claims) continue;

                    const refreshedClaims = refreshedVerification.claims;
                    if (refreshedClaims.licenseId !== claims.licenseId ||
                        normalizeStudentId(refreshedClaims.studentId) !== activeStudentId ||
                        refreshedClaims.gradeScope !== activeGradeId ||
                        refreshedClaims.installationBinding !== claims.installationBinding ||
                        refreshedClaims.deviceType !== claims.deviceType ||
                        refreshedClaims.deviceKeyFingerprint !== claims.deviceKeyFingerprint) continue;

                    if (!window.TahouriEntitlementStore.write(refreshed.entitlement)) continue;
                    envelope = refreshed.entitlement;
                    result = refreshedVerification;
                    claims = refreshedClaims;
                }

                if (!result || !result.valid || !result.claims) continue;
                claims = result.claims;

                // A signed offline lease is usable only with the same local
                // cryptographic key that the Worker bound to this device slot.
                if (claims.offlineLeaseExpiresAt !== undefined &&
                    (!localDeviceKeyFingerprint ||
                     claims.deviceKeyFingerprint !== localDeviceKeyFingerprint)) continue;

                const binding = claims.installationBinding;
                if (binding && binding !== installationId &&
                    binding !== legacyInstallationId) continue;
                if (normalizeStudentId(claims.studentId) !== activeStudentId) continue;
                if (!claims.gradeScope || claims.gradeScope !== activeGradeId) continue;

                const currentProfile = getActiveProfile();
                if (selectionSequence !== entitlementSelectionSequence ||
                    normalizeStudentId(currentProfile && currentProfile.studentId) !== activeStudentId ||
                    safeText(currentProfile && (currentProfile.grade || currentProfile.gradeId)).trim() !== activeGradeId) {
                    return false;
                }

                // Never expose a legacy entitlement without a signed offline lease
                // as active while an online upgrade is pending.
                const leaseExpiry = Date.parse(claims.offlineLeaseExpiresAt || "");
                const hasValidOfflineLease =
                    Number.isFinite(leaseExpiry) &&
                    leaseExpiry > Date.now() &&
                    typeof claims.deviceSlotId === "string" &&
                    /^[a-f0-9]{64}$/.test(claims.deviceSlotId);

                verifiedRemoteEntitlement = claims;
                if (!hasValidOfflineLease || leaseExpiry - Date.now() < 24 * 60 * 60 * 1000) {
                    const status = await refreshRemoteLicenseStatus();
                    if (selectionSequence !== entitlementSelectionSequence) return false;

                    // A valid, unexpired lease may survive a network outage.
                    // A legacy entitlement without a lease must fail closed.
                    if (!status || !status.valid) {
                        const temporaryOfflineFailure = status &&
                            ["network_error", "status_client_unavailable"].includes(status.reason);
                        if (!hasValidOfflineLease || !temporaryOfflineFailure) {
                            verifiedRemoteEntitlement = null;
                            return false;
                        }
                    }
                }

                return Boolean(
                    verifiedRemoteEntitlement &&
                    hasValidRemoteEntitlement(activeGradeId)
                );
            }

            return false;
        } catch (error) {
            if (selectionSequence === entitlementSelectionSequence) {
                verifiedRemoteEntitlement = null;
            }
            console.warn("License Manager: Stored entitlement verification failed.", error);
            return false;
        }
    }

    async function getProfileEntitlementStatus(studentId, gradeId) {
        const normalizedStudentId = normalizeStudentId(studentId);
        const expectedGradeId = safeText(gradeId).trim();

        if (!normalizedStudentId || !expectedGradeId) {
            return { active: false, status: "invalid", reason: "شناسه پروفایل یا پایه مشخص نیست." };
        }

        const currentAcademicYear = String(getAcademicYear() || "");

        if (!isRemoteProductionMode()) {
            const license = getProfileLicense(normalizedStudentId, expectedGradeId);
            if (!license) {
                return { active: false, status: "inactive", reason: "برای این پروفایل هنوز مجوزی ثبت نشده است." };
            }
            if (String(license.academicYear || "") !== currentAcademicYear) {
                return { active: false, status: "renewal_required", reason: "مجوز این پروفایل مربوط به سال تحصیلی دیگری است." };
            }

            const validFrom = new Date(license.validFrom || license.activatedAt || "");
            const validUntil = new Date(license.validUntil || "");
            if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime()) ||
                validFrom.getTime() >= validUntil.getTime()) {
                return { active: false, status: "invalid", reason: "بازه اعتبار مجوز معتبر نیست." };
            }
            if (Date.now() < validFrom.getTime()) {
                return { active: false, status: "pending", reason: "زمان شروع اعتبار مجوز هنوز نرسیده است." };
            }
            if (Date.now() >= validUntil.getTime()) {
                return { active: false, status: "expired", reason: "مجوز این پروفایل منقضی شده است." };
            }

            return {
                active: true,
                status: "active",
                academicYear: currentAcademicYear,
                academicYearText: getAcademicYearText(),
                validUntil: license.validUntil
            };
        }

        const store = window.TahouriEntitlementStore;
        const verifier = window.TahouriEntitlementVerifier;
        if (!store || !verifier || typeof verifier.verifyEnvelope !== "function") {
            return { active: false, status: "unavailable", reason: "امکان بررسی مجوز ذخیره‌شده وجود ندارد." };
        }

        let matchingEntitlementFound = false;
        let lastStatus = "inactive";
        let lastReason = "برای این پروفایل هنوز مجوزی ثبت نشده است.";
        let lastRequiresLegacyDeviceMigration = false;

        try {
            const envelopes = typeof store.readAll === "function"
                ? store.readAll()
                : [store.read()].filter(Boolean);
            const installationId = await getOrCreateRemoteInstallationId();

            for (const envelope of envelopes) {
                const storedClaims = envelope && envelope.claims;
                if (!storedClaims ||
                    normalizeStudentId(storedClaims.studentId) !== normalizedStudentId ||
                    safeText(storedClaims.gradeScope).trim() !== expectedGradeId) {
                    continue;
                }

                matchingEntitlementFound = true;
                const verification = await verifier.verifyEnvelope(envelope, { allowFuture: true });
                if (!verification || !verification.valid || !verification.claims) {
                    lastReason = verification && verification.reason
                        ? verification.reason
                        : "اعتبار امضای مجوز تأیید نشد.";
                    lastStatus = /منقضی/.test(lastReason) ? "expired" : "invalid";
                    continue;
                }

                const claims = verification.claims;
                const legacyInstallationId = getLegacyInstallationId();
                const matchesCurrentInstallation = claims.installationBinding === installationId;
                const matchesLegacyInstallation = Boolean(
                    legacyInstallationId &&
                    claims.installationBinding === legacyInstallationId
                );
                if (!matchesCurrentInstallation && !matchesLegacyInstallation) {
                    lastStatus = "invalid";
                    lastReason = "این مجوز به دستگاه دیگری متصل است.";
                    continue;
                }
                const leaseExpiry = Date.parse(claims.offlineLeaseExpiresAt || "");
                const hasDeviceLease =
                    typeof claims.deviceSlotId === "string" &&
                    /^[a-f0-9]{64}$/.test(claims.deviceSlotId) &&
                    Number.isFinite(Number(claims.revocationEpoch)) &&
                    Number(claims.revocationEpoch) > 0 &&
                    Number.isFinite(leaseExpiry) &&
                    leaseExpiry > Date.now();
                if (!hasDeviceLease) {
                    lastStatus = "renewal_required";
                    lastReason = "برای تکمیل مهاجرت مجوز قدیمی، اتصال آنلاین و تأیید هویت دستگاه لازم است.";
                    lastRequiresLegacyDeviceMigration = true;
                    continue;
                }

                if (String(claims.academicYear) !== currentAcademicYear) {
                    lastStatus = "renewal_required";
                    lastReason = "مجوز این پروفایل مربوط به سال تحصیلی دیگری است.";
                    continue;
                }

                const validFrom = new Date(claims.validFrom);
                const validUntil = new Date(claims.validUntil);
                if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime()) ||
                    validFrom.getTime() >= validUntil.getTime()) {
                    lastStatus = "invalid";
                    lastReason = "بازه اعتبار مجوز معتبر نیست.";
                    continue;
                }
                if (Date.now() < validFrom.getTime()) {
                    return {
                        active: false,
                        status: "pending",
                        reason: "اعتبار این مجوز از تاریخ شروع سال تحصیلی فعال می‌شود.",
                        academicYear: String(claims.academicYear),
                        validFrom: claims.validFrom
                    };
                }
                if (Date.now() >= validUntil.getTime()) {
                    lastStatus = "expired";
                    lastReason = "مجوز این پروفایل منقضی شده است.";
                    continue;
                }

                return {
                    active: true,
                    status: "active",
                    academicYear: String(claims.academicYear),
                    academicYearText: getAcademicYearText(),
                    validUntil: claims.validUntil
                };
            }
        } catch (error) {
            console.warn("License Manager: Profile entitlement status check failed.", error);
            return { active: false, status: "unavailable", reason: "بررسی مجوز ذخیره‌شده با خطا روبه‌رو شد." };
        }

        return {
            active: false,
            status: matchingEntitlementFound ? lastStatus : "inactive",
            reason: lastReason,
            requiresLegacyDeviceMigration: lastRequiresLegacyDeviceMigration
        };
    }

    function hasValidRemoteEntitlement(gradeId) {
        const claims = verifiedRemoteEntitlement;
        if (!claims || claims.productId !== "tahouri-edu") return false;

        const activeStudentId = getActiveStudentId();
        if (!activeStudentId || claims.studentId !== activeStudentId) return false;
        if (!gradeId || !claims.gradeScope || claims.gradeScope !== gradeId) return false;

        const from = new Date(claims.validFrom);
        const until = new Date(claims.validUntil);
        const leaseUntil = new Date(claims.offlineLeaseExpiresAt || "");
        const clock = getOfflineClockState();
        return (
            clock.safe &&
            typeof claims.deviceSlotId === "string" &&
            /^[a-f0-9]{64}$/.test(claims.deviceSlotId) &&
            Number.isFinite(Number(claims.revocationEpoch)) &&
            Number(claims.revocationEpoch) > 0 &&
            !Number.isNaN(leaseUntil.getTime()) &&
            !Number.isNaN(from.getTime()) &&
            !Number.isNaN(until.getTime()) &&
            clock.now >= from.getTime() &&
            clock.now < until.getTime() &&
            clock.now < leaseUntil.getTime()
        );
    }

    // =====================================
    // Public API
    // =====================================

    const api = {

        // Grades
        getGrades:
            function () {

                return {
                    ...GRADES
                };

            },


        // Academic Year
        getAcademicYear:
            getAcademicYear,

        getAcademicYearText:
            getAcademicYearText,

        getAcademicPeriod:
            getAcademicPeriod,

        getRemainingDays:
            getRemainingDays,


        // Dates
        getPersianDate:
            getPersianDate,

        getGregorianDate:
            getGregorianDate,


        // Licenses
        getActiveLicenses:
            getActiveLicenses,

        getProfileLicenses:
            getProfileLicenses,

        getProfileLicense:
            getProfileLicense,


        // Status
        isActivated:
            isActivated,

        isGradeActivated:
            isGradeActivated,

        isProfileActivated:
            isProfileActivated,


        // Validation
        validateCode:
            validateCode,


        // Activation
        activate:
            activate,

        refreshRemoteLicenseStatus:
            refreshRemoteLicenseStatus,

        activateRemote:
            activateRemote,

        hasValidRemoteEntitlement:
            hasValidRemoteEntitlement,

        getRemoteEntitlement:
            getRemoteEntitlement,

        initializeRemoteEntitlement:
            initializeRemoteEntitlement,

        getProfileEntitlementStatus:
            getProfileEntitlementStatus,


        // Internal / Testing
        removeLicense:
            removeLicense

    };


    // =====================================
    // Global
    // =====================================

    window.LicenseManager =
        api;


    console.log(
        "License Manager v2.2 Ready"
    );

})();