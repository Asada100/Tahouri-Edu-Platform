// =====================================
// Tahouri Edu Platform
// Statistics Manager
// Version 3.2
// Profile Scoped Statistics
// Legacy Statistics Migration
// Overall + Subject + Activity Statistics
// =====================================

const StatisticsManager = {

    STORAGE_KEY: "Tahouri_Statistics",
    MIGRATION_KEY: "Tahouri_ProfileScoped_Migration_v1",

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

        return ProfileContext.key(
            this.STORAGE_KEY
        );

    },


    migrateLegacyStatistics: function (profileKey) {

        if (!profileKey) {
            return;
        }

        if (
            localStorage.getItem(this.MIGRATION_KEY) === "true"
        ) {
            return;
        }

        const legacy =
            localStorage.getItem(this.STORAGE_KEY);

        if (!legacy) {
            return;
        }

        if (
            localStorage.getItem(profileKey) !== null
        ) {
            localStorage.setItem(
                this.MIGRATION_KEY,
                "true"
            );
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

                localStorage.setItem(
                    profileKey,
                    legacy
                );

                localStorage.setItem(
                    this.MIGRATION_KEY,
                    "true"
                );

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

        const key =
            this.getStorageKey();

        if (!key) {

            this.currentStorageKey = null;
            this.statistics =
                this.getDefaultStatistics();
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
        this.statistics =
            this.getDefaultStatistics();

        this.migrateLegacyStatistics(key);

        try {

            const saved =
                SaveManager.load(key);

            if (
                saved &&
                saved.overall &&
                saved.subjects &&
                saved.activities
            ) {

                this.statistics = saved;
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

            this.statistics =
                this.getDefaultStatistics();

        }

    },


    init: function () {

        this.ensureProfileContext();
        this.bindProfileContext();

        console.log(
            "Statistics Loaded",
            this.statistics
        );

    },


    bindProfileContext: function () {

        if (
            typeof EventManager === "undefined" ||
            typeof EventManager.on !== "function"
        ) {
            return;
        }

        EventManager.on(
            "profileChanged",
            function () {
                StatisticsManager.currentStorageKey = null;
                StatisticsManager.ensureProfileContext();
            }
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
            activity.id ||
            result.activityId ||
            "unknown";

        const subjectId =
            activity.subject ||
            "unknown";

        const gradeId =
            activity.grade ||
            "unknown";

        const chapterId =
            activity.chapter ||
            "unknown";

        const score =
            Number(result.score || 0);

        const correct =
            Number(
                result.correctAnswers ||
                result.correct ||
                0
            );

        const wrong =
            Number(
                result.wrongAnswers ||
                result.wrong ||
                0
            );

        const percentage =
            Number(result.percentage || 0);

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

        console.log(
            "Statistics Updated:",
            activityId,
            this.getActivity(activityId)
        );

    },


    updateOverall: function (data) {

        const overall =
            this.statistics.overall;

        overall.totalActivities++;
        overall.totalScore += data.score;
        overall.totalCorrect += data.correct;
        overall.totalWrong += data.wrong;

        if (data.score > overall.bestScore) {
            overall.bestScore = data.score;
        }

        overall.averageScore =
            Math.round(
                overall.totalScore /
                overall.totalActivities
            );

    },


    updateSubject: function (subjectId, gradeId, data) {

        if (!this.statistics.subjects[subjectId]) {

            this.statistics.subjects[subjectId] = {
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

        const subject =
            this.statistics.subjects[subjectId];

        subject.totalActivities++;
        subject.totalScore += data.score;
        subject.totalCorrect += data.correct;
        subject.totalWrong += data.wrong;

        if (data.score > subject.bestScore) {
            subject.bestScore = data.score;
        }

        subject.averageScore =
            Math.round(
                subject.totalScore /
                subject.totalActivities
            );

    },


    updateActivity: function (
        activityId,
        subjectId,
        gradeId,
        chapterId,
        data
    ) {

        if (!this.statistics.activities[activityId]) {

            this.statistics.activities[activityId] = {
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

        const activity =
            this.statistics.activities[activityId];

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

        activity.averageScore =
            Math.round(
                activity.totalScore /
                activity.totalActivities
            );

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

        if (!this.statistics.subjects[subjectId]) {

            return {
                subjectId: subjectId,
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0
            };

        }

        return {
            ...this.statistics.subjects[subjectId]
        };

    },


    getSubjects: function () {

        this.ensureProfileContext();

        return {
            ...this.statistics.subjects
        };

    },


    getActivity: function (activityId) {

        this.ensureProfileContext();

        if (!this.statistics.activities[activityId]) {

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

        }

        return {
            ...this.statistics.activities[activityId]
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

        this.statistics =
            this.getDefaultStatistics();

        this.save();

        console.log(
            "Statistics Reset For Active Profile"
        );

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


window.StatisticsManager =
    StatisticsManager;


StatisticsManager.init();


console.log(
    "Statistics Manager Ready"
);