// =====================================
// Tahouri Edu Platform
// Dictation Engine
// Version 1.0
// Word Spelling / Custom Keyboard
// =====================================

(function (window) {
    "use strict";

    const PERSIAN_ALPHABET = [
        "ا","ب","پ","ت","ث","ج","چ","ح","خ","د","ذ","ر","ز","ژ",
        "س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ک","گ","ل","م",
        "ن","و","ه","ی"
    ];

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

            if (!this.content || !Array.isArray(this.content.words) || this.content.words.length === 0) {
                throw new Error("DictationEngine: No spelling words available");
            }

            this.state = {
                started: true,
                isFinished: false,
                locked: false,
                currentIndex: 0,
                totalQuestions: this.content.words.length,
                correctAnswers: 0,
                wrongAnswers: 0,
                score: 0,
                attempts: 0,
                answers: []
            };

            EventManager.emit("activityStarted", this.activity);
            EventManager.emit("activityPlaying");

            return this.getState();
        },

        getCurrentWord: function () {
            if (!this.state || this.state.currentIndex >= this.content.words.length) return null;
            return this.content.words[this.state.currentIndex];
        },

        getKeyboard: function () {
            const word = this.getCurrentWord();
            const mode = this.getKeyboardMode();

            if (mode === "full") {
                return PERSIAN_ALPHABET.slice();
            }

            const targetLetters = this.uniqueLetters(word && word.answer ? word.answer : "");
            if (mode === "target-only") {
                return targetLetters;
            }

            const distractors = PERSIAN_ALPHABET.filter(function (letter) {
                return !targetLetters.includes(letter);
            });

            const count = Math.max(0, Number(this.content.settings.distractorCount) || 4);
            return targetLetters.concat(this.shuffle(distractors).slice(0, count));
        },

        getKeyboardMode: function () {
            const settings = this.content.settings || {};
            const mode = settings.keyboardMode || "target-only";
            return ["target-only", "target-plus-distractors", "full"].includes(mode)
                ? mode
                : "target-only";
        },

        submitAnswer: function (answer) {
            if (!this.state || this.state.isFinished) return null;

            const word = this.getCurrentWord();
            if (!word) return null;

            const normalizedAnswer = this.normalize(answer);
            const normalizedTarget = this.normalize(word.answer);
            const correct = normalizedAnswer === normalizedTarget;

            this.state.attempts += 1;
            if (correct) {
                this.state.correctAnswers += 1;
                this.state.score += Number(this.content.settings.scorePerCorrect) || 10;
            } else {
                this.state.wrongAnswers += 1;
            }

            this.state.answers.push({
                questionIndex: this.state.currentIndex,
                target: word.answer,
                answer: answer || "",
                correct: correct
            });

            const result = {
                correct: correct,
                answer: answer || "",
                target: word.answer,
                questionIndex: this.state.currentIndex,
                retryAllowed: !correct && this.isRetryAllowed()
            };

            if (correct || !result.retryAllowed) {
                this.advance();
            }

            EventManager.emit(correct ? "answer:correct" : "answer:wrong", result);
            return result;
        },

        isRetryAllowed: function () {
            return (this.content.settings || {}).allowRetry !== false;
        },

        advance: function () {
            if (!this.state) return null;

            this.state.currentIndex += 1;

            if (this.state.currentIndex >= this.content.words.length) {
                return this.finish();
            }

            return this.getState();
        },

        finish: function () {
            if (!this.state || this.state.isFinished) return this.getResult();

            this.state.isFinished = true;
            this.state.locked = true;

            const total = this.state.totalQuestions;
            const percentage = total > 0
                ? Math.round((this.state.correctAnswers / total) * 100)
                : 0;

            let result = {
                activityId: this.activity ? this.activity.id : null,
                score: this.state.score,
                percentage: percentage,
                correctAnswers: this.state.correctAnswers,
                wrongAnswers: this.state.wrongAnswers,
                totalQuestions: total,
                completed: true
            };

            if (window.ActivityResult && typeof window.ActivityResult.create === "function") {
                result = window.ActivityResult.create({
                    activityId: this.activity ? this.activity.id : null,
                    score: this.state.score,
                    percentage: percentage,
                    correctAnswers: this.state.correctAnswers,
                    wrongAnswers: this.state.wrongAnswers,
                    totalQuestions: total,
                    correct: this.state.correctAnswers,
                    wrong: this.state.wrongAnswers,
                    message: "🎉 املا تمام شد"
                });
            }

            this.state.result = result;
            EventManager.emit("activityFinished", result);
            return result;
        },

        normalize: function (value) {
            return String(value == null ? "" : value)
                .replace(/ي/g, "ی")
                .replace(/ى/g, "ی")
                .replace(/ك/g, "ک")
                .replace(/ۀ/g, "ه")
                .replace(/ة/g, "ه")
                .replace(/[\u064B-\u065F\u0670]/g, "")
                .replace(/[\u200c\u200d]/g, "")
                .replace(/[\u200e\u200f]/g, "")
                .replace(/\s+/g, "")
                .trim();
        },

        uniqueLetters: function (text) {
            const result = [];
            Array.from(this.normalize(text)).forEach(function (letter) {
                if (PERSIAN_ALPHABET.includes(letter) && !result.includes(letter)) {
                    result.push(letter);
                }
            });
            return result;
        },

        getState: function () {
            if (!this.state) return null;
            return JSON.parse(JSON.stringify({
                ...this.state,
                currentWord: this.getCurrentWord(),
                keyboard: this.getKeyboard(),
                keyboardMode: this.getKeyboardMode()
            }));
        },

        getSessionState: function () {
            return this.getState();
        },

        restoreSession: function (state) {
            if (!state || !this.activity || !this.content) return false;
            try {
                this.state = JSON.parse(JSON.stringify(state));
                return !!this.state && Array.isArray(this.state.answers);
            } catch (error) {
                this.reset();
                return false;
            }
        },

        getResult: function () {
            return this.state && this.state.result ? this.state.result : null;
        },

        reset: function () {
            this.activity = null;
            this.content = null;
            this.state = null;
        },

        shuffle: function (array) {
            const list = array.slice();
            for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = list[i];
                list[i] = list[j];
                list[j] = temp;
            }
            return list;
        }
    };

    window.DictationEngine = DictationEngine;
})(window);

console.log("Dictation Engine v1.0 Ready");
