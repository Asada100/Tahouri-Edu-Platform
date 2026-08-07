// =====================================
// Tahouri Edu Platform
// Version 4.4
// Activity Manager
// EngineManager Integration
// Quiz Display Connection
// ActivityHistory Fix
// =====================================

const ActivityManager = {

    currentActivity:null,



    load:function(activityData){

        console.log(
            "Loading Activity:",
            activityData
        );



        this.currentActivity = activityData;



        // =============================
        // ذخیره فعالیت جاری
        // =============================

        ActivityHistory.set(
            activityData
        );



        ActivityState.set(
            "started"
        );



        EventManager.emit(
            "activityLoaded",
            activityData
        );



        this.start(
            activityData
        );

    },







    start:function(activityData){



        const engineName =

        activityData.engine ||

        activityData.type;



        console.log(
            "Requested Engine:",
            engineName
        );



        const engine =

        EngineManager.getEngine(
            engineName
        );



        if(!engine){

            console.error(
                "Engine Not Found:",
                engineName
            );

            return;

        }



        console.log(
            "Starting Engine:",
            engineName
        );



        ActivityState.set(
            "playing"
        );



        const result =

        engine.start(
            activityData
        );



        // =============================
        // Quiz Engine Display
        // =============================

        if(

            engineName === "QuizEngine"

            ||

            engineName === "quiz"

        ){

            if(result){

                Screen.showQuiz({

                    title:
                    activityData.title,

                    score:
                    ScoreManager.score,

                    currentQuestion:
                    engine.currentQuestion + 1,

                    totalQuestions:
                    engine.questions.length,

                    question:
                    result

                });

                Components.bindQuizButtons();

            }

        }



        // =============================
        // Memory Engine Display
        // =============================

        if(

            engineName === "MemoryEngine"

            ||

            engineName === "memory"

        ){

            if(engine.refresh){

                engine.refresh();

            }

        }

    },







    finish:function(result){

        console.log(
            "Activity Finished",
            result
        );

        ActivityState.set(
            "finished"
        );

        EventManager.emit(
            "activityFinished",
            result
        );

    },







    restart:function(){

        if(!this.currentActivity){

            console.warn(
                "No Current Activity"
            );

            return;

        }



        console.log(
            "Restart Activity:",
            this.currentActivity.id
        );



        this.load(
            this.currentActivity
        );

    },







    getCurrent:function(){

        return this.currentActivity;

    },







    reset:function(){

        this.currentActivity = null;

        ActivityHistory.clear();

        ActivityState.reset();

        console.log(
            "Activity Manager Reset"
        );

    }

};



console.log(
    "Activity Manager Ready"
);