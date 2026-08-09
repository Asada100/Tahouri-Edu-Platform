// =====================================
// Tahouri Edu Platform
// Version 4.0
// Reports Controller
// Independent Performance Reports
// =====================================

const ReportsController = {

    // =====================================
    // باز کردن صفحه گزارش
    // =====================================

    open: function () {

        console.log(
            "Reports Controller Opening"
        );


        // =================================
        // بررسی StatisticsManager
        // =================================

        if (
            typeof StatisticsManager === "undefined"
        ) {

            console.error(
                "StatisticsManager Not Found"
            );

            return;
        }


        // =================================
        // دریافت آمار کلی
        // =================================

        let overall = {};

        if (
            typeof StatisticsManager.get ===
            "function"
        ) {

            overall =
                StatisticsManager.get() || {};

        }


        // =================================
        // دریافت آمار درس‌ها
        // =================================

        let subjects = {};

        if (
            typeof StatisticsManager.getSubjects ===
            "function"
        ) {

            subjects =
                StatisticsManager.getSubjects() || {};

        }


        // =================================
        // دریافت آمار فعالیت‌ها
        // =================================

        let activities = {};

        if (
            typeof StatisticsManager.getActivities ===
            "function"
        ) {

            activities =
                StatisticsManager.getActivities() || {};

        }


        // =================================
        // ساخت اطلاعات گزارش
        // =================================

        const reportData = {

            overall: overall,

            subjects: subjects,

            activities: activities

        };


        // =================================
        // بررسی ReportsScreen
        // =================================

        if (
            typeof ReportsScreen === "undefined"
        ) {

            console.error(
                "ReportsScreen Not Found"
            );

            return;
        }


        if (
            typeof ReportsScreen.show !==
            "function"
        ) {

            console.error(
                "ReportsScreen.show Not Found"
            );

            return;
        }


        // =================================
        // نمایش گزارش
        // =================================

        ReportsScreen.show(
            reportData
        );


        // =================================
        // Console
        // =================================

        console.log(
            "Reports Controller Ready",
            reportData
        );

    }

};


// =====================================
// دسترسی سراسری
// =====================================

window.ReportsController =
    ReportsController;


// =====================================
// آماده بودن Controller
// =====================================

console.log(
    "Reports Controller Ready"
);