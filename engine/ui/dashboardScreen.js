// =====================================
// Tahouri Edu Platform
// Version 3.1
// Dashboard Screen
// خلاصه عملکرد + ورود به گزارش مستقل
// =====================================

const DashboardScreen = {

    // =====================================
    // نمایش داشبورد
    // =====================================

    show: function () {

        // ================================
        // بررسی App Container
        // ================================

        const app =
            document.getElementById("app");

        if (!app) {

            console.error(
                "Dashboard App Container Missing"
            );

            return;
        }


        // ================================
        // دریافت آمار کلی
        // ================================

        let overall = {};

        if (
            typeof StatisticsManager !== "undefined" &&
            typeof StatisticsManager.get === "function"
        ) {

            overall =
                StatisticsManager.get() || {};

        } else {

            console.error(
                "StatisticsManager.get Not Found"
            );

        }


        // ================================
        // نمایش داشبورد
        // ================================

        app.innerHTML = `

            <div class="dashboard-container">

                <!-- ====================== -->
                <!-- عنوان -->
                <!-- ====================== -->

                <h1>
                    📊 داشبورد عملکرد
                </h1>

                <p>
                    خلاصه‌ای از عملکرد آموزشی شما
                </p>


                <!-- ====================== -->
                <!-- خلاصه عملکرد -->
                <!-- ====================== -->

                <section class="dashboard-section">

                    <h2>
                        📈 خلاصه عملکرد
                    </h2>


                    <div class="dashboard-cards">


                        <!-- فعالیت‌ها -->

                        <div class="dashboard-card">

                            <h3>
                                🎯 فعالیت‌ها
                            </h3>

                            <p>
                                ${overall.totalActivities || 0}
                            </p>

                        </div>


                        <!-- امتیاز کل -->

                        <div class="dashboard-card">

                            <h3>
                                ⭐ امتیاز کل
                            </h3>

                            <p>
                                ${overall.totalScore || 0}
                            </p>

                        </div>


                        <!-- میانگین -->

                        <div class="dashboard-card">

                            <h3>
                                📈 میانگین
                            </h3>

                            <p>
                                ${overall.averageScore || 0}
                            </p>

                        </div>


                        <!-- بهترین امتیاز -->

                        <div class="dashboard-card">

                            <h3>
                                🏆 بهترین امتیاز
                            </h3>

                            <p>
                                ${overall.bestScore || 0}
                            </p>

                        </div>


                    </div>


                    <!-- ====================== -->
                    <!-- خلاصه پاسخ‌ها -->
                    <!-- ====================== -->

                    <div class="dashboard-detail">

                        <h3>
                            📊 خلاصه پاسخ‌ها
                        </h3>

                        <p>
                            ✅ پاسخ صحیح:
                            ${overall.totalCorrect || 0}
                        </p>

                        <p>
                            ❌ پاسخ اشتباه:
                            ${overall.totalWrong || 0}
                        </p>

                    </div>


                </section>


                <!-- ====================== -->
                <!-- ورود به گزارش کامل -->
                <!-- ====================== -->

                <section class="dashboard-section">

                    <h2>
                        📋 گزارش عملکرد
                    </h2>

                    <p>
                        برای مشاهده جزئیات کامل عملکرد،
                        گزارش آموزشی خود را مشاهده کنید.
                    </p>


                    <button
                        id="dashboardReportsBtn"
                        type="button"
                    >

                        📊 مشاهده گزارش کامل

                    </button>

                </section>


            </div>

        `;


        // ================================
        // دکمه گزارش کامل
        // ================================

        const reportsBtn =
            document.getElementById(
                "dashboardReportsBtn"
            );


        if (reportsBtn) {

            reportsBtn.onclick = function () {

                console.log(
                    "Opening Independent Reports"
                );


                if (
                    typeof ReportsController !== "undefined" &&
                    typeof ReportsController.open === "function"
                ) {

                    ReportsController.open();

                } else {

                    console.error(
                        "ReportsController.open Not Found"
                    );

                }

            };

        }


        // ================================
        // Console
        // ================================

        console.log(
            "Dashboard Displayed",
            {
                overall: overall
            }
        );

    }

};


// =====================================
// دسترسی سراسری
// =====================================

window.DashboardScreen =
    DashboardScreen;


// =====================================
// آماده بودن Dashboard Screen
// =====================================

console.log(
    "Dashboard Screen Ready"
);