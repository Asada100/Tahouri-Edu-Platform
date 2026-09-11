// =====================================
// Tahouri Edu Platform
// Activity Session Manager v1.2
//
// Responsibilities:
// - Profile-scoped resumable activity sessions
// - One independent session per activity
// - Pause / Exit / Resume lifecycle
// - Engine state snapshot / restore
// - Generic gameplay exit overlay
// - Dashboard resume bridge
// =====================================

const ActivitySessionManager = {
    BASE_KEY: "Tahouri_ActivitySession",
    VERSION: "1.2",
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

    load: function (activityId) {
        const sessions = this.loadAll();
        if (activityId) {
            const session = sessions[activityId] || null;
            this.currentSession = session;
            return session;
        }
        const list = Object.values(sessions).filter(Boolean);
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
        if (!activityId || (this.currentSession && this.currentSession.activityId === id)) {
            this.currentSession = null;
        }
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
        const engineName = this.getActivityType(activity);
        const engine = this.getEngine(engineName);
        if (!engine) return null;
        if (typeof engine.getSessionState === "function") return engine.getSessionState();
        if (engineName === "PuzzleEngine" || engineName === "puzzle") {
            return {
                kind: "puzzle",
                activity: engine.activity || activity,
                state: { ...(engine.state || {}) },
                puzzle: engine.puzzle ? JSON.parse(JSON.stringify(engine.puzzle)) : null,
                items: Array.isArray(engine.items) ? JSON.parse(JSON.stringify(engine.items)) : [],
                userAnswer: engine.userAnswer,
                moves: Number(engine.moves || 0)
            };
        }
        if (engineName === "QuizEngine" || engineName === "quiz") {
            return {
                kind: "quiz",
                activity: engine.activity || activity,
                state: { ...(engine.state || {}) },
                questions: Array.isArray(engine.questions) ? JSON.parse(JSON.stringify(engine.questions)) : [],
                currentQuestion: Number(engine.currentQuestion || 0),
                score: typeof ScoreManager !== "undefined" ? Number(ScoreManager.score || 0) : 0,
                correct: typeof ScoreManager !== "undefined" ? Number(ScoreManager.correct || 0) : 0,
                wrong: typeof ScoreManager !== "undefined" ? Number(ScoreManager.wrong || 0) : 0
            };
        }
        if (engineName === "MemoryEngine" || engineName === "memory") {
            const cards = Array.isArray(engine.cards) ? JSON.parse(JSON.stringify(engine.cards)) : [];
            cards.forEach(function (card) { card.flipped = !!card.matched; });
            return {
                kind: "memory",
                activity: engine.activity || activity,
                cards: cards,
                firstCardId: null,
                secondCardId: null,
                lockBoard: false,
                matchedPairs: Number(engine.matchedPairs || 0),
                moves: Number(engine.moves || 0),
                totalPairs: Number(engine.totalPairs || 0),
                finished: !!engine.finished,
                score: typeof ScoreManager !== "undefined" ? Number(ScoreManager.score || 0) : 0,
                correct: typeof ScoreManager !== "undefined" ? Number(ScoreManager.correct || 0) : 0,
                wrong: typeof ScoreManager !== "undefined" ? Number(ScoreManager.wrong || 0) : 0
            };
        }
        console.warn("ActivitySessionManager: No serializer for engine", engineName);
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
        if (!engineState) {
            console.warn("ActivitySessionManager: Activity state could not be captured", activity.id);
            return false;
        }
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
        const resumable = Object.values(sessions).filter(function (session) {
            return session && session.status === "resumable" && session.engineState;
        });
        resumable.sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); });
        const session = resumable.length ? resumable[0] : null;
        this.currentSession = session;
        return session;
    },

    resume: async function () {
        const session = this.getResumable();
        if (!session) return false;
        if (typeof App === "undefined" || typeof App.resolveActivityById !== "function") {
            console.error("ActivitySessionManager: App activity resolver unavailable");
            return false;
        }
        const activity = App.resolveActivityById(session.activityId);
        if (!activity) {
            console.error("ActivitySessionManager: Activity not found", session.activityId);
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
        if (data.kind === "puzzle" && (engineName === "PuzzleEngine" || engineName === "puzzle")) {
            engine.activity = data.activity || activity;
            engine.state = { ...(data.state || {}), started: true, isFinished: false };
            engine.puzzle = data.puzzle ? JSON.parse(JSON.stringify(data.puzzle)) : null;
            engine.items = Array.isArray(data.items) ? JSON.parse(JSON.stringify(data.items)) : [];
            engine.userAnswer = data.userAnswer;
            engine.moves = Number(data.moves || 0);
            ActivityManager.currentActivity = activity;
            ActivityState.set("started");
            ActivityState.set("playing");
            if (typeof PuzzleScreen !== "undefined" && typeof PuzzleScreen.show === "function") PuzzleScreen.show(engine.getState());
            return true;
        }
        if (data.kind === "quiz" && (engineName === "QuizEngine" || engineName === "quiz")) {
            engine.activity = data.activity || activity;
            engine.questions = Array.isArray(data.questions) ? JSON.parse(JSON.stringify(data.questions)) : [];
            engine.currentQuestion = Number(data.currentQuestion || 0);
            engine.state = { ...(data.state || {}), started: true, isFinished: false };
            if (typeof ScoreManager !== "undefined") {
                ScoreManager.score = Number(data.score || 0);
                ScoreManager.correct = Number(data.correct || 0);
                ScoreManager.wrong = Number(data.wrong || 0);
            }
            ActivityManager.currentActivity = activity;
            ActivityState.set("started");
            ActivityState.set("playing");
            const question = engine.getQuestion();
            if (question && typeof QuizScreen !== "undefined" && typeof QuizScreen.show === "function") {
                QuizScreen.reset();
                QuizScreen.show({
                    title: activity.title,
                    score: typeof ScoreManager !== "undefined" ? ScoreManager.score : 0,
                    currentQuestion: engine.currentQuestion + 1,
                    totalQuestions: engine.questions.length,
                    question: question
                });
            }
            return true;
        }
        if (data.kind === "memory" && (engineName === "MemoryEngine" || engineName === "memory")) {
            engine.activity = data.activity || activity;
            engine.cards = Array.isArray(data.cards) ? JSON.parse(JSON.stringify(data.cards)) : [];
            engine.cards.forEach(function (card) { card.flipped = !!card.matched; });
            engine.firstCard = null;
            engine.secondCard = null;
            engine.lockBoard = false;
            engine.matchedPairs = Number(data.matchedPairs || 0);
            engine.moves = Number(data.moves || 0);
            engine.totalPairs = Number(data.totalPairs || 0);
            engine.finished = false;
            if (typeof ScoreManager !== "undefined") {
                ScoreManager.score = Number(data.score || 0);
                ScoreManager.correct = Number(data.correct || 0);
                ScoreManager.wrong = Number(data.wrong || 0);
            }
            ActivityManager.currentActivity = activity;
            ActivityState.set("started");
            ActivityState.set("playing");
            if (typeof MemoryScreen !== "undefined" && typeof MemoryScreen.show === "function") MemoryScreen.show({ title: activity.title || "بازی حافظه", cards: engine.cards });
            return true;
        }
        if (data.type === "matching" && (engineName === "MatchingEngine" || engineName === "matching") && typeof engine.restoreSession === "function") {
            const restoredState = engine.restoreSession(data);
            if (!restoredState) {
                console.error("ActivitySessionManager: Matching session restore failed");
                return false;
            }
            ActivityManager.currentActivity = activity;
            ActivityState.set("started");
            ActivityState.set("playing");
            if (typeof MatchingScreen !== "undefined" && typeof MatchingScreen.show === "function") MatchingScreen.show(restoredState);
            return true;
        }
        console.error("ActivitySessionManager: Unsupported restore type", engineName);
        return false;
    },

    complete: function (activityId) {
        const id = activityId || (this.currentSession && this.currentSession.activityId);
        if (id) {
            this.clear(id);
        }
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
        this.capture("resumable");
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
        console.log("Activity Session Manager v1.2 Ready");
    }
};

window.ActivitySessionManager = ActivitySessionManager;
ActivitySessionManager.connect();
