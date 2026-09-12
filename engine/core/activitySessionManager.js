// =====================================
// Tahouri Edu Platform
// Activity Session Manager v1.5
// =====================================

const ActivitySessionManager = {
    BASE_KEY: "Tahouri_ActivitySession",
    VERSION: "1.5",
    currentSession: null,
    exitControlId: "activitySessionControl",
    overlayId: "activitySessionOverlay",
    gameplayActive: false,
    initialized: false,

    storageKey: function () {
        if (typeof ProfileContext === "undefined" || typeof ProfileContext.key !== "function") return null;
        return ProfileContext.key(this.BASE_KEY);
    },

    loadAll: function () {
        const key = this.storageKey();
        if (!key || typeof SaveManager === "undefined") return {};
        const stored = SaveManager.load(key);
        if (!stored) return {};
        if (stored.sessions && typeof stored.sessions === "object") return stored.sessions;
        if (stored.activityId) {
            const migrated = {};
            migrated[stored.activityId] = stored;
            SaveManager.save(key, { version: this.VERSION, sessions: migrated, updatedAt: Date.now() });
            return migrated;
        }
        return {};
    },

    saveAll: function (sessions) {
        const key = this.storageKey();
        if (!key || typeof SaveManager === "undefined") return false;
        return SaveManager.save(key, {
            version: this.VERSION,
            sessions: sessions || {},
            updatedAt: Date.now()
        });
    },

    isInvalidClassificationState: function (state) {
        const value = state && state.state && typeof state.state === "object"
            ? state.state
            : state;
        if (!value || typeof value !== "object") return true;
        return (
            !Array.isArray(value.items) ||
            !Array.isArray(value.categories) ||
            value.items.length === 0 ||
            value.categories.length === 0 ||
            Number(value.totalItems || 0) <= 0
        );
    },

    isInvalidClassificationSession: function (session, activity) {
        if (!session || !session.engineState) return false;
        const sessionType = String(session.activityType || "").toLowerCase();
        const activityType = activity
            ? String(activity.engine || activity.type || "").toLowerCase()
            : "";
        const isClassification =
            activityType === "classification" ||
            sessionType === "classification" ||
            sessionType === "classificationengine";
        if (!isClassification) return false;
        return this.isInvalidClassificationState(session.engineState);
    },

    load: function (activityId) {
        const sessions = this.loadAll();
        if (activityId) {
            const session = sessions[activityId] || null;
            if (this.isInvalidClassificationSession(session)) {
                delete sessions[activityId];
                this.saveAll(sessions);
                this.currentSession = null;
                return null;
            }
            this.currentSession = session;
            return session;
        }
        const list = Object.values(sessions).filter(function (session) {
            return session && !ActivitySessionManager.isInvalidClassificationSession(session);
        });
        list.sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); });
        const session = list.length ? list[0] : null;
        this.currentSession = session;
        return session;
    },

    save: function (session) {
        if (!session || !session.activityId) return false;
        const sessions = this.loadAll();
        session.version = this.VERSION;
        session.updatedAt = Date.now();
        sessions[session.activityId] = session;
        const ok = this.saveAll(sessions);
        if (ok) this.currentSession = session;
        return ok;
    },

    clear: function (activityId) {
        const sessions = this.loadAll();
        const id = activityId || (this.currentSession && this.currentSession.activityId);
        if (id && Object.prototype.hasOwnProperty.call(sessions, id)) {
            delete sessions[id];
            this.saveAll(sessions);
        }
        if (!activityId || (this.currentSession && this.currentSession.activityId === id)) this.currentSession = null;
    },

    getEngine: function (activityType) {
        if (typeof EngineManager === "undefined") return null;
        try { return EngineManager.getEngine(activityType); }
        catch (error) { console.error("ActivitySessionManager: Engine resolution failed", error); return null; }
    },

    getActivityType: function (activity) {
        if (!activity) return null;
        return activity.engine || activity.type || null;
    },

    snapshotEngine: function (activity) {
        const engine = this.getEngine(this.getActivityType(activity));
        if (!engine) return null;
        if (typeof engine.getSessionState === "function") return engine.getSessionState();
        return null;
    },

    begin: function (activity) {
        if (!activity || !activity.id) return null;
        const existing = this.load(activity.id);
        if (existing && existing.status === "resumable") {
            this.currentSession = existing;
            this.gameplayActive = true;
            return existing;
        }
        const session = {
            version: this.VERSION,
            id: "activity-session-" + activity.id + "-" + Date.now(),
            profileId: typeof ProfileContext !== "undefined" ? ProfileContext.getStudentId() : null,
            activityId: activity.id,
            activityType: this.getActivityType(activity),
            status: "active",
            startedAt: Date.now(),
            updatedAt: Date.now(),
            engineState: null
        };
        this.currentSession = session;
        this.save(session);
        this.gameplayActive = true;
        return session;
    },

    capture: function (status) {
        if (!this.gameplayActive) return false;
        const activity = typeof ActivityManager !== "undefined" ? ActivityManager.getCurrent() : null;
        if (!activity || !activity.id) return false;
        const session = this.load(activity.id);
        if (!session || session.status !== "active") return false;
        const engineState = this.snapshotEngine(activity);
        if (!engineState) return false;
        session.activityId = activity.id;
        session.activityType = this.getActivityType(activity);
        session.engineState = engineState;
        session.status = status || "resumable";
        session.updatedAt = Date.now();
        return this.save(session);
    },

    exit: function () {
        const saved = this.capture("resumable");
        if (!saved) return false;
        this.gameplayActive = false;
        this.hideOverlay();
        this.removeExitControl();
        document.body.classList.remove("activity-playing");
        if (typeof ActivityManager !== "undefined" && typeof ActivityManager.resetRuntime === "function") ActivityManager.resetRuntime();
        EventManager.emit("activityExited", this.currentSession);
        if (typeof DashboardController !== "undefined" && typeof DashboardController.open === "function") DashboardController.open();
        else if (typeof App !== "undefined" && typeof App.goHome === "function") App.goHome();
        return true;
    },

    getResumable: function () {
        const sessions = this.loadAll();
        let changed = false;
        const resumable = Object.values(sessions).filter(function (session) {
            if (!session) return false;
            let activity = null;
            if (typeof App !== "undefined" && typeof App.resolveActivityById === "function" && session.activityId) {
                activity = App.resolveActivityById(session.activityId);
            }
            if (ActivitySessionManager.isInvalidClassificationSession(session, activity)) {
                delete sessions[session.activityId];
                changed = true;
                return false;
            }
            return session.status === "resumable" && session.engineState;
        });
        if (changed) this.saveAll(sessions);
        resumable.sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); });
        const session = resumable.length ? resumable[0] : null;
        this.currentSession = session;
        return session;
    },

    resume: async function () {
        const session = this.getResumable();
        if (!session) return false;
        const activity = typeof App !== "undefined" && typeof App.resolveActivityById === "function"
            ? App.resolveActivityById(session.activityId)
            : null;
        if (!activity) {
            this.clear(session.activityId);
            return false;
        }
        const restored = await this.restoreEngine(activity, session);
        if (!restored) return false;
        session.status = "active";
        session.updatedAt = Date.now();
        this.save(session);
        this.gameplayActive = true;
        EventManager.emit("activityResumed", session);
        this.installExitControl();
        return true;
    },

    restoreEngine: async function (activity, session) {
        const data = session.engineState;
        const engineName = session.activityType || this.getActivityType(activity);
        const engine = this.getEngine(engineName);
        if (!engine || !data) return false;

        if (data.type === "matching" && (engineName === "MatchingEngine" || engineName === "matching") && typeof engine.restoreSession === "function") {
            const restoredState = engine.restoreSession(data);
            if (!restoredState) return false;
            ActivityManager.currentActivity = activity;
            ActivityState.set("started");
            ActivityState.set("playing");
            if (typeof MatchingScreen !== "undefined" && typeof MatchingScreen.show === "function") MatchingScreen.show(restoredState);
            return true;
        }

        if (
            (engineName === "classification" || String(engineName).toLowerCase() === "classificationengine") &&
            typeof engine.start === "function" &&
            typeof engine.restoreSession === "function"
        ) {
            try {
                const fullActivity =
                    typeof ActivityManager !== "undefined" &&
                    typeof ActivityManager.loadActivityConfig === "function"
                        ? await ActivityManager.loadActivityConfig(activity)
                        : activity;

                // Always initialize the engine from the real activity content first.
                // A stale session must never be allowed to replace a healthy state.
                const freshState = engine.start(fullActivity);

                if (this.isInvalidClassificationState(data)) {
                    console.warn("ActivitySessionManager: Discarding invalid Classification state", activity.id);
                    session.engineState = freshState;
                    session.status = "active";
                    this.save(session);
                    ActivityManager.currentActivity = fullActivity;
                    ActivityState.set("started");
                    ActivityState.set("playing");
                    document.body.classList.add("activity-playing");
                    if (typeof ClassificationScreen !== "undefined" && typeof ClassificationScreen.show === "function") {
                        ClassificationScreen.currentActivity = fullActivity;
                        ClassificationScreen.currentState = freshState;
                        ClassificationScreen.show(freshState);
                    }
                    return true;
                }

                const restoredState = engine.restoreSession(data);

                // Defensive check: even if the session passed the first check,
                // never display a zero-item classification state.
                if (this.isInvalidClassificationState(restoredState)) {
                    console.warn("ActivitySessionManager: Restored Classification state invalid; using fresh state", activity.id);
                    session.engineState = freshState;
                    session.status = "active";
                    this.save(session);
                    ActivityManager.currentActivity = fullActivity;
                    ActivityState.set("started");
                    ActivityState.set("playing");
                    document.body.classList.add("activity-playing");
                    if (typeof ClassificationScreen !== "undefined" && typeof ClassificationScreen.show === "function") {
                        ClassificationScreen.currentActivity = fullActivity;
                        ClassificationScreen.currentState = freshState;
                        ClassificationScreen.show(freshState);
                    }
                    return true;
                }

                ActivityManager.currentActivity = fullActivity;
                ActivityState.set("started");
                ActivityState.set("playing");
                document.body.classList.add("activity-playing");
                if (typeof ClassificationScreen !== "undefined" && typeof ClassificationScreen.show === "function") {
                    ClassificationScreen.currentActivity = fullActivity;
                    ClassificationScreen.currentState = restoredState;
                    ClassificationScreen.show(restoredState);
                }
                return true;
            } catch (error) {
                console.error("ActivitySessionManager: Classification session restore failed", error);
                return false;
            }
        }

        console.error("ActivitySessionManager: Unsupported restore type", engineName);
        return false;
    },

    complete: function (activityId) {
        const id = activityId || (this.currentSession && this.currentSession.activityId);
        if (id) this.clear(id);
        this.currentSession = null;
        this.gameplayActive = false;
        this.hideOverlay();
        this.removeExitControl();
    },

    installExitControl: function () {
        this.removeExitControl();
        if (!this.gameplayActive) return;
        const control = document.createElement("button");
        control.id = this.exitControlId;
        control.type = "button";
        control.textContent = "☰";
        control.title = "مکث و خروج";
        control.setAttribute("aria-label", "مکث و خروج از فعالیت");
        control.style.position = "fixed";
        control.style.top = "12px";
        control.style.right = "12px";
        control.style.zIndex = "9999";
        control.style.width = "42px";
        control.style.height = "42px";
        control.style.borderRadius = "50%";
        control.style.border = "0";
        control.style.cursor = "pointer";
        control.style.fontSize = "20px";
        control.onclick = function () { ActivitySessionManager.showOverlay(); };
        document.body.appendChild(control);
    },

    removeExitControl: function () {
        const control = document.getElementById(this.exitControlId);
        if (control) control.remove();
    },

    showOverlay: function () {
        this.hideOverlay();
        const overlay = document.createElement("div");
        overlay.id = this.overlayId;
        overlay.dir = "rtl";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.zIndex = "10000";
        overlay.style.background = "rgba(0,0,0,.55)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.padding = "20px";
        const box = document.createElement("div");
        box.style.background = "white";
        box.style.borderRadius = "18px";
        box.style.padding = "24px";
        box.style.maxWidth = "360px";
        box.style.width = "100%";
        box.style.textAlign = "center";
        box.style.boxSizing = "border-box";
        box.innerHTML = `
            <h2>فعالیت متوقف شد</h2>
            <p>می‌توانی همین‌جا ادامه بدهی یا از فعالیت خارج شوی. وضعیت فعلی ذخیره شده است.</p>
            <div style="display:flex;gap:10px;flex-direction:column;margin-top:18px;">
                <button id="activitySessionResumeBtn" type="button">ادامه فعالیت</button>
                <button id="activitySessionExitBtn" type="button">خروج و ذخیره</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        document.getElementById("activitySessionResumeBtn").onclick = function () { ActivitySessionManager.hideOverlay(); };
        document.getElementById("activitySessionExitBtn").onclick = function () { ActivitySessionManager.exit(); };
    },

    hideOverlay: function () {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) overlay.remove();
    },

    connect: function () {
        if (this.initialized) return;
        this.initialized = true;
        EventManager.on("activityReady", function (payload) {
            if (!payload || !payload.activity) return;
            ActivitySessionManager.begin(payload.activity);
            ActivitySessionManager.gameplayActive = true;
            ActivitySessionManager.installExitControl();
        });
        EventManager.on("activityFinished", function (payload) {
            const activityId = payload && payload.activity
                ? payload.activity.id
                : (payload && payload.activityId ? payload.activityId : null);
            ActivitySessionManager.complete(activityId);
        });
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden" && ActivitySessionManager.gameplayActive) ActivitySessionManager.capture("resumable");
        });
        window.addEventListener("beforeunload", function () {
            if (ActivitySessionManager.gameplayActive) ActivitySessionManager.capture("resumable");
        });
        console.log("Activity Session Manager v1.5 Ready");
    }
};

window.ActivitySessionManager = ActivitySessionManager;
ActivitySessionManager.connect();