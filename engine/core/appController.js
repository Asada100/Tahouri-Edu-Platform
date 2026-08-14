// =====================================
// Tahouri Edu Platform
// Version 5.0
// App Controller
// Activity Config Loader
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

    showHome:function(){

        Screen.showHome();

    },

    showGrades:function(){

        Screen.showGrades();

    },

    showSubjects:function(){

        Screen.showSubjects(
            AppState.grade
        );

    },

    showChapters:function(){

        Screen.showChapters(
            AppState.grade,
            AppState.subject
        );

    },

    showActivities:function(){

        Screen.showActivities(
            AppState.grade,
            AppState.subject,
            AppState.chapter
        );

    },

    // =====================================
    // Start Activity
    // =====================================

    startActivity: async function(activity){

        if(!activity){

            console.error(
                "Activity Missing"
            );

            return;

        }

        try{

            const config =
                await DataManager.loadJSON(

                    activity.path +
                    "/activity.json"

                );

            activity.config = config;

            console.log(
                "Activity Config Loaded",
                config
            );

        }

        catch(error){

            console.warn(
                "Activity Config Not Found"
            );

            activity.config = null;

        }

        ActivityManager.load(
            activity
        );

    },

    // =====================================
    // Restart Activity
    // =====================================

    restartActivity: async function(){

        if(
            !AppState.activity
        ){

            console.error(
                "No Current Activity"
            );

            return;

        }

        const activity =

        this.activities.find(

            function(item){

                return(

                    item.id ===
                    AppState.activity

                );

            }

        );

        if(!activity){

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
    // Dashboard
    // =====================================

    openDashboard:function(){

        Navigation.openDashboard();

    },

    // =====================================
    // Reports
    // =====================================

    openReports:function(){

        Screen.showReports();

    },

    // =====================================
    // Home
    // =====================================

    goHome:function(){

        Screen.showHome();

    }

};

window.App = App;

console.log(
    "App Controller Ready"
);