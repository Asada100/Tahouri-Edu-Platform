// =====================================
// Tahouri Edu Platform
// App Controller v5.4
// =====================================

const App = {

    grades: [],
    subjects: [],
    chapters: [],
    activities: [],

    init: async function () {

        console.log("App Controller Started");

        const loaded = await this.loadData();

        if (!loaded) {
            console.error("App startup stopped because required data could not be loaded.");
            return false;
        }

        if (
            typeof ContentLockManager !== "undefined" &&
            typeof ContentLockManager.waitUntilReady === "function"
        ) {
            const locksLoaded = await ContentLockManager.waitUntilReady();

            if (locksLoaded === false) {
                console.warn(
                    "App startup: Content lock file could not be loaded; safe default locks remain active."
                );
            }
        }

        Screen.showHome();
        return true;
    },

    loadData: async function () {

        try {
            this.grades = await DataManager.loadJSON("data/grades.json");
            this.subjects = await DataManager.loadJSON("data/subjects.json");
            this.chapters = await DataManager.loadJSON("data/chapters.json");
            this.activities = await DataManager.loadJSON("data/activities.json");

            grades = this.grades;
            subjects = this.subjects;
            chapters = this.chapters;
            activities = this.activities;

            console.log("All Data Loaded");
            return true;
        }
        catch (error) {
            console.error("Loading Error", error);
            return false;
        }
    },

    showHome: function () {
        Screen.showHome();
    },

    showGrades: function () {
        Screen.showGrades();
    },

    showSubjects: function () {
        Screen.showSubjects(AppState.grade);
    },

    showChapters: function () {
        Screen.showChapters(AppState.grade, AppState.subject);
    },

    showActivities: function () {
        Screen.showActivities(
            AppState.grade,
            AppState.subject,
            AppState.chapter
        );
    },

    startActivity: async function (activity) {

        if (!activity) {
            console.error("Activity Missing");
            return;
        }

        if (typeof activity === "string") {
            const activityId = activity;

            const foundActivity = this.activities.find(function (item) {
                return item && item.id === activityId;
            });

            if (!foundActivity) {
                console.error("Activity Not Found:", activityId);
                return;
            }

            activity = foundActivity;
        }

        if (typeof activity !== "object") {
            console.error("Invalid Activity:", activity);
            return;
        }

        if (!activity.id) {
            console.error("Activity ID Missing:", activity);
            return;
        }

        console.log("App: Starting Activity:", activity.id);

        if (
            typeof ActivityManager !== "undefined" &&
            typeof ActivityManager.load === "function"
        ) {
            await ActivityManager.load(activity);
            return;
        }

        console.error("ActivityManager Not Available");
    },

    // =====================================
    // ACTIVITY RESOLVER
    // =====================================

    resolveActivityById: function (activityId) {

        if (!activityId || !Array.isArray(this.activities)) {
            return null;
        }

        return this.activities.find(function (activity) {
            return activity && activity.id === activityId;
        }) || null;
    },

    restartActivity: async function () {

        if (!AppState.activity) {
            console.error("No Current Activity");
            return;
        }

        const activity = this.resolveActivityById(AppState.activity);

        if (!activity) {
            console.error("Activity Not Found:", AppState.activity);
            return;
        }

        await this.startActivity(activity);
    },

    openDashboard: function () {
        Navigation.openDashboard();
    },

    openReports: function () {
        Screen.showReports();
    },

    goHome: function () {
        Screen.showHome();
    }
};

window.App = App;
window.AppController = App;

console.log("App Controller v5.4 Ready");
