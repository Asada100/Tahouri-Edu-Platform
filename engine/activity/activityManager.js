// =====================================
// Tahouri Edu Platform
// Version 2.0
// Activity Manager
// =====================================

const ActivityManager = {

    currentActivity:null,



    load:function(activity){

        this.currentActivity = activity;

        console.log(
            "Loading Activity:",
            activity
        );



        switch(activity.engine){

            case "QuizEngine":

                this.loadQuiz(activity);

                break;



            default:

                console.error(
                    "Unknown Engine:",
                    activity.engine
                );

        }

    },



    loadQuiz:function(activity){

        const question =

        QuizEngine.start(
            activity
        );



        Screen.showQuiz({

            title:
            activity.title,

            score:
            QuizEngine.score,

            currentQuestion:
            QuizEngine.currentQuestion + 1,

            totalQuestions:
            QuizEngine.questions.length,

            question:
            question

        });



        Components.bindQuizButtons();

    }

};



console.log(
    "Activity Manager Ready"
);