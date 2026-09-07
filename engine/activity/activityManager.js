// =====================================
// Tahouri Edu Platform
// Version 6.2
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
// - Safe Runtime Reset
// - Unfinished Attempt Protection
// =====================================

const ActivityManager = {

    currentActivity: null,

    load: async function (activityData) {

        console.log("Loading Activity:", activityData);

        if (!activityData) {
            console.error("Activity Data Missing");
            return null;
        }

        const selectedDifficulty =
            activityData.settings && activityData.settings.difficulty
                ? activityData.settings.difficulty
                : null;

        EventManager.emit("activityLoaded", activityData);

        return await this.start(activityData, selectedDifficulty);

    },

    start: async function (activityData, selectedDifficulty = null) {

        const fullActivity = await this.loadActivityConfig(
            activityData,
            selectedDifficulty
        );

        if (!fullActivity) {
            console.error("ActivityManager: Full Activity Could Not Be Prepared");
            return null;
        }

        // =====================================
        // UNFINISHED ATTEMPT GUARD
        // =====================================
        // A resumable/active attempt for the same activity must never be
        // replaced by a fresh attempt. This protects learning history from
        // being bypassed by restarting the activity from the activity list.
        if (
            typeof ActivitySessionManager !== "undefined" &&
            typeof ActivitySessionManager.hasUnfinished === "function" &&
            ActivitySessionManager.hasUnfinished(fullActivity.id)
        ) {
            console.warn(
                "ActivityManager: New attempt blocked; unfinished session exists.",
                fullActivity.id
            );

            if (
                typeof ActivitySessionManager.showBlockedStartNotice === "function"
            ) {
                ActivitySessionManager.showBlockedStartNotice(fullActivity);
            }
            else {
                alert(
                    "این فعالیت یک بازی ناتمام دارد. ابتدا از مسیر «ادامه فعالیت» آن را ادامه دهید."
                );
            }

            return null;
        }

        this.currentActivity = fullActivity;
        ActivityHistory.set(fullActivity);

        // =====================================
        // CREATE THE ATTEMPT BEFORE ENGINE START
        // =====================================
        // Quiz/Memory/Puzzle engines may reset their runtime inside start().
        // The session must therefore exist before engine.start() is called.
        if (
            typeof ActivitySessionManager !== "undefined" &&
            typeof ActivitySessionManager.begin === "function"
        ) {
            const session = ActivitySessionManager.begin(fullActivity);

            if (!session) {
                console.error(
                    "ActivityManager: Activity session could not be created",
                    fullActivity.id
                );
                this.currentActivity = null;
                ActivityHistory.clear();
                return null;
            }
        }

        const engineName = fullActivity.engine || fullActivity.type;
        console.log("Requested Engine:", engineName);

        const engine = this.resolveEngine(engineName);

        if (!engine) {
            console.error("Engine Not Found:", engineName);
            ActivityState.set("error");
            return null;
        }

        ActivityState.set("playing");

        let result;

        try {
            result = await engine.start(fullActivity);
        }
        catch (error) {
            console.error("ActivityManager: Engine Start Error:", error);
            ActivityState.set("error");
            return null;
        }

        this.publishActivityReady(
            engineName,
            engine,
            result,
            fullActivity
        );

        return result;

    },

    loadActivityConfig: async function (activityData, selectedDifficulty = null) {

        let fullActivity = { ...activityData };

        if (!activityData.path) {
            if (selectedDifficulty) {
                fullActivity.settings = {
                    ...(fullActivity.settings || {}),
                    difficulty: selectedDifficulty
                };
            }
            return fullActivity;
        }

        try {
            const configPath = activityData.path + "/activity.json";
            const activityConfig = await DataManager.loadJSON(configPath);

            const baseSettings = activityConfig && activityConfig.settings
                ? { ...activityConfig.settings }
                : {};

            const activitySettings = { ...(activityData.settings || {}) };
            const mergedSettings = {
                ...baseSettings,
                ...activitySettings
            };

            if (selectedDifficulty) {
                mergedSettings.difficulty = selectedDifficulty;
            }

            fullActivity = {
                ...activityConfig,
                ...activityData,
                settings: mergedSettings
            };

        }
        catch (error) {
            console.warn("activity.json Not Found:", activityData.id);

            if (selectedDifficulty) {
                fullActivity.settings = {
                    ...(fullActivity.settings || {}),
                    difficulty: selectedDifficulty
                };
            }
        }

        return fullActivity;

    },

    resolveEngine: function (engineName) {

        if (typeof EngineManager === "undefined") {
            console.error("EngineManager Not Available");
            return null;
        }

        return EngineManager.getEngine(engineName);

    },

    publishActivityReady: function (engineName, engine, result, activity) {

        const payload = {
            activity: activity,
            engine: engine,
            engineName: engineName,
            result: result
        };

        console.log(
            "Activity Ready:",
            activity ? activity.id : null
        );

        EventManager.emit("activityReady", payload);

    },

    finish: function (result) {

        console.log("Activity Finished", result);
        ActivityState.set("finished");
        EventManager.emit("activityFinished", result);

    },

    restart: function () {

        if (!this.currentActivity) {
            console.warn("No Current Activity");
            return;
        }

        return this.load(this.currentActivity);

    },

    getCurrent: function () {
        return this.currentActivity;
    },

    // =====================================
    // RUNTIME RESET
    // =====================================

    resetRuntime: function () {

        this.currentActivity = null;

        if (typeof ActivityHistory !== "undefined") {
            ActivityHistory.clear();
        }

        if (typeof ActivityState !== "undefined") {
            ActivityState.reset();
        }

        if (
            typeof window.PuzzleEngine !== "undefined" &&
            typeof PuzzleEngine.reset === "function"
        ) {
            PuzzleEngine.reset();
        }

        if (
            typeof window.QuizEngine !== "undefined" &&
            typeof QuizEngine.reset === "function"
        ) {
            QuizEngine.reset();
        }

        if (typeof window.MemoryEngine !== "undefined") {
            MemoryEngine.cards = [];
            MemoryEngine.firstCard = null;
            MemoryEngine.secondCard = null;
            MemoryEngine.lockBoard = false;
            MemoryEngine.activity = null;
            MemoryEngine.matchedPairs = 0;
            MemoryEngine.moves = 0;
            MemoryEngine.totalPairs = 0;
            MemoryEngine.finished = false;
        }

        console.log("Activity Manager Runtime Reset");

    },

    reset: function () {
        this.resetRuntime();
        console.log("Activity Manager Reset");
    }

};

window.ActivityManager = ActivityManager;
console.log("Activity Manager v6.2 Ready");
