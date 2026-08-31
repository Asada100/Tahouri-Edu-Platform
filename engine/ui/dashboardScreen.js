// =====================================
// Tahouri Edu Platform
// Dashboard Screen
// Version 5.4
//
// Stable Dashboard
// Continue Learning Fix
// =====================================


const DashboardScreen = {

    // =====================================
    // SHOW DASHBOARD
    // =====================================

    show: function (data) {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Missing"
            );

            return;

        }


        data = data || {};


        // =====================================
        // PROFILE
        // =====================================

        let profile = {};


        if (
            typeof ProfileManager !==
            "undefined" &&

            typeof ProfileManager.get ===
            "function"
        ) {

            profile =
                ProfileManager.get() || {};

        }


        // =====================================
        // STATISTICS
        // =====================================

        let overall = {};


        if (
            data.overall &&

            typeof data.overall ===
            "object"
        ) {

            overall =
                data.overall;

        }

        else if (
            typeof StatisticsManager !==
            "undefined" &&

            typeof StatisticsManager.get ===
            "function"
        ) {

            overall =
                StatisticsManager.get() || {};

        }


        // =====================================
        // PROFILE NAME
        // =====================================

        let profileName =
            "دانش‌آموز";


        if (
            typeof profile.name ===
            "string" &&

            profile.name.trim() !== ""
        ) {

            profileName =
                profile.name;

        }


        // =====================================
        // GRADE
        // =====================================

        let gradeTitle =
            "انتخاب نشده";


        if (
            profile.grade &&

            typeof grades !==
            "undefined" &&

            Array.isArray(grades)
        ) {

            for (
                let i = 0;
                i < grades.length;
                i++
            ) {

                if (
                    grades[i].id ===
                    profile.grade
                ) {

                    gradeTitle =
                        grades[i].title;

                    break;

                }

            }

        }


        // =====================================
        // STATISTICS VALUES
        // =====================================

        const totalActivities =
            Number(
                overall.totalActivities
            ) || 0;


        const totalScore =
            Number(
                overall.totalScore
            ) || 0;


        const averageScore =
            Number(
                overall.averageScore
            ) || 0;


        const bestScore =
            Number(
                overall.bestScore
            ) || 0;


        const totalCorrect =
            Number(
                overall.totalCorrect
            ) || 0;


        const totalWrong =
            Number(
                overall.totalWrong
            ) || 0;


        // =====================================
        // CONTINUE LEARNING
        //
        // IMPORTANT:
        // Only use data supplied by
        // DashboardController.
        //
        // NEVER use ActivityHistory here.
        // =====================================

        let continueActivityId =
            null;


        let continueActivityTitle =
            "هنوز فعالیتی برای ادامه وجود ندارد";


        let continueSubject =
            "";


        let continueChapter =
            "";


        if (
            data.continueLearning &&

            typeof data.continueLearning ===
            "object"
        ) {

            continueActivityId =
                data.continueLearning.activityId ||
                null;


            continueActivityTitle =
                data.continueLearning.activityTitle ||
                continueActivityTitle;


            continueSubject =
                data.continueLearning.subject ||
                "";


            continueChapter =
                data.continueLearning.chapter ||
                "";

        }


        // =====================================
        // CONTINUE BUTTON TEXT
        // =====================================

        let continueButtonText =
            "▶ ادامه یادگیری";


        if (!continueActivityId) {

            continueButtonText =
                "📚 رفتن به درس‌ها";

        }


        // =====================================
        // DASHBOARD HTML
        // =====================================

        const html = [

            '<div class="screen">',

            '<h1>📊 داشبورد</h1>',

            '<p>مرکز کنترل یادگیری</p>',

            '<hr>',


            // =================================
            // PROFILE
            // =================================

            '<div class="dashboard-profile">',

            '<h2>👤 ',
            profileName,
            '</h2>',

            '<p>🎓 پایه: ',
            gradeTitle,
            '</p>',

            '<button id="dashboardProfileBtn" type="button">',
            '👤 پروفایل من',
            '</button>',

            '</div>',

            '<hr>',


            // =================================
            // LEARNING STATUS
            // =================================

            '<h2>📚 وضعیت یادگیری</h2>',

            '<div class="dashboard-cards">',


            '<div class="dashboard-card">',

            '<h3>🎯 فعالیت‌ها</h3>',

            '<p>',
            totalActivities,
            '</p>',

            '</div>',


            '<div class="dashboard-card">',

            '<h3>⭐ امتیاز کل</h3>',

            '<p>',
            totalScore,
            '</p>',

            '</div>',


            '<div class="dashboard-card">',

            '<h3>📈 میانگین</h3>',

            '<p>',
            averageScore,
            '</p>',

            '</div>',


            '<div class="dashboard-card">',

            '<h3>🏆 بهترین امتیاز</h3>',

            '<p>',
            bestScore,
            '</p>',

            '</div>',


            '</div>',

            '<hr>',


            // =================================
            // ANSWERS
            // =================================

            '<div class="dashboard-summary">',

            '<p>✅ پاسخ صحیح: ',
            totalCorrect,
            '</p>',

            '<p>❌ پاسخ اشتباه: ',
            totalWrong,
            '</p>',

            '</div>',

            '<hr>',


            // =================================
            // CONTINUE LEARNING
            // =================================

            '<div class="dashboard-continue">',

            '<h2>▶ ادامه یادگیری</h2>',

            '<p>',
            continueActivityTitle,
            '</p>',


            (
                continueSubject ||
                continueChapter
            )

                ? (
                    '<p>' +

                    continueSubject +

                    (
                        continueSubject &&
                        continueChapter
                            ? " ← "
                            : ""
                    ) +

                    continueChapter +

                    '</p>'
                )

                : "",


            '<button id="dashboardContinueBtn" type="button">',

            continueButtonText,

            '</button>',

            '</div>',

            '<hr>',


            // =================================
            // REPORTS
            // =================================

            '<button id="dashboardReportsBtn" type="button">',

            '📈 گزارش عملکرد',

            '</button>',


            // =================================
            // GRADES
            // =================================

            '<button id="dashboardGradesBtn" type="button">',

            '🎓 انتخاب پایه',

            '</button>',


            // =================================
            // HOME
            // =================================

            '<button id="dashboardHomeBtn" type="button">',

            '🏠 صفحه اصلی',

            '</button>',


            '</div>'

        ].join("");


        app.innerHTML =
            html;


        // =====================================
        // PROFILE BUTTON
        // =====================================

        const profileBtn =
            document.getElementById(
                "dashboardProfileBtn"
            );


        if (profileBtn) {

            profileBtn.onclick =
                function () {

                    if (
                        typeof Screen !==
                        "undefined" &&

                        typeof Screen.showProfile ===
                        "function"
                    ) {

                        Screen.showProfile();

                    }

                    else {

                        console.error(
                            "Screen.showProfile Not Found"
                        );

                    }

                };

        }


        // =====================================
        // CONTINUE LEARNING BUTTON
        // =====================================

        const continueBtn =
            document.getElementById(
                "dashboardContinueBtn"
            );


        if (continueBtn) {

            continueBtn.onclick =
                function () {


                    // =================================
                    // Activity Exists
                    // =================================

                    if (continueActivityId) {

                        console.log(
                            "Dashboard: Continuing Activity:",
                            continueActivityId
                        );


                        // ---------------------------------
                        // Correct Global App Controller
                        // ---------------------------------

                        if (
                            typeof App !==
                            "undefined" &&

                            typeof App.startActivity ===
                            "function"
                        ) {

                            App.startActivity(
                                continueActivityId
                            );

                            return;

                        }


                        console.error(
                            "App.startActivity Not Found"
                        );

                        return;

                    }


                    // =================================
                    // No Activity
                    // =================================

                    console.log(
                        "Dashboard: No Activity To Continue"
                    );


                    if (
                        typeof Screen !==
                        "undefined" &&

                        typeof Screen.showGrades ===
                        "function"
                    ) {

                        Screen.showGrades();

                    }

                    else {

                        console.error(
                            "Screen.showGrades Not Found"
                        );

                    }

                };

        }


        // =====================================
        // REPORTS BUTTON
        // =====================================

        const reportsBtn =
            document.getElementById(
                "dashboardReportsBtn"
            );


        if (reportsBtn) {

            reportsBtn.onclick =
                function () {

                    if (
                        typeof ReportsController !==
                        "undefined" &&

                        typeof ReportsController.open ===
                        "function"
                    ) {

                        ReportsController.open();

                    }

                    else {

                        console.error(
                            "ReportsController.open Not Found"
                        );

                    }

                };

        }


        // =====================================
        // GRADES BUTTON
        // =====================================

        const gradesBtn =
            document.getElementById(
                "dashboardGradesBtn"
            );


        if (gradesBtn) {

            gradesBtn.onclick =
                function () {

                    if (
                        typeof Screen !==
                        "undefined" &&

                        typeof Screen.showGrades ===
                        "function"
                    ) {

                        Screen.showGrades();

                    }

                    else {

                        console.error(
                            "Screen.showGrades Not Found"
                        );

                    }

                };

        }


        // =====================================
        // HOME BUTTON
        // =====================================

        const homeBtn =
            document.getElementById(
                "dashboardHomeBtn"
            );


        if (homeBtn) {

            homeBtn.onclick =
                function () {

                    if (
                        typeof Screen !==
                        "undefined" &&

                        typeof Screen.showHome ===
                        "function"
                    ) {

                        Screen.showHome();

                    }

                    else {

                        console.error(
                            "Screen.showHome Not Found"
                        );

                    }

                };

        }


        // =====================================
        // LOG
        // =====================================

        console.log(
            "Dashboard Displayed"
        );


        console.log(
            "Dashboard Statistics:",
            overall
        );


        console.log(
            "Dashboard Continue Activity:",
            continueActivityId
        );

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.DashboardScreen =
    DashboardScreen;


// =====================================
// READY
// =====================================

console.log(
    "Dashboard Screen v5.4 Ready"
);

