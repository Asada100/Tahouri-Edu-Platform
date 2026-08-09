// =====================================
// Tahouri Edu Platform
// Reports Screen
// Version 2.0
// Professional Independent Performance Report
// =====================================

const ReportsScreen = {

    show: function (data) {

        // =================================
        // بررسی App Container
        // =================================

        const app =
            document.getElementById("app");

        if (!app) {

            console.error(
                "Reports App Container Missing"
            );

            return;
        }


        // =================================
        // دریافت آمار
        // =================================

        const statistics =
            data ||
            (
                typeof StatisticsManager !== "undefined" &&
                typeof StatisticsManager.get === "function"
                    ? StatisticsManager.get()
                    : {}
            );


        // =================================
        // استخراج اطلاعات
        // =================================

        const overall =
            statistics.overall || {};

        const subjects =
            statistics.subjects || {};

        const activities =
            statistics.activities || {};


        // =================================
        // محاسبه اطلاعات کلی
        // =================================

        const totalActivities =
            overall.totalActivities || 0;

        const totalScore =
            overall.totalScore || 0;

        const averageScore =
            overall.averageScore || 0;

        const bestScore =
            overall.bestScore || 0;

        const totalCorrect =
            overall.totalCorrect || 0;

        const totalWrong =
            overall.totalWrong || 0;


        const totalAnswers =
            totalCorrect + totalWrong;


        const accuracy =
            totalAnswers > 0
                ? Math.round(
                    (totalCorrect / totalAnswers) * 100
                )
                : 0;


        // =================================
        // ساخت ستاره‌های بهترین امتیاز
        // =================================

        const bestStars =
            Math.max(
                0,
                Math.min(
                    5,
                    Math.round(bestScore / 20)
                )
            );


        let starsHTML = "";

        for (
            let i = 1;
            i <= 5;
            i++
        ) {

            starsHTML +=
                i <= bestStars
                    ? "⭐"
                    : "☆";
        }


        // =================================
        // گزارش درس‌ها
        // =================================

        let subjectsHTML = "";

        const subjectKeys =
            Object.keys(subjects);


        if (subjectKeys.length === 0) {

            subjectsHTML = `

                <div class="report-empty">

                    <p>
                        📚 هنوز گزارشی برای درس‌ها ثبت نشده است.
                    </p>

                </div>

            `;

        } else {

            subjectKeys.forEach(
                function (subjectId) {

                    const subject =
                        subjects[subjectId] || {};


                    const subjectScore =
                        subject.averageScore || 0;


                    const subjectStars =
                        Math.max(
                            0,
                            Math.min(
                                5,
                                Math.round(
                                    subject.bestScore / 20
                                )
                            )
                        );


                    let subjectStarsHTML = "";

                    for (
                        let i = 1;
                        i <= 5;
                        i++
                    ) {

                        subjectStarsHTML +=
                            i <= subjectStars
                                ? "⭐"
                                : "☆";
                    }


                    subjectsHTML += `

                        <article class="report-card">

                            <div class="report-card-header">

                                <div>

                                    <span class="report-card-icon">
                                        📚
                                    </span>

                                    <h3>
                                        ${subject.title || subjectId}
                                    </h3>

                                </div>

                                <div class="report-stars">
                                    ${subjectStarsHTML}
                                </div>

                            </div>


                            <div class="report-score">

                                <strong>
                                    ${subjectScore}
                                </strong>

                                <span>
                                    میانگین امتیاز
                                </span>

                            </div>


                            <div class="report-details">

                                <p>
                                    🎯 فعالیت‌ها:
                                    <strong>
                                        ${subject.totalActivities || 0}
                                    </strong>
                                </p>

                                <p>
                                    🏆 بهترین امتیاز:
                                    <strong>
                                        ${subject.bestScore || 0}
                                    </strong>
                                </p>

                                <p>
                                    💯 امتیاز کل:
                                    <strong>
                                        ${subject.totalScore || 0}
                                    </strong>
                                </p>

                                <p>
                                    ✅ صحیح:
                                    <strong>
                                        ${subject.totalCorrect || 0}
                                    </strong>
                                </p>

                                <p>
                                    ❌ اشتباه:
                                    <strong>
                                        ${subject.totalWrong || 0}
                                    </strong>
                                </p>

                            </div>

                        </article>

                    `;
                }
            );
        }


        // =================================
        // گزارش فعالیت‌ها
        // =================================

        let activitiesHTML = "";

        const activityKeys =
            Object.keys(activities);


        if (activityKeys.length === 0) {

            activitiesHTML = `

                <div class="report-empty">

                    <p>
                        🎮 هنوز گزارشی برای بازی‌ها ثبت نشده است.
                    </p>

                </div>

            `;

        } else {

            activityKeys.forEach(
                function (activityId) {

                    const activity =
                        activities[activityId] || {};


                    const activityBest =
                        activity.bestScore || 0;


                    const activityStars =
                        Math.max(
                            0,
                            Math.min(
                                5,
                                Math.round(
                                    activityBest / 20
                                )
                            )
                        );


                    let activityStarsHTML = "";

                    for (
                        let i = 1;
                        i <= 5;
                        i++
                    ) {

                        activityStarsHTML +=
                            i <= activityStars
                                ? "⭐"
                                : "☆";
                    }


                    activitiesHTML += `

                        <article class="report-card">

                            <div class="report-card-header">

                                <div>

                                    <span class="report-card-icon">
                                        🎮
                                    </span>

                                    <h3>
                                        ${activity.title || activityId}
                                    </h3>

                                </div>

                                <div class="report-stars">
                                    ${activityStarsHTML}
                                </div>

                            </div>


                            <div class="report-score">

                                <strong>
                                    ${activity.averageScore || 0}
                                </strong>

                                <span>
                                    میانگین امتیاز
                                </span>

                            </div>


                            <div class="report-details">

                                <p>
                                    🔄 تعداد دفعات:
                                    <strong>
                                        ${activity.totalActivities || 0}
                                    </strong>
                                </p>

                                <p>
                                    🏆 بهترین امتیاز:
                                    <strong>
                                        ${activity.bestScore || 0}
                                    </strong>
                                </p>

                                <p>
                                    💯 امتیاز کل:
                                    <strong>
                                        ${activity.totalScore || 0}
                                    </strong>
                                </p>

                                <p>
                                    ✅ صحیح:
                                    <strong>
                                        ${activity.totalCorrect || 0}
                                    </strong>
                                </p>

                                <p>
                                    ❌ اشتباه:
                                    <strong>
                                        ${activity.totalWrong || 0}
                                    </strong>
                                </p>

                            </div>

                        </article>

                    `;
                }
            );
        }


        // =================================
        // نمایش صفحه گزارش
        // =================================

        app.innerHTML = `

            <div class="reports-container">


                <!-- ================================= -->
                <!-- Header -->
                <!-- ================================= -->

                <header class="reports-header">

                    <div class="reports-header-icon">
                        📊
                    </div>

                    <div>

                        <h1>
                            گزارش عملکرد من
                        </h1>

                        <p>
                            خلاصه‌ای از پیشرفت آموزشی شما
                        </p>

                    </div>

                </header>



                <!-- ================================= -->
                <!-- کارت‌های خلاصه -->
                <!-- ================================= -->

                <section class="reports-summary">

                    <div class="summary-card">

                        <span class="summary-icon">
                            🎯
                        </span>

                        <span class="summary-title">
                            فعالیت‌ها
                        </span>

                        <strong class="summary-value">
                            ${totalActivities}
                        </strong>

                    </div>


                    <div class="summary-card">

                        <span class="summary-icon">
                            ⭐
                        </span>

                        <span class="summary-title">
                            امتیاز کل
                        </span>

                        <strong class="summary-value">
                            ${totalScore}
                        </strong>

                    </div>


                    <div class="summary-card">

                        <span class="summary-icon">
                            📈
                        </span>

                        <span class="summary-title">
                            میانگین
                        </span>

                        <strong class="summary-value">
                            ${averageScore}
                        </strong>

                    </div>


                    <div class="summary-card">

                        <span class="summary-icon">
                            🏆
                        </span>

                        <span class="summary-title">
                            بهترین امتیاز
                        </span>

                        <strong class="summary-value">
                            ${bestScore}
                        </strong>

                    </div>

                </section>



                <!-- ================================= -->
                <!-- عملکرد کلی -->
                <!-- ================================= -->

                <section class="report-section">

                    <div class="section-title">

                        <span>
                            📈
                        </span>

                        <h2>
                            عملکرد کلی
                        </h2>

                    </div>


                    <div class="overall-report">


                        <div class="overall-score">

                            <span>
                                بهترین عملکرد
                            </span>

                            <strong>
                                ${bestScore}
                            </strong>

                            <div class="overall-stars">
                                ${starsHTML}
                            </div>

                        </div>


                        <div class="overall-answers">

                            <div>

                                <span>
                                    ✅ پاسخ صحیح
                                </span>

                                <strong>
                                    ${totalCorrect}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    ❌ پاسخ اشتباه
                                </span>

                                <strong>
                                    ${totalWrong}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    🎯 دقت پاسخ‌ها
                                </span>

                                <strong>
                                    ${accuracy}%
                                </strong>

                            </div>

                        </div>

                    </div>

                </section>



                <!-- ================================= -->
                <!-- گزارش درس‌ها -->
                <!-- ================================= -->

                <section class="report-section">

                    <div class="section-title">

                        <span>
                            📚
                        </span>

                        <h2>
                            عملکرد بر اساس درس
                        </h2>

                    </div>


                    <div class="reports-grid">

                        ${subjectsHTML}

                    </div>

                </section>



                <!-- ================================= -->
                <!-- گزارش بازی‌ها -->
                <!-- ================================= -->

                <section class="report-section">

                    <div class="section-title">

                        <span>
                            🎮
                        </span>

                        <h2>
                            عملکرد بر اساس بازی
                        </h2>

                    </div>


                    <div class="reports-grid">

                        ${activitiesHTML}

                    </div>

                </section>



                <!-- ================================= -->
                <!-- امکانات آینده -->
                <!-- ================================= -->

                <section class="report-section future-report">

                    <div class="section-title">

                        <span>
                            🚀
                        </span>

                        <h2>
                            امکانات آینده
                        </h2>

                    </div>


                    <div class="future-items">

                        <div>
                            🏆 دستاوردها
                        </div>

                        <div>
                            📅 سابقه فعالیت
                        </div>

                        <div>
                            📈 نمودار پیشرفت
                        </div>

                    </div>

                </section>



                <!-- ================================= -->
                <!-- Navigation -->
                <!-- ================================= -->

                <div class="reports-navigation">

                    <button
                        id="reportsBackBtn"
                        type="button"
                        class="reports-button"
                    >
                        ⬅️ بازگشت به داشبورد
                    </button>


                    <button
                        id="reportsHomeBtn"
                        type="button"
                        class="reports-button"
                    >
                        🏠 صفحه اصلی
                    </button>

                </div>


            </div>

        `;


        // =================================
        // بازگشت به داشبورد
        // =================================

        const backBtn =
            document.getElementById(
                "reportsBackBtn"
            );


        if (backBtn) {

            backBtn.onclick = function () {

                if (
                    typeof DashboardController !== "undefined" &&
                    typeof DashboardController.open === "function"
                ) {

                    DashboardController.open();

                } else {

                    console.error(
                        "DashboardController.open Not Found"
                    );

                }

            };

        }


        // =================================
        // صفحه اصلی
        // =================================

        const homeBtn =
            document.getElementById(
                "reportsHomeBtn"
            );


        if (homeBtn) {

            homeBtn.onclick = function () {

                if (
                    typeof App !== "undefined" &&
                    typeof App.goHome === "function"
                ) {

                    App.goHome();

                } else {

                    console.error(
                        "App.goHome Not Found"
                    );

                }

            };

        }


        // =================================
        // Console
        // =================================

        console.log(
            "Reports Screen Displayed",
            {
                overall: overall,
                subjects: subjects,
                activities: activities
            }
        );

    }

};


// =====================================
// Global Access
// =====================================

window.ReportsScreen =
    ReportsScreen;


// =====================================
// Ready
// =====================================

console.log(
    "Reports Screen Ready"
);