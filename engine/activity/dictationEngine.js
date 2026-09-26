// =====================================
// Tahouri Edu Platform
// Dictation Engine
// Version 2.0
// Guided Word + Missing Letter + Context
// =====================================

(function (window) {
    "use strict";

    const PERSIAN_ROWS = [
        ["ض","ص","ث","ق","ف","غ","ع","ه","خ","ح","ج","چ"],
        ["ش","س","ی","ب","ل","ا","ت","ن","م","ک","گ"],
        ["ظ","ط","ز","ر","ذ","د","ئ","و","پ","ژ"]
    ];
    const SPACE = " ";

    const DictationEngine = {
        activity: null,
        content: null,
        state: null,

        start: async function (activityData) {
            this.reset();
            this.activity = activityData || {};
            if (!window.DictationProvider || typeof window.DictationProvider.getContent !== "function") {
                throw new Error("DictationProvider is not available");
            }
            this.content = window.DictationProvider.getContent(this.activity);
            if (!this.content || !Array.isArray(this.content.questions) || this.content.questions.length === 0) {
                throw new Error("DictationEngine: No spelling questions available");
            }
            this.state = {
                started: true, isFinished: false, locked: false,
                currentIndex: 0, totalQuestions: this.content.questions.length,
                correctAnswers: 0, wrongAnswers: 0, score: 0, attempts: 0,
                characterErrors: 0, answers: [], currentInput: "",
                missingSlots: [], currentSlotIndex: 0, currentCharIndex: 0,\n                questionCompleted: false, transitioning: false
            };
            this.prepareCurrentQuestion();
            EventManager.emit("activityStarted", this.activity);
            EventManager.emit("activityPlaying");
            return this.getState();
        },

        getCurrentQuestion: function () {
            if (!this.state || !this.content || this.state.currentIndex >= this.content.questions.length) return null;
            return this.content.questions[this.state.currentIndex];
        },

        getMode: function () {
            const q = this.getCurrentQuestion();
            return q && q.mode ? q.mode : "guided-word";
        },

        prepareCurrentQuestion: function () {
            const q = this.getCurrentQuestion();
            if (!q || !this.state) return;
            this.state.currentInput = "";
            this.state.currentSlotIndex = 0;
            this.state.currentCharIndex = 0;
            this.state.missingSlots = this.buildMissingSlots(q);
        },

        buildMissingSlots: function (question) {
            const slots = [];
            if (!question || !Array.isArray(question.missing)) return slots;
            question.missing.forEach(function (item) {
                const start = Math.max(0, Number(item.start) || 0);
                const length = Math.max(1, Number(item.length) || 1);
                for (let i = 0; i < length; i += 1) slots.push(start + i);
            });
            return slots;
        },

        getKeyboardRows: function () {
            const question = this.getCurrentQuestion();
            const active = new Set();
            if (question) {
                if (this.getMode() === "missing-letter" || this.getMode() === "context") {
                    const candidates = Array.isArray(question.allowedLetters) && question.allowedLetters.length
                        ? question.allowedLetters
                        : this.state.missingSlots.map(i => Array.from(question.answer || "")[i]).filter(Boolean);
                    candidates.forEach(c => active.add(c));
                } else {
                    Array.from(question.answer || "").forEach(c => { if (c !== SPACE) active.add(c); });
                }
            }
            const expected = this.getExpectedChar();
            return PERSIAN_ROWS.map(row => row.map(key => ({
                key: key, active: active.has(key), expected: key === expected
            })));
        },

        getKeyboard: function () {
            return this.getKeyboardRows().flat();
        },

        getExpectedChar: function () {
            const q = this.getCurrentQuestion();
            if (!q || !this.state) return "";
            const chars = Array.from(q.answer || "");
            if (this.getMode() === "missing-letter" || this.getMode() === "context") {
                return chars[this.state.missingSlots[this.state.currentSlotIndex]] || "";
            }
            return chars[this.state.currentCharIndex] || "";
        },

        getDisplayText: function () {
            const q = this.getCurrentQuestion();
            if (!q || !this.state) return "";
            const chars = Array.from(q.answer || "");
            if (this.getMode() === "missing-letter" || this.getMode() === "context") {
                const pending = new Set(this.state.missingSlots.slice(this.state.currentSlotIndex));
                return chars.map((char, index) => pending.has(index) ? "...." : char).join("");
            }
            return chars.slice(0, this.state.currentCharIndex).join("");
        },

        getGuideChar: function () {
            return this.getExpectedChar() || "";
        },

        inputChar: function (char) {
            if (!this.state || this.state.isFinished || this.state.transitioning || !char) return null;
            const q = this.getCurrentQuestion();
            if (!q) return null;
            const expected = this.getExpectedChar();
            const normalizedChar = this.normalizeChar(char);
            const normalizedExpected = this.normalizeChar(expected);
            this.state.attempts += 1;

            if (normalizedChar !== normalizedExpected) {
                this.state.characterErrors += 1;
                const result = { correct: false, character: char, expected: expected, questionIndex: this.state.currentIndex };
                EventManager.emit("answer:wrong", result);
                return result;
            }

            if (this.getMode() === "missing-letter" || this.getMode() === "context") {
                this.state.currentSlotIndex += 1;
            } else {
                this.state.currentCharIndex += 1;
            }

            const complete = this.isCurrentQuestionComplete();
            const result = { correct: true, character: char, expected: expected, questionIndex: this.state.currentIndex, complete: complete };
            EventManager.emit("answer:correct", result);
            if (complete) return this.completeCurrentQuestion();
            return result;
        },

        inputSpace: function () {
            return this.inputChar(SPACE);
        },

        backspace: function () {
            if (!this.state || this.state.isFinished) return false;
            const mode = this.getMode();
            if (mode === "missing-letter" || mode === "context") {
                if (this.state.currentSlotIndex <= 0) return false;
                this.state.currentSlotIndex -= 1;
                return true;
            }
            if (this.state.currentCharIndex <= 0) return false;
            this.state.currentCharIndex -= 1;
            return true;
        },

        isCurrentQuestionComplete: function () {
            const mode = this.getMode();
            if (mode === "missing-letter" || mode === "context") {
                return this.state.currentSlotIndex >= this.state.missingSlots.length;
            }
            const q = this.getCurrentQuestion();
            return this.state.currentCharIndex >= Array.from(q.answer || "").length;
        },

        completeCurrentQuestion: function () {
            const q = this.getCurrentQuestion();
            this.state.correctAnswers += 1;
            this.state.score += Number(this.content.settings.scorePerCorrect) || 10;
            this.state.answers.push({
                questionIndex: this.state.currentIndex,
                target: q.answer,
                correct: true,
                characterErrors: this.state.characterErrors
            });

            this.state.questionCompleted = true;
            this.state.transitioning = true;
            const engine = this;

            window.setTimeout(function () {
                if (!engine.state || engine.state.isFinished) return;

                engine.state.currentIndex += 1;

                if (engine.state.currentIndex >= engine.content.questions.length) {
                    engine.state.transitioning = false;
                    engine.finish();
                    return;
                }

                engine.prepareCurrentQuestion();
            }, 600);

            return this.getState();
        },

        finish: function () {
            if (!this.state || this.state.isFinished) return this.getResult();
            this.state.isFinished = true;
            this.state.locked = true;
            const total = this.state.totalQuestions;
            const percentage = total > 0 ? Math.round((this.state.correctAnswers / total) * 100) : 0;
            let result = {
                activityId: this.activity ? this.activity.id : null,
                score: this.state.score, percentage: percentage,
                correctAnswers: this.state.correctAnswers, wrongAnswers: this.state.wrongAnswers,
                totalQuestions: total, characterErrors: this.state.characterErrors, completed: true
            };
            if (window.ActivityResult && typeof window.ActivityResult.create === "function") {
                result = window.ActivityResult.create({
                    activityId: this.activity ? this.activity.id : null,
                    score: this.state.score, percentage: percentage,
                    correctAnswers: this.state.correctAnswers, wrongAnswers: this.state.wrongAnswers,
                    totalQuestions: total, correct: this.state.correctAnswers,
                    wrong: this.state.wrongAnswers, message: "🎉 املا تمام شد"
                });
            }
            this.state.result = result;
            EventManager.emit("activityFinished", result);
            return result;
        },

        normalizeChar: function (value) {
            return String(value == null ? "" : value)
                .replace(/ي/g, "ی").replace(/ى/g, "ی").replace(/ك/g, "ک")
                .replace(/ۀ/g, "ه").replace(/ة/g, "ه").trim();
        },

        normalize: function (value) {
            return String(value == null ? "" : value)
                .replace(/ي/g, "ی").replace(/ى/g, "ی").replace(/ك/g, "ک")
                .replace(/ۀ/g, "ه").replace(/ة/g, "ه")
                .replace(/[\u064B-\u065F\u0670]/g, "")
                .replace(/[\u200d\u200e\u200f]/g, "").replace(/\s+/g, " ").trim();
        },

        getState: function () {
            if (!this.state) return null;
            return JSON.parse(JSON.stringify({
                ...this.state,
                currentQuestion: this.getCurrentQuestion(),
                mode: this.getMode(),
                keyboardRows: this.getKeyboardRows(),
                expectedChar: this.getExpectedChar(),
                displayText: this.getDisplayText(),
                guideChar: this.getGuideChar()
            }));
        },

        getSessionState: function () { return this.getState(); },
        restoreSession: function (state) {
            if (!state || !this.activity || !this.content) return false;
            try { this.state = JSON.parse(JSON.stringify(state)); return true; }
            catch (error) { this.reset(); return false; }
        },
        getResult: function () { return this.state && this.state.result ? this.state.result : null; },
        reset: function () { this.activity = null; this.content = null; this.state = null; }
    };

    window.DictationEngine = DictationEngine;
})(window);

console.log("Dictation Engine v2.0 Ready");
