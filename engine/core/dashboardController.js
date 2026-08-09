// =====================================
// Tahouri Edu Platform
// Dashboard Controller
// Version 3.0
// Overall + Subject + Activity Reports
// =====================================

const DashboardController = {

    open: function(){

        console.log(
            "Dashboard Controller Opening"
        );


        if(
            typeof DashboardScreen === "undefined"
        ){

            console.error(
                "DashboardScreen Not Found"
            );

            return;

        }


        // ================================
        // دریافت آمار کلی
        // ================================

        const overall =

            StatisticsManager.get();


        // ================================
        // دریافت آمار درس‌ها
        // ================================

        const subjects =

            StatisticsManager.getSubjects();


        // ================================
        // دریافت آمار فعالیت‌ها
        // ================================

        const activities =

            StatisticsManager.getActivities();


        // ================================
        // نمایش داشبورد
        // ================================

        DashboardScreen.show({

            overall: overall,

            subjects: subjects,

            activities: activities

        });


        console.log(
            "Dashboard Displayed With Latest Statistics"
        );

    }

};


window.DashboardController =
    DashboardController;


console.log(
    "Dashboard Controller Ready"
);