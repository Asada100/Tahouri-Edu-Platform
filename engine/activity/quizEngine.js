// =====================================
// Tahouri Edu Platform
// Version 5.1
// Quiz Engine
// Execution Only
// Question Provider Integration
// Session / Resume Contract
// =====================================

const QuizEngine = {

    state: {
        started: false,
        isFinished: false
    },

    activity: null,
    questions: [],
    currentQuestion: 0,

    init: function(){
        this.state.started = false;
        this.state.isFinished = false;
    },

    start: async function(activityData){
        console.log("Activity Data:", activityData);
        console.log("Activity Settings:", activityData.settings);

        this.activity = activityData;
        this.state.started = true;
        this.state.isFinished = false;

        if(typeof QuestionProvider === "undefined"){
            console.error("QuestionProvider Not Available");
            this.state.started = false;
            return null;
        }

        this.questions = await QuestionProvider.getQuestions(activityData);

        if(!Array.isArray(this.questions) || this.questions.length === 0){
            console.error("QuizEngine: No Questions Available");
            this.state.started = false;
            return null;
        }

        console.log("Quiz Questions Ready:", this.questions.length);

        this.currentQuestion = 0;
        ScoreManager.reset();

        console.log("Quiz Started:", activityData.id);

        EventManager.emit("activityStarted", activityData);
        EventManager.emit("activityPlaying");

        return this.getQuestion();
    },

    getQuestion: function(){
        return this.questions[this.currentQuestion];
    },

    checkAnswer: function(answer){
        const question = this.getQuestion();
        if(!question) return false;

        if(answer === question.answer){
            ScoreManager.addCorrect();
            console.log("Correct Answer");
            EventManager.emit("answer:correct", question);
            return true;
        }

        ScoreManager.addWrong();
        console.log("Wrong Answer");
        EventManager.emit("answer:wrong", question);
        return false;
    },

    next: function(){
        this.currentQuestion++;

        if(this.currentQuestion >= this.questions.length){
            this.finish();
            return null;
        }

        return this.getQuestion();
    },

    finish: function(){
        this.state.isFinished = true;

        console.log("Quiz Finished");

        const rawResult = this.getResult();
        const result = ActivityResult.create({
            activityId: this.activity ? this.activity.id : null,
            score: rawResult.score,
            totalQuestions: rawResult.totalQuestions,
            correctAnswers: rawResult.correctAnswers,
            wrongAnswers: rawResult.wrongAnswers,
            correct: rawResult.correctAnswers,
            wrong: rawResult.wrongAnswers,
            percentage: rawResult.percentage,
            message: "🎉 آزمون تمام شد"
        });

        EventManager.emit("activityFinished", result);
    },

    // =====================================
    // Session / Resume Contract
    // Every engine that supports resumable play
    // exposes the same two methods.
    // =====================================

    getSessionState: function(){
        if(!this.activity || !Array.isArray(this.questions) || !this.questions.length){
            return null;
        }

        return {
            type: "quiz",
            activityId: this.activity.id || null,
            activity: this.activity,
            questions: JSON.parse(JSON.stringify(this.questions)),
            currentQuestion: this.currentQuestion,
            state: {
                started: !!this.state.started,
                isFinished: !!this.state.isFinished
            },
            score: {
                score: Number(ScoreManager.score) || 0,
                correct: Number(ScoreManager.correct) || 0,
                wrong: Number(ScoreManager.wrong) || 0
            }
        };
    },

    restoreSession: function(snapshot, activityData){
        if(!snapshot || snapshot.type !== "quiz") return null;
        if(!Array.isArray(snapshot.questions) || snapshot.questions.length === 0) return null;

        const index = Number(snapshot.currentQuestion);
        if(!Number.isInteger(index) || index < 0 || index >= snapshot.questions.length) return null;

        try {
            this.activity = activityData || snapshot.activity || null;
            this.questions = JSON.parse(JSON.stringify(snapshot.questions));
            this.currentQuestion = index;

            this.state.started = snapshot.state
                ? snapshot.state.started !== false
                : true;
            this.state.isFinished = !!(snapshot.state && snapshot.state.isFinished);

            if(typeof ScoreManager !== "undefined"){
                ScoreManager.score = snapshot.score ? Number(snapshot.score.score) || 0 : 0;
                ScoreManager.correct = snapshot.score ? Number(snapshot.score.correct) || 0 : 0;
                ScoreManager.wrong = snapshot.score ? Number(snapshot.score.wrong) || 0 : 0;
            }

            console.log("QuizEngine: Session restored", {
                activityId: this.activity ? this.activity.id : null,
                currentQuestion: this.currentQuestion,
                totalQuestions: this.questions.length,
                score: typeof ScoreManager !== "undefined'" ? ScoreManager.score : 0
            });

            return this.getQuestion();
        } catch(error){
            console.error("QuizEngine: Failed to restore session", error);
            this.reset();
            return null;
        }
    },

    reset: function(){
        this.state.started = false;
        this.state.isFinished = false;
        this.activity = null;
        this.questions = [];
        this.currentQuestion = 0;
        ScoreManager.reset();
    },

    getResult: function(){
        const total = this.questions.length;
        const result = ScoreManager.getResult(total);

        return {
            score: result.score || 0,
            totalQuestions: total,
            correctAnswers: result.correct || 0,
            wrongAnswers: result.wrong || 0,
            percentage: result.percentage || 0
        };
    }
};

window.QuizEngine = QuizEngine;
console.log("Quiz Engine Ready v5.1");