// =====================================
// Tahouri Edu Platform
// Version 4.0
// app.js
// Part 1
// =====================================

console.log(
    "Tahouri Edu Platform Started"
);

const app =
document.getElementById(
    "app"
);

// =====================================
// Global Data
// =====================================

let grades = [];

let subjects = [];

let chapters = [];

let activities = [];

// =====================================
// Grades
// =====================================

function showGrades(){

    Screen.showGrades();

}

// =====================================
// Subjects
// =====================================

function showSubjects(
    gradeId
){

    Screen.showSubjects(
        gradeId
    );

}

// =====================================
// Chapters
// =====================================

function showChapters(

    gradeId,

    subjectId

){

    Screen.showChapters(

        gradeId,

        subjectId

    );

}

// =====================================
// Activities
// =====================================

function showActivities(

    gradeId,

    subjectId,

    chapterId

){

    Screen.showActivities(

        gradeId,

        subjectId,

        chapterId

    );

}
// =====================================
// Load Activity
// =====================================

function loadActivity(
    activity
){

    if(
        !activity
    ){

        console.error(
            "Activity Not Found"
        );

        return;

    }

    ActivityManager.load(
        activity
    );

}

// =====================================
// Find Activity
// =====================================

function getActivityById(
    activityId
){

    return activities.find(
        function(item){

            return (
                item.id === activityId
            );

        }
    );

}

// =====================================
// Start Activity
// =====================================

function startActivity(
    activityId
){

    const activity =
    getActivityById(
        activityId
    );

    if(
        !activity
    ){

        console.error(
            "Activity Missing"
        );

        return;

    }

    Navigation.selectActivity(
        activityId
    );

    loadActivity(
        activity
    );

}

// =====================================
// Restart Activity
// =====================================

function restartActivity(){

    if(
        !AppState.activity
    ){

        console.error(
            "No Activity Selected"
        );

        return;

    }

    startActivity(
        AppState.activity
    );

}

// =====================================
// Home
// =====================================

function goHome(){

    Screen.showHome();

}

// =====================================
// Dashboard
// =====================================

function openDashboard(){

    Navigation.openDashboard();

}

// =====================================
// Reports
// =====================================

function openReports(){

    Screen.showReports();

}

// =====================================
// Platform Ready
// =====================================

console.log(
    "App.js Ready"
);

// =====================================
// Start Application
// =====================================

App.init();