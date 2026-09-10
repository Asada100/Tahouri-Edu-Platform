// =====================================
// Tahouri Edu Platform
// Question Performance Manager v1.0
// Smart Content — Question-Level Data Layer
//
// Responsibilities:
// - Record question-level correct / wrong results
// - Keep data isolated per active profile
// - Preserve activity/question metadata for future adaptive selection
//
// This module is intentionally independent from:
// - QuizEngine execution
// - StatisticsManager aggregates
// - Memory / Puzzle engines
// =====================================

const QuestionPerformanceManager = {

    VERSION: "1.0",

    STORAGE_KEY: "Tahouri_QuestionPerformance",

    currentActivityId: null,

    initialized: false,

    init: function () {

        if (this.initialized) {
            return;
        }

        if (typeof EventManager === "undefined") {
            console.error("QuestionPerformanceManager: EventManager Not Available");
            return;
        }

        EventManager.on("activityStarted", (activity) => {
            this.currentActivityId =
                activity && activity.id
                    ? activity.id
                    : null;
        });

        EventManager.on("answer:correct", (question) => {
            this.record(question, true);
        });

        EventManager.on("answer:wrong", (question) => {
            this.record(question, false);
        });

        EventManager.on("activityFinished", () => {
            this.currentActivityId = null;
        });

        this.initialized = true;

        console.log("Question Performance Manager v1.0 Ready");
    },

    getStorageKey: function () {

        if (
            typeof ProfileContext !== "undefined" &&
            typeof ProfileContext.key === "function"
        ) {
            return ProfileContext.key(this.STORAGE_KEY);
        }

        return null;
    },

    load: function () {

        const key = this.getStorageKey();

        if (!key) {
            return {};
        }

        try {
            const raw = localStorage.getItem(key);

            if (!raw) {
                return {};
            }

            const data = JSON.parse(raw);

            return data && typeof data === "object"
                ? data
                : {};
        }
        catch (error) {
            console.error(
                "QuestionPerformanceManager: Load failed",
                error
            );
            return {};
        }
    },

    save: function (data) {

        const key = this.getStorageKey();

        if (!key) {
            return false;
        }

        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        }
        catch (error) {
            console.error(
                "QuestionPerformanceManager: Save failed",
                error
            );
            return false;
        }
    },

    getQuestionKey: function (question, activityId) {

        if (!question) {
            return null;
        }

        const resolvedActivityId =
            activityId ||
            this.currentActivityId ||
            "unknown-activity";

        if (question.id !== undefined && question.id !== null) {
            return (
                String(resolvedActivityId) +
                "|id:" +
                String(question.id)
            );
        }

        const parts = [
            resolvedActivityId,
            question.type || "quiz",
            question.mode || "",
            question.number !== undefined ? question.number : "",
            question.divisor !== undefined ? question.divisor : "",
            question.text || ""
        ];

        return parts.join("|");
    },

    record: function (question, isCorrect) {

        const studentId =
            typeof ProfileContext !== "undefined" &&
            typeof ProfileContext.getStudentId === "function"
                ? ProfileContext.getStudentId()
                : null;

        if (!studentId || !question) {
            return false;
        }

        const questionKey = this.getQuestionKey(question);

        if (!questionKey) {
            return false;
        }

        const data = this.load();
        const existing = data[questionKey] || {
            activityId: this.currentActivityId,
            attempts: 0,
            correct: 0,
            wrong: 0,
            lastAnswerCorrect: null,
            firstSeenAt: new Date().toISOString()
        };

        existing.activityId =
            existing.activityId || this.currentActivityId;

        existing.attempts += 1;

        if (isCorrect) {
            existing.correct += 1;
        }
        else {
            existing.wrong += 1;
        }

        existing.lastAnswerCorrect = !!isCorrect;
        existing.lastSeenAt = new Date().toISOString();

        if (question.difficulty !== undefined) {
            existing.difficulty = question.difficulty;
        }

        if (question.skill !== undefined) {
            existing.skill = question.skill;
        }

        if (question.concept !== undefined) {
            existing.concept = question.concept;
        }

        if (question.mode !== undefined) {
            existing.mode = question.mode;
        }

        if (question.number !== undefined) {
            existing.number = question.number;
        }

        if (question.divisor !== undefined) {
            existing.divisor = question.divisor;
        }

        data[questionKey] = existing;

        const saved = this.save(data);

        if (saved) {
            console.log(
                "Question Performance Recorded:",
                this.currentActivityId,
                questionKey,
                isCorrect ? "correct" : "wrong"
            );
        }

        return saved;
    },

    get: function (question, activityId) {

        if (!question) {
            return null;
        }

        const key = this.getQuestionKey(
            question,
            activityId
        );

        const data = this.load();

        return key ? (data[key] || null) : null;
    },

    getAll: function () {
        return this.load();
    }
};

window.QuestionPerformanceManager = QuestionPerformanceManager;

QuestionPerformanceManager.init();
