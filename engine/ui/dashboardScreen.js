// =====================================
// Tahouri Edu Platform
// Version 4.2
// Dashboard Screen
// Profile Integration
// =====================================

const DashboardScreen = {

    // =====================================
    // Show Dashboard
    // =====================================

    show: function () {

        const app =
            document.getElementById("app");

        if (!app) {

            console.error(
                "App Container Missing"
            );

            return;
        }


        // =====================================
        // Profile
        // =====================================

        let profile = {
            name: "",
            grade: null
        };


        if (
            typeof ProfileManager !==
            "undefined"
            &&
            typeof ProfileManager.get ===
            "function"
        ) {

            profile =
                ProfileManager.get() ||
                profile;

        }


        // =====================================
        // Overall Statistics
        // =====================================

        let overall = {

            totalActivities: 0,
            totalScore: 0,
            averageScore: 0,
            bestScore: 0,
            totalCorrect: 0,
            totalWrong: 0

        };


        if (
            typeof StatisticsManager !==
            "undefined"
            &&
            typeof StatisticsManager.get ===
            "function"
        ) {

            overall =
                StatisticsManager.get() ||
                overall;

        }


        // =====================================
        // Grade Title
        // =====================================

        let gradeTitle =
            "انتخاب نشده";


        if (
            profile.grade &&
            typeof grades !==
            "undefined"
        ) {

            const selectedGrade =
                grades.find(function (grade) {

                    return (
                        grade.id ===
                        profile.grade
                    );

                });


            if (selectedGrade) {

                gradeTitle =
                    selectedGrade.title;

            }

        }


        // =====================================
        // Profile Name
        // =====================================

        const profileName =
            profile.name &&
            profile.name.trim() !== ""
                ?
                profile.name
                :
                "دانش‌آموز";


        // =====================================
        // Dashboard UI
        // =====================================

        app.innerHTML = `

<div class="screen">

    <h1>

        📊 داشبورد

    </h1>


    <p>

        مرکز کنترل عملکرد آموزشی

    </p>


    <hr>


    <!-- ============================= -->
    <!-- PROFILE SUMMARY -->
    <!-- ============================= -->

    <div class="dashboard-profile">

        <h2>

            👤 ${profileName}

        </h2>

        <p>

            🎓 پایه:
            ${gradeTitle}

        </p>

        <button
            id="dashboardProfileBtn">

            👤 مشاهده پروفایل

        </button>

    </div>


    <hr>


    <!-- ============================= -->
    <!-- STATISTICS CARDS -->
    <!-- ============================= -->

    <div class="dashboard-cards">


        <div class="dashboard-card">

            <h3>

                🎯 فعالیت‌ها

            </h3>

            <p>

                ${overall.totalActivities}

            </p>

        </div>


        <div class="dashboard-card">

            <h3>

                ⭐ امتیاز

            </h3>

            <p>

                ${overall.totalScore}

            </p>

        </div>


        <div class="dashboard-card">

            <h3>

                📈 میانگین

            </h3>

            <p>

                ${overall.averageScore}

            </p>

        </div>


        <div class="dashboard-card">

            <h3>

                🏆 بهترین

            </h3>

            <p>

                ${overall.bestScore}

            </p>

        </div>


    </div>


    <hr>


    <!-- ============================= -->
    <!-- ANSWER SUMMARY -->
    <!-- ============================= -->

    <div class="dashboard-summary">

        <p>

            ✅ پاسخ صحیح:

            ${overall.totalCorrect}

        </p>


        <p>

            ❌ پاسخ اشتباه:

            ${overall.totalWrong}

        </p>

    </div>


    <hr>


    <!-- ============================= -->
    <!-- NAVIGATION -->
    <!-- ============================= -->

    <button
        id="dashboardReportsBtn">

        📈 گزارش کامل

    </button>


    <button
        id="dashboardGradesBtn">

        🎓 انتخاب پایه

    </button>


    <button
        id="dashboardHomeBtn">

        🏠 صفحه اصلی

    </button>


</div>

`;


        // =====================================
        // Profile
        // =====================================

        document
            .getElementById(
                "dashboardProfileBtn"
            )
            .onclick = function () {

                Screen.showProfile();

            };


        // =====================================
        // Reports
        // =====================================

        document
            .getElementById(
                "dashboardReportsBtn"
            )
            .onclick = function () {

                if (
                    typeof ReportsController !==
                    "undefined"
                ) {

                    ReportsController.open();

                }

            };


        // =====================================
        // Grades
        // =====================================

        document
            .getElementById(
                "dashboardGradesBtn"
            )
            .onclick = function () {

                Screen.showGrades();

            };


        // =====================================
        // Home
        // =====================================

        document
            .getElementById(
                "dashboardHomeBtn"
            )
            .onclick = function () {

                Screen.showHome();

            };


        console.log(
            "Dashboard Displayed"
        );

        console.log(
            "Dashboard Profile:",
            profile
        );

    }

};


// =====================================
// Global
// =====================================

window.DashboardScreen =
    DashboardScreen;


// =====================================
// Ready
// =====================================

console.log(
    "Dashboard Screen Ready"
);