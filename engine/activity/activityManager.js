// =====================================
// Tahouri Edu Platform
// Version 5.3
// Activity Manager
// Dynamic Activity Configuration
// Async Quiz Support
// Difficulty Preservation
// =====================================


const ActivityManager = {

    currentActivity: null,


    // =====================================
    // Load Activity
    // =====================================

    load: async function(activityData) {

        console.log(
            "Loading Activity:",
            activityData
        );


        if (!activityData) {

            console.error(
                "Activity Data Missing"
            );

            return;

        }


        // =====================================
        // Keep Selected Difficulty
        // =====================================

        const selectedDifficulty =

            activityData.settings &&

            activityData.settings.difficulty

            ?

            activityData.settings.difficulty

            :

            null;


        // =====================================
        // Temporary Current Activity
        // =====================================

        this.currentActivity =
            activityData;


        ActivityState.set(
            "started"
        );


        EventManager.emit(
            "activityLoaded",
            activityData
        );


        await this.start(
            activityData,
            selectedDifficulty
        );

    },


    // =====================================
    // Start Activity
    // =====================================

    start: async function(
        activityData,
        selectedDifficulty = null
    ) {


        // =====================================
        // Initial Activity
        // =====================================

        let fullActivity = {

            ...activityData

        };


        // =====================================
        // Load activity.json
        // =====================================

        if (activityData.path) {

            try {

                console.log(
                    "Loading From:",
                    activityData.path +
                    "/activity.json"
                );


                const activityConfig =

                    await DataManager.loadJSON(

                        activityData.path +
                        "/activity.json"

                    );


                console.log(
                    "Activity Config:",
                    activityConfig
                );


                // =================================
                // Base Settings
                // =================================

                const baseSettings = {

                    ...(activityConfig &&
                       activityConfig.settings
                        ?
                        activityConfig.settings
                        :
                        {})

                };


                // =================================
                // Activity Settings
                // =================================

                const activitySettings = {

                    ...(activityData.settings || {})

                };


                // =================================
                // Merge Settings
                // =================================

                const mergedSettings = {

                    ...baseSettings,

                    ...activitySettings

                };


                // =================================
                // Preserve Difficulty
                // =================================

                if (
                    selectedDifficulty
                ) {

                    mergedSettings.difficulty =

                        selectedDifficulty;

                }


                // =================================
                // Build Full Activity
                // =================================

                fullActivity = {

                    ...activityConfig,

                    ...activityData,

                    settings:
                        mergedSettings

                };


                console.log(
                    "Full Activity:",
                    fullActivity
                );


                console.log(
                    "Settings:",
                    fullActivity.settings
                );


                console.log(
                    "Selected Difficulty:",
                    fullActivity
                        .settings
                        .difficulty
                        ||
                        "Not Selected"
                );

            }


            catch (error) {

                console.warn(
                    "activity.json Not Found:",
                    activityData.id
                );


                console.error(
                    error
                );


                // =================================
                // Fallback Difficulty
                // =================================

                if (
                    selectedDifficulty
                ) {

                    fullActivity.settings = {

                        ...(fullActivity.settings || {}),

                        difficulty:
                            selectedDifficulty

                    };

                }

            }

        }


        // =====================================
        // Current Full Activity
        // =====================================

        this.currentActivity =
            fullActivity;


        // =====================================
        // Save Final Activity History
        // =====================================

        ActivityHistory.set(
            fullActivity
        );


        // =====================================
        // Engine
        // =====================================

        const engineName =

            fullActivity.engine

            ||

            fullActivity.type;


        console.log(
            "Requested Engine:",
            engineName
        );


        const engine =

            EngineManager.getEngine(
                engineName
            );


        if (!engine) {

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


        // =====================================
        // Start Engine
        // IMPORTANT:
        // engine.start may be async
        // =====================================

        const result =

            await engine.start(
                fullActivity
            );


        // =====================================
        // Quiz Engine
        // =====================================

        if (

            engineName === "QuizEngine"

            ||

            engineName === "quiz"

        ) {

            if (result) {

                Screen.showQuiz({

                    title:
                        fullActivity.title,

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

            else {

                console.error(
                    "Quiz Engine Returned No Question"
                );

            }

        }


        // =====================================
        // Memory Engine
        // =====================================

        if (

            engineName === "MemoryEngine"

            ||

            engineName === "memory"

        ) {

            if (
                engine.refresh
            ) {

                engine.refresh();

            }

        }

    },


    // =====================================
    // Finish
    // =====================================

    finish: function(result) {

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


    // =====================================
    // Restart
    // =====================================

    restart: function() {

        if (!this.currentActivity) {

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


    // =====================================
    // Current Activity
    // =====================================

    getCurrent: function() {

        return this.currentActivity;

    },


    // =====================================
    // Reset
    // =====================================

    reset: function() {

        this.currentActivity =
            null;


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