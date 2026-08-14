// =====================================
// Tahouri Edu Platform
// Dashboard Controller
// Version 3.2
// =====================================

const DashboardController = {

    // ================================
    // باز کردن داشبورد
    // ================================

    open: function () {

        console.log(
            "Opening Dashboard..."
        );

        const data =
            this.getDashboardData();

        DashboardScreen.show(
            data
        );

    },

    // ================================
    // آماده سازی اطلاعات داشبورد
    // ================================

    getDashboardData: function () {

        let overall = {};

        if (
            typeof StatisticsManager !== "undefined" &&
            typeof StatisticsManager.get === "function"
        ) {

            overall =
                StatisticsManager.get() || {};

        }

        return {

            user: {

                name: "دانش آموز",
                avatar: "👤"

            },

            overall: overall,

            continueLearning: {

                grade: "پایه ششم",

                subject: "ریاضی",

                chapter: "فصل اول",

                activity: "آخرین فعالیت"

            },

            lastAchievement: {

                title:
                    "هنوز دستاوردی ثبت نشده است."

            }

        };

    }

};

window.DashboardController =
DashboardController;

console.log(
    "Dashboard Controller Ready"
);