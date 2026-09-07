// =====================================
// Tahouri Edu Platform
// Version 6.3
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
// - Safe Resume of Blocked Attempts
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
        // Exactly one unfinished attempt is allowed for each activityId.
        // It must be resumed; it can never be silently replaced by a new
        // attempt from the activity list.
        if (typeof ActivitySessionManager !== "undefined") {

            const existing =
                typeof ActivitySessionManager.load === "function"
                    ? ActivitySessionManager.load(fullActivity.id)
                    : null;

            const unfinished =
                existing &&
                (existing.status === "resumable" || existing.status === "active") &&
                existing.engineState;

            if (unfinished) {
                console.warn(
                    "ActivityManager: New attempt blocked; unfinished session exists.",
                    fullActivity.id
                );

                this.showBlockedStartNotice(fullActivity, existing);
                return null;
            }
        }

        this.currentActivity = fullActivity;
        ActivityHistory.set(fullActivity);

        // =====================================
        // CREATE THE ATTEMPT BEFORE ENGINE START
        // =====================================
        // The session must exist before engine.start() because the engine may
        // reset its runtime while starting a new attempt.
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
    // BLOCKED START / RESUME
    // =====================================

    showBlockedStartNotice: function (activity, session) {

        if (!activity || !session) {
            return false;
        }

        const overlayId = "unfinishedActivityGuardOverlay";
        const existingOverlay = document.getElementById(overlayId);

        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement("div");
        overlay.id = overlayId;
        overlay.dir = "rtl";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.zIndex = "10001";
        overlay.style.background = "rgba(0,0,0,.55)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.padding = "20px";
        overlay.style.boxSizing = "border-box";

        const box = document.createElement("div");
        box.style.background = "white";
        box.style.borderRadius = "18px";
        box.style.padding = "24px";
        box.style.maxWidth = "400px";
        box.style.width = "100%";
        box.style.textAlign = "center";
        box.style.boxSizing = "border-box";

        const title = activity.title || "این فعالیت";

        box.innerHTML = `
            <h2>بازی ناتمام است</h2>
            <p>
                شما یک بازی ناتمام از «${title}» دارید.
                امکان شروع بازی جدید وجود ندارد.
            </p>
            <p style="margin-top:10px;color:#666;">
                ابتدا بازی قبلی را از مسیر «ادامه فعالیت» ادامه دهید.
            </p>
            <div style="display:flex;gap:10px;flex-direction:column;margin-top:18px;">
                <button id="unfinishedActivityResumeBtn" type="button">ادامه فعالیت</button>
                <button id="unfinishedActivityBackBtn" type="button">بازگشت</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const resumeButton = document.getElementById("unfinishedActivityResumeBtn");
        const backButton = document.getElementById("unfinishedActivityBackBtn");

        if (resumeButton) {
            resumeButton.onclick = async function () {
                overlay.remove();
                await ActivityManager.resumeSession(session);
            };
        }

        if (backButton) {
            backButton.onclick = function () {
                overlay.remove();
            };
        }

        return true;
    },

    resumeSession: async function (session) {

        if (!session || !session.activityId) {
            return false;
        }

        if (
            typeof ActivitySessionManager === "undefined" ||
            typeof ActivitySessionManager.restoreEngine !== "function"
        ) {
            console.error("ActivityManager: Session restore is unavailable");
            return false;
        }

        const activity =
            typeof App !== "undefined" &&
            typeof App.resolveActivityById === "function"
                ? App.resolveActivityById(session.activityId)
                : null;

        if (!activity) {
            console.error("ActivityManager: Activity not found for resume", session.activityId);
            return false;
        }

        const restored = await ActivitySessionManager.restoreEngine(
            activity,
            session
        );

        if (!restored) {
            console.error("ActivityManager: Failed to restore unfinished activity", session.activityId);
            return false;
        }

        this.currentActivity = activity;
        ActivityHistory.set(activity);

        session.status = "active";
        session.updatedAt = Date.now();
        ActivitySessionManager.save(session);
        ActivitySessionManager.currentSession = session;
        ActivitySessionManager.gameplayActive = true;
        ActivitySessionManager.installExitControl();

        EventManager.emit("activityResumed", session);

        console.log(
            "ActivityManager: Unfinished activity resumed",
            session.activityId
        );

        return true;
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
console.log("Activity Manager v6.3 Ready");
