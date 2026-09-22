// =====================================
// Tahouri Edu Platform
// Version 6.9
// Activity Manager
// =====================================

const ActivityManager = {
    currentActivity: null,
    allowActivityStartFromResult: false,
    postFinishLoadBlocked: false,

    getCurrent: function () {
        return this.currentActivity;
    },

    load: async function (activityData) {
        if (this.postFinishLoadBlocked && !this.allowActivityStartFromResult) { console.warn("ActivityManager: Activity load blocked after completion; explicit restart is required."); return null; }
        const resultModalOpen = document.getElementById("resultModal");
        if (resultModalOpen && !this.allowActivityStartFromResult) { console.warn("ActivityManager: Activity load blocked while result modal is open."); return null; }
        this.allowActivityStartFromResult = false;
        console.log("Loading Activity:", activityData);
        if (!activityData) { console.error("Activity Data Missing"); return null; }

        // Jigsaw must ask for its level before the engine starts.
        // Keep this guard here at the ActivityManager boundary so it cannot
        // be skipped by cached/alternate navigation entry points.
        const isJigsawActivity =
            String(activityData.type || "").toLowerCase() === "puzzle" &&
            String(activityData.engine || "").toLowerCase() === "puzzle" &&
            !(activityData.settings && activityData.settings.jigsawLevelSelected === true);

        if (
            isJigsawActivity &&
            typeof DifficultyModal !== "undefined" &&
            typeof DifficultyModal.open === "function"
        ) {
            let puzzleConfig = activityData.puzzle || null;
            if (!puzzleConfig && activityData.path && typeof DataManager !== "undefined" && typeof DataManager.loadJSON === "function") {
                try {
                    const config = await DataManager.loadJSON(activityData.path + "/activity.json");
                    puzzleConfig = config && config.puzzle ? config.puzzle : null;
                } catch (error) {
                    console.warn("ActivityManager: Could not inspect puzzle type before difficulty selection.", activityData.id);
                }
            }

            const isJigsaw = puzzleConfig && String(puzzleConfig.type || "").toLowerCase() === "jigsaw";
            const jigsawMode =
                isJigsaw && puzzleConfig.image ? "image" :
                isJigsaw && puzzleConfig.content && Array.isArray(puzzleConfig.content.words) ? "words" :
                isJigsaw && Array.isArray(puzzleConfig.words) ? "words" : null;

            if (jigsawMode) {
                DifficultyModal.open({ ...activityData, puzzle: puzzleConfig, jigsawMode: jigsawMode }, function (selectedActivity) {
                    if (!selectedActivity) return;
                    selectedActivity.settings = { ...(selectedActivity.settings || {}), jigsawLevelSelected: true };
                    ActivityManager.load(selectedActivity);
                });
                return null;
            }

            return await this.start(activityData, activityData.settings && activityData.settings.difficulty ? activityData.settings.difficulty : null);
        }

        const selectedDifficulty = activityData.settings && activityData.settings.difficulty ? activityData.settings.difficulty : null;
        EventManager.emit("activityLoaded", activityData);
        return await this.start(activityData, selectedDifficulty);
    },

    allowNewActivityStart: function () { this.postFinishLoadBlocked = false; this.allowActivityStartFromResult = false; console.log("ActivityManager: Explicit activity start allowed."); },
    blockPostFinishLoads: function () { this.postFinishLoadBlocked = true; this.allowActivityStartFromResult = false; console.log("ActivityManager: Post-finish activity loads blocked."); },

    start: async function (activityData, selectedDifficulty = null) {
        const fullActivity = await this.loadActivityConfig(activityData, selectedDifficulty);
        if (!fullActivity) { console.error("ActivityManager: Full Activity Could Not Be Prepared"); return null; }
        if (typeof ActivitySessionManager !== "undefined") {
            let existing = typeof ActivitySessionManager.load === "function" ? ActivitySessionManager.load(fullActivity.id) : null;
            const invalidClassificationSession = existing && fullActivity.engine === "classification" && existing.engineState && (!Array.isArray(existing.engineState.items) || !Array.isArray(existing.engineState.categories) || existing.engineState.items.length === 0 || existing.engineState.categories.length === 0 || Number(existing.engineState.totalItems || 0) <= 0);
            if (invalidClassificationSession) { ActivitySessionManager.clear(); existing = null; }
            const invalidPuzzleSession = existing && fullActivity.engine === "puzzle" && existing.engineState && (existing.engineState.kind !== "puzzle" || !existing.engineState.puzzle || !existing.engineState.puzzle.type);
            if (invalidPuzzleSession) { ActivitySessionManager.clear(); existing = null; }
            const currentPuzzleType = fullActivity.engine === "puzzle" && fullActivity.puzzle ? fullActivity.puzzle.type : null;
            const savedPuzzleType = existing && existing.engineState && existing.engineState.puzzle ? existing.engineState.puzzle.type : null;
            const incompatiblePuzzleSession = existing && fullActivity.engine === "puzzle" && currentPuzzleType && savedPuzzleType && currentPuzzleType !== savedPuzzleType;
            if (incompatiblePuzzleSession) { ActivitySessionManager.clear(); existing = null; }

            const currentJigsawGrid = fullActivity.engine === "puzzle" && currentPuzzleType === "jigsaw" && fullActivity.puzzle
                ? { rows: Number(fullActivity.puzzle.rows), cols: Number(fullActivity.puzzle.cols) }
                : null;
            const savedJigsawGrid = existing && existing.engineState && existing.engineState.puzzle && savedPuzzleType === "jigsaw"
                ? { rows: Number(existing.engineState.puzzle.rows), cols: Number(existing.engineState.puzzle.cols) }
                : null;
            const incompatibleJigsawGrid = !!(existing && currentJigsawGrid && savedJigsawGrid &&
                (currentJigsawGrid.rows !== savedJigsawGrid.rows || currentJigsawGrid.cols !== savedJigsawGrid.cols));
            if (incompatibleJigsawGrid) {
                ActivitySessionManager.clear();
                existing = null;
                console.log("ActivityManager: Jigsaw session grid changed; starting a fresh session.", {
                    current: currentJigsawGrid,
                    saved: savedJigsawGrid
                });
            }
            const solvedJigsawSession = existing && fullActivity.engine === "puzzle" && existing.engineState && savedPuzzleType === "jigsaw" && Array.isArray(existing.engineState.items) && existing.engineState.items.length > 1 && existing.engineState.items.every(function (id, index) { const value = String(id || ""); return value === `word-${index}` || value === `piece-${index}`; });
            if (solvedJigsawSession) { ActivitySessionManager.clear(); existing = null; }
            const unfinished = existing && (existing.status === "resumable" || existing.status === "active") && existing.engineState;
            if (unfinished) {
                const engineState = existing.engineState;
                const state = engineState.state || {};
                const completedSnapshot = state.isFinished === true || engineState.finished === true || engineState.completed === true;
                if (completedSnapshot) ActivitySessionManager.clear();
                else {
                    // An explicit activity click must not dead-end on a stale resumable
                    // session. Try to restore it first; if restoration fails, discard the
                    // broken session and start a clean attempt.
                    if (typeof ActivitySessionManager.resume === "function") {
                        const resumed = await ActivitySessionManager.resume(fullActivity.id);
                        if (resumed) return ActivitySessionManager.currentSession;
                    }
                    ActivitySessionManager.clear();
                    console.warn("ActivityManager: Invalid resumable session cleared; starting fresh.", fullActivity.id);
                }
            }
        }
        this.currentActivity = fullActivity;
        ActivityHistory.set(fullActivity);
        if (typeof ActivitySessionManager !== "undefined" && typeof ActivitySessionManager.begin === "function") {
            const session = ActivitySessionManager.begin(fullActivity);
            if (!session) { console.error("ActivityManager: Activity session could not be created", fullActivity.id); this.currentActivity = null; ActivityHistory.clear(); return null; }
        }
        const engineName = fullActivity.engine || fullActivity.type;
        console.log("Requested Engine:", engineName);
        const engine = this.resolveEngine(engineName);
        if (!engine) { console.error("Engine Not Found:", engineName); ActivityState.set("error"); return null; }
        ActivityState.set("playing");
        document.body.classList.add("activity-playing");
        let result;
        try { result = await engine.start(fullActivity); }
        catch (error) { document.body.classList.remove("activity-playing"); console.error("ActivityManager: Engine Start Error:", error); ActivityState.set("error"); return null; }
        this.publishActivityReady(engineName, engine, result, fullActivity);
        return result;
    },

    loadActivityConfig: async function (activityData, selectedDifficulty = null) {
        let fullActivity = { ...activityData };
        if (!activityData.path) { if (selectedDifficulty) fullActivity.settings = { ...(fullActivity.settings || {}), difficulty: selectedDifficulty }; return fullActivity; }
        try {
            const configPath = activityData.path + "/activity.json";
            if (typeof DataManager !== "undefined" && typeof DataManager.invalidateCache === "function") DataManager.invalidateCache(configPath);
            const activityConfig = await DataManager.loadJSON(configPath);
            const baseSettings = activityConfig && activityConfig.settings ? { ...activityConfig.settings } : {};
            const activitySettings = { ...(activityData.settings || {}) };
            const mergedSettings = { ...baseSettings, ...activitySettings };
            if (selectedDifficulty) mergedSettings.difficulty = selectedDifficulty;
            fullActivity = { ...activityConfig, ...activityData, settings: mergedSettings };

            // Jigsaw level selection supplies the orientation-aware grid.
            // Keep this override scoped to Jigsaw so other puzzle types remain untouched.
            if (
                fullActivity.puzzle &&
                String(fullActivity.puzzle.type || "").toLowerCase() === "jigsaw" &&
                Number.isInteger(Number(mergedSettings.jigsawRows)) &&
                Number.isInteger(Number(mergedSettings.jigsawCols))
            ) {
                fullActivity.puzzle = {
                    ...fullActivity.puzzle,
                    rows: Number(mergedSettings.jigsawRows),
                    cols: Number(mergedSettings.jigsawCols),
                    difficulty: selectedDifficulty || mergedSettings.difficulty || 1
                };
            }
            if (
                fullActivity.puzzle &&
                String(fullActivity.puzzle.type || "").toLowerCase() === "jigsaw" &&
                !fullActivity.puzzle.image &&
                Number.isInteger(Number(mergedSettings.wordJigsawDifficulty))
            ) {
                fullActivity.puzzle = {
                    ...fullActivity.puzzle,
                    difficulty: Number(mergedSettings.wordJigsawDifficulty)
                };
            }
        } catch (error) { console.warn("activity.json Not Found:", activityData.id); if (selectedDifficulty) fullActivity.settings = { ...(fullActivity.settings || {}), difficulty: selectedDifficulty }; }
        return fullActivity;
    },

    resolveEngine: function (engineName) { if (typeof EngineManager === "undefined") { console.error("EngineManager Not Available"); return null; } return EngineManager.getEngine(engineName); },
    publishActivityReady: function (engineName, engine, result, activity) { const payload = { activity: activity, engine: engine, engineName: engineName, result: result }; console.log("Activity Ready:", activity ? activity.id : null); EventManager.emit("activityReady", payload); },
    finish: function (result) { console.log("Activity Finished", result); this.blockPostFinishLoads(); ActivityState.set("finished"); EventManager.emit("activityFinished", result); },
    restart: function () { if (!this.currentActivity) { console.warn("No Current Activity"); return; } this.allowActivityStartFromResult = true; this.postFinishLoadBlocked = false; return this.load(this.currentActivity); },
    showBlockedStartNotice: function (activity, session) { if (typeof ToastManager !== "undefined" && typeof ToastManager.show === "function") ToastManager.show("این فعالیت قبلاً شروع شده است. برای ادامه، گزینه «ادامه» را انتخاب کنید."); if (typeof DashboardController !== "undefined" && typeof DashboardController.showResumePrompt === "function") DashboardController.showResumePrompt(activity, session); }
};

window.ActivityManager = ActivityManager;
console.log("Activity Manager v6.9 Ready");