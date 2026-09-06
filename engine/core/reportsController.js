// =====================================
// Tahouri Edu Platform
// Version 4.2
// Reports Controller
// Independent Performance Reports
// Report ViewModel Adapter
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
        // دریافت آمار خام
        // =================================

        const statistics =
            typeof StatisticsManager.get === "function"
                ? (StatisticsManager.get() || {})
                : {};

        const rawSubjects =
            typeof StatisticsManager.getSubjects === "function"
                ? (StatisticsManager.getSubjects() || {})
                : (statistics.subjects || {});

        const rawActivities =
            typeof StatisticsManager.getActivities === "function"
                ? (StatisticsManager.getActivities() || {})
                : (statistics.activities || {});

        const rawChapters =
            statistics.chapters || {};

        // =================================
        // پایه فعال
        // =================================
        // StatisticsManager برای حفظ سابقه پایه‌ها از کلیدهایی
        // مانند grade6:math و grade6:math:chapter1:evenOdd
        // استفاده می‌کند. این کلیدها فقط برای Storage هستند.
        // ReportsScreen باید یک ViewModel ساده و قابل نمایش دریافت کند.

        let activeGrade = null;

        if (
            typeof ProfileManager !== "undefined" &&
            typeof ProfileManager.getGrade === "function"
        ) {
            activeGrade = ProfileManager.getGrade();
        }

        // =================================
        // Helpers
        // =================================

        function entries(value) {

            if (Array.isArray(value)) {
                return value.map(function (item, index) {
                    return [
                        item && (
                            item.activityId ||
                            item.subjectId ||
                            item.chapterId ||
                            item.id ||
                            String(index)
                        ),
                        item || {}
                    ];
                });
            }

            if (value && typeof value === "object") {
                return Object.keys(value).map(function (key) {
                    return [key, value[key] || {}];
                });
            }

            return [];
        }

        function belongsToActiveGrade(item) {

            if (!activeGrade) {
                return true;
            }

            const grade =
                item && (
                    item.gradeId ||
                    item.grade
                );

            // سوابق قدیمی ممکن است grade نداشته باشند.
            // آن‌ها را حذف نمی‌کنیم.
            return !grade || grade === activeGrade;
        }

        // =================================
        // Subjects ViewModel
        // =================================

        const subjects = {};

        entries(rawSubjects).forEach(function (entry) {

            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) {
                return;
            }

            const subjectId =
                item.subjectId ||
                item.subject ||
                (
                    String(key).indexOf(":") >= 0
                        ? String(key).split(":").pop()
                        : key
                );

            if (!subjectId) {
                return;
            }

            // کلید ViewModel ساده است؛ grade در خود item حفظ می‌شود.
            subjects[subjectId] = {
                ...item,
                subjectId: subjectId,
                gradeId: item.gradeId || item.grade || activeGrade || "unknown"
            };
        });

        // =================================
        // Chapters ViewModel
        // =================================

        const chapters = {};

        entries(rawChapters).forEach(function (entry) {

            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) {
                return;
            }

            const chapterId =
                item.chapterId ||
                item.chapter ||
                (
                    String(key).indexOf(":") >= 0
                        ? String(key).split(":").pop()
                        : key
                );

            const subjectId =
                item.subjectId ||
                item.subject ||
                null;

            if (!chapterId) {
                return;
            }

            // برای جلوگیری از برخورد فصل‌های همنام در درس‌های مختلف،
            // کلید داخلی ViewModel ترکیبی است؛ خود chapterId ساده باقی می‌ماند.
            const viewKey =
                String(subjectId || "unknown") + ":" +
                String(chapterId);

            chapters[viewKey] = {
                ...item,
                chapterId: chapterId,
                subjectId: subjectId || "unknown",
                gradeId: item.gradeId || item.grade || activeGrade || "unknown"
            };
        });

        // =================================
        // Activities ViewModel
        // =================================

        const activities = {};

        entries(rawActivities).forEach(function (entry) {

            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) {
                return;
            }

            const activityId =
                item.activityId ||
                item.id ||
                (
                    String(key).split(":").pop()
                );

            if (!activityId) {
                return;
            }

            activities[activityId] = {
                ...item,
                activityId: activityId,
                subjectId:
                    item.subjectId ||
                    item.subject ||
                    "unknown",
                chapterId:
                    item.chapterId ||
                    item.chapter ||
                    "unknown",
                gradeId:
                    item.gradeId ||
                    item.grade ||
                    activeGrade ||
                    "unknown"
            };
        });

        // =================================
        // اگر StatisticsManager فصل‌ها را نداشت،
        // فصل‌ها از روی Activity ViewModel ساخته می‌شوند.
        // =================================

        if (Object.keys(chapters).length === 0) {

            Object.keys(activities).forEach(function (activityId) {

                const activity = activities[activityId];
                const chapterId = activity.chapterId;
                const subjectId = activity.subjectId;

                if (!chapterId || chapterId === "unknown") {
                    return;
                }

                const viewKey =
                    String(subjectId) + ":" +
                    String(chapterId);

                if (!chapters[viewKey]) {
                    chapters[viewKey] = {
                        chapterId: chapterId,
                        subjectId: subjectId,
                        gradeId: activity.gradeId,
                        totalActivities: 0,
                        totalScore: 0,
                        averageScore: 0,
                        bestScore: 0,
                        totalCorrect: 0,
                        totalWrong: 0,
                        bestPercentage: 0
                    };
                }

                const chapter = chapters[viewKey];

                chapter.totalActivities +=
                    Number(activity.totalActivities || 0);

                chapter.totalScore +=
                    Number(activity.totalScore || 0);

                chapter.totalCorrect +=
                    Number(activity.totalCorrect || 0);

                chapter.totalWrong +=
                    Number(activity.totalWrong || 0);

                chapter.bestScore = Math.max(
                    chapter.bestScore,
                    Number(activity.bestScore || 0)
                );

                chapter.bestPercentage = Math.max(
                    chapter.bestPercentage,
                    Number(activity.bestPercentage || 0)
                );
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
        }

        // =================================
        // ساخت اطلاعات گزارش
        // =================================

        const reportData = {
            overall: statistics.overall || {},
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

        ReportsScreen.show(
            reportData
        );

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