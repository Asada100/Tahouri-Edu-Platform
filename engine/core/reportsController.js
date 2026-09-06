// =====================================
// Tahouri Edu Platform
// Version 4.3
// Reports Controller
// Independent Performance Reports
// Report ViewModel Adapter
// =====================================

const ReportsController = {

    open: function () {

        console.log("Reports Controller Opening");

        if (typeof StatisticsManager === "undefined") {
            console.error("StatisticsManager Not Found");
            return;
        }

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

        const rawChapters = statistics.chapters || {};

        // فقط آمار پایه فعال باید در گزارش این پروفایل نمایش داده شود.
        let activeGrade = null;

        if (
            typeof ProfileManager !== "undefined" &&
            typeof ProfileManager.getGrade === "function"
        ) {
            activeGrade = ProfileManager.getGrade();
        }

        const subjectTitles = {
            math: "ریاضی",
            mathematics: "ریاضی",
            persian: "فارسی",
            farsi: "فارسی",
            science: "علوم",
            computer: "رایانه",
            computerScience: "رایانه"
        };

        const chapterTitles = {
            chapter1: "فصل اول",
            chapter2: "فصل دوم",
            chapter3: "فصل سوم",
            chapter4: "فصل چهارم",
            chapter5: "فصل پنجم",
            chapter6: "فصل ششم",
            chapter7: "فصل هفتم",
            chapter8: "فصل هشتم"
        };

        const activityTitles = {
            evenOdd: "اعداد زوج و فرد",
            divisibleBy2: "بخش‌پذیری بر ۲",
            divisibleBy3: "بخش‌پذیری بر ۳",
            divisibleBy5: "بخش‌پذیری بر ۵",
            divisibleBy6: "بخش‌پذیری بر ۶",
            divisibleBy9: "بخش‌پذیری بر ۹",
            divisibleBy10: "بخش‌پذیری بر ۱۰",
            divisibleBy100: "بخش‌پذیری بر ۱۰۰",
            memoryDemo: "بازی حافظه"
        };

        function entries(value) {
            if (Array.isArray(value)) {
                return value.map(function (item, index) {
                    return [
                        item && (
                            item.id ||
                            item.subjectId ||
                            item.chapterId ||
                            item.activityId ||
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
            if (!activeGrade) return true;

            const grade = item && (
                item.gradeId ||
                item.grade
            );

            // داده‌های قدیمی ممکن است grade نداشته باشند.
            return !grade || grade === activeGrade;
        }

        function extractId(key, item, field) {
            if (item && item[field]) {
                return item[field];
            }

            const parts = String(key).split(":");
            return parts[parts.length - 1];
        }

        // =================================
        // Subjects
        // =================================

        // آرایه عمداً استفاده می‌شود تا کلید grade6:math وارد UI نشود.
        // هر آیتم شناسه ساده subjectId را نگه می‌دارد.
        const subjects = [];
        const subjectSeen = {};

        entries(rawSubjects).forEach(function (entry) {
            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) return;

            const subjectId = extractId(key, item, "subjectId");
            if (!subjectId || subjectSeen[subjectId]) return;

            subjectSeen[subjectId] = true;

            subjects.push({
                ...item,
                subjectId: subjectId,
                gradeId: item.gradeId || item.grade || activeGrade || "unknown",
                title: subjectTitles[subjectId] || item.title || subjectId
            });
        });

        // =================================
        // Chapters
        // =================================

        // آرایه باعث می‌شود chapterId همیشه شناسه واقعی فصل باشد،
        // نه کلید ذخیره‌سازی مانند grade6:math:chapter1.
        const chapters = [];
        const chapterSeen = {};

        entries(rawChapters).forEach(function (entry) {
            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) return;

            const chapterId = extractId(key, item, "chapterId");
            const subjectId =
                item.subjectId ||
                item.subject ||
                null;

            if (!chapterId) return;

            // یک فصل با همان شناسه می‌تواند در درس‌های مختلف وجود داشته باشد.
            // ترکیب grade + subject + chapter فقط برای حذف رکورد تکراری داخلی است.
            const uniqueKey =
                String(item.gradeId || item.grade || activeGrade || "unknown") + ":" +
                String(subjectId || "unknown") + ":" +
                String(chapterId);

            if (chapterSeen[uniqueKey]) return;
            chapterSeen[uniqueKey] = true;

            chapters.push({
                ...item,
                chapterId: chapterId,
                subjectId: subjectId || "unknown",
                gradeId: item.gradeId || item.grade || activeGrade || "unknown",
                title: chapterTitles[chapterId] || item.title || chapterId
            });
        });

        // =================================
        // Activities
        // =================================

        const activities = [];
        const activitySeen = {};

        entries(rawActivities).forEach(function (entry) {
            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) return;

            const activityId = extractId(key, item, "activityId");
            if (!activityId) return;

            const subjectId =
                item.subjectId ||
                item.subject ||
                "unknown";

            const chapterId =
                item.chapterId ||
                item.chapter ||
                "unknown";

            const gradeId =
                item.gradeId ||
                item.grade ||
                activeGrade ||
                "unknown";

            const uniqueKey =
                String(gradeId) + ":" +
                String(subjectId) + ":" +
                String(chapterId) + ":" +
                String(activityId);

            if (activitySeen[uniqueKey]) return;
            activitySeen[uniqueKey] = true;

            activities.push({
                ...item,
                activityId: activityId,
                subjectId: subjectId,
                chapterId: chapterId,
                gradeId: gradeId,
                title: activityTitles[activityId] || item.title || activityId
            });
        });

        // =================================
        // اگر chapter statistics هنوز وجود نداشت،
        // فصل‌ها از activity statistics بازسازی می‌شوند.
        // =================================

        if (!chapters.length && activities.length) {
            const rebuilt = {};

            activities.forEach(function (activity) {
                if (!activity.chapterId || activity.chapterId === "unknown") return;

                const key =
                    String(activity.gradeId) + ":" +
                    String(activity.subjectId) + ":" +
                    String(activity.chapterId);

                if (!rebuilt[key]) {
                    rebuilt[key] = {
                        chapterId: activity.chapterId,
                        subjectId: activity.subjectId,
                        gradeId: activity.gradeId,
                        totalActivities: 0,
                        totalScore: 0,
                        averageScore: 0,
                        bestScore: 0,
                        totalCorrect: 0,
                        totalWrong: 0,
                        bestPercentage: 0,
                        title:
                            chapterTitles[activity.chapterId] ||
                            activity.chapterId
                    };
                }

                const chapter = rebuilt[key];

                chapter.totalActivities += Number(activity.totalActivities || 0);
                chapter.totalScore += Number(activity.totalScore || 0);
                chapter.totalCorrect += Number(activity.totalCorrect || 0);
                chapter.totalWrong += Number(activity.totalWrong || 0);
                chapter.bestScore = Math.max(
                    chapter.bestScore,
                    Number(activity.bestScore || 0)
                );
                chapter.bestPercentage = Math.max(
                    chapter.bestPercentage,
                    Number(activity.bestPercentage || 0)
                );
            });

            Object.keys(rebuilt).forEach(function (key) {
                const chapter = rebuilt[key];
                chapter.averageScore = chapter.totalActivities > 0
                    ? Math.round(chapter.totalScore / chapter.totalActivities)
                    : 0;
                chapters.push(chapter);
            });
        }

        const reportData = {
            overall: statistics.overall || {},
            subjects: subjects,
            chapters: chapters,
            activities: activities
        };

        if (typeof ReportsScreen === "undefined") {
            console.error("ReportsScreen Not Found");
            return;
        }

        if (typeof ReportsScreen.show !== "function") {
            console.error("ReportsScreen.show Not Found");
            return;
        }

        ReportsScreen.show(reportData);

        console.log("Reports Controller Ready", reportData);
    }
};

window.ReportsController = ReportsController;

console.log("Reports Controller Ready");