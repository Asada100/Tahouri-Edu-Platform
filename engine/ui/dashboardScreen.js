// =====================================
// Tahouri Edu Platform
// Version 4.0
// Dashboard Screen
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

        app.innerHTML = `

<div class="screen">

<h1>

📊 داشبورد

</h1>

<p>

مرکز کنترل عملکرد آموزشی

</p>

<hr>

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

<div class="dashboard-summary">

<p>

✅ پاسخ صحیح :

${overall.totalCorrect}

</p>

<p>

❌ پاسخ اشتباه :

${overall.totalWrong}

</p>

</div>

<hr>

<button
id="dashboardReportsBtn">

📈 گزارش کامل

</button>

<button
id="dashboardHomeBtn">

🏠 صفحه اصلی

</button>

<button
id="dashboardGradesBtn">

🎓 انتخاب پایه

</button>

</div>

`;

        // ============================
        // Reports
        // ============================

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

        // ============================
        // Home
        // ============================

        document
            .getElementById(
                "dashboardHomeBtn"
            )
            .onclick = function () {

                Screen.showHome();

            };

        // ============================
        // Grades
        // ============================

        document
            .getElementById(
                "dashboardGradesBtn"
            )
            .onclick = function () {

                Screen.showGrades();

            };

        console.log(
            "Dashboard Displayed"
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