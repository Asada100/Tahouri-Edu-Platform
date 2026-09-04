// =====================================
// Tahouri Edu Platform
// Statistics Manager
// Version 3.1
// Profile Scoped Statistics
// Overall + Subject + Activity Statistics
// =====================================

const StatisticsManager = {

    STORAGE_KEY: "Tahouri_Statistics",

    statistics: null,

    currentStorageKey: null,


    // =====================================
    // DEFAULT STRUCTURE
    // =====================================

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


    // =====================================
    // PROFILE STORAGE KEY
    // =====================================

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


    // =====================================
    // ENSURE CURRENT PROFILE
    // =====================================

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


    // =====================================
    // LOAD FOR PROFILE
    // =====================================

    loadForKey: function (key) {

        this.currentStorageKey = key;
        this.statistics =
            this.getDefaultStatistics();

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


    // =====================================
    // INIT
    // =====================================

    init: function () {

        this.ensureProfileContext();

        this.bindProfileContext();

        console.log(
            "Statistics Loaded",
            this.statistics
        );

    },


    // =====================================
    // PROFILE CHANGE SUPPORT
    // =====================================

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


    // =====================================
    // ADD RESULT
    // =====================================

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


    // =====================================
    // UPDATE OVERALL
    // =====================================

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


    // =====================================
    // UPDATE SUBJECT
    // =====================================

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


    // =====================================
    // UPDATE ACTIVITY
    // =====================================

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


    // =====================================
    // SAVE
    // =====================================

    save: function () {

        if (!this.ensureProfileContext()) {
            return false;
        }

        return SaveManager.save(
            this.currentStorageKey,
            this.statistics
        );

    },


    // =====================================
    // LOAD
    // =====================================

    load: function () {

        return this.ensureProfileContext();

    },


    // =====================================
    // GET OVERALL
    // =====================================

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


    // =====================================
    // GET SUBJECT
    // =====================================

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


    // =====================================
    // GET ALL SUBJECTS
    // =====================================

    getSubjects: function () {

        this.ensureProfileContext();

        return {
            ...this.statistics.subjects
        };

    },


    // =====================================
    // GET ACTIVITY
    // =====================================

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


    // =====================================
    // GET ALL ACTIVITIES
    // =====================================

    getActivities: function () {

        this.ensureProfileContext();

        return {
            ...this.statistics.activities
        };

    },


    // =====================================
    // RESET CURRENT PROFILE
    // =====================================

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


    // =====================================
    // HELPERS
    // =====================================

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