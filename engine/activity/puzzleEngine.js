// =====================================
// Tahouri Edu Platform
// Puzzle Engine
// Version 3.0
// Multi-question lifecycle + aggregated result
// =====================================

const PuzzleEngine = {
    state: {
        started: false,
        isFinished: false
    },

    activity: null,
    puzzle: null,
    questions: [],
    currentQuestion: 0,
    items: [],
    userAnswer: null,
    moves: 0,
    transitioning: false,

    start: async function (activityData) {
        if (!activityData) {
            console.error("Puzzle Engine: Activity Data Missing");
            return null;
        }

        this.activity = activityData;
        this.state.started = true;
        this.state.isFinished = false;
        this.transitioning = false;
        this.puzzle = null;
        this.questions = [];
        this.currentQuestion = 0;
        this.items = [];
        this.userAnswer = null;
        this.moves = 0;

        if (typeof QuestionProvider === "undefined") {
            console.error("Puzzle Engine: QuestionProvider Not Available");
            this.state.started = false;
            return null;
        }

        if (typeof PuzzleTypeRegistry === "undefined") {
            console.error("Puzzle Engine: PuzzleTypeRegistry Not Available");
            this.state.started = false;
            return null;
        }

        const providerActivity = this.prepareProviderActivity(activityData);
        let puzzleQuestions;

        try {
            puzzleQuestions = await QuestionProvider.getPuzzleQuestions(providerActivity);
        } catch (error) {
            console.error("Puzzle Engine: QuestionProvider Error:", error);
            this.state.started = false;
            return null;
        }

        if (!Array.isArray(puzzleQuestions) || puzzleQuestions.length === 0) {
            console.error("Puzzle Engine: No Puzzle Content Available");
            this.state.started = false;
            return null;
        }

        this.questions = puzzleQuestions.filter(Boolean);
        if (this.questions.length === 0) {
            console.error("Puzzle Engine: No Valid Puzzle Questions");
            this.state.started = false;
            return null;
        }

        if (typeof ScoreManager !== "undefined" && typeof ScoreManager.reset === "function") {
            ScoreManager.reset();
        }

        EventManager.emit("activityStarted", activityData);
        EventManager.emit("activityPlaying");

        console.log("Puzzle Questions Ready:", this.questions.length);
        return this.startCurrentQuestion();
    },

    prepareProviderActivity: function (activityData) {
        const puzzle = activityData.puzzle || {};
        const settings = activityData.settings || {};

        const hasExplicitSource =
            puzzle.source !== undefined ||
            settings.questionSource !== undefined;

        if (hasExplicitSource) return activityData;

        const hasFixedData =
            Array.isArray(puzzle.items) ||
            Array.isArray(puzzle.correctOrder) ||
            Array.isArray(puzzle.options) ||
            Array.isArray(puzzle.words) ||
            Array.isArray(puzzle.cells) ||
            Array.isArray(puzzle.inputs) ||
            Array.isArray(puzzle.outputs);

        if (hasFixedData) {
            return {
                ...activityData,
                settings: { ...settings, questionSource: "file" },
                puzzle: { ...puzzle, source: "file" }
            };
        }

        return {
            ...activityData,
            settings: { ...settings, questionSource: "generated" },
            puzzle: { ...puzzle, source: "generated" }
        };
    },

    startCurrentQuestion: function () {
        if (this.currentQuestion >= this.questions.length) {
            this.completeActivity();
            return null;
        }

        this.puzzle = null;
        this.items = [];
        this.userAnswer = null;

        const puzzle = this.questions[this.currentQuestion];
        if (!puzzle) {
            console.error("Puzzle Engine: Invalid Puzzle Content", this.currentQuestion);
            this.state.started = false;
            return null;
        }

        const handler = PuzzleTypeRegistry.get(puzzle.type);
        if (!handler || typeof handler.start !== "function") {
            console.error("Puzzle Engine: Unsupported Puzzle Type:", puzzle.type);
            this.state.started = false;
            return null;
        }

        console.log("Puzzle Question:", this.currentQuestion + 1, "/", this.questions.length, puzzle.type);
        const result = handler.start(this, puzzle);

        if (!result) {
            console.error("Puzzle Engine: Puzzle Handler Failed:", puzzle.type);
            this.state.started = false;
            return null;
        }

        this.emitCurrentQuestionReady();
        return result;
    },

    emitCurrentQuestionReady: function () {
        EventManager.emit("activityReady", {
            activity: this.activity,
            engine: this,
            engineName: "PuzzleEngine",
            result: this.getState()
        });
    },

    getState: function () {
        const state = {
            type: this.puzzle ? this.puzzle.type : null,
            dataType: this.puzzle ? (this.puzzle.dataType || null) : null,
            source: this.puzzle ? (this.puzzle.source || null) : null,
            instruction: this.puzzle ? (this.puzzle.instruction || "") : "",
            items: Array.isArray(this.items) ? [...this.items] : [],
            userAnswer: this.userAnswer,
            moves: this.moves,
            currentQuestion: this.currentQuestion,
            totalQuestions: this.questions.length,
            questionNumber: this.currentQuestion + 1,
            finished: this.state.isFinished
        };

        if (!this.puzzle) return state;

        if (this.puzzle.type === "ordering") {
            state.correctOrder = Array.isArray(this.puzzle.correctOrder) ? [...this.puzzle.correctOrder] : [];
        }

        if (this.puzzle.type === "sequence") {
            state.missingIndex = this.puzzle.missingIndex;
            state.answer = this.puzzle.answer;
            state.pattern = this.puzzle.pattern;
            state.step = this.puzzle.step;
            state.multiplier = this.puzzle.multiplier;
        }

        if (this.puzzle.type === "visualMath") {
            state.operation = this.puzzle.operation;
            state.comparison = this.puzzle.comparison;
            state.answer = this.puzzle.answer;
        }

        if (this.puzzle.type === "inputOutput") {
            state.inputs = Array.isArray(this.puzzle.inputs) ? [...this.puzzle.inputs] : [];
            state.outputs = Array.isArray(this.items) ? [...this.items] : [];
            state.missingIndex = this.puzzle.missingIndex;
            state.rule = this.puzzle.rule;
            state.answer = this.puzzle.answer;
        }

        if (this.puzzle.type === "sentence") {
            state.mode = this.puzzle.mode;
            state.words = Array.isArray(this.puzzle.words) ? [...this.puzzle.words] : [];
            state.correctWords = Array.isArray(this.puzzle.correctOrder) ? [...this.puzzle.correctOrder] : [];
            state.grammar = this.puzzle.grammar;
            state.targets = Array.isArray(this.puzzle.targets) ? [...this.puzzle.targets] : [];
            state.answers = Array.isArray(this.puzzle.answers) ? [...this.puzzle.answers] : [];
        }

        if (["grid", "wordGrid", "crossGrid"].includes(this.puzzle.type)) {
            state.rows = this.puzzle.rows;
            state.cols = this.puzzle.cols;
            state.cells = Array.isArray(this.puzzle.cells) ? [...this.puzzle.cells] : [];
            state.missingIndices = Array.isArray(this.puzzle.missingIndices) ? [...this.puzzle.missingIndices] : [];
            state.answers = Array.isArray(this.puzzle.answers) ? [...this.puzzle.answers] : [];
        }

        if (this.puzzle.type === "grid") {
            state.rules = Array.isArray(this.puzzle.rules) ? [...this.puzzle.rules] : [];
            state.answer = this.puzzle.answer;
        }

        if (this.puzzle.type === "wordGrid") {
            state.relation = this.puzzle.relation;
            state.relationType = this.puzzle.relationType;
            state.answer = this.puzzle.answer;
        }

        if (this.puzzle.type === "crossGrid") {
            state.horizontalPaths = Array.isArray(this.puzzle.horizontalPaths) ? [...this.puzzle.horizontalPaths] : [];
            state.verticalPaths = Array.isArray(this.puzzle.verticalPaths) ? [...this.puzzle.verticalPaths] : [];
            state.paths = Array.isArray(this.puzzle.paths) ? [...this.puzzle.paths] : [];
            state.rules = Array.isArray(this.puzzle.rules) ? [...this.puzzle.rules] : [];
            state.answer = this.puzzle.answer;
        }

        if (this.puzzle.type === "jigsaw") {
            state.objective = this.puzzle.objective || "";
            state.title = this.puzzle.title || "";
            state.difficulty = this.puzzle.difficulty;
            state.image = this.puzzle.image;
            state.rows = this.puzzle.rows;
            state.cols = this.puzzle.cols;
            state.pieceCount = this.puzzle.pieceCount;
        }

        return state;
    },

    setOrder: function (newOrder) {
        if (!Array.isArray(newOrder)) return false;
        this.items = [...newOrder];
        this.moves++;
        EventManager.emit("puzzleChanged", this.getState());
        return true;
    },

    setSequenceAnswer: function (value) {
        if (!this.puzzle || this.puzzle.type !== "sequence") return false;
        this.items[this.puzzle.missingIndex] = value;
        this.moves++;
        EventManager.emit("puzzleChanged", this.getState());
        return true;
    },

    setVisualMathAnswer: function (value) {
        if (!this.puzzle || this.puzzle.type !== "visualMath") return false;

        if (this.puzzle.operation === "comparison") {
            if (!["left", "right", "equal"].includes(value)) return false;
            this.userAnswer = value;
        } else {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) return false;
            this.userAnswer = numericValue;
        }

        this.moves++;
        EventManager.emit("puzzleChanged", this.getState());
        return true;
    },

    setGenericAnswer: function (value) {
        if (!this.puzzle) return false;
        this.userAnswer = Array.isArray(value) ? [...value] : value;

        if (this.puzzle.type === "inputOutput" && Number.isInteger(this.puzzle.missingIndex)) {
            this.items[this.puzzle.missingIndex] = value;
        }

        this.moves++;
        EventManager.emit("puzzleChanged", this.getState());
        return true;
    },

    setTypeAnswer: function (value) {
        if (!this.puzzle) return false;
        const handler = PuzzleTypeRegistry.get(this.puzzle.type);
        if (!handler) return false;
        if (typeof handler.setAnswer === "function") return handler.setAnswer(this, value);
        this.userAnswer = Array.isArray(value) ? [...value] : value;
        this.moves++;
        EventManager.emit("puzzleChanged", this.getState());
        return true;
    },

    setCell: function (index, value) {
        if (!this.puzzle) return false;
        const handler = PuzzleTypeRegistry.get(this.puzzle.type);
        if (!handler || typeof handler.setCell !== "function") return false;
        return handler.setCell(this, index, value);
    },

    setCells: function (values) {
        if (!this.puzzle) return false;
        const handler = PuzzleTypeRegistry.get(this.puzzle.type);
        if (!handler || typeof handler.setCells !== "function") return false;
        return handler.setCells(this, values);
    },

    check: function () {
        if (!this.puzzle) return false;
        const handler = PuzzleTypeRegistry.get(this.puzzle.type);
        if (!handler || typeof handler.check !== "function") return false;
        return handler.check(this);
    },

    emitWrong: function () {
        if (typeof ScoreManager !== "undefined" && typeof ScoreManager.addWrong === "function") {
            ScoreManager.addWrong();
        }
        EventManager.emit("puzzleWrong", this.getState());
    },

    emitStarted: function () {
        EventManager.emit("puzzleStarted", this.puzzle);
        EventManager.emit("activityPlaying");
    },

    finish: function () {
        if (this.state.isFinished || this.transitioning) return;

        if (typeof ScoreManager !== "undefined" && typeof ScoreManager.addCorrect === "function") {
            ScoreManager.addCorrect();
        }

        const finishedQuestion = this.currentQuestion;
        this.currentQuestion++;

        if (this.currentQuestion < this.questions.length) {
            this.transitioning = true;
            this.startCurrentQuestion();
            setTimeout(function () {
                PuzzleEngine.transitioning = false;
            }, 0);
            return;
        }

        this.completeActivity(finishedQuestion);
    },

    completeActivity: function () {
        if (this.state.isFinished) return;

        this.state.isFinished = true;
        const result = this.buildResult();

        console.log("Puzzle Finished:", result);
        EventManager.emit("puzzleFinished", result);
        EventManager.emit("activityFinished", result);
    },

    buildResult: function () {
        const total = this.questions.length || 1;
        const correct = typeof ScoreManager !== "undefined" ? Number(ScoreManager.correct || 0) : 0;
        const wrong = typeof ScoreManager !== "undefined" ? Number(ScoreManager.wrong || 0) : 0;
        const score = typeof ScoreManager !== "undefined" ? Number(ScoreManager.score || 0) : correct * 10;
        const percentage = Math.round((correct / total) * 100);

        return ActivityResult.create({
            activityId: this.activity ? this.activity.id : null,
            score: score,
            percentage: percentage,
            totalQuestions: total,
            correctAnswers: correct,
            wrongAnswers: wrong,
            moves: this.moves,
            message: "🎉 پازل تمام شد"
        });
    },

    reset: function () {
        this.state.started = false;
        this.state.isFinished = false;
        this.activity = null;
        this.puzzle = null;
        this.questions = [];
        this.currentQuestion = 0;
        this.items = [];
        this.userAnswer = null;
        this.moves = 0;
        this.transitioning = false;
    },

    buildCorrectOrder: function (items, order) {
        const copy = Array.isArray(items) ? [...items] : [];
        if (order === "descending") return copy.sort((a, b) => b - a);
        if (this.detectDataType(copy) === "number") return copy.sort((a, b) => a - b);
        return copy.sort();
    },

    detectDataType: function (items) {
        if (!Array.isArray(items) || items.length === 0) return "text";
        if (items.every(item => typeof item === "string" && (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item) || item.startsWith("data:image/")))) return "image";
        if (items.every(item => typeof item === "number")) return "number";
        return "text";
    },

    valuesEqual: function (a, b) {
        if (a === null || a === undefined || b === null || b === undefined) return a === b;
        const numberA = Number(a);
        const numberB = Number(b);
        if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) return numberA === numberB;
        return String(a) === String(b);
    },

    areArraysEqual: function (a, b) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (!this.valuesEqual(a[i], b[i])) return false;
        return true;
    },

    shuffle: function (array) {
        if (!Array.isArray(array)) return [];
        const list = [...array];
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
    },

    logOrdering: function () {
        if (!this.puzzle) return;
        console.log("Puzzle Data Type:", this.puzzle.dataType);
        console.log("Puzzle Items:", this.items);
        console.log("Correct Order:", this.puzzle.correctOrder);
    },

    logSequence: function () {
        if (!this.puzzle) return;
        console.log("Sequence Data Type:", this.puzzle.dataType);
        console.log("Sequence Items:", this.items);
        console.log("Sequence Pattern:", this.puzzle.pattern);
        console.log("Sequence Missing Index:", this.puzzle.missingIndex);
        if (this.puzzle.step !== null) console.log("Sequence Step:", this.puzzle.step);
        if (this.puzzle.multiplier !== null) console.log("Sequence Multiplier:", this.puzzle.multiplier);
    }
};

window.PuzzleEngine = PuzzleEngine;
console.log("Puzzle Engine v3.0 Ready");