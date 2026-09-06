// =====================================
// Tahouri Edu Platform
// Version 5.3
// App Controller
//
// Responsibilities:
// - Application Initialization
// - Global Data Loading
// - Navigation Bridge
// - Unified Activity Entry
// - Dashboard Continue Learning Bridge
//
// Important:
// ActivityManager is the ONLY place that
// loads activity.json.
// =====================================

const App = {

    grades: [],
    subjects: [],
    chapters: [],
    activities: [],

    // =====================================
    // START APPLICATION
    // =====================================

    init: async function () {

        console.log("App Controller Started");

        const loaded = await this.loadData();

        if (!loaded) {
            console.error(
                "App startup stopped because required data could not be loaded."
            );
            return false;
        }

        // Content locks are loaded asynchronously from the repository.
        // Do not finish application startup until their initial state has
        // been resolved. This prevents a fast user click from racing the
        // lock fetch and seeing an incorrect temporary lock state.
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

        // ActivationGate remains the visible startup entry screen.
        // Home is rendered underneath it so that after a successful
        // gate entry the initial loading text is replaced immediately.
        Screen.showHome();

        return true;
    },

    // =====================================
    // LOAD DATA
    // =====================================

    loadData: async function () {

        try {
            this.grades = await DataManager.loadJSON("data/grades.json");
            this.subjects = await DataManager.loadJSON("data/subjects.json");
            this.chapters = await DataManager.loadJSON("data/chapters.json");
            this.activities = await DataManager.loadJSON("data/activities.json");

            // =================================
            // Legacy Global Data Compatibility
            // =================================

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

    // =====================================
    // NAVIGATION
    // =====================================

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

    // =====================================
    // START ACTIVITY
    // =====================================

    startActivity: async function (activity) {

        if (!activity) {
            console.error("Activity Missing");
            return;
        }

        if (typeof activity === "string") {
            const activityId = activity;
            console.log("App: Resolving Activity ID:", activityId);

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
    // RESTART ACTIVITY
    // =====================================

    restartActivity: async function () {
        if (!AppState.activity) {
            console.error("No Current Activity");
            return;
        }

        const activity = this.activities.find(function (item) {
            return item && item.id === AppState.activity;
        });

        if (!activity) {
            console.error("Activity Not Found:", AppState.activity);
            return;
        }

        await this.startActivity(activity);
    },

    // =====================================
    // DASHBOARD
    // =====================================

    openDashboard: function () {
        Navigation.openDashboard();
    },

    // =====================================
    // REPORTS
    // =====================================

    openReports: function () {
        Screen.showReports();
    },

    // =====================================
    // HOME
    // =====================================

    goHome: function () {
        Screen.showHome();
    }
};

// =====================================
// GLOBAL ACCESS
// =====================================

window.App = App;
window.AppController = App;

// =====================================
// READY
// =====================================

console.log("App Controller v5.3 Ready");