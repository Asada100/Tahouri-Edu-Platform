// =====================================
// Tahouri Edu Platform
// Version 6.6
// Activity Manager
// =====================================

const ActivityManager = {

    currentActivity: null,

    load: async function (activityData) {
        console.log("Loading Activity:", activityData);
        if (!activityData) { console.error("Activity Data Missing"); return null; }
        const selectedDifficulty = activityData.settings && activityData.settings.difficulty ? activityData.settings.difficulty : null;
        EventManager.emit("activityLoaded", activityData);
        return await this.start(activityData, selectedDifficulty);
    },

    start: async function (activityData, selectedDifficulty = null) {
        const fullActivity = await this.loadActivityConfig(activityData, selectedDifficulty);
        if (!fullActivity) { console.error("ActivityManager: Full Activity Could Not Be Prepared"); return null; }

        if (typeof ActivitySessionManager !== "undefined") {
            let existing = typeof ActivitySessionManager.load === "function" ? ActivitySessionManager.load(fullActivity.id) : null;

            const invalidClassificationSession =
                existing &&
                fullActivity.engine === "classification" &&
                existing.engineState &&
                (
                    !Array.isArray(existing.engineState.items) ||
                    !Array.isArray(existing.engineState.categories) ||
                    existing.engineState.items.length === 0 ||
                    existing.engineState.categories.length === 0 ||
                    Number(existing.engineState.totalItems || 0) <= 0
                );

            if (invalidClassificationSession) {
                console.warn("ActivityManager: Clearing invalid classification session", fullActivity.id);
                ActivitySessionManager.clear(fullActivity.id);
                existing = null;
            }

            const unfinished = existing && (existing.status === "resumable" || existing.status === "active") && existing.engineState;

            if (unfinished) {
                const engineState = existing.engineState;
                const state = engineState.state || {};
                const completedSnapshot =
                    state.isFinished === true ||
                    engineState.finished === true ||
                    engineState.completed === true;

                if (completedSnapshot) {
                    console.log("ActivityManager: Clearing completed stale session", fullActivity.id);
                    ActivitySessionManager.clear(fullActivity.id);
                }
                else {
                    console.warn("ActivityManager: New attempt blocked; unfinished session exists.", fullActivity.id);
                    this.showBlockedStartNotice(fullActivity, existing);
                    return null;
                }
            }
        }

        this.currentActivity = fullActivity;
        ActivityHistory.set(fullActivity);

        if (typeof ActivitySessionManager !== "undefined" && typeof ActivitySessionManager.begin === "function") {
            const session = ActivitySessionManager.begin(fullActivity);
            if (!session) {
                console.error("ActivityManager: Activity session could not be created", fullActivity.id);
                this.currentActivity = null;
                ActivityHistory.clear();
                return null;
            }
        }

        const engineName = fullActivity.engine || fullActivity.type;
        console.log("Requested Engine:", engineName);
        const engine = this.resolveEngine(engineName);
        if (!engine) { console.error("Engine Not Found:", engineName); ActivityState.set("error"); return null; }

        ActivityState.set("playing");
        document.body.classList.add("activity-playing");

        let result;
        try { result = await engine.start(fullActivity); }
        catch (error) {
            document.body.classList.remove("activity-playing");
            console.error("ActivityManager: Engine Start Error:", error);
            ActivityState.set("error");
            return null;
        }

        this.publishActivityReady(engineName, engine, result, fullActivity);
        return result;
    },

    loadActivityConfig: async function (activityData, selectedDifficulty = null) {
        let fullActivity = { ...activityData };
        if (!activityData.path) {
            if (selectedDifficulty) fullActivity.settings = { ...(fullActivity.settings || {}), difficulty: selectedDifficulty };
            return fullActivity;
        }
        try {
            const configPath = activityData.path + "/activity.json";

            if (typeof DataManager !== "undefined" && typeof DataManager.invalidateCache === "function") {
                DataManager.invalidateCache(configPath);
            }

            const activityConfig = await DataManager.loadJSON(configPath);
            const baseSettings = activityConfig && activityConfig.settings ? { ...activityConfig.settings } : {};
            const activitySettings = { ...(activityData.settings || {}) };
            const mergedSettings = { ...baseSettings, ...activitySettings };
            if (selectedDifficulty) mergedSettings.difficulty = selectedDifficulty;
            fullActivity = { ...activityConfig, ...activityData, settings: mergedSettings };
        }
        catch (error) {
            console.warn("activity.json Not Found:", activityData.id);
            if (selectedDifficulty) fullActivity.settings = { ...(fullActivity.settings || {}), difficulty: selectedDifficulty };
        }
        return fullActivity;
    },

    resolveEngine: function (engineName) {
        if (typeof EngineManager === "undefined") { console.error("EngineManager Not Available"); return null; }
        return EngineManager.getEngine(engineName);
    },

    publishActivityReady: function (engineName, engine, result, activity) {
        const payload = { activity: activity, engine: engine, engineName: engineName, result: result };
        console.log("Activity Ready:", activity ? activity.id : null);
        EventManager.emit("activityReady", payload);
    },

    finish: function (result) {
        console.log("Activity Finished", result);
        ActivityState.set("finished");
        EventManager.emit("activityFinished", result);
    },

    restart: function () {
        if (!this.currentActivity) { console.warn("No Current Activity"); return; }
        return this.load(this.currentActivity);
    },

    getCurrent: function () { return this.currentActivity; },

    showBlockedStartNotice: function (activity, session) {
        if (!activity || !session) return false;
        const overlayId = "unfinishedActivityGuardOverlay";
        const existingOverlay = document.getElementById(overlayId);
        if (existingOverlay) existingOverlay.remove();
        const overlay = document.createElement("div");
        overlay.id = overlayId;
        overlay.dir = "rtl";
        const box = document.createElement("div");
        box.className = "unfinishedActivityGuardModal";
        const title = activity.title || "این فعالیت";
        box.innerHTML = `
            <h2>بازی ناتمام است</h2>
            <p>شما یک بازی ناتمام از «${title}» دارید.</p>
            <p>امکان شروع بازی جدید وجود ندارد.</p>
            <p>ابتدا بازی قبلی را از مسیر «ادامه فعالیت» ادامه دهید.</p>
            <div class="unfinishedActivityGuardActions">
                <button id="unfinishedActivityResumeBtn" type="button">ادامه فعالیت</button>
                <button id="unfinishedActivityBackBtn" type="button">بازگشت</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        const resumeButton = document.getElementById("unfinishedActivityResumeBtn");
        const backButton = document.getElementById("unfinishedActivityBackBtn");
        if (resumeButton) resumeButton.onclick = async function () { overlay.remove(); await ActivityManager.resumeSession(session); };
        if (backButton) backButton.onclick = function () { overlay.remove(); };
        return true;
    },

    resumeSession: async function (session) {
        if (!session || !session.activityId) return false;
        if (typeof ActivitySessionManager === "undefined" || typeof ActivitySessionManager.restoreEngine !== "function") {
            console.error("ActivityManager: Session restore is unavailable");
            return false;
        }
        const activity = typeof App !== "undefined" && typeof App.resolveActivityById === "function" ? App.resolveActivityById(session.activityId) : null;
        if (!activity) { console.error("ActivityManager: Activity not found for resume", session.activityId); return false; }
        const restored = await ActivitySessionManager.restoreEngine(activity, session);
        if (!restored) { console.error("ActivityManager: Failed to restore unfinished activity", session.activityId); return false; }
        this.currentActivity = activity;
        ActivityHistory.set(activity);
        session.status = "active";
        session.updatedAt = Date.now();
        ActivitySessionManager.save(session);
        ActivitySessionManager.currentSession = session;
        ActivitySessionManager.gameplayActive = true;
        document.body.classList.add("activity-playing");
        ActivitySessionManager.installExitControl();
        EventManager.emit("activityResumed", session);
        console.log("ActivityManager: Unfinished activity resumed", session.activityId);
        return true;
    },

    resetRuntime: function () {
        if (
            typeof ActivitySessionManager !== "undefined" &&
            ActivitySessionManager.gameplayActive === true
        ) {
            console.warn("ActivityManager: Runtime reset blocked while an activity is active.");
            return false;
        }

        this.currentActivity = null;
        if (typeof ActivityHistory !== "undefined") ActivityHistory.clear();
        if (typeof ActivityState !== "undefined") ActivityState.reset();
        if (typeof window.PuzzleEngine !== "undefined" && typeof PuzzleEngine.reset === "function") PuzzleEngine.reset();
        if (typeof window.QuizEngine !== "undefined" && typeof QuizEngine.reset === "function") QuizEngine.reset();
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
        if (typeof window.MatchingEngine !== "undefined" && typeof MatchingEngine.reset === "function") MatchingEngine.reset();
        if (typeof window.ClassificationEngine !== "undefined" && typeof ClassificationEngine.reset === "function") ClassificationEngine.reset();
        console.log("Activity Manager Runtime Reset");
        return true;
    },

    reset: function () { return this.resetRuntime(); }
};

window.ActivityManager = ActivityManager;
console.log("Activity Manager v6.6 Ready");
