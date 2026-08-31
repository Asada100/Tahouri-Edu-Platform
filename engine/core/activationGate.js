// =====================================
// Tahouri Edu Platform
// Activation Gate
// Version 4.0
// =====================================

(function () {

    "use strict";

    // =====================================
    // State
    // =====================================

    let gateElement = null;
    let selectedGradeId = null;


    // =====================================
    // Create Gate
    // =====================================

    function createGate() {

        const oldGate =
            document.getElementById(
                "tahouriActivationGate"
            );

        if (oldGate) {
            oldGate.remove();
        }

        gateElement =
            document.createElement("div");

        gateElement.id =
            "tahouriActivationGate";

        gateElement.style.position = "fixed";
        gateElement.style.inset = "0";
        gateElement.style.zIndex = "999999";
        gateElement.style.display = "flex";
        gateElement.style.alignItems = "center";
        gateElement.style.justifyContent = "center";
        gateElement.style.padding = "20px";
        gateElement.style.boxSizing = "border-box";
        gateElement.style.direction = "rtl";
        gateElement.style.background = "#f1f5f9";
        gateElement.style.fontFamily =
            '"B Yekan", "Vazirmatn", Tahoma, Arial, sans-serif';

        document.body.appendChild(
            gateElement
        );

        return gateElement;
    }


    // =====================================
    // Render
    // =====================================

    function renderGate() {

        if (
            !window.LicenseManager
        ) {

            console.error(
                "Activation Gate: LicenseManager not found."
            );

            return;
        }


        const gate =
            createGate();


        const grades =
            LicenseManager.getGrades();


        const licenses =
            LicenseManager.getActiveLicenses();


        let gradeHTML = "";


        Object.keys(grades).forEach(
            function (gradeId) {

                const active =
                    LicenseManager.isGradeActivated(
                        gradeId
                    );


                gradeHTML += `
                    <button
                        type="button"
                        data-grade-id="${gradeId}"
                        style="
                            width:100%;
                            padding:18px;
                            margin-bottom:10px;
                            border-radius:12px;
                            border:1px solid #cbd5e1;
                            background:${active ? "#dcfce7" : "#f8fafc"};
                            cursor:pointer;
                            font-family:inherit;
                            font-size:16px;
                            text-align:right;
                        "
                    >
                        ${active ? "🎓" : "🔒"}
                        ${grades[gradeId]}
                        <br>
                        <small>
                            ${
                                active
                                    ? "✓ مجاز - ورود به پایه"
                                    : "🔒 قفل - نیاز به کد فعال‌سازی"
                            }
                        </small>
                    </button>
                `;

            }
        );


        gate.innerHTML = `
            <div
                style="
                    width:min(600px,100%);
                    max-height:90vh;
                    overflow:auto;
                    background:white;
                    padding:25px;
                    border-radius:20px;
                    box-sizing:border-box;
                    box-shadow:0 20px 50px rgba(0,0,0,.15);
                "
            >

                <div
                    style="
                        text-align:center;
                        margin-bottom:20px;
                    "
                >

                    <div style="font-size:40px;">
                        🔐
                    </div>

                    <h2>
                        پلتفرم آموزشی طهوری
                    </h2>

                    <p>
                        پایه‌ای را که مجوز استفاده از آن را دارید
                        انتخاب کنید.
                    </p>

                    <div
                        style="
                            padding:12px;
                            background:#f0fdf4;
                            border-radius:12px;
                        "
                    >
                        تعداد پایه‌های فعال:
                        <strong>
                            ${licenses.length}
                        </strong>

                        <br>

                        سال تحصیلی:
                        <strong>
                            ${LicenseManager.getAcademicYearText()}
                        </strong>
                    </div>

                </div>


                <div id="tahouriGradeList">
                    ${gradeHTML}
                </div>


                <div
                    id="tahouriActivationForm"
                    style="
                        display:none;
                        margin-top:20px;
                        padding:20px;
                        background:#f8fafc;
                        border-radius:15px;
                    "
                >

                    <h3
                        id="tahouriActivationTitle"
                    >
                        فعال‌سازی پایه
                    </h3>


                    <p
                        id="tahouriActivationMessage"
                    ></p>


                    <input
                        id="tahouriActivationCode"
                        type="text"
                        autocomplete="off"
                        placeholder="کد فعال‌سازی"
                        style="
                            width:100%;
                            height:50px;
                            box-sizing:border-box;
                            padding:10px;
                            border:1px solid #cbd5e1;
                            border-radius:10px;
                            text-align:center;
                            direction:ltr;
                            font-size:16px;
                        "
                    />


                    <div
                        id="tahouriActivationError"
                        style="
                            display:none;
                            margin-top:10px;
                            padding:10px;
                            background:#fee2e2;
                            color:#b91c1c;
                            border-radius:10px;
                            text-align:center;
                        "
                    ></div>


                    <button
                        id="tahouriActivationButton"
                        type="button"
                        style="
                            width:100%;
                            margin-top:12px;
                            padding:14px;
                            border:0;
                            border-radius:10px;
                            background:#2563eb;
                            color:white;
                            font-family:inherit;
                            font-size:15px;
                            font-weight:bold;
                            cursor:pointer;
                        "
                    >
                        🔓 فعال‌سازی پایه
                    </button>


                    <button
                        id="tahouriActivationCancel"
                        type="button"
                        style="
                            width:100%;
                            margin-top:8px;
                            padding:12px;
                            border:1px solid #cbd5e1;
                            border-radius:10px;
                            background:white;
                            font-family:inherit;
                            cursor:pointer;
                        "
                    >
                        بازگشت
                    </button>

                </div>


                <div
                    style="
                        margin-top:20px;
                        padding:12px;
                        background:#f8fafc;
                        border-radius:10px;
                        text-align:center;
                        font-size:12px;
                        color:#64748b;
                        line-height:2;
                    "
                >
                    انتخاب پایه به‌تنهایی مجوز ایجاد نمی‌کند.
                    <br>
                    فقط پایه‌هایی که مجوز معتبر دارند قابل ورود هستند.
                </div>

            </div>
        `;


        const buttons =
            gate.querySelectorAll(
                "[data-grade-id]"
            );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const gradeId =
                            button.getAttribute(
                                "data-grade-id"
                            );


                        handleGradeClick(
                            gradeId
                        );

                    }
                );

            }
        );


        const cancel =
            document.getElementById(
                "tahouriActivationCancel"
            );


        if (cancel) {

            cancel.addEventListener(
                "click",
                function () {

                    hideActivationForm();

                }
            );

        }

    }


    // =====================================
    // Grade Click
    // =====================================

    function handleGradeClick(
        gradeId
    ) {

        console.log(
            "Activation Gate: Grade Selected:",
            gradeId
        );


        const activated =
            LicenseManager.isGradeActivated(
                gradeId
            );


        if (activated) {

            console.log(
                "Activation Gate: Grade Authorized:",
                gradeId
            );


            enterGrade(
                gradeId
            );


            return;
        }


        console.log(
            "Activation Gate: Grade Locked:",
            gradeId
        );


        showActivationForm(
            gradeId
        );

    }


    // =====================================
    // Show Activation Form
    // =====================================

    function showActivationForm(
        gradeId
    ) {

        selectedGradeId =
            gradeId;


        const grades =
            LicenseManager.getGrades();


        const form =
            document.getElementById(
                "tahouriActivationForm"
            );


        const title =
            document.getElementById(
                "tahouriActivationTitle"
            );


        const message =
            document.getElementById(
                "tahouriActivationMessage"
            );


        const code =
            document.getElementById(
                "tahouriActivationCode"
            );


        const error =
            document.getElementById(
                "tahouriActivationError"
            );


        if (
            !form ||
            !title ||
            !message ||
            !code ||
            !error
        ) {

            return;
        }


        title.textContent =
            "🔐 فعال‌سازی " +
            grades[gradeId];


        message.textContent =
            "این پایه هنوز فعال نشده است. " +
            "برای ورود، کد فعال‌سازی همین پایه را وارد کنید.";


        code.value = "";


        error.textContent = "";


        error.style.display =
            "none";


        form.style.display =
            "block";


        code.focus();

    }


    // =====================================
    // Hide Activation Form
    // =====================================

    function hideActivationForm() {

        selectedGradeId =
            null;


        const form =
            document.getElementById(
                "tahouriActivationForm"
            );


        if (form) {

            form.style.display =
                "none";

        }

    }


    // =====================================
    // Activate Selected Grade
    // =====================================

    function activateSelectedGrade() {

        if (!selectedGradeId) {

            return;
        }


        const code =
            document.getElementById(
                "tahouriActivationCode"
            );


        const error =
            document.getElementById(
                "tahouriActivationError"
            );


        if (
            !code ||
            !error
        ) {

            return;
        }


        error.style.display =
            "none";


        const result =
            LicenseManager.activate(
                code.value,
                selectedGradeId
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


        console.log(
            "Tahouri Activation Successful:",
            result.license
        );


        /*
         * بعد از فعال‌سازی،
         * فقط همان پایه قابل ورود است.
         */

        enterGrade(
            selectedGradeId
        );

    }


    // =====================================
    // Enter Grade
    // =====================================

    function enterGrade(
        gradeId
    ) {

        /*
         * کنترل نهایی امنیتی:
         * حتی اگر somehow این تابع با پایه غیرمجاز
         * فراخوانی شود، اجازه ورود نمی‌دهیم.
         */

        if (
            !LicenseManager.isGradeActivated(
                gradeId
            )
        ) {

            console.warn(
                "Activation Gate: Unauthorized Grade:",
                gradeId
            );


            showActivationForm(
                gradeId
            );


            return;
        }


        console.log(
            "Activation Gate: Entering Authorized Grade:",
            gradeId
        );


        const gate =
            document.getElementById(
                "tahouriActivationGate"
            );


        if (gate) {

            gate.remove();

        }


        gateElement =
            null;


        document.body.style.overflow =
            "";


        /*
         * انتخاب پایه در سیستم Navigation
         */

        if (
            window.Navigation &&
            typeof Navigation.selectGrade ===
            "function"
        ) {

            Navigation.selectGrade(
                gradeId
            );

        }


        /*
         * اگر Navigation.selectGrade وجود نداشت،
         * از Router استفاده می‌کنیم.
         */

        else if (
            window.Router &&
            typeof Router.goTo ===
            "function"
        ) {

            Router.goTo(
                "grade",
                gradeId
            );

        }


        console.log(
            "Activation Gate: Application Unlocked:",
            gradeId
        );

    }


    // =====================================
    // Initialize
    // =====================================

    function initialize() {

        console.log(
            "Tahouri Activation Gate Ready"
        );


        if (
            !window.LicenseManager
        ) {

            console.error(
                "Activation Gate: LicenseManager not found."
            );


            return;
        }


        /*
         * نسخه 4:
         *
         * همیشه ابتدا صفحه انتخاب پایه نمایش داده می‌شود.
         *
         * وجود یک لایسنس به معنی آزاد بودن
         * تمام پایه‌ها نیست.
         */

        renderGate();

    }


    // =====================================
    // Public API
    // =====================================

    const api = {

        open:
            function () {

                renderGate();

            },


        close:
            function () {

                const gate =
                    document.getElementById(
                        "tahouriActivationGate"
                    );


                if (gate) {

                    gate.remove();

                }


                gateElement =
                    null;


                document.body.style.overflow =
                    "";

            },


        isActivated:
            function () {

                return LicenseManager
                    .isActivated();

            },


        isGradeActivated:
            function (
                gradeId
            ) {

                return LicenseManager
                    .isGradeActivated(
                        gradeId
                    );

            },


        openGrade:
            function (
                gradeId
            ) {

                handleGradeClick(
                    gradeId
                );

            }

    };


    // =====================================
    // Global
    // =====================================

    window.ActivationGate =
        api;


    window.__TahouriActivationGate__ =
        api;


    // =====================================
    // Activation Button
    // =====================================

    document.addEventListener(
        "click",
        function (event) {

            if (
                event.target &&
                event.target.id ===
                "tahouriActivationButton"
            ) {

                activateSelectedGrade();

            }

        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Enter"
            ) {

                return;
            }


            const code =
                document.getElementById(
                    "tahouriActivationCode"
                );


            if (
                code &&
                document.activeElement === code
            ) {

                activateSelectedGrade();

            }

        }
    );


    // =====================================
    // Start
    // =====================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }
    else {

        initialize();

    }


})();