// =====================================
// Tahouri Edu Platform
// Version 5.1
// Screen Manager
//
// Responsibilities:
// - Home
// - Grades
// - Subjects
// - Chapters
// - Activity List Bridge
// - Dashboard Bridge
// - Reports Bridge
// - Finish Bridge
// - Profile Bridge
//
// Activity rendering is handled by
// Activity-specific Screens.
// =====================================


const Screen = {


    // =====================================
    // HOME SCREEN
    // =====================================

    showHome: function () {

        const app =
            document.getElementById(
                "app"
            );


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
                        id="continueLearningBtn">

                        ▶ ادامه یادگیری

                    </button>


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
                        id="achievementBtn">

                        🏆 دستاوردها

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

        document
            .getElementById(
                "gradesBtn"
            )
            .onclick =
                function () {

                    Screen.showGrades();

                };


        // =================================
        // PROFILE
        // =================================

        document
            .getElementById(
                "profileBtn"
            )
            .onclick =
                function () {

                    Screen.showProfile();

                };


        // =================================
        // DASHBOARD
        // =================================

        document
            .getElementById(
                "dashboardBtn"
            )
            .onclick =
                function () {

                    Navigation.openDashboard();

                };


        // =================================
        // REPORTS
        // =================================

        document
            .getElementById(
                "reportsBtn"
            )
            .onclick =
                function () {

                    if (
                        typeof ReportsController !==
                        "undefined"
                    ) {

                        ReportsController.open();

                    }

                };


        // =================================
        // CONTINUE LEARNING
        // =================================

        document
            .getElementById(
                "continueLearningBtn"
            )
            .onclick =
                function () {

                    if (
                        typeof ActivityHistory ===
                        "undefined"
                    ) {

                        alert(
                            "سیستم سابقه فعالیت در دسترس نیست."
                        );

                        return;

                    }


                    const activity =
                        ActivityHistory.get();


                    if (!activity) {

                        alert(
                            "هنوز فعالیتی برای ادامه وجود ندارد."
                        );

                        return;

                    }


                    if (
                        typeof ContentLockManager !==
                        "undefined"

                        &&

                        !ContentLockManager.canOpen(
                            activity.id
                        )
                    ) {

                        alert(
                            "این فعالیت در حال حاضر قفل است."
                        );

                        return;

                    }


                    console.log(
                        "Continue Learning:",
                        activity
                    );


                    // =================================
                    // RESTORE NAVIGATION
                    // =================================

                    if (
                        typeof Navigation !==
                        "undefined"
                    ) {

                        if (
                            activity.grade
                        ) {

                            Navigation.selectGrade(
                                activity.grade
                            );

                        }


                        if (
                            activity.subject
                        ) {

                            Navigation.selectSubject(
                                activity.subject
                            );

                        }


                        if (
                            activity.chapter
                        ) {

                            Navigation.selectChapter(
                                activity.chapter
                            );

                        }


                        Navigation.selectActivity(
                            activity.id
                        );

                    }


                    // =================================
                    // START ACTIVITY
                    // =================================

                    if (
                        typeof App !==
                        "undefined"

                        &&

                        typeof App.startActivity ===
                        "function"
                    ) {

                        App.startActivity(
                            activity
                        );

                        return;

                    }


                    console.error(
                        "App.startActivity Not Available"
                    );

                };


        // =================================
        // ACHIEVEMENTS
        // =================================

        document
            .getElementById(
                "achievementBtn"
            )
            .onclick =
                function () {

                    alert(
                        "در نسخه بعدی فعال می‌شود."
                    );

                };


        // =================================
        // SETTINGS
        // =================================

        document
            .getElementById(
                "settingsBtn"
            )
            .onclick =
                function () {

                    alert(
                        "در نسخه بعدی فعال می‌شود."
                    );

                };


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
            document.getElementById(
                "app"
            );


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


                <h2>
                    انتخاب پایه
                </h2>


                <div id="gradesContainer">

                    ${
                        grades
                            .map(
                                function (grade) {

                                    return `

                                        <button
                                            class="gradeBtn"
                                            data-id="${grade.id}">

                                            ${grade.title}

                                        </button>

                                    `;

                                }
                            )
                            .join("")
                    }

                </div>


                <br>


                <button
                    id="backHomeBtn">

                    🏠 بازگشت به خانه

                </button>

            </div>

        `;


        document
            .querySelectorAll(
                ".gradeBtn"
            )
            .forEach(
                function (btn) {

                    btn.onclick =
                        function () {

                            const gradeId =
                                this.dataset.id;


                            Navigation.selectGrade(
                                gradeId
                            );


                            Screen.showSubjects(
                                gradeId
                            );

                        };

                }
            );


        document
            .getElementById(
                "backHomeBtn"
            )
            .onclick =
                function () {

                    Screen.showHome();

                };


        console.log(
            "Grades Displayed",
            grades.length
        );

    },


    // =====================================
    // SUBJECTS SCREEN
    // =====================================

    showSubjects: function (
        gradeId
    ) {

        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        const gradeSubjects =
            subjects.filter(
                function (subject) {

                    return (
                        subject.grades.includes(
                            gradeId
                        )
                    );

                }
            );


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

                    ⬅ بازگشت به پایه‌ها

                </button>

            </div>

        `;


        document
            .querySelectorAll(
                ".subjectBtn"
            )
            .forEach(
                function (btn) {

                    btn.onclick =
                        function () {

                            const subjectId =
                                this.dataset.id;


                            Navigation.selectSubject(
                                subjectId
                            );


                            Screen.showChapters(
                                gradeId,
                                subjectId
                            );

                        };

                }
            );


        document
            .getElementById(
                "backGradesBtn"
            )
            .onclick =
                function () {

                    Screen.showGrades();

                };

    },


    // =====================================
    // CHAPTERS SCREEN
    // =====================================

    showChapters: function (
        gradeId,
        subjectId
    ) {

        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "App Container Not Found"
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


        document
            .querySelectorAll(
                ".chapterBtn"
            )
            .forEach(
                function (btn) {

                    btn.onclick =
                        function () {

                            const chapterId =
                                this.dataset.id;


                            Navigation.selectChapter(
                                chapterId
                            );


                            Screen.showActivities(
                                gradeId,
                                subjectId,
                                chapterId
                            );

                        };

                }
            );


        document
            .getElementById(
                "backSubjectsBtn"
            )
            .onclick =
                function () {

                    Screen.showSubjects(
                        gradeId
                    );

                };

    },


    // =====================================
    // ACTIVITIES SCREEN BRIDGE
    // =====================================

    showActivities: function (
        gradeId,
        subjectId,
        chapterId
    ) {

        if (
            typeof ActivityScreen ===
            "undefined"
        ) {

            console.error(
                "ActivityScreen Not Available"
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
            chapterActivities.length
        );


        ActivityScreen.show(
            chapterActivities
        );

    },


    // =====================================
    // DASHBOARD BRIDGE
    // =====================================

    showDashboard: function () {

        Navigation.openDashboard();

    },


    // =====================================
    // REPORTS BRIDGE
    // =====================================

    showReports: function () {

        if (
            typeof ReportsController !==
            "undefined"
        ) {

            ReportsController.open();

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
    "Screen Manager v5.1 Ready"
);