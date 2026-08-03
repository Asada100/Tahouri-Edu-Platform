// =====================================
// Tahouri Edu Platform
// Version 3.3
// Navigation Manager
// Navigation History Integration
// =====================================


const Navigation = {


    selectGrade:function(grade){


        AppState.grade = grade;


        NavigationHistory.push(

            "grade",

            grade

        );


        console.log(
            "Selected Grade:",
            grade
        );


    },





    selectSubject:function(subject){


        AppState.subject = subject;


        NavigationHistory.push(

            "subject",

            subject

        );


        console.log(
            "Selected Subject:",
            subject
        );


    },






    selectChapter:function(chapter){


        AppState.chapter = chapter;


        NavigationHistory.push(

            "chapter",

            chapter

        );


        console.log(
            "Selected Chapter:",
            chapter
        );


    },






    selectActivity:function(activity){


        AppState.activity = activity;


        NavigationHistory.push(

            "activity",

            activity

        );


        console.log(
            "Selected Activity:",
            activity
        );


    }



};




console.log(
"Navigation System Ready"
);