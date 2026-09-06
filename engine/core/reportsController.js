// =====================================
// Tahouri Edu Platform
// Version 4.1
// Reports Controller
// Independent Performance Reports
// Chapter Aggregation Fix
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
        // ساخت آمار فصل‌ها از روی فعالیت‌ها
        // =================================
        // StatisticsManager نسخه فعلی آمار فصل را مستقیماً
        // ذخیره نمی‌کند؛ اما هر فعالیت chapterId دارد.
        // بنابراین فصل‌ها را بدون تغییر در ذخیره‌سازی
        // Statistics از روی فعالیت‌های ثبت‌شده محاسبه می‌کنیم.

        const chapters = {};
        const activityEntries =
            Array.isArray(activities)
                ? activities.map(function (item, index) {
                    return [
                        item && (
                            item.activityId ||
                            item.id ||
                            String(index)
                        ),
                        item || {}
                    ];
                })
                : Object.keys(activities || {}).map(function (key) {
                    return [key, activities[key] || {}];
                });

        activityEntries.forEach(function (entry) {

            const activity = entry[1] || {};
            const chapterId =
                activity.chapterId ||
                activity.chapter;

            const subjectId =
                activity.subjectId ||
                activity.subject;

            const gradeId =
                activity.gradeId ||
                activity.grade;

            if (!chapterId) {
                return;
            }

            const chapterKey =
                String(gradeId || "unknown") +
                ":" +
                String(subjectId || "unknown") +
                ":" +
                String(chapterId);

            if (!chapters[chapterKey]) {

                chapters[chapterKey] = {
                    chapterId: chapterId,
                    subjectId: subjectId || "unknown",
                    gradeId: gradeId || "unknown",
                    totalActivities: 0,
                    totalScore: 0,
                    averageScore: 0,
                    bestScore: 0,
                    totalCorrect: 0,
                    totalWrong: 0,
                    bestPercentage: 0
                };

            }

            const chapter = chapters[chapterKey];

            const attempts =
                Number(activity.totalActivities || 0);

            const totalScore =
                Number(activity.totalScore || 0);

            const totalCorrect =
                Number(activity.totalCorrect || 0);

            const totalWrong =
                Number(activity.totalWrong || 0);

            chapter.totalActivities += attempts;
            chapter.totalScore += totalScore;
            chapter.totalCorrect += totalCorrect;
            chapter.totalWrong += totalWrong;

            if (
                Number(activity.bestScore || 0) >
                chapter.bestScore
            ) {
                chapter.bestScore =
                    Number(activity.bestScore || 0);
            }

            if (
                Number(activity.bestPercentage || 0) >
                chapter.bestPercentage
            ) {
                chapter.bestPercentage =
                    Number(activity.bestPercentage || 0);
            }

        });

        Object.keys(chapters).forEach(function (key) {

            const chapter = chapters[key];

            chapter.averageScore =
                chapter.totalActivities > 0
                    ? Math.round(
                        chapter.totalScore /
                        chapter.totalActivities
                    )
                    : 0;

        });


        // =================================
        // ساخت اطلاعات گزارش
        // =================================

        const reportData = {

            overall: overall,

            subjects: subjects,

            chapters: chapters,

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