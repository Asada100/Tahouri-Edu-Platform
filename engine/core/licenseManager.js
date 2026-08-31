// =====================================
// Tahouri Edu Platform
// License Manager
// Version 1.0
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
    // فقط برای آزمایش
    //

    const DEMO_CODES = {

        "GRADE1-1405-TEST": "grade1",

        "GRADE2-1405-TEST": "grade2",

        "GRADE3-1405-TEST": "grade3",

        "GRADE4-1405-TEST": "grade4",

        "GRADE5-1405-TEST": "grade5",

        "GRADE6-1405-TEST": "grade6"

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


    function escapeHTML(value) {

        return safeText(value)

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");

    }


    // =====================================
    // Academic Year
    // =====================================
    //
    // شروع سال تحصیلی:
    // 1 مهر
    //
    // در تقویم اجرایی این نسخه:
    // 23 September
    //
    // پایان:
    // 22 September سال بعد
    //
    // اولین لحظه 23 September
    // سال بعد، سال تحصیلی جدید است.
    //

    function getAcademicYear() {

        const now =
            new Date();


        const year =
            now.getFullYear();


        const september23 =
            new Date(
                year,
                8,
                23,
                0,
                0,
                0,
                0
            );


        if (
            now >=
            september23
        ) {

            return year;

        }


        return year - 1;

    }


    function getAcademicYearText() {

        const start =
            getAcademicYear();


        const end =
            start + 1;


        return (
            toPersianDigits(start) +
            "–" +
            toPersianDigits(end)
        );

    }


    // =====================================
    // Academic Period
    // =====================================

    function getAcademicPeriod() {

        const academicStartYear =
            getAcademicYear();


        const start =
            new Date(
                academicStartYear,
                8,
                23,
                0,
                0,
                0,
                0
            );


        const nextStart =
            new Date(
                academicStartYear + 1,
                8,
                23,
                0,
                0,
                0,
                0
            );


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
                academicStartYear + 1

        };

    }


    // =====================================
    // Remaining Days
    // =====================================

    function getRemainingDays() {

        const period =
            getAcademicPeriod();


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
                "License Manager: Load failed",
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
                "License Manager: Save failed",
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


        const licenses =
            loadLicenses();


        const valid =
            licenses.filter(
                function (license) {

                    if (
                        !license ||
                        !license.academicYear
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


    function isActivated() {

        return (
            getActiveLicenses()
                .length > 0
        );

    }


    function isGradeActivated(
        gradeId
    ) {

        return getActiveLicenses()
            .some(
                function (license) {

                    return (
                        license.gradeId ===
                        gradeId
                    );

                }
            );

    }


    // =====================================
    // Validate Code
    // =====================================

    function validateCode(
        code,
        selectedGrade
    ) {

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


        const codeGrade =
            DEMO_CODES[
                normalized
            ];


        if (!codeGrade) {

            return {

                valid: false,

                message:
                    "کد فعال‌سازی معتبر نیست."

            };

        }


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


        if (
            isGradeActivated(
                selectedGrade
            )
        ) {

            return {

                valid: false,

                message:
                    "این پایه قبلاً روی این دستگاه فعال شده است."

            };

        }


        return {

            valid: true,

            gradeId:
                codeGrade,

            code:
                normalized

        };

    }


    // =====================================
    // Activate
    // =====================================

    function activate(
        code,
        gradeId
    ) {

        const validation =
            validateCode(
                code,
                gradeId
            );


        if (
            !validation.valid
        ) {

            return validation;

        }


        const period =
            getAcademicPeriod();


        const license = {

            id:
                "license_" +
                Date.now(),

            code:
                validation.code,

            gradeId:
                validation.gradeId,

            gradeTitle:
                GRADES[
                    validation.gradeId
                ],

            academicYear:
                period.academicStartYear,

            academicYearText:
                getAcademicYearText(),

            activatedAt:
                new Date().toISOString(),

            validFrom:
                period.start.toISOString(),

            validUntil:
                period.nextStart.toISOString()

        };


        const licenses =
            getActiveLicenses();


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
    // Public API
    // =====================================

    const api = {

        getGrades:
            function () {

                return {
                    ...GRADES
                };

            },

        getAcademicYear:
            getAcademicYear,

        getAcademicYearText:
            getAcademicYearText,

        getAcademicPeriod:
            getAcademicPeriod,

        getRemainingDays:
            getRemainingDays,

        getPersianDate:
            getPersianDate,

        getActiveLicenses:
            getActiveLicenses,

        isActivated:
            isActivated,

        isGradeActivated:
            isGradeActivated,

        validateCode:
            validateCode,

        activate:
            activate

    };


    // =====================================
    // Global
    // =====================================

    window.LicenseManager =
        api;


    console.log(
        "License Manager Ready"
    );

})();