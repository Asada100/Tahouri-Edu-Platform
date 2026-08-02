// =====================================
// Tahouri Edu Platform
// Version 0.2
// Router System
// =====================================


const Router = {


    openGrade:function(grade){

        AppState.grade = grade;

        console.log(
            "Grade:",
            grade
        );

    },


    openSubject:function(subject){

        AppState.subject = subject;

        console.log(
            "Subject:",
            subject
        );

    },


    openChapter:function(chapter){

        AppState.chapter = chapter;

        console.log(
            "Chapter:",
            chapter
        );

    },


    openActivity:function(activity){

        AppState.activity = activity;

        console.log(
            "Activity:",
            activity
        );

    }


};


console.log(
"Router System Ready"
);