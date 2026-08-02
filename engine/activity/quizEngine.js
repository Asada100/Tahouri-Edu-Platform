// =====================================
// Tahouri Edu Platform
// Version 2.1
// Quiz Engine
// ScoreManager Integration
// =====================================


const QuizEngine = {


    state:{


        started:false,


        isFinished:false


    },



    questions:[],


    currentQuestion:0,



    init:function(){


        this.state.started = false;


        this.state.isFinished = false;


    },





    start:function(activityData){



        this.state.started = true;


        this.state.isFinished = false;



        this.questions =

        this.generateQuestions(10);



        this.currentQuestion = 0;



        ScoreManager.reset();



        console.log(

            "Random Quiz Started"

        );



        EventManager.emit(

            "activity:start"

        );



        return this.getQuestion();



    },







    generateQuestions:function(count){



        const list = [];



        for(

            let i = 0;

            i < count;

            i++

        ){



            const number =

            Math.floor(

                Math.random() * 1000

            ) + 1;





            list.push({



                text:

                `عدد ${number} زوج است یا فرد؟`,




                answer:

                number % 2 === 0

                ? "زوج"

                : "فرد",




                number:number



            });



        }



        return list;



    },







    getQuestion:function(){



        return this.questions[

            this.currentQuestion

        ];



    },







    checkAnswer:function(answer){



        const question =

        this.getQuestion();





        if(!question){


            return false;


        }







        if(answer === question.answer){



            ScoreManager.addCorrect();



            console.log(

                "Correct Answer"

            );



            EventManager.emit(

                "answer:correct",

                question

            );



            return true;



        }







        ScoreManager.addWrong();



        console.log(

            "Wrong Answer"

        );



        EventManager.emit(

            "answer:wrong",

            question

        );



        return false;



    },







    next:function(){



        this.currentQuestion++;





        if(



            this.currentQuestion >=

            this.questions.length



        ){



            this.finish();



            return null;



        }






        return this.getQuestion();



    },








    finish:function(){



        this.state.isFinished = true;



        console.log(

            "Quiz Finished"

        );



        const result =

ResultManager.create(
    this.getResult()
);


EventManager.emit(
    "activity:finish",
    result
);



    },









    reset:function(){



        this.state.started = false;



        this.state.isFinished = false;



        this.questions = [];



        this.currentQuestion = 0;



        ScoreManager.reset();



    },









    getResult:function(){



        const total =

        this.questions.length;





        const result =

        ScoreManager.getResult(

            total

        );





        return {



            score:

            result.score,




            totalQuestions:

            total,




            correctAnswers:

            result.correct,




            wrongAnswers:

            result.wrong,




            percentage:

            result.percentage



        };



    }



};







console.log(

    "Quiz Engine Ready"

);