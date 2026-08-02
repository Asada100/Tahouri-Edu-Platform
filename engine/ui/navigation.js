// =====================================
// Tahouri Edu Platform
// Version 0.1
// Navigation Manager
// =====================================


const Navigation = {


    selectGrade:function(grade){


        AppState.grade = grade;


        console.log(
            "Selected Grade:",
            grade
        );


    },





    selectSubject:function(subject){


        AppState.subject = subject;


        console.log(
            "Selected Subject:",
            subject
        );


    },






    selectChapter:function(chapter){


        AppState.chapter = chapter;


        console.log(
            "Selected Chapter:",
            chapter
        );


    },






    selectActivity:function(activity){


        AppState.activity = activity;


        console.log(
            "Selected Activity:",
            activity
        );


    }



};




console.log(
"Navigation System Ready"
);