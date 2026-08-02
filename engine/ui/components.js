// =====================================
// Tahouri Edu Platform
// Version 1.0
// Components Manager
// Protected Against Multi Click
// =====================================


const Components = {

    isLocked:false,



    bindQuizButtons:function(){


        const evenBtn =
        document.getElementById("evenBtn");


        const oddBtn =
        document.getElementById("oddBtn");


        if(!evenBtn || !oddBtn){

            console.log(
                "Quiz Buttons Not Found"
            );

            return;

        }


        evenBtn.onclick = function(){

            Components.answer("زوج");

        };


        oddBtn.onclick = function(){

            Components.answer("فرد");

        };


    },






    answer:function(answer){


        // جلوگیری از چند کلیک
        if(this.isLocked){

            return;

        }

        this.isLocked = true;


        const evenBtn =
        document.getElementById("evenBtn");

        const oddBtn =
        document.getElementById("oddBtn");


        if(evenBtn){

            evenBtn.disabled = true;

        }


        if(oddBtn){

            oddBtn.disabled = true;

        }



        const result =

        QuizEngine.checkAnswer(
            answer
        );



        if(result){

            Screen.showMessage(

                "✅ پاسخ صحیح",

                "correct"

            );

        }
        else{

            Screen.showMessage(

                "❌ پاسخ اشتباه",

                "wrong"

            );

        }




        setTimeout(function(){


            const nextQuestion =

            QuizEngine.next();




            if(nextQuestion){


                Screen.showQuiz({


                    title:

                    "اعداد زوج و فرد",


                    score:

                    ScoreManager.score,


                    currentQuestion:

                    QuizEngine.currentQuestion + 1,


                    totalQuestions:

                    QuizEngine.questions.length,


                    question:

                    nextQuestion


                });


                Components.isLocked = false;

                Components.bindQuizButtons();


            }
            else{


               const finalResult =

ResultManager.create(

    QuizEngine.getResult()

);


Components.isLocked = false;


Screen.showFinish(
    finalResult
);


Components.bindResultButtons();


            }


        },2500);


    },






    bindResultButtons:function(){


        const retryBtn =

        document.getElementById(
            "retryBtn"
        );


        const backBtn =

        document.getElementById(
            "backActivitiesBtn"
        );



        if(retryBtn){


            retryBtn.onclick = function(){


                console.log(
                    "Restart Quiz"
                );


                Components.isLocked = false;


                const newQuestion =

                QuizEngine.start(
                    {
                        id:"evenOdd"
                    }
                );


                Screen.showQuiz({


                    title:

                    "اعداد زوج و فرد",


                    score:

                    ScoreManager.score,


                    currentQuestion:

                    QuizEngine.currentQuestion + 1,


                    totalQuestions:

                    QuizEngine.questions.length,


                    question:

                    newQuestion


                });


                Components.bindQuizButtons();


            };


        }




        if(backBtn){


            backBtn.onclick = function(){


                console.log(
                    "Back To Activities"
                );


                Components.isLocked = false;


                alert(
                    "بازگشت به فعالیت‌ها در مرحله بعد فعال می‌شود"
                );


            };


        }


    }


};



console.log(

"Components Manager Ready"

);