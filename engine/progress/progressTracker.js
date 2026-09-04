// =====================================
// Tahouri Edu Platform
// Version 2.2
// Progress Tracker
// Profile Scoped Progress
// Legacy Progress Migration
// Quiz + Memory + Future Engines
// =====================================


const ProgressTracker = {

    progress: {},

    STORAGE_KEY: "Tahouri_Progress",

    MIGRATION_KEY: "Tahouri_ProfileScoped_Migration_v1",


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


    init: function () {

        this.load();
        this.bindProfileContext();

        console.log(
            "Progress Tracker Ready"
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
                ProgressTracker.load();
            }
        );

    },


    migrateLegacyProgress: function (profileKey) {

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

            JSON.parse(legacy);

            localStorage.setItem(
                profileKey,
                legacy
            );

            localStorage.setItem(
                this.MIGRATION_KEY,
                "true"
            );

            console.log(
                "Legacy Progress Migrated To Active Profile"
            );

        }
        catch (error) {

            console.error(
                "Legacy Progress Migration Error",
                error
            );

        }

    },


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

        this.migrateLegacyProgress(key);

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
            return Math.min(result.score, 100);
        }

        return 0;

    },


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
            item.bestScore = result.score;
        }

        this.save();

        console.log(
            "Progress Updated:",
            activityId,
            item
        );

    },


    getAll: function () {
        return this.progress;
    },


    getStars: function (activityId) {

        const item = this.get(activityId);

        return item ? item.stars : 0;

    },


    getBestScore: function (activityId) {

        const item = this.get(activityId);

        return item ? item.bestScore : 0;

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