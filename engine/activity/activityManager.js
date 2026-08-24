// =====================================
// Tahouri Edu Platform
// Version 6.0
// Activity Manager
//
// Responsibilities:
// - Activity Loading
// - Activity Config Loading
// - Settings Merge
// - Difficulty Preservation
// - Engine Resolution
// - Engine Start
// - Activity Lifecycle
// - Activity Ready Event
//
// Architecture:
// UI is no longer rendered here.
//
// Flow:
// UI
// ↓
// App.startActivity()
// ↓
// ActivityManager.load()
// ↓
// EngineManager
// ↓
// Engine
// ↓
// activityReady
// ↓
// UI Screen
//
// Stage 2:
// Quiz UI separated ✅
// Puzzle UI separated ✅
// Memory UI independent ✅
//
// =====================================


const ActivityManager = {

    currentActivity: null,


    // =====================================
    // LOAD ACTIVITY
    // =====================================

    load: async function (
        activityData
    ) {

        console.log(
            "Loading Activity:",
            activityData
        );


        if (!activityData) {

            console.error(
                "Activity Data Missing"
            );

            return null;

        }


        const selectedDifficulty =

            activityData.settings &&

            activityData.settings.difficulty

                ?

                activityData.settings.difficulty

                :

                null;


        this.currentActivity =
            activityData;


        ActivityState.set(
            "started"
        );


        EventManager.emit(
            "activityLoaded",
            activityData
        );


        return await this.start(
            activityData,
            selectedDifficulty
        );

    },


    // =====================================
    // START ACTIVITY
    // =====================================

    start: async function (
        activityData,
        selectedDifficulty = null
    ) {

        const fullActivity =
            await this.loadActivityConfig(
                activityData,
                selectedDifficulty
            );


        if (!fullActivity) {

            console.error(
                "ActivityManager: Full Activity Could Not Be Prepared"
            );

            return null;

        }


        // =================================
        // CURRENT ACTIVITY
        // =================================

        this.currentActivity =
            fullActivity;


        ActivityHistory.set(
            fullActivity
        );


        // =================================
        // RESOLVE ENGINE
        // =================================

        const engineName =
            fullActivity.engine ||
            fullActivity.type;


        console.log(
            "Requested Engine:",
            engineName
        );


        const engine =
            this.resolveEngine(
                engineName
            );


        if (!engine) {

            console.error(
                "Engine Not Found:",
                engineName
            );


            ActivityState.set(
                "error"
            );


            return null;

        }


        console.log(
            "Starting Engine:",
            engineName
        );


        ActivityState.set(
            "playing"
        );


        // =================================
        // START ENGINE
        // =================================

        let result;


        try {

            result =
                await engine.start(
                    fullActivity
                );

        }

        catch (error) {

            console.error(
                "ActivityManager: Engine Start Error:",
                error
            );


            ActivityState.set(
                "error"
            );


            return null;

        }


        // =================================
        // ACTIVITY READY
        // =================================
        //
        // ActivityManager announces that
        // the Engine prepared the Activity.
        //
        // UI decides what to render.
        // =================================

        this.publishActivityReady(
            engineName,
            engine,
            result,
            fullActivity
        );


        return result;

    },


    // =====================================
    // LOAD ACTIVITY CONFIG
    // =====================================

    loadActivityConfig: async function (
        activityData,
        selectedDifficulty = null
    ) {

        let fullActivity = {

            ...activityData

        };


        // =================================
        // NO EXTERNAL CONFIG
        // =================================

        if (!activityData.path) {

            if (selectedDifficulty) {

                fullActivity.settings = {

                    ...(fullActivity.settings || {}),

                    difficulty:
                        selectedDifficulty

                };

            }


            return fullActivity;

        }


        // =================================
        // LOAD ACTIVITY.JSON
        // =================================

        try {

            const configPath =
                activityData.path +
                "/activity.json";


            console.log(
                "Loading From:",
                configPath
            );


            const activityConfig =
                await DataManager.loadJSON(
                    configPath
                );


            console.log(
                "Activity Config:",
                activityConfig
            );


            // =================================
            // SETTINGS MERGE
            // =================================

            const baseSettings =

                activityConfig &&
                activityConfig.settings

                    ?

                    {
                        ...activityConfig.settings
                    }

                    :

                    {};


            const activitySettings = {

                ...(activityData.settings || {})

            };


            const mergedSettings = {

                ...baseSettings,

                ...activitySettings

            };


            // =================================
            // PRESERVE DIFFICULTY
            // =================================

            if (
                selectedDifficulty
            ) {

                mergedSettings.difficulty =
                    selectedDifficulty;

            }


            // =================================
            // BUILD FULL ACTIVITY
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


        return fullActivity;

    },


    // =====================================
    // RESOLVE ENGINE
    // =====================================

    resolveEngine: function (
        engineName
    ) {

        if (
            typeof EngineManager ===
            "undefined"
        ) {

            console.error(
                "EngineManager Not Available"
            );

            return null;

        }


        return EngineManager.getEngine(
            engineName
        );

    },


    // =====================================
    // PUBLISH ACTIVITY READY
    // =====================================

    publishActivityReady: function (
        engineName,
        engine,
        result,
        activity
    ) {

        const payload = {

            activity:
                activity,

            engine:
                engine,

            engineName:
                engineName,

            result:
                result

        };


        console.log(
            "Activity Ready:",
            activity
                ? activity.id
                : null
        );


        EventManager.emit(
            "activityReady",
            payload
        );

    },


    // =====================================
    // FINISH
    // =====================================

    finish: function (
        result
    ) {

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
    // RESTART
    // =====================================

    restart: function () {

        if (
            !this.currentActivity
        ) {

            console.warn(
                "No Current Activity"
            );

            return;

        }


        console.log(
            "Restart Activity:",
            this.currentActivity.id
        );


        return this.load(
            this.currentActivity
        );

    },


    // =====================================
    // CURRENT ACTIVITY
    // =====================================

    getCurrent: function () {

        return this.currentActivity;

    },


    // =====================================
    // RESET
    // =====================================

    reset: function () {

        this.currentActivity =
            null;


        ActivityHistory.clear();


        ActivityState.reset();


        if (
            window.PuzzleEngine

            &&

            typeof PuzzleEngine.reset ===
            "function"
        ) {

            PuzzleEngine.reset();

        }


        if (
            window.QuizScreen

            &&

            typeof QuizScreen.reset ===
            "function"
        ) {

            QuizScreen.reset();

        }


        console.log(
            "Activity Manager Reset"
        );

    }

};


// =====================================
// GLOBAL
// =====================================

window.ActivityManager =
    ActivityManager;


// =====================================
// READY
// =====================================

console.log(
    "Activity Manager v6.0 Ready"
);