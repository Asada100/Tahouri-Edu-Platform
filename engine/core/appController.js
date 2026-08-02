// =====================================
// Tahouri Edu Platform
// Version 2.0
// App Controller
// =====================================

const App = {

    grades: [],

    subjects: [],

    chapters: [],

    activities: [],



    init: async function(){

        console.log(
            "App Controller Started"
        );

        await this.loadData();

        this.showGrades();

    },



    loadData: async function(){

        try{

            const gradesResponse =
            await fetch(
                "data/grades.json"
            );

            this.grades =
            await gradesResponse.json();



            const subjectsResponse =
            await fetch(
                "data/subjects.json"
            );

            this.subjects =
            await subjectsResponse.json();



            const chaptersResponse =
            await fetch(
                "data/chapters.json"
            );

            this.chapters =
            await chaptersResponse.json();



            const activitiesResponse =
            await fetch(
                "data/activities.json"
            );

            this.activities =
            await activitiesResponse.json();



            // انتقال داده ها به سیستم فعلی

            grades = this.grades;

            subjects = this.subjects;

            chapters = this.chapters;

            activities = this.activities;



            console.log(
                "All Data Loaded"
            );

        }

        catch(error){

            console.error(
                "Loading Error:",
                error
            );

        }

    },



    showGrades:function(){

        showGrades();

    },



    showSubjects:function(){

        showSubjects(
            AppState.grade
        );

    },



    showChapters:function(){

        showChapters(
            AppState.grade,
            AppState.subject
        );

    },



    showActivities:function(){

        showActivities(
            AppState.grade,
            AppState.subject,
            AppState.chapter
        );

    },



    startActivity:function(activity){

        loadActivity(activity);

    },



    restartActivity:function(activity){

        loadActivity(activity);

    },



    goHome:function(){

        this.showGrades();

    }

};



console.log(
    "App Controller Ready"
);