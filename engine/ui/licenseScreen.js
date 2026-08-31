// =====================================
// Tahouri Edu Platform
// License Screen
// Version 1.0
// =====================================

(function () {

    "use strict";


    // =====================================
    // State
    // =====================================

    let container =
        null;


    // =====================================
    // Styles
    // =====================================

    function injectStyles() {

        if (
            document.getElementById(
                "tahouriLicenseScreenStyles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "tahouriLicenseScreenStyles";


        style.textContent = `

            .tahouri-license-screen {

                direction: rtl;

                width: 100%;

                box-sizing: border-box;

                padding: 24px;

                font-family:
                    "B Yekan",
                    "Vazirmatn",
                    Tahoma,
                    Arial,
                    sans-serif;

            }


            .tahouri-license-wrapper {

                width:
                    min(700px, 100%);

                margin:
                    0 auto;

            }


            .tahouri-license-header {

                text-align: center;

                margin-bottom: 25px;

            }


            .tahouri-license-header-icon {

                font-size: 42px;

                margin-bottom: 10px;

            }


            .tahouri-license-header h2 {

                margin: 0;

                font-size: 25px;

                color: #0f172a;

            }


            .tahouri-license-header p {

                margin-top: 8px;

                color: #64748b;

                line-height: 1.9;

            }


            .tahouri-license-status {

                padding: 15px;

                border-radius: 16px;

                background: #f0fdf4;

                color: #166534;

                text-align: center;

                font-weight: 700;

                margin-bottom: 16px;

            }


            .tahouri-license-card {

                background: #ffffff;

                border:
                    1px solid #e2e8f0;

                border-radius: 18px;

                padding: 18px;

                margin-bottom: 12px;

                display: flex;

                justify-content: space-between;

                align-items: center;

                gap: 15px;

                box-sizing: border-box;

            }


            .tahouri-license-card-info {

                min-width: 0;

            }


            .tahouri-license-grade {

                font-size: 17px;

                font-weight: 700;

                color: #0f172a;

            }


            .tahouri-license-year {

                margin-top: 6px;

                font-size: 13px;

                color: #64748b;

            }


            .tahouri-license-valid {

                margin-top: 4px;

                font-size: 12px;

                color: #64748b;

            }


            .tahouri-license-days {

                flex-shrink: 0;

                padding: 9px 12px;

                border-radius: 12px;

                background: #ecfdf5;

                color: #047857;

                font-size: 13px;

                font-weight: 700;

            }


            .tahouri-license-add {

                width: 100%;

                min-height: 52px;

                border: 0;

                border-radius: 15px;

                background: #2563eb;

                color: #ffffff;

                font-family: inherit;

                font-size: 15px;

                font-weight: 700;

                cursor: pointer;

                margin-top: 8px;

            }


            .tahouri-license-add:hover {

                background: #1d4ed8;

            }


            .tahouri-license-back {

                width: 100%;

                min-height: 48px;

                border: 1px solid #dbe3ec;

                border-radius: 14px;

                background: #f8fafc;

                color: #334155;

                font-family: inherit;

                font-size: 14px;

                font-weight: 700;

                cursor: pointer;

                margin-top: 10px;

            }


            .tahouri-license-form {

                background: #ffffff;

                border:
                    1px solid #e2e8f0;

                border-radius: 20px;

                padding: 20px;

                box-sizing: border-box;

            }


            .tahouri-license-label {

                display: block;

                margin-bottom: 8px;

                color: #334155;

                font-size: 14px;

                font-weight: 700;

            }


            .tahouri-license-select,
            .tahouri-license-input {

                width: 100%;

                height: 52px;

                border:
                    1px solid #cbd5e1;

                border-radius: 14px;

                padding: 0 14px;

                box-sizing: border-box;

                font-family: inherit;

                font-size: 15px;

                outline: none;

            }


            .tahouri-license-input {

                direction: ltr;

                text-align: center;

                letter-spacing: 1px;

                margin-top: 14px;

            }


            .tahouri-license-select:focus,
            .tahouri-license-input:focus {

                border-color: #60a5fa;

                box-shadow:
                    0 0 0 3px
                    rgba(96,165,250,.15);

            }


            .tahouri-license-error {

                display: none;

                margin-top: 12px;

                padding: 11px;

                border-radius: 12px;

                background: #fef2f2;

                color: #b91c1c;

                text-align: center;

                font-size: 13px;

                line-height: 1.8;

            }


            .tahouri-license-note {

                margin-top: 16px;

                padding: 13px;

                border-radius: 14px;

                background: #f8fafc;

                color: #64748b;

                font-size: 12px;

                line-height: 1.9;

                text-align: center;

            }

        `;


        document.head.appendChild(
            style
        );

    }


    // =====================================
    // Render
    // =====================================

    function render(target) {

        if (
            !window.LicenseManager
        ) {

            console.error(
                "License Screen: LicenseManager not found."
            );

            return;

        }


        container =
            typeof target === "string"
                ? document.querySelector(target)
                : target;


        if (!container) {

            console.error(
                "License Screen: Target not found."
            );

            return;

        }


        injectStyles();


        renderList();

    }


    // =====================================
    // List
    // =====================================

    function renderList() {

        const licenses =
            LicenseManager
                .getActiveLicenses();


        const grades =
            LicenseManager
                .getGrades();


        container.innerHTML = `

            <div
                class="tahouri-license-screen"
            >

                <div
                    class="tahouri-license-wrapper"
                >

                    <div
                        class="tahouri-license-header"
                    >

                        <div
                            class="tahouri-license-header-icon"
                        >
                            🔐
                        </div>

                        <h2>
                            مجوزهای فعال
                        </h2>

                        <p>
                            مدیریت پایه‌های فعال
                            و مجوزهای سال تحصیلی
                        </p>

                    </div>


                    <div
                        class="tahouri-license-status"
                    >
                        🟢
                        ${licenses.length}
                        پایه فعال است
                        <br>
                        سال تحصیلی
                        ${LicenseManager
                            .getAcademicYearText()}
                    </div>


                    ${

                        licenses.length

                            ?

                            licenses
                                .map(
                                    function (license) {

                                        return `

                                            <div
                                                class="tahouri-license-card"
                                            >

                                                <div
                                                    class="tahouri-license-card-info"
                                                >

                                                    <div
                                                        class="tahouri-license-grade"
                                                    >
                                                        🎓
                                                        ${
                                                            grades[
                                                                license.gradeId
                                                            ] ||
                                                            license.gradeId
                                                        }
                                                    </div>

                                                    <div
                                                        class="tahouri-license-year"
                                                    >
                                                        سال تحصیلی:
                                                        ${
                                                            license.academicYearText
                                                        }
                                                    </div>

                                                    <div
                                                        class="tahouri-license-valid"
                                                    >
                                                        فعال از:
                                                        ${
                                                            LicenseManager
                                                                .getPersianDate(
                                                                    new Date(
                                                                        license.validFrom
                                                                    )
                                                                )
                                                        }
                                                    </div>

                                                </div>


                                                <div
                                                    class="tahouri-license-days"
                                                >
                                                    ${
                                                        LicenseManager
                                                            .getRemainingDays()
                                                    }
                                                    روز باقی‌مانده
                                                </div>

                                            </div>

                                        `;

                                    }
                                )
                                .join("")

                            :

                            `

                                <div
                                    class="tahouri-license-note"
                                >
                                    هنوز هیچ پایه‌ای فعال نشده است.
                                </div>

                            `

                    }


                    <button
                        id="tahouriLicenseAddButton"
                        class="tahouri-license-add"
                        type="button"
                    >
                        ➕ افزودن کد پایه دیگر
                    </button>


                    <button
                        id="tahouriLicenseBackButton"
                        class="tahouri-license-back"
                        type="button"
                    >
                        ← بازگشت
                    </button>

                </div>

            </div>

        `;


        const addButton =
            container.querySelector(
                "#tahouriLicenseAddButton"
            );


        const backButton =
            container.querySelector(
                "#tahouriLicenseBackButton"
            );


        addButton.addEventListener(
            "click",
            renderAddForm
        );


        backButton.addEventListener(
            "click",
            function () {

                if (
                    window.Screen &&
                    typeof Screen.showHome ===
                    "function"
                ) {

                    Screen.showHome();

                }
                else {

                    window.history.back();

                }

            }
        );

    }


    // =====================================
    // Add Form
    // =====================================

    function renderAddForm() {

        const licenses =
            LicenseManager
                .getActiveLicenses();


        const activeGrades =
            licenses.map(
                function (license) {

                    return license.gradeId;

                }
            );


        const grades =
            LicenseManager
                .getGrades();


        const options =
            Object.keys(grades)

                .filter(
                    function (gradeId) {

                        return (
                            !activeGrades.includes(
                                gradeId
                            )
                        );

                    }
                )

                .map(
                    function (gradeId) {

                        return `

                            <option
                                value="${gradeId}"
                            >
                                ${grades[gradeId]}
                            </option>

                        `;

                    }
                )

                .join("");


        container.innerHTML = `

            <div
                class="tahouri-license-screen"
            >

                <div
                    class="tahouri-license-wrapper"
                >

                    <div
                        class="tahouri-license-header"
                    >

                        <div
                            class="tahouri-license-header-icon"
                        >
                            ➕
                        </div>

                        <h2>
                            افزودن پایه
                        </h2>

                        <p>
                            کد پایه جدید را وارد کنید.
                        </p>

                    </div>


                    <div
                        class="tahouri-license-form"
                    >

                        <label
                            class="tahouri-license-label"
                            for="tahouriLicenseGrade"
                        >
                            پایه تحصیلی
                        </label>


                        <select
                            id="tahouriLicenseGrade"
                            class="tahouri-license-select"
                        >

                            <option value="">
                                انتخاب پایه
                            </option>

                            ${options}

                        </select>


                        <input
                            id="tahouriLicenseCode"
                            class="tahouri-license-input"
                            type="text"
                            autocomplete="off"
                            placeholder="کد فعال‌سازی"
                        />


                        <div
                            id="tahouriLicenseError"
                            class="tahouri-license-error"
                        ></div>


                        <button
                            id="tahouriLicenseSubmit"
                            class="tahouri-license-add"
                            type="button"
                        >
                            🔓 فعال‌سازی پایه
                        </button>


                        <button
                            id="tahouriLicenseCancel"
                            class="tahouri-license-back"
                            type="button"
                        >
                            ← بازگشت
                        </button>


                        <div
                            class="tahouri-license-note"
                        >
                            هر کد فقط برای یک پایه معتبر است.
                            <br>
                            هر پایه مجوز مستقل خود را دارد.
                            <br>
                            اعتبار مجوز از ۱ مهر تا ۳۱ شهریور
                            سال تحصیلی است.
                        </div>

                    </div>

                </div>

            </div>

        `;


        const grade =
            container.querySelector(
                "#tahouriLicenseGrade"
            );


        const code =
            container.querySelector(
                "#tahouriLicenseCode"
            );


        const submit =
            container.querySelector(
                "#tahouriLicenseSubmit"
            );


        const cancel =
            container.querySelector(
                "#tahouriLicenseCancel"
            );


        const error =
            container.querySelector(
                "#tahouriLicenseError"
            );


        function submitLicense() {

            error.style.display =
                "none";


            const result =
                LicenseManager.activate(
                    code.value,
                    grade.value
                );


            if (
                !result.valid
            ) {

                error.textContent =
                    result.message;

                error.style.display =
                    "block";

                return;

            }


            renderList();

        }


        submit.addEventListener(
            "click",
            submitLicense
        );


        code.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                ) {

                    submitLicense();

                }

            }
        );


        cancel.addEventListener(
            "click",
            renderList
        );

    }


    // =====================================
    // Public API
    // =====================================

    window.LicenseScreen = {

        open:
            render

    };


    console.log(
        "License Screen Ready"
    );

})();