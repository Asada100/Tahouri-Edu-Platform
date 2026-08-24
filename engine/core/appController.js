// =====================================
// Tahouri Edu Platform
// Version 5.1
// App Controller
//
// Responsibilities:
// - Application Initialization
// - Global Data Loading
// - Navigation Bridge
// - Unified Activity Entry
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

        console.log(
            "App Controller Started"
        );


        await this.loadData();


        Screen.showHome();

    },


    // =====================================
    // LOAD DATA
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


            // =================================
            // Legacy Global Data Compatibility
            // =================================

            grades =
                this.grades;

            subjects =
                this.subjects;

            chapters =
                this.chapters;

            activities =
                this.activities;


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
    // NAVIGATION
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
    // START ACTIVITY
    // =====================================
    //
    // Unified Activity Entry Point
    //
    // UI
    //   ↓
    // App.startActivity(activity)
    //   ↓
    // ActivityManager.load(activity)
    //
    // ActivityManager is responsible for
    // loading activity.json.
    // =====================================

    startActivity: async function (
        activity
    ) {


        if (!activity) {

            console.error(
                "Activity Missing"
            );

            return;

        }


        console.log(
            "App: Starting Activity:",
            activity.id
        );


        // =================================
        // Unified Entry
        // =================================

        if (
            typeof ActivityManager !==
            "undefined"
            &&
            typeof ActivityManager.load ===
            "function"
        ) {


            await ActivityManager.load(
                activity
            );


            return;

        }


        console.error(
            "ActivityManager Not Available"
        );

    },


    // =====================================
    // RESTART ACTIVITY
    // =====================================

    restartActivity: async function () {

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


        await this.startActivity(
            activity
        );

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
// GLOBAL
// =====================================

window.App =
    App;


// =====================================
// READY
// =====================================

console.log(
    "App Controller v5.1 Ready"
);