// =====================================
// Tahouri Edu Platform
// Version 5.2
// Screen Manager
//
// Responsibilities:
// - Home
// - Active Grade
// - Subjects
// - Chapters
// - Activity List Bridge
// - Dashboard Bridge
// - Reports Bridge
// - Finish Bridge
// - Profile Bridge
//
// No CSS
// No class syntax
// =====================================


const Screen = {

    // =====================================
    // HOME SCREEN
    // =====================================

    showHome: function () {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        app.innerHTML = `

            <div class="screen">

                <h1>
                    پلتفرم آموزشی طهوری
                </h1>


                <p>
                    به مرکز کنترل پلتفرم خوش آمدید
                </p>


                <hr>


                <div class="home-buttons">

                    <button
                        id="gradesBtn">

                        🎓 انتخاب پایه

                    </button>


                    <button
                        id="profileBtn">

                        👤 پروفایل من

                    </button>


                    <button
                        id="dashboardBtn">

                        📊 داشبورد

                    </button>


                    <button
                        id="reportsBtn">

                        📈 گزارش‌ها

                    </button>


                    <button
                        id="settingsBtn">

                        ⚙ تنظیمات

                    </button>

                </div>

            </div>

        `;


        // =================================
        // GRADES
        // =================================

        const gradesButton =
            document.getElementById(
                "gradesBtn"
            );


        if (gradesButton) {

            gradesButton.onclick =
                function () {

                    Screen.showGrades();

                };

        }


        // =================================
        // PROFILE
        // =================================

        const profileButton =
            document.getElementById(
                "profileBtn"
            );


        if (profileButton) {

            profileButton.onclick =
                function () {

                    Screen.showProfile();

                };

        }


        // =================================
        // DASHBOARD
        // =================================

        const dashboardButton =
            document.getElementById(
                "dashboardBtn"
            );


        if (dashboardButton) {

            dashboardButton.onclick =
                function () {

                    if (
                        typeof Navigation !==
                        "undefined"
                    ) {

                        Navigation.openDashboard();

                    }
                    else {

                        console.error(
                            "Navigation Not Available"
                        );

                    }

                };

        }


        // =================================
        // REPORTS
        // =================================

        const reportsButton =
            document.getElementById(
                "reportsBtn"
            );


        if (reportsButton) {

            reportsButton.onclick =
                function () {

                    if (
                        typeof ReportsController !==
                        "undefined"

                        &&

                        typeof ReportsController.open ===
                        "function"
                    ) {

                        ReportsController.open();

                    }
                    else {

                        console.error(
                            "ReportsController Not Available"
                        );

                    }

                };

        }


        // =================================
        // SETTINGS
        // =================================

        const settingsButton =
            document.getElementById(
                "settingsBtn"
            );


        if (settingsButton) {

            settingsButton.onclick =
                function () {

                    alert(
                        "در نسخه بعدی فعال می‌شود."
                    );

                };

        }


        console.log(
            "Home Screen Displayed"
        );

    },


    // =====================================
    // PROFILE SCREEN
    // =====================================

    showProfile: function () {

        if (
            typeof ProfileScreen ===
            "undefined"
        ) {

            console.error(
                "ProfileScreen Not Found"
            );

            return;

        }


        if (
            typeof ProfileScreen.show !==
            "function"
        ) {

            console.error(
                "ProfileScreen.show Not Available"
            );

            return;

        }


        ProfileScreen.show();


        console.log(
            "Profile Screen Opened"
        );

    },


    // =====================================
    // GRADES SCREEN
    // =====================================

    showGrades: function () {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =================================
        // Check License Manager
        // =================================

        if (
            typeof LicenseManager ===
            "undefined"
        ) {

            console.error(
                "LicenseManager Not Available"
            );

            return;

        }


        // =================================
        // Get All Grades
        // =================================

        const allGrades =
            LicenseManager.getGrades();


        // =================================
        // Get Active Grades
        // =================================

        const activeGradeIds = [];


        Object.keys(allGrades)
            .forEach(
                function (gradeId) {

                    if (
                        LicenseManager.isGradeActivated(
                            gradeId
                        )
                    ) {

                        activeGradeIds.push(
                            gradeId
                        );

                    }

                }
            );


        // =================================
        // No Active Grade
        // =================================

        if (
            activeGradeIds.length === 0
        ) {

            app.innerHTML = `

                <div class="screen">

                    <h1>
                        پلتفرم آموزشی طهوری
                    </h1>

                    <h2>
                        پایه فعال
                    </h2>

                    <p>
                        هنوز هیچ پایه‌ای فعال نشده است.
                    </p>

                    <br>

                    <button
                        id="backHomeBtn">

                        🏠 بازگشت به خانه

                    </button>

                </div>

            `;


            const backButton =
                document.getElementById(
                    "backHomeBtn"
                );


            if (backButton) {

                backButton.onclick =
                    function () {

                        Screen.showHome();

                    };

            }


            return;

        }


        // =================================
        // Render Only Active Grades
        // =================================

        const gradeButtons =
            activeGradeIds
                .map(
                    function (gradeId) {

                        return `

                            <button
                                class="gradeBtn"
                                data-id="${gradeId}">

                                ${allGrades[gradeId]}

                            </button>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div class="screen">

                <h1>
                    پلتفرم آموزشی طهوری
                </h1>


                <h2>
                    پایه فعال
                </h2>


                <div id="gradesContainer">

                    ${gradeButtons}

                </div>


                <br>


                <button
                    id="backHomeBtn">

                    🏠 بازگشت به خانه

                </button>

            </div>

        `;


        // =================================
        // Grade Buttons
        // =================================

        document
            .querySelectorAll(".gradeBtn")
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            const gradeId =
                                this.dataset.id;


                            // امنیت دوباره
                            if (
                                !LicenseManager.isGradeActivated(
                                    gradeId
                                )
                            ) {

                                alert(
                                    "این پایه فعال نیست."
                                );

                                return;

                            }


                            if (
                                typeof Navigation !==
                                "undefined"

                                &&

                                typeof Navigation.selectGrade ===
                                "function"
                            ) {

                                Navigation.selectGrade(
                                    gradeId
                                );

                            }


                            Screen.showSubjects(
                                gradeId
                            );

                        };

                }
            );


        // =================================
        // Back Home
        // =================================

        const backHomeButton =
            document.getElementById(
                "backHomeBtn"
            );


        if (backHomeButton) {

            backHomeButton.onclick =
                function () {

                    Screen.showHome();

                };

        }


        console.log(
            "Active Grades Displayed:",
            activeGradeIds
        );

    },


    // =====================================
    // SUBJECTS SCREEN
    // =====================================

    showSubjects: function (
        gradeId
    ) {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =================================
        // License Check
        // =================================

        if (
            typeof LicenseManager !==
            "undefined"
        ) {

            if (
                !LicenseManager.isGradeActivated(
                    gradeId
                )
            ) {

                alert(
                    "این پایه فعال نیست."
                );

                Screen.showGrades();

                return;

            }

        }


        // =================================
        // Check Subjects
        // =================================

        if (
            typeof subjects ===
            "undefined"
        ) {

            console.error(
                "Subjects Data Not Available"
            );

            return;

        }


        const gradeSubjects =
            subjects.filter(
                function (subject) {

                    return (
                        Array.isArray(
                            subject.grades
                        )

                        &&

                        subject.grades.includes(
                            gradeId
                        )
                    );

                }
            );


        // =================================
        // Render
        // =================================

        app.innerHTML = `

            <div class="screen">

                <h1>
                    انتخاب درس
                </h1>


                <div id="subjectsContainer">

                    ${
                        gradeSubjects
                            .map(
                                function (subject) {

                                    return `

                                        <button
                                            class="subjectBtn"
                                            data-id="${subject.id}">

                                            ${subject.title}

                                        </button>

                                    `;

                                }
                            )
                            .join("")
                    }

                </div>


                <br>


                <button
                    id="backGradesBtn">

                    ⬅ بازگشت به پایه

                </button>

            </div>

        `;


        // =================================
        // Subject Buttons
        // =================================

        document
            .querySelectorAll(".subjectBtn")
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            const subjectId =
                                this.dataset.id;


                            if (
                                typeof Navigation !==
                                "undefined"

                                &&

                                typeof Navigation.selectSubject ===
                                "function"
                            ) {

                                Navigation.selectSubject(
                                    subjectId
                                );

                            }


                            Screen.showChapters(
                                gradeId,
                                subjectId
                            );

                        };

                }
            );


        // =================================
        // Back
        // =================================

        const backButton =
            document.getElementById(
                "backGradesBtn"
            );


        if (backButton) {

            backButton.onclick =
                function () {

                    Screen.showGrades();

                };

        }


        console.log(
            "Subjects Displayed:",
            gradeSubjects.length
        );

    },


    // =====================================
    // CHAPTERS SCREEN
    // =====================================

    showChapters: function (
        gradeId,
        subjectId
    ) {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =================================
        // License Check
        // =================================

        if (
            typeof LicenseManager !==
            "undefined"
        ) {

            if (
                !LicenseManager.isGradeActivated(
                    gradeId
                )
            ) {

                alert(
                    "این پایه فعال نیست."
                );

                Screen.showGrades();

                return;

            }

        }


        // =================================
        // Check Chapters
        // =================================

        if (
            typeof chapters ===
            "undefined"
        ) {

            console.error(
                "Chapters Data Not Available"
            );

            return;

        }


        const subjectChapters =
            chapters.filter(
                function (chapter) {

                    return (

                        chapter.grade ===
                        gradeId

                        &&

                        chapter.subject ===
                        subjectId

                    );

                }
            );


        // =================================
        // Render
        // =================================

        app.innerHTML = `

            <div class="screen">

                <h1>
                    انتخاب فصل
                </h1>


                <div id="chaptersContainer">

                    ${
                        subjectChapters
                            .map(
                                function (chapter) {

                                    return `

                                        <button
                                            class="chapterBtn"
                                            data-id="${chapter.id}">

                                            ${chapter.title}

                                        </button>

                                    `;

                                }
                            )
                            .join("")
                    }

                </div>


                <br>


                <button
                    id="backSubjectsBtn">

                    ⬅ بازگشت به درس‌ها

                </button>

            </div>

        `;


        // =================================
        // Chapter Buttons
        // =================================

        document
            .querySelectorAll(".chapterBtn")
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            const chapterId =
                                this.dataset.id;


                            if (
                                typeof Navigation !==
                                "undefined"

                                &&

                                typeof Navigation.selectChapter ===
                                "function"
                            ) {

                                Navigation.selectChapter(
                                    chapterId
                                );

                            }


                            Screen.showActivities(
                                gradeId,
                                subjectId,
                                chapterId
                            );

                        };

                }
            );


        // =================================
        // Back
        // =================================

        const backButton =
            document.getElementById(
                "backSubjectsBtn"
            );


        if (backButton) {

            backButton.onclick =
                function () {

                    Screen.showSubjects(
                        gradeId
                    );

                };

        }


        console.log(
            "Chapters Displayed:",
            subjectChapters.length
        );

    },


    // =====================================
    // ACTIVITIES SCREEN
    // =====================================

    showActivities: function (
        gradeId,
        subjectId,
        chapterId
    ) {

        // =================================
        // License Check
        // =================================

        if (
            typeof LicenseManager !==
            "undefined"
        ) {

            if (
                !LicenseManager.isGradeActivated(
                    gradeId
                )
            ) {

                alert(
                    "این پایه فعال نیست."
                );

                Screen.showGrades();

                return;

            }

        }


        // =================================
        // ActivityScreen Check
        // =================================

        if (
            typeof ActivityScreen ===
            "undefined"
        ) {

            console.error(
                "ActivityScreen Not Available"
            );

            return;

        }


        // =================================
        // Activities Data
        // =================================

        if (
            typeof activities ===
            "undefined"
        ) {

            console.error(
                "Activities Data Not Available"
            );

            return;

        }


        const chapterActivities =
            activities.filter(
                function (activity) {

                    return (

                        activity.grade ===
                        gradeId

                        &&

                        activity.subject ===
                        subjectId

                        &&

                        activity.chapter ===
                        chapterId

                    );

                }
            );


        console.log(
            "Screen Activity Bridge:",
            {
                grade: gradeId,
                subject: subjectId,
                chapter: chapterId,
                count: chapterActivities.length
            }
        );


        // =================================
        // IMPORTANT
        // =================================
        // بازی‌های فصل توسط ActivityScreen
        // نمایش داده می‌شوند.
        // اینجا مستقیماً بازی را اجرا نمی‌کنیم.

        ActivityScreen.show(
            chapterActivities
        );

    },


    // =====================================
    // DASHBOARD BRIDGE
    // =====================================

    showDashboard: function () {

        if (
            typeof Navigation !==
            "undefined"

            &&

            typeof Navigation.openDashboard ===
            "function"
        ) {

            Navigation.openDashboard();

        }
        else {

            console.error(
                "Navigation.openDashboard Not Available"
            );

        }

    },


    // =====================================
    // REPORTS BRIDGE
    // =====================================

    showReports: function () {

        if (
            typeof ReportsController !==
            "undefined"

            &&

            typeof ReportsController.open ===
            "function"
        ) {

            ReportsController.open();

        }
        else {

            console.error(
                "ReportsController Not Available"
            );

        }

    },


    // =====================================
    // FINISH BRIDGE
    // =====================================

    showFinish: function (
        result
    ) {

        console.log(
            "SHOW FINISH",
            result
        );


        if (
            typeof ResultModal !==
            "undefined"

            &&

            typeof ResultModal.show ===
            "function"
        ) {

            ResultModal.show(
                result
            );

        }
        else {

            console.error(
                "ResultModal Not Available"
            );

        }

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.Screen =
    Screen;


// =====================================
// READY
// =====================================

console.log(
    "Screen Manager v5.2 Ready"
);