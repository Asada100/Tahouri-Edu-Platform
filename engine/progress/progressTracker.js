// =====================================
// Tahouri Edu Platform
// Version 2.1
// Progress Tracker
// Profile Scoped Progress
// Quiz + Memory + Future Engines
// =====================================


const ProgressTracker = {

    progress: {},

    STORAGE_KEY: "Tahouri_Progress",


    // =====================================
    // PROFILE CONTEXT
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


    getDefaultProgress: function () {

        return {};

    },


    // =====================================
    // INIT
    // =====================================

    init: function () {

        this.load();

        this.bindProfileContext();

        console.log(
            "Progress Tracker Ready"
        );

    },


    // =====================================
    // PROFILE CHANGE
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
                ProgressTracker.load();
            }
        );

    },


    // =====================================
    // LOAD
    // =====================================

    load: function () {

        this.progress =
            this.getDefaultProgress();

        const key =
            this.getStorageKey();

        if (!key) {

            console.warn(
                "Progress Tracker: No Active Profile"
            );

            return;

        }

        try {

            const data =
                localStorage.getItem(key);

            if (data) {

                const parsed =
                    JSON.parse(data);

                if (
                    parsed &&
                    typeof parsed === "object" &&
                    !Array.isArray(parsed)
                ) {

                    this.progress = parsed;

                }

            }

        }
        catch (error) {

            console.error(
                "Progress Load Error",
                error
            );

            this.progress =
                this.getDefaultProgress();

        }

    },


    // =====================================
    // SAVE
    // =====================================

    save: function () {

        const key =
            this.getStorageKey();

        if (!key) {

            console.warn(
                "Progress Tracker: Save skipped, no active profile"
            );

            return false;

        }

        try {

            localStorage.setItem(
                key,
                JSON.stringify(this.progress)
            );

            return true;

        }
        catch (error) {

            console.error(
                "Progress Save Error",
                error
            );

            return false;

        }

    },


    // =====================================
    // GET ACTIVITY
    // =====================================

    get: function (activityId) {

        if (!activityId) {

            return null;

        }

        if (!this.progress[activityId]) {

            this.progress[activityId] = {
                played: false,
                bestScore: 0,
                stars: 0,
                percentage: 0,
                completed: false,
                lastPlayed: null
            };

        }

        return this.progress[activityId];

    },


    // =====================================
    // CALCULATE PERCENTAGE
    // =====================================

    calculatePercentage: function (result) {

        result = result || {};

        if (result.percentage !== undefined) {
            return result.percentage;
        }

        if (
            result.pairs !== undefined &&
            result.totalPairs !== undefined
        ) {

            return Math.round(
                (result.pairs / result.totalPairs) * 100
            );

        }

        if (result.score !== undefined) {

            return Math.min(
                result.score,
                100
            );

        }

        return 0;

    },


    // =====================================
    // UPDATE
    // =====================================

    update: function (activityId, result) {

        if (!activityId || !result) {

            return;

        }

        if (!this.getStorageKey()) {

            console.warn(
                "Progress Tracker: Update skipped, no active profile"
            );

            return;

        }

        const item =
            this.get(activityId);

        item.played = true;
        item.completed = true;
        item.lastPlayed = Date.now();
        item.percentage =
            this.calculatePercentage(result);

        item.stars = Math.round(
            item.percentage / 20
        );

        if (
            result.score !== undefined &&
            result.score > item.bestScore
        ) {

            item.bestScore =
                result.score;

        }

        this.save();

        console.log(
            "Progress Updated:",
            activityId,
            item
        );

    },


    // =====================================
    // GET ALL
    // =====================================

    getAll: function () {

        return this.progress;

    },


    getStars: function (activityId) {

        const item = this.get(activityId);

        return item
            ? item.stars
            : 0;

    },


    getBestScore: function (activityId) {

        const item = this.get(activityId);

        return item
            ? item.bestScore
            : 0;

    },


    isCompleted: function (activityId) {

        const item = this.get(activityId);

        return !!(
            item &&
            item.completed
        );

    }

};


window.ProgressTracker =
    ProgressTracker;


ProgressTracker.init();