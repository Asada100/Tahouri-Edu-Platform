// =====================================
// Tahouri Edu Platform
// Statistics Manager
// Version 3.4
// Profile Scoped Statistics
// Legacy Statistics Migration
// Overall + Subject + Chapter + Activity Statistics
// =====================================

const StatisticsManager = {

    STORAGE_KEY: "Tahouri_Statistics",
    MIGRATION_KEY: "Tahouri_Statistics_ProfileMigration_v1",

    statistics: null,
    currentStorageKey: null,

    getDefaultStatistics: function () {
        return {
            overall: {
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0
            },
            subjects: {},
            chapters: {},
            activities: {}
        };
    },

    getStorageKey: function () {
        if (
            typeof ProfileContext === "undefined" ||
            typeof ProfileContext.key !== "function"
        ) {
            return null;
        }

        return ProfileContext.key(this.STORAGE_KEY);
    },

    migrateLegacyStatistics: function (profileKey) {
        if (!profileKey) return;

        if (localStorage.getItem(this.MIGRATION_KEY) === "true") return;

        const legacy = localStorage.getItem(this.STORAGE_KEY);
        if (!legacy) return;

        if (localStorage.getItem(profileKey) !== null) {
            localStorage.setItem(this.MIGRATION_KEY, "true");
            return;
        }

        try {
            const parsed = JSON.parse(legacy);

            if (
                parsed &&
                parsed.overall &&
                parsed.subjects &&
                parsed.activities
            ) {
                localStorage.setItem(profileKey, legacy);
                localStorage.setItem(this.MIGRATION_KEY, "true");

                console.log(
                    "Legacy Statistics Migrated To Active Profile"
                );
            }
        }
        catch (error) {
            console.error(
                "Legacy Statistics Migration Error",
                error
            );
        }
    },

    ensureProfileContext: function () {
        const key = this.getStorageKey();

        if (!key) {
            this.currentStorageKey = null;
            this.statistics = this.getDefaultStatistics();
            return false;
        }

        if (
            this.currentStorageKey !== key ||
            !this.statistics
        ) {
            this.loadForKey(key);
        }

        return true;
    },

    loadForKey: function (key) {
        this.currentStorageKey = key;
        this.statistics = this.getDefaultStatistics();

        this.migrateLegacyStatistics(key);

        try {
            const saved = SaveManager.load(key);

            if (
                saved &&
                saved.overall &&
                saved.subjects &&
                saved.activities
            ) {
                this.statistics = saved;

                // نسخه‌های قبلی statistics فاقد chapters بودند.
                // سوابق فعالیت‌ها حفظ می‌شوند و فصل‌ها در اولین
                // بارگذاری از روی همان فعالیت‌ها بازسازی می‌شوند.
                if (!this.statistics.chapters) {
                    this.rebuildChapters();
                    this.save();
                }
            }
            else if (saved) {
                console.log(
                    "Old Statistics Structure Detected For Profile"
                );
                this.save();
            }
        }
        catch (error) {
            console.error(
                "Statistics Load Error",
                error
            );
        }
    },

    init: function () {
        this.ensureProfileContext();

        console.log(
            "Statistics Loaded",
            this.statistics
        );
    },

    addResult: function (activity, result) {
        if (!activity || !result) {
            console.error(
                "Statistics Activity Or Result Missing"
            );
            return;
        }

        if (!this.ensureProfileContext()) {
            console.warn(
                "Statistics Update Skipped: No Active Profile"
            );
            return;
        }

        const activityId =
            activity.id || result.activityId || "unknown";

        const subjectId = activity.subject || "unknown";
        const gradeId = activity.grade || "unknown";
        const chapterId = activity.chapter || "unknown";

        const score = Number(result.score || 0);
        const correct = Number(
            result.correctAnswers || result.correct || 0
        );
        const wrong = Number(
            result.wrongAnswers || result.wrong || 0
        );
        const percentage = Number(result.percentage || 0);

        this.updateOverall({
            score: score,
            correct: correct,
            wrong: wrong
        });

        this.updateSubject(
            subjectId,
            gradeId,
            {
                score: score,
                correct: correct,
                wrong: wrong,
                percentage: percentage
            }
        );

        this.updateChapter(
            chapterId,
            subjectId,
            gradeId,
            {
                score: score,
                correct: correct,
                wrong: wrong,
                percentage: percentage
            }
        );

        this.updateActivity(
            activityId,
            subjectId,
            gradeId,
            chapterId,
            {
                score: score,
                correct: correct,
                wrong: wrong,
                percentage: percentage
            }
        );

        this.save();
    },

    updateOverall: function (data) {
        const overall = this.statistics.overall;

        overall.totalActivities++;
        overall.totalScore += data.score;
        overall.totalCorrect += data.correct;
        overall.totalWrong += data.wrong;

        if (data.score > overall.bestScore) {
            overall.bestScore = data.score;
        }

        overall.averageScore = Math.round(
            overall.totalScore / overall.totalActivities
        );
    },

    updateSubject: function (subjectId, gradeId, data) {
        const key = String(gradeId) + ":" + String(subjectId);

        if (!this.statistics.subjects[key]) {
            // اگر ساختار قبلی با کلید subjectId وجود دارد، آن را
            // برای حفظ سوابق قبلی دوباره استفاده می‌کنیم.
            if (
                this.statistics.subjects[subjectId] &&
                this.statistics.subjects[subjectId].gradeId === gradeId
            ) {
                this.statistics.subjects[key] =
                    this.statistics.subjects[subjectId];
                delete this.statistics.subjects[subjectId];
            }
            else {
                this.statistics.subjects[key] = {
                    subjectId: subjectId,
                    gradeId: gradeId,
                    totalActivities: 0,
                    totalScore: 0,
                    averageScore: 0,
                    bestScore: 0,
                    totalCorrect: 0,
                    totalWrong: 0
                };
            }
        }

        const subject = this.statistics.subjects[key];

        subject.totalActivities++;
        subject.totalScore += data.score;
        subject.totalCorrect += data.correct;
        subject.totalWrong += data.wrong;

        if (data.score > subject.bestScore) {
            subject.bestScore = data.score;
        }

        subject.averageScore = Math.round(
            subject.totalScore / subject.totalActivities
        );
    },

    updateChapter: function (chapterId, subjectId, gradeId, data) {
        const key =
            String(gradeId) + ":" +
            String(subjectId) + ":" +
            String(chapterId);

        if (!this.statistics.chapters) {
            this.statistics.chapters = {};
        }

        if (!this.statistics.chapters[key]) {
            this.statistics.chapters[key] = {
                chapterId: chapterId,
                subjectId: subjectId,
                gradeId: gradeId,
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0,
                bestPercentage: 0
            };
        }

        const chapter = this.statistics.chapters[key];

        chapter.totalActivities++;
        chapter.totalScore += data.score;
        chapter.totalCorrect += data.correct;
        chapter.totalWrong += data.wrong;

        if (data.score > chapter.bestScore) {
            chapter.bestScore = data.score;
        }

        if (data.percentage > chapter.bestPercentage) {
            chapter.bestPercentage = data.percentage;
        }

        chapter.averageScore = Math.round(
            chapter.totalScore / chapter.totalActivities
        );
    },

    updateActivity: function (
        activityId,
        subjectId,
        gradeId,
        chapterId,
        data
    ) {
        const key =
            String(gradeId) + ":" +
            String(subjectId) + ":" +
            String(chapterId) + ":" +
            String(activityId);

        if (!this.statistics.activities[key]) {
            // ساختار قدیمی activityId ساده را برای حفظ سوابق قبلی
            // در همان پایه/درس/فصل مهاجرت می‌کنیم.
            if (
                this.statistics.activities[activityId] &&
                this.statistics.activities[activityId].gradeId === gradeId &&
                (
                    this.statistics.activities[activityId].subjectId === subjectId ||
                    this.statistics.activities[activityId].subject === subjectId
                ) &&
                (
                    this.statistics.activities[activityId].chapterId === chapterId ||
                    this.statistics.activities[activityId].chapter === chapterId
                )
            ) {
                this.statistics.activities[key] =
                    this.statistics.activities[activityId];
                delete this.statistics.activities[activityId];
            }
            else {
                this.statistics.activities[key] = {
                    activityId: activityId,
                    subjectId: subjectId,
                    gradeId: gradeId,
                    chapterId: chapterId,
                    totalActivities: 0,
                    totalScore: 0,
                    averageScore: 0,
                    bestScore: 0,
                    totalCorrect: 0,
                    totalWrong: 0,
                    bestPercentage: 0
                };
            }
        }

        const activity = this.statistics.activities[key];

        activity.totalActivities++;
        activity.totalScore += data.score;
        activity.totalCorrect += data.correct;
        activity.totalWrong += data.wrong;

        if (data.score > activity.bestScore) {
            activity.bestScore = data.score;
        }

        if (data.percentage > activity.bestPercentage) {
            activity.bestPercentage = data.percentage;
        }

        activity.averageScore = Math.round(
            activity.totalScore / activity.totalActivities
        );
    },

    rebuildChapters: function () {
        if (!this.statistics) return;

        this.statistics.chapters = {};

        const activities =
            this.statistics.activities || {};

        Object.keys(activities).forEach(function (key) {
            const activity = activities[key];
            if (!activity) return;

            const chapterId =
                activity.chapterId || activity.chapter;
            const subjectId =
                activity.subjectId || activity.subject;
            const gradeId =
                activity.gradeId || activity.grade;

            if (!chapterId) return;

            const chapterKey =
                String(gradeId || "unknown") + ":" +
                String(subjectId || "unknown") + ":" +
                String(chapterId);

            if (!this.statistics.chapters[chapterKey]) {
                this.statistics.chapters[chapterKey] = {
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

            const chapter = this.statistics.chapters[chapterKey];

            chapter.totalActivities += Number(
                activity.totalActivities || 0
            );
            chapter.totalScore += Number(
                activity.totalScore || 0
            );
            chapter.totalCorrect += Number(
                activity.totalCorrect || 0
            );
            chapter.totalWrong += Number(
                activity.totalWrong || 0
            );

            chapter.bestScore = Math.max(
                chapter.bestScore,
                Number(activity.bestScore || 0)
            );

            chapter.bestPercentage = Math.max(
                chapter.bestPercentage,
                Number(activity.bestPercentage || 0)
            );
        }, this);

        Object.keys(this.statistics.chapters).forEach(function (key) {
            const chapter = this.statistics.chapters[key];

            chapter.averageScore =
                chapter.totalActivities > 0
                    ? Math.round(
                        chapter.totalScore /
                        chapter.totalActivities
                    )
                    : 0;
        }, this);
    },

    save: function () {
        if (!this.ensureProfileContext()) {
            return false;
        }

        return SaveManager.save(
            this.currentStorageKey,
            this.statistics
        );
    },

    load: function () {
        return this.ensureProfileContext();
    },

    get: function () {
        if (!this.ensureProfileContext()) {
            return {
                ...this.getDefaultStatistics().overall
            };
        }

        return {
            ...this.statistics.overall
        };
    },

    getSubject: function (subjectId) {
        this.ensureProfileContext();

        const gradeId =
            typeof ProfileContext !== "undefined" &&
            typeof ProfileContext.getGrade === "function"
                ? ProfileContext.getGrade()
                : null;

        const key =
            gradeId
                ? String(gradeId) + ":" + String(subjectId)
                : subjectId;

        if (!this.statistics.subjects[key]) {
            return {
                subjectId: subjectId,
                gradeId: gradeId,
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0
            };
        }

        return {
            ...this.statistics.subjects[key]
        };
    },

    getSubjects: function () {
        this.ensureProfileContext();
        return {
            ...this.statistics.subjects
        };
    },

    getChapter: function (chapterId) {
        this.ensureProfileContext();

        const gradeId =
            typeof ProfileContext !== "undefined" &&
            typeof ProfileContext.getGrade === "function"
                ? ProfileContext.getGrade()
                : null;

        const key = String(gradeId || "unknown") + ":" +
            String(chapterId);

        const foundKey =
            this.statistics.chapters[key]
                ? key
                : Object.keys(this.statistics.chapters).find(function (itemKey) {
                    const item = this.statistics.chapters[itemKey];
                    return (
                        item &&
                        item.chapterId === chapterId &&
                        (!gradeId || item.gradeId === gradeId)
                    );
                });

        if (!foundKey) {
            return {
                chapterId: chapterId,
                gradeId: gradeId,
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0,
                bestPercentage: 0
            };
        }

        return {
            ...this.statistics.chapters[foundKey]
        };
    },

    getChapters: function () {
        this.ensureProfileContext();
        return {
            ...this.statistics.chapters
        };
    },

    getActivity: function (activityId) {
        this.ensureProfileContext();

        if (this.statistics.activities[activityId]) {
            return {
                ...this.statistics.activities[activityId]
            };
        }

        const foundKey = Object.keys(this.statistics.activities).find(function (key) {
            return (
                this.statistics.activities[key] &&
                this.statistics.activities[key].activityId === activityId
            );
        }, this);

        if (foundKey) {
            return {
                ...this.statistics.activities[foundKey]
            };
        }

        return {
            activityId: activityId,
            totalActivities: 0,
            totalScore: 0,
            averageScore: 0,
            bestScore: 0,
            totalCorrect: 0,
            totalWrong: 0,
            bestPercentage: 0
        };
    },

    getActivities: function () {
        this.ensureProfileContext();
        return {
            ...this.statistics.activities
        };
    },

    reset: function () {
        if (!this.ensureProfileContext()) {
            return false;
        }

        this.statistics = this.getDefaultStatistics();
        this.save();
        return true;
    },

    getAverage: function () {
        return this.get().averageScore;
    },

    getBestScore: function () {
        return this.get().bestScore;
    },

    getTotalActivities: function () {
        return this.get().totalActivities;
    },

    getTotalScore: function () {
        return this.get().totalScore;
    },

    getTotalCorrect: function () {
        return this.get().totalCorrect;
    },

    getTotalWrong: function () {
        return this.get().totalWrong;
    }
};

window.StatisticsManager = StatisticsManager;

StatisticsManager.init();

console.log(
    "Statistics Manager Ready"
);