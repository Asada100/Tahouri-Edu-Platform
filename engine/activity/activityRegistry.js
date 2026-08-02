// =====================================
// Tahouri Edu Platform
// Version 2.3.1
// Activity Registry
// =====================================


const ActivityRegistry = {


    QuizEngine:{


        start:function(activity){


            const question =

            QuizEngine.start(
                activity
            );


            Screen.showQuiz({


                title:
                activity.title,


                score:
                ScoreManager.score,


                currentQuestion:
                QuizEngine.currentQuestion + 1,


                totalQuestions:
                QuizEngine.questions.length,


                question:
                question


            });


            Components.bindQuizButtons();


        }


    },



    MemoryEngine:{


        start:function(activity){


            console.log(
                "Loading Memory UI"
            );


            MemoryEngine.start(
                activity
            );


            setTimeout(function(){


                Components.bindMemoryCards();


            },100);


        }


    }


};



console.log(

    "Activity Registry Ready"

);