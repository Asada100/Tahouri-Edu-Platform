// =====================================
// Tahouri Edu Platform
// Version 2.4
// Quiz Engine
// Activity Result Integration
// Stable Event System
// =====================================


const QuizEngine = {


    state:{


        started:false,

        isFinished:false


    },



    activity:null,


    questions:[],


    currentQuestion:0,





    init:function(){


        this.state.started = false;

        this.state.isFinished = false;


    },








    start:function(activityData){



        this.activity = activityData;



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

            "activityStarted",

            activityData

        );





        EventManager.emit(

            "activityPlaying"

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

                Math.random()*1000

            ) + 1;





            list.push({



                text:

                `عدد ${number} زوج است یا فرد؟`,



                answer:

                number % 2 === 0

                ?

                "زوج"

                :

                "فرد",



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



    const rawResult =

    this.getResult();



    const result =

    ActivityResult.create({

        activityId:

        this.activity
        ?
        this.activity.id
        :
        null,

        score:
        rawResult.score,

        totalQuestions:
        rawResult.totalQuestions,

        correctAnswers:
        rawResult.correctAnswers,

        wrongAnswers:
        rawResult.wrongAnswers,

        // سازگاری با StatisticsManager
        correct:
        rawResult.correctAnswers,

        wrong:
        rawResult.wrongAnswers,

        percentage:
        rawResult.percentage,

        message:
        "🎉 آزمون تمام شد"

    });



    EventManager.emit(

        "activityFinished",

        result

    );

},









    reset:function(){



        this.state.started = false;



        this.state.isFinished = false;



        this.activity = null;



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
        result.score || 0,

        totalQuestions:
        total,

        correctAnswers:
        result.correct || 0,

        wrongAnswers:
        result.wrong || 0,

        percentage:
        result.percentage || 0

    };

}



};






console.log(



    "Quiz Engine Ready"



);




window.QuizEngine = QuizEngine;