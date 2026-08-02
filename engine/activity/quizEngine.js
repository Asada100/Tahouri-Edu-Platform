// =====================================
// Tahouri Edu Platform
// Version 2.0
// Quiz Engine
// =====================================

const QuizEngine = {

    state:{

        started:false,

        isFinished:false

    },



    questions:[],

    currentQuestion:0,

    score:0,

    correctAnswers:0,

    wrongAnswers:0,



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

        this.score = 0;

        this.correctAnswers = 0;

        this.wrongAnswers = 0;

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

            this.score += 10;

            this.correctAnswers++;

            console.log(
                "Correct Answer"
            );

            EventManager.emit(
                "answer:correct",
                question
            );

            return true;

        }

        this.wrongAnswers++;

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

        EventManager.emit(
            "activity:finish",
            this.getResult()
        );

    },



    reset:function(){

        this.state.started = false;

        this.state.isFinished = false;

        this.questions = [];

        this.currentQuestion = 0;

        this.score = 0;

        this.correctAnswers = 0;

        this.wrongAnswers = 0;

    },



    getResult:function(){

        const total =
        this.questions.length;

        const percentage =
        Math.round(
            (this.correctAnswers / total)
            * 100
        );

        return{

            score:this.score,

            totalQuestions:total,

            correctAnswers:this.correctAnswers,

            wrongAnswers:this.wrongAnswers,

            percentage:percentage

        };

    }

};



console.log(
    "Quiz Engine Ready"
);