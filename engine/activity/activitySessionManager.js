// Activity Session Manager v1.8
// Stable session lifecycle and engine-level restore.
// Completion cleanup is performed by ActivityLifecycle after completion data is processed.
const ActivitySessionManager = {
    BASE_KEY: "Tahouri_ActivitySession",
    VERSION: "1.9",
    SCHEMA_VERSION: 1,
    currentSession: null,
    exitControlId: "activitySessionControl",
    overlayId: "activitySessionOverlay",
    gameplayActive: false,
    initialized: false,
    restoringSession: false,

    storageKey() {
        return typeof ProfileContext !== "undefined" && typeof ProfileContext.key === "function"
            ? ProfileContext.key(this.BASE_KEY)
            : null;
    },

    validateSession(session) {
        if (!session || typeof session !== "object" || Array.isArray(session)) return false;
        if (session.version !== this.VERSION) return false;
        // Sessions written before schemaVersion was introduced are treated as
        // schema v1 only when they carry the exact known manager version.
        if (session.schemaVersion !== undefined && session.schemaVersion !== this.SCHEMA_VERSION) return false;
        if (typeof session.profileId !== "string" || !session.profileId) return false;
        if (
            typeof ProfileContext === "undefined" ||
            typeof ProfileContext.getStudentId !== "function" ||
            session.profileId !== ProfileContext.getStudentId()
        ) return false;
        if (typeof session.activityId !== "string" || !session.activityId) return false;
        if (!["active", "resumable"].includes(session.status)) return false;
        if (!session.engineState || typeof session.engineState !== "object" || Array.isArray(session.engineState)) return false;

        const type = session.activityType;
        const data = session.engineState;
        if (type === "DictationEngine" || type === "dictation") {
            return data.kind === "dictation" && !!data.state && typeof data.state === "object" &&
                !!data.content && Array.isArray(data.content.questions) && data.content.questions.length > 0;
        }
        if (type === "WordPuzzleEngine" || type === "wordPuzzle") {
            return data.kind === "wordPuzzle" &&
                !!data.state && typeof data.state === "object" && !Array.isArray(data.state) &&
                !!data.round && typeof data.round === "object" && !Array.isArray(data.round);
        }
        if (type === "QuizEngine" || type === "quiz") {
            return data.kind === "quiz" && !!data.state && typeof data.state === "object" &&
                Array.isArray(data.questions) && data.questions.length > 0 &&
                Number.isInteger(data.currentQuestion) && data.currentQuestion >= 0 &&
                data.currentQuestion < data.questions.length;
        }
        if (type === "MemoryEngine" || type === "memory") {
            return data.kind === "memory" && Array.isArray(data.cards) && data.cards.length > 0 &&
                Number.isInteger(data.totalPairs) && data.totalPairs > 0 &&
                Number.isInteger(data.matchedPairs) && data.matchedPairs >= 0 &&
                data.matchedPairs <= data.totalPairs;
        }
        if (type === "PuzzleEngine" || type === "puzzle") {
            return data.kind === "puzzle" && !!data.state && typeof data.state === "object" &&
                Array.isArray(data.items) && !!data.puzzle && typeof data.puzzle === "object";
        }
        if (type === "ClassificationEngine" || type === "classification") {
            return Array.isArray(data.items) && data.items.length > 0 &&
                Array.isArray(data.categories) && data.categories.length > 0;
        }
        return false;
    },

    load(activityId) {
        const key = this.storageKey();
        if (!key || typeof SaveManager === "undefined") return null;

        const session = SaveManager.load(key);
        if (!this.validateSession(session)) {
            // Reject unsupported or malformed snapshots without deleting them.
            // This preserves evidence and allows a future compatible migrator.
            this.currentSession = null;
            return null;
        }

        if (activityId && session.activityId !== activityId) return null;

        this.currentSession = session;
        return session;
    },

    save(session) {
        const key = this.storageKey();
        if (!key || typeof SaveManager === "undefined" || !session) return false;

        session.version = this.VERSION;
        session.schemaVersion = this.SCHEMA_VERSION;
        session.updatedAt = Date.now();

        const ok = SaveManager.save(key, session);
        if (ok) this.currentSession = session;
        return ok;
    },

    clear() {
        const key = this.storageKey();
        if (key && typeof SaveManager !== "undefined") SaveManager.remove(key);
        this.currentSession = null;
        this.restoringSession = false;
    },

    getEngine(name) {
        if (typeof EngineManager === "undefined") return null;
        try {
            return EngineManager.getEngine(name);
        } catch (error) {
            console.error("ActivitySessionManager engine error", error);
            return null;
        }
    },

    type(activity) {
        return activity ? (activity.engine || activity.type || null) : null;
    },

    generateSessionId() {
        const provider = typeof globalThis !== "undefined" ? globalThis.crypto : null;
        if (!provider) throw new Error("Secure cryptographic randomness is unavailable.");
        if (typeof provider.randomUUID === "function") {
            const uuid = provider.randomUUID();
            if (typeof uuid !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
                throw new Error("crypto.randomUUID() returned an invalid UUID v4.");
            }
            return "activity-session-" + uuid.toLowerCase();
        }
        if (typeof provider.getRandomValues !== "function") {
            throw new Error("Secure crypto.getRandomValues() is unavailable.");
        }
        const bytes = new Uint8Array(16);
        provider.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
        const uuid = hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
        return "activity-session-" + uuid;
    },

    snapshot(activity) {
        const engineName = this.type(activity);
        const engine = this.getEngine(engineName);
        if (!engine) return null;

        if (engineName === "DictationEngine" || engineName === "dictation") {
            if (typeof engine.getSessionState === "function") {
                const state = engine.getSessionState();
                if (!state) return null;
                return {
                    kind: "dictation",
                    activity: engine.activity || activity,
                    content: engine.content ? JSON.parse(JSON.stringify(engine.content)) : null,
                    state: JSON.parse(JSON.stringify(state))
                };
            }
            return null;
        }

        if (typeof engine.getSessionState === "function") {
            return engine.getSessionState();
        }

        if (engineName === "QuizEngine" || engineName === "quiz") {
            return {
                kind: "quiz",
                activity: engine.activity || activity,
                state: { ...(engine.state || {}) },
                questions: Array.isArray(engine.questions) ? JSON.parse(JSON.stringify(engine.questions)) : [],
                currentQuestion: Number(engine.currentQuestion || 0),
                score: Number(typeof ScoreManager !== "undefined" ? ScoreManager.score || 0 : 0),
                correct: Number(typeof ScoreManager !== "undefined" ? ScoreManager.correct || 0 : 0),
                wrong: Number(typeof ScoreManager !== "undefined" ? ScoreManager.wrong || 0 : 0)
            };
        }

        if (engineName === "MemoryEngine" || engineName === "memory") {
            return {
                kind: "memory",
                activity: engine.activity || activity,
                cards: Array.isArray(engine.cards) ? JSON.parse(JSON.stringify(engine.cards)) : [],
                matchedPairs: Number(engine.matchedPairs || 0),
                moves: Number(engine.moves || 0),
                totalPairs: Number(engine.totalPairs || 0),
                finished: !!engine.finished,
                score: Number(typeof ScoreManager !== "undefined" ? ScoreManager.score || 0 : 0),
                correct: Number(typeof ScoreManager !== "undefined" ? ScoreManager.correct || 0 : 0),
                wrong: Number(typeof ScoreManager !== "undefined" ? ScoreManager.wrong || 0 : 0)
            };
        }

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

        return null;
    },

    begin(activity) {
        if (!activity || !activity.id) return null;

        // Never replace an active session for the same activity. This is
        // important because ActivityManager emits activityReady after the
        // engine starts; that event must not create a second session.
        if (
            this.currentSession &&
            this.currentSession.activityId === activity.id &&
            this.currentSession.status === "active"
        ) {
            this.gameplayActive = true;
            document.body.classList.add("activity-playing");
            return this.currentSession;
        }

        const old = this.load(activity.id);
        if (old && old.activityId === activity.id && old.status === "resumable") {
            return old;
        }

        let sessionId;
        try {
            sessionId = this.generateSessionId();
        } catch (error) {
            console.error("ActivitySessionManager: Secure session identity could not be generated.", error);
            return null;
        }

        const session = {
            version: this.VERSION,
            schemaVersion: this.SCHEMA_VERSION,
            id: sessionId,
            profileId:
                typeof ProfileContext !== "undefined" && typeof ProfileContext.getStudentId === "function"
                    ? ProfileContext.getStudentId()
                    : null,
            activityId: activity.id,
            activityType: this.type(activity),
            status: "active",
            startedAt: Date.now(),
            updatedAt: Date.now(),
            engineState: null
        };

        this.currentSession = session;
        this.save(session);
        this.gameplayActive = true;
        document.body.classList.add("activity-playing");
        return session;
    },

    capture(status) {
        const activity = typeof ActivityManager !== "undefined" ? ActivityManager.getCurrent() : null;
        if (!activity || !activity.id) return false;

        let session = this.currentSession;
        if (!session || session.activityId !== activity.id) session = this.begin(activity);

        const state = this.snapshot(activity);
        if (!state) return false;

        session.activityId = activity.id;
        session.activityType = this.type(activity);
        session.engineState = state;
        session.status = status || "resumable";

        return this.save(session);
    },

    exit() {
        if (!this.capture("resumable")) return false;

        this.gameplayActive = false;
        document.body.classList.remove("activity-playing");
        this.hideOverlay();
        this.removeExitControl();

        if (typeof ActivityManager !== "undefined" && typeof ActivityManager.resetRuntime === "function") {
            ActivityManager.resetRuntime();
        }

        EventManager.emit("activityExited", this.currentSession);

        // Return directly to the dashboard through the platform navigation
        // controller so the dashboard history and active navigation stay in sync.
        if (typeof Navigation !== "undefined" && typeof Navigation.openDashboard === "function") {
            Navigation.openDashboard();
        } else if (typeof DashboardController !== "undefined" && typeof DashboardController.open === "function") {
            DashboardController.open();
        } else if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") {
            Screen.showHome();
        } else if (typeof App !== "undefined" && typeof App.goHome === "function") {
            App.goHome();
        }

        return true;
    },

    getResumable(activityId) {
        const session = this.load();
        if (!session || session.status !== "resumable" || !session.engineState) return null;
        if (activityId && session.activityId !== activityId) return null;
        return session;
    },

    async resumeDictationTransactional(activity, session, rawSnapshot) {
        const key = this.storageKey();
        const engine = this.getEngine("DictationEngine");
        if (!key || !engine || typeof engine.restoreSession !== "function" ||
            !rawSnapshot || rawSnapshot.ok !== true || rawSnapshot.exists !== true ||
            typeof rawSnapshot.value !== "string" ||
            typeof DictationScreen === "undefined" || typeof DictationScreen.render !== "function") return false;

        const app = document.getElementById("app");
        if (!app) return false;
        const previous = {
            currentSession: this.currentSession,
            gameplayActive: this.gameplayActive,
            activity: engine.activity,
            content: engine.content,
            state: engine.state,
            runToken: engine.runToken,
            finishAuthorized: engine.finishAuthorized,
            currentActivity: ActivityManager.currentActivity,
            activityState: ActivityState.current,
            bodyPlaying: document.body.classList.contains("activity-playing"),
            appMarkup: app.innerHTML,
            exitNode: document.getElementById(this.exitControlId)
        };
        const exitParent = previous.exitNode ? previous.exitNode.parentNode : null;
        const exitNext = previous.exitNode ? previous.exitNode.nextSibling : null;
        const candidate = JSON.parse(JSON.stringify(session));
        let storageWriteAttempted = false;
        let screenRenderAttempted = false;

        const rollback = () => {
            const failures = [];
            try {
                engine.activity = previous.activity;
                engine.content = previous.content;
                engine.state = previous.state;
                engine.runToken = previous.runToken;
                engine.finishAuthorized = previous.finishAuthorized;
                app.innerHTML = previous.appMarkup;
                if (screenRenderAttempted && previous.state) DictationScreen.render(engine.getState());
            } catch (error) { failures.push("engine-and-screen"); }
            try {
                ActivityManager.currentActivity = previous.currentActivity;
                ActivityState.current = previous.activityState;
                this.currentSession = previous.currentSession;
                this.gameplayActive = previous.gameplayActive;
                document.body.classList.toggle("activity-playing", previous.bodyPlaying);
                const currentExit = document.getElementById(this.exitControlId);
                if (currentExit) currentExit.remove();
                if (previous.exitNode && exitParent) {
                    exitParent.insertBefore(previous.exitNode,
                        exitNext && exitNext.parentNode === exitParent ? exitNext : null);
                }
            } catch (error) { failures.push("runtime-publication"); }
            if (storageWriteAttempted) {
                try {
                    if (!SaveManager.restoreRaw(key, rawSnapshot)) throw new Error("raw restore returned false");
                    const verified = SaveManager.readRaw(key);
                    if (!verified.ok || verified.exists !== rawSnapshot.exists ||
                        verified.value !== rawSnapshot.value) throw new Error("raw restore verification mismatch");
                } catch (error) { failures.push("persisted-session"); }
            }
            return failures;
        };

        this.restoringSession = true;
        try {
            const data = candidate.engineState;
            if (!data || data.kind !== "dictation") return false;

            const preparedEngine = Object.create(engine);
            preparedEngine.activity = data.activity || activity;
            preparedEngine.content = data.content
                ? JSON.parse(JSON.stringify(data.content))
                : (typeof DictationProvider !== "undefined" && typeof DictationProvider.getContent === "function"
                    ? DictationProvider.getContent(preparedEngine.activity)
                    : null);
            if (!preparedEngine.content || !Array.isArray(preparedEngine.content.questions) ||
                !preparedEngine.content.questions.length ||
                preparedEngine.restoreSession(data.state) !== true) return false;

            candidate.status = "active";
            candidate.updatedAt = Date.now();
            const serialized = JSON.stringify(candidate);
            storageWriteAttempted = true;
            if (SaveManager.writeRaw(key, serialized) !== true) {
                const failures = rollback();
                if (failures.length) console.error("Dictation resume rollback incomplete", failures);
                return false;
            }
            const readBack = SaveManager.readRaw(key);
            if (!readBack.ok || !readBack.exists || readBack.value !== serialized) {
                const failures = rollback();
                if (failures.length) console.error("Dictation resume rollback incomplete", failures);
                return false;
            }
            const verified = JSON.parse(readBack.value);
            if (!this.validateSession(verified) || verified.id !== candidate.id ||
                verified.status !== "active" || verified.activityType !== candidate.activityType) {
                const failures = rollback();
                if (failures.length) console.error("Dictation resume rollback incomplete", failures);
                return false;
            }

            engine.activity = preparedEngine.activity;
            engine.content = preparedEngine.content;
            engine.state = preparedEngine.state;
            this.activateRestoredActivity(activity);
            this.currentSession = candidate;
            this.gameplayActive = true;
            screenRenderAttempted = true;
            DictationScreen.render(engine.getState());
            this.installExitControl();
            if (!document.getElementById(this.exitControlId)) {
                throw new Error("Dictation exit control was not published");
            }

            try { EventManager.emit("activityResumed", candidate); }
            catch (error) { console.error("Dictation activityResumed delivery failed after commit", error); }
            console.log("ActivitySessionManager: Dictation session transaction committed", {
                activityId: candidate.activityId,
                sessionId: candidate.id
            });
            return true;
        } catch (error) {
            const failures = rollback();
            console.error("Dictation resume transaction failed", error, failures);
            return false;
        } finally {
            this.restoringSession = false;
        }
    },

    async resumeWordPuzzleTransactional(activity, session, rawSnapshot) {
        const key = this.storageKey();
        const engine = this.getEngine("WordPuzzleEngine");
        if (!key || !engine || typeof engine.restoreSession !== "function" ||
            !rawSnapshot || rawSnapshot.ok !== true || rawSnapshot.exists !== true ||
            typeof rawSnapshot.value !== "string") return false;

        const previous = {
            currentSession: this.currentSession,
            gameplayActive: this.gameplayActive,
            activity: engine.activity,
            engineState: engine.state,
            round: engine.round,
            currentActivity: ActivityManager.currentActivity,
            activityState: ActivityState.current,
            bodyPlaying: document.body.classList.contains("activity-playing"),
            exitNode: document.getElementById(this.exitControlId)
        };
        const exitNode = previous.exitNode;
        const exitParent = previous.exitNode ? previous.exitNode.parentNode : null;
        const exitNext = previous.exitNode ? previous.exitNode.nextSibling : null;
        const candidate = JSON.parse(JSON.stringify(session));
        let storageWriteAttempted = false;

        const rollback = () => {
            const failures = [];
            try {
                engine.activity = previous.activity;
                engine.state = previous.engineState;
                engine.round = previous.round;
            } catch (error) { failures.push("engine"); }
            try {
                ActivityManager.currentActivity = previous.currentActivity;
                ActivityState.current = previous.activityState;
                this.currentSession = previous.currentSession;
                this.gameplayActive = previous.gameplayActive;
                document.body.classList.toggle("activity-playing", previous.bodyPlaying);
                const currentExit = document.getElementById(this.exitControlId);
                if (currentExit) currentExit.remove();
                if (exitNode && exitParent) {
                    exitParent.insertBefore(exitNode, exitNext && exitNext.parentNode === exitParent ? exitNext : null);
                }
            } catch (error) { failures.push("runtime-publication"); }
            if (storageWriteAttempted) {
                try {
                    if (!SaveManager.restoreRaw(key, rawSnapshot)) throw new Error("raw restore returned false");
                    const verified = SaveManager.readRaw(key);
                    if (!verified.ok || verified.exists !== rawSnapshot.exists ||
                        verified.value !== rawSnapshot.value) throw new Error("raw restore verification mismatch");
                } catch (error) { failures.push("persisted-session"); }
            }
            return failures;
        };

        this.restoringSession = true;
        try {
            // Prepare the saved state on an isolated engine facade. restoreSession()
            // writes only to this facade; the live engine remains untouched until
            // the durable storage snapshot has passed exact read-back verification.
            const engineData = candidate.engineState;
            if (!engineData || engineData.kind !== "wordPuzzle" ||
                typeof engine.restoreSession !== "function") {
                const failures = rollback();
                if (failures.length) console.error("WordPuzzle resume rollback incomplete", failures);
                return false;
            }
            const preparedEngine = Object.create(engine);
            preparedEngine.activity = engine.activity;
            preparedEngine.state = engine.state;
            preparedEngine.round = engine.round;
            if (preparedEngine.restoreSession(engineData, { emitReady: false }) !== true) {
                const failures = rollback();
                if (failures.length) console.error("WordPuzzle resume rollback incomplete", failures);
                return false;
            }

            candidate.status = "active";
            candidate.updatedAt = Date.now();
            const serialized = JSON.stringify(candidate);
            storageWriteAttempted = true;
            if (SaveManager.writeRaw(key, serialized) !== true) {
                const failures = rollback();
                if (failures.length) console.error("WordPuzzle resume rollback incomplete", failures);
                return false;
            }
            const readBack = SaveManager.readRaw(key);
            if (!readBack.ok || !readBack.exists || readBack.value !== serialized) {
                const failures = rollback();
                if (failures.length) console.error("WordPuzzle resume rollback incomplete", failures);
                return false;
            }
            let verified;
            try { verified = JSON.parse(readBack.value); } catch (_) { verified = null; }
            if (!verified || verified.id !== candidate.id || verified.profileId !== candidate.profileId ||
                verified.activityId !== candidate.activityId || verified.status !== "active" ||
                verified.activityType !== "WordPuzzleEngine") {
                const failures = rollback();
                if (failures.length) console.error("WordPuzzle resume rollback incomplete", failures);
                return false;
            }

            // Commit the prepared engine only after persistence is durable and verified.
            engine.activity = preparedEngine.activity;
            engine.state = preparedEngine.state;
            engine.round = preparedEngine.round;

            this.activateRestoredActivity(activity);
            this.currentSession = candidate;
            this.gameplayActive = true;
            this.installExitControl();
            if (!document.getElementById(this.exitControlId)) {
                throw new Error("WordPuzzle exit control was not published");
            }

            try { if (typeof engine.emitReady === "function") engine.emitReady(); }
            catch (error) { console.error("WordPuzzle activityReady delivery failed after commit", error); }
            try { EventManager.emit("activityResumed", candidate); }
            catch (error) { console.error("WordPuzzle activityResumed delivery failed after commit", error); }

            console.log("ActivitySessionManager: WordPuzzle session transaction committed", {
                activityId: candidate.activityId,
                sessionId: candidate.id
            });
            return true;
        } catch (error) {
            const failures = rollback();
            console.error("WordPuzzle resume transaction failed", error, failures);
            return false;
        } finally {
            this.restoringSession = false;
        }
    },

    async resume(activityId) {
        // WordPuzzle reads the persisted candidate without publishing it into currentSession.
        const key = this.storageKey();
        if (key && typeof SaveManager !== "undefined" && typeof SaveManager.readRaw === "function") {
            const raw = SaveManager.readRaw(key);
            if (!raw || raw.ok !== true) return false;
            if (raw.exists && typeof raw.value === "string") {
                let stored = null;
                try { stored = JSON.parse(raw.value); } catch (_) { return false; }
                if (this.validateSession(stored) && stored.status === "resumable" &&
                    (!activityId || stored.activityId === activityId) &&
                    (stored.activityType === "DictationEngine" || stored.activityType === "dictation")) {
                    if (typeof App === "undefined" || typeof App.resolveActivityById !== "function") return false;
                    const dictationActivity = App.resolveActivityById(stored.activityId);
                    if (!dictationActivity || dictationActivity.id !== stored.activityId ||
                        this.type(dictationActivity) !== stored.activityType) return false;
                    return this.resumeDictationTransactional(dictationActivity, stored, raw);
                }
                if (this.validateSession(stored) && stored.status === "resumable" &&
                    (!activityId || stored.activityId === activityId) &&
                    (stored.activityType === "WordPuzzleEngine" || stored.activityType === "wordPuzzle")) {
                    if (typeof App === "undefined" || typeof App.resolveActivityById !== "function") return false;
                    const wordPuzzleActivity = App.resolveActivityById(stored.activityId);
                    if (!wordPuzzleActivity || wordPuzzleActivity.id !== stored.activityId ||
                        this.type(wordPuzzleActivity) !== stored.activityType) return false;
                    return this.resumeWordPuzzleTransactional(wordPuzzleActivity, stored, raw);
                }
            }
        }

        const session = this.getResumable(activityId);
        if (!session) return false;

        if (typeof App === "undefined" || typeof App.resolveActivityById !== "function") {
            return false;
        }

        const activity = App.resolveActivityById(session.activityId);
        if (
            !activity ||
            activity.id !== session.activityId ||
            this.type(activity) !== session.activityType
        ) {
            return false;
        }

        // Mark the session as the active restore target before touching the
        // engine. This prevents lifecycle events from replacing it.
        this.currentSession = session;
        this.restoringSession = true;

        try {
            const restored = await this.restoreEngine(activity, session);
            if (!restored) return false;

            session.status = "active";
            this.save(session);
            this.gameplayActive = true;
            document.body.classList.add("activity-playing");
            this.installExitControl();
            EventManager.emit("activityResumed", session);

            console.log("ActivitySessionManager: Session restored", {
                activityId: session.activityId,
                activityType: session.activityType
            });

            return true;
        } finally {
            this.restoringSession = false;
        }
    },

    activateRestoredActivity(activity) {
        ActivityManager.currentActivity = activity;
        ActivityState.set("started");
        ActivityState.set("playing");
        document.body.classList.add("activity-playing");
    },

    async restoreEngine(activity, session) {
        const data = session && session.engineState;
        const engineName = (session && session.activityType) || this.type(activity);
        const engine = this.getEngine(engineName);

        if (!engine || !data) return false;

        // Restore never calls engine.start(). Do not publish global activity
        // state until the engine has accepted its saved snapshot.
        if (data.kind === "dictation" && (engineName === "DictationEngine" || engineName === "dictation")) {
            if (!data.state || typeof engine.restoreSession !== "function") return false;

            const previousEngineState = {
                activity: engine.activity,
                content: engine.content,
                state: engine.state,
                runToken: engine.runToken,
                finishAuthorized: engine.finishAuthorized
            };
            const rollbackEngineState = () => Object.assign(engine, previousEngineState);

            try {
                engine.activity = data.activity || activity;
                engine.content = data.content
                    ? JSON.parse(JSON.stringify(data.content))
                    : (typeof DictationProvider !== "undefined" && typeof DictationProvider.getContent === "function"
                        ? DictationProvider.getContent(engine.activity)
                        : null);

                if (!engine.content || !Array.isArray(engine.content.questions) || !engine.content.questions.length) {
                    rollbackEngineState();
                    return false;
                }

                if (!engine.restoreSession(data.state)) {
                    rollbackEngineState();
                    return false;
                }
            } catch (error) {
                rollbackEngineState();
                throw error;
            }

            this.activateRestoredActivity(activity);

            if (typeof DictationScreen !== "undefined" && typeof DictationScreen.render === "function") {
                DictationScreen.render(engine.getState());
            }

            console.log("ActivitySessionManager: Dictation session restored", {
                activityId: activity.id,
                question: Number(engine.state.currentIndex || 0) + 1,
                totalQuestions: Number(engine.state.totalQuestions || 0)
            });
            return true;
        }

        if (data.kind === "wordPuzzle" && (engineName === "WordPuzzleEngine" || engineName === "wordPuzzle")) {
            if (typeof engine.restoreSession !== "function") return false;

            const previousEngineState = {
                activity: engine.activity,
                state: engine.state,
                round: engine.round
            };
            const rollbackEngineState = () => Object.assign(engine, previousEngineState);

            try {
                if (!engine.restoreSession(data, { emitReady: false })) {
                    rollbackEngineState();
                    return false;
                }
            } catch (error) {
                rollbackEngineState();
                throw error;
            }

            // The transaction coordinator publishes ActivityManager and ActivityState after
            // the session snapshot has been durably written and read back.
            return true;
        }

        if (data.kind === "quiz" && (engineName === "QuizEngine" || engineName === "quiz")) {
            if (typeof QuizScreen === "undefined" || typeof QuizScreen.show !== "function") return false;
            const app = typeof document !== "undefined" && document.getElementById("app");
            if (!app) return false;

            const previousEngineState = {
                activity: engine.activity,
                questions: engine.questions,
                currentQuestion: engine.currentQuestion,
                state: engine.state
            };
            const previousScore = typeof ScoreManager !== "undefined"
                ? { score: ScoreManager.score, correct: ScoreManager.correct, wrong: ScoreManager.wrong }
                : null;
            const previousScreenLock = QuizScreen.isLocked;
            const previousMarkup = app.innerHTML;
            const rollback = () => {
                Object.assign(engine, previousEngineState);
                if (previousScore) Object.assign(ScoreManager, previousScore);
                if (previousScreenLock !== undefined) QuizScreen.isLocked = previousScreenLock;
                app.innerHTML = previousMarkup;
            };

            try {
                engine.activity = data.activity || activity;
                engine.questions = Array.isArray(data.questions) ? JSON.parse(JSON.stringify(data.questions)) : [];
                engine.currentQuestion = Number(data.currentQuestion || 0);
                engine.state = { ...(data.state || {}), started: true, isFinished: false };

                const question = typeof engine.getQuestion === "function" ? engine.getQuestion() : null;
                if (!question) {
                    rollback();
                    return false;
                }

                if (typeof ScoreManager !== "undefined") {
                    ScoreManager.score = Number(data.score || 0);
                    ScoreManager.correct = Number(data.correct || 0);
                    ScoreManager.wrong = Number(data.wrong || 0);
                }

                QuizScreen.reset();
                QuizScreen.show({
                    title: activity.title,
                    score: typeof ScoreManager !== "undefined" ? ScoreManager.score : Number(data.score || 0),
                    currentQuestion: engine.currentQuestion + 1,
                    totalQuestions: engine.questions.length,
                    question
                });
            } catch (error) {
                rollback();
                throw error;
            }

            this.activateRestoredActivity(activity);
            return true;
        }

        if (data.kind === "memory" && (engineName === "MemoryEngine" || engineName === "memory")) {
            if (
                typeof MemoryScreen === "undefined" ||
                typeof MemoryScreen.show !== "function" ||
                typeof document === "undefined"
            ) return false;
            const app = document.getElementById("app");
            if (!app || !Array.isArray(data.cards) || data.cards.length === 0) return false;

            const engineFields = [
                "activity", "cards", "firstCard", "secondCard", "lockBoard",
                "matchedPairs", "moves", "totalPairs", "finished"
            ];
            const previousEngineState = {};
            engineFields.forEach(key => { previousEngineState[key] = engine[key]; });
            const previousScore = typeof ScoreManager !== "undefined"
                ? { score: ScoreManager.score, correct: ScoreManager.correct, wrong: ScoreManager.wrong }
                : null;
            const previousMarkup = app.innerHTML;
            const rollback = () => {
                Object.assign(engine, previousEngineState);
                if (previousScore) Object.assign(ScoreManager, previousScore);
                app.innerHTML = previousMarkup;
            };

            try {
                engine.activity = data.activity || activity;
                engine.cards = JSON.parse(JSON.stringify(data.cards));
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

                const rendered = MemoryScreen.show({
                    title: activity.title || "بازی حافظه",
                    cards: engine.cards
                });
                if (rendered !== true) {
                    rollback();
                    return false;
                }
            } catch (error) {
                rollback();
                throw error;
            }

            this.activateRestoredActivity(activity);
            return true;
        }

        if (data.kind === "puzzle" && (engineName === "PuzzleEngine" || engineName === "puzzle")) {
            if (
                !data.state || typeof data.state !== "object" || Array.isArray(data.state) ||
                !data.puzzle || typeof data.puzzle !== "object" || Array.isArray(data.puzzle) ||
                !Array.isArray(data.items) || !Number.isFinite(Number(data.moves)) ||
                typeof document === "undefined" ||
                typeof PuzzleScreen === "undefined" || typeof PuzzleScreen.show !== "function"
            ) return false;
            const app = document.getElementById("app");
            if (!app) return false;

            const engineFields = [
                "activity", "state", "puzzle", "questions", "currentQuestion", "items",
                "userAnswer", "moves", "transitioning", "checking", "finishAcceptedThisCheck",
                "startRequestId", "transitionRequestId"
            ];
            const previousEngineState = {};
            engineFields.forEach(key => { previousEngineState[key] = engine[key]; });
            const previousScore = typeof ScoreManager !== "undefined"
                ? { score: ScoreManager.score, correct: ScoreManager.correct, wrong: ScoreManager.wrong }
                : null;
            const previousMarkup = app.innerHTML;
            const previousJigsawStates = {
                facade: typeof JigsawPuzzle !== "undefined" ? JigsawPuzzle.state : undefined,
                image: typeof JigsawImagePuzzle !== "undefined" ? JigsawImagePuzzle.state : undefined,
                words: typeof JigsawWordPuzzle !== "undefined" ? JigsawWordPuzzle.state : undefined
            };
            const isJigsaw = data.puzzle.type === "jigsaw";
            const rollback = () => {
                // Restore the visible UI even if a core-state rollback itself throws.
                try {
                    Object.assign(engine, previousEngineState);
                    if (previousScore) Object.assign(ScoreManager, previousScore);
                    if (typeof JigsawPuzzle !== "undefined") JigsawPuzzle.state = previousJigsawStates.facade;
                    if (typeof JigsawImagePuzzle !== "undefined") JigsawImagePuzzle.state = previousJigsawStates.image;
                    if (typeof JigsawWordPuzzle !== "undefined") JigsawWordPuzzle.state = previousJigsawStates.words;
                } finally {
                    app.innerHTML = previousMarkup;
                }
            };

            try {
                engine.activity = data.activity || activity;
                engine.state = { ...data.state, started: true, isFinished: false };
                engine.puzzle = JSON.parse(JSON.stringify(data.puzzle));
                // Reconcile persisted Jigsaw state with the current activity definition.
                // Older sessions may contain the old nested { content: { image, rows, cols } }
                // shape, so the saved session must not override the current asset definition.
                if (isJigsaw && activity.puzzle) {
                    const currentPuzzle = activity.puzzle;
                    const currentContent = currentPuzzle.content || {};
                    const currentImage = currentPuzzle.image || currentContent.image;
                    const currentRows = currentPuzzle.rows || currentContent.rows;
                    const currentCols = currentPuzzle.cols || currentContent.cols;
                    if (currentImage) engine.puzzle.image = currentImage;
                    if (currentRows) engine.puzzle.rows = currentRows;
                    if (currentCols) engine.puzzle.cols = currentCols;
                }
                engine.items = JSON.parse(JSON.stringify(data.items));
                engine.userAnswer = data.userAnswer;
                engine.moves = Number(data.moves);

                if (isJigsaw) {
                    if (
                        typeof JigsawPuzzle === "undefined" ||
                        typeof JigsawPuzzle.restoreFromEngine !== "function" ||
                        JigsawPuzzle.restoreFromEngine() !== true
                    ) {
                        rollback();
                        return false;
                    }
                }

                const rendered = PuzzleScreen.show(engine.getState());
                if (rendered === false || !app.innerHTML ||
                    !app.innerHTML.includes("puzzleScreen") ||
                    (isJigsaw && !app.innerHTML.includes("jigsawScreen"))) {
                    rollback();
                    return false;
                }
            } catch (error) {
                rollback();
                throw error;
            }

            // Activity publication is deferred until the durable resume commit.
            return true;
        }

        if (engineName === "classification" || engineName === "ClassificationEngine") {
            if (typeof engine.restoreSession !== "function") return false;
            if (!Array.isArray(data.items) || !Array.isArray(data.categories)) return false;
            if (data.items.length === 0 || data.categories.length === 0) return false;

            const fullActivity =
                typeof ActivityManager !== "undefined" && typeof ActivityManager.loadActivityConfig === "function"
                    ? await ActivityManager.loadActivityConfig(activity)
                    : activity;

            if (!fullActivity || !fullActivity.classification) return false;

            // ClassificationEngine.restoreSession() requires activityData
            // before it can rebuild its content. Preserve its previous engine
            // fields if validation rejects the snapshot or restoration throws.
            const previousEngineState = {
                activityData: engine.activityData,
                content: engine.content,
                handler: engine.handler,
                state: engine.state
            };
            engine.activityData = fullActivity;
            let classificationRestored = false;
            try {
                classificationRestored = engine.restoreSession(data) === true;
            } catch (error) {
                Object.assign(engine, previousEngineState);
                throw error;
            }
            if (!classificationRestored) {
                Object.assign(engine, previousEngineState);
                return false;
            }

            // Do not call ClassificationEngine.start() on this path.
            this.activateRestoredActivity(fullActivity);
            if (typeof ClassificationScreen !== "undefined" && typeof ClassificationScreen.show === "function") {
                ClassificationScreen.currentActivity = fullActivity;
                ClassificationScreen.currentState = engine.getState();
                ClassificationScreen.lastMessage = "";
                ClassificationScreen.show(engine.getState());
            }

            return true;
        }

        return false;
    },

    complete() {
        this.clear();
        this.gameplayActive = false;
        document.body.classList.remove("activity-playing");
        document.body.classList.remove("activity-result-open");
        this.hideOverlay();
        this.removeExitControl();
    },

    installExitControl() {
        this.removeExitControl();
        if (!this.gameplayActive) return;

        const button = document.createElement("button");
        button.id = this.exitControlId;
        button.type = "button";
        button.textContent = "☰";
        button.title = "مکث و خروج";
        button.setAttribute("aria-label", "مکث و خروج از فعالیت");
        button.onclick = () => this.showOverlay();
        document.body.appendChild(button);
    },

    removeExitControl() {
        const button = document.getElementById(this.exitControlId);
        if (button) button.remove();
    },

    showOverlay() {
        const saved = this.capture("resumable");
        this.hideOverlay();

        const overlay = document.createElement("div");
        overlay.id = this.overlayId;
        overlay.dir = "rtl";

        const box = document.createElement("div");
        box.className = "activityRuntimeModal";
        box.innerHTML = '<h2>فعالیت متوقف شد</h2><p>' + (saved ? 'وضعیت فعلی ذخیره شد.' : 'ذخیره خودکار این بازی در دسترس نیست؛ می‌توانید به فعالیت‌ها برگردید.') + '</p><div class="activityRuntimeActions"><button id="activitySessionResumeBtn" type="button">ادامه فعالیت</button><button id="activitySessionExitBtn" type="button">' + (saved ? 'خروج و ذخیره' : 'خروج') + '</button></div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const resumeButton = document.getElementById("activitySessionResumeBtn");
        const exitButton = document.getElementById("activitySessionExitBtn");

        if (resumeButton) resumeButton.onclick = () => this.hideOverlay();
        if (exitButton) exitButton.onclick = () => this.exit();
    },

    hideOverlay() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) overlay.remove();
    },

    connect() {
        if (this.initialized) return;
        this.initialized = true;

        EventManager.on("activityReady", payload => {
            if (!payload || !payload.activity) return;

            // A restore path does not need a new session. More importantly,
            // never replace a restored session with a fresh one on lifecycle
            // events.
            if (this.restoringSession) {
                console.log("ActivitySessionManager: activityReady ignored during session restore");
                return;
            }

            this.begin(payload.activity);
            this.gameplayActive = true;
            document.body.classList.add("activity-playing");
            this.installExitControl();
        });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden" && this.gameplayActive) {
                this.capture("resumable");
            }
        });

        window.addEventListener("beforeunload", () => {
            if (this.gameplayActive) this.capture("resumable");
        });

        console.log("Activity Session Manager v1.9 Ready");
    }
};

window.ActivitySessionManager = ActivitySessionManager;
ActivitySessionManager.connect();