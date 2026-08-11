// =====================================
// Tahouri Edu Platform
// Version 4.0
// App Controller
// Unified Platform Controller
// =====================================

const App = {

    grades: [],
    subjects: [],
    chapters: [],
    activities: [],

    // =====================================
    // Start Application
    // =====================================

    init: async function () {

        console.log(
            "App Controller Started"
        );

        await this.loadData();

        Screen.showHome();

    },

    // =====================================
    // Load Data
    // =====================================

    loadData: async function () {

        try {

            this.grades =
                await DataManager.loadJSON(
                    "data/grades.json"
                );

            this.subjects =
                await DataManager.loadJSON(
                    "data/subjects.json"
                );

            this.chapters =
                await DataManager.loadJSON(
                    "data/chapters.json"
                );

            this.activities =
                await DataManager.loadJSON(
                    "data/activities.json"
                );

            // انتقال به متغیرهای سراسری

            grades = this.grades;
            subjects = this.subjects;
            chapters = this.chapters;
            activities = this.activities;

            console.log(
                "All Data Loaded"
            );

        }

        catch (error) {

            console.error(
                "Loading Error",
                error
            );

        }

    },

    // =====================================
    // Navigation
    // =====================================

    showHome: function () {

        Screen.showHome();

    },

    showGrades: function () {

        Screen.showGrades();

    },

    showSubjects: function () {

        Screen.showSubjects(
            AppState.grade
        );

    },

    showChapters: function () {

        Screen.showChapters(
            AppState.grade,
            AppState.subject
        );

    },

    showActivities: function () {

        Screen.showActivities(
            AppState.grade,
            AppState.subject,
            AppState.chapter
        );

    },

    // =====================================
    // Activity
    // =====================================

    startActivity: function (
        activity
    ) {

        if (!activity) {

            console.error(
                "Activity Missing"
            );

            return;

        }

        ActivityManager.load(
            activity
        );

    },

    restartActivity: function () {

        if (
            !AppState.activity
        ) {

            console.error(
                "No Current Activity"
            );

            return;

        }

        const activity =

            this.activities.find(
                function (item) {

                    return (
                        item.id ===
                        AppState.activity
                    );

                }
            );

        if (!activity) {

            console.error(
                "Activity Not Found"
            );

            return;

        }

        ActivityManager.load(
            activity
        );

    },

    // =====================================
    // Dashboard
    // =====================================

    openDashboard: function () {

        Navigation.openDashboard();

    },

    // =====================================
    // Reports
    // =====================================

    openReports: function () {

        Screen.showReports();

    },

    // =====================================
    // Home
    // =====================================

    goHome: function () {

        Screen.showHome();

    }

};

// =====================================
// Global Access
// =====================================

window.App = App;

// =====================================
// Ready
// =====================================

console.log(
    "App Controller Ready"
);