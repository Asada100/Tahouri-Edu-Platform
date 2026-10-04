// =====================================
// Tahouri Edu Platform
// Dictation Engine
// Version 2.1
// Guided Word + Missing Letter + Context + Dictation
// =====================================

(function (window) {
    "use strict";

    const PERSIAN_ROWS = [
        ["ض","ص","ث","ق","ف","غ","ع","ه","خ","ح","ج","چ"],
        ["ش","س","ی","ب","ل","ا","ت","ن","م","ک","گ"],
        ["ظ","ط","ز","ر","ذ","د","ئ","و","پ","ژ"]
    ];
    const SPACE = " ";

    // Characters that are reached from a base key on touch devices.
    // Desktop users can still enter the actual character directly through
    // the operating-system Persian keyboard (including Shift combinations).
    const PERSIAN_VARIANTS = {
        "ا": ["آ"],
        "ی": ["ئ"],
        "و": ["ؤ"],
        "ه": ["ۀ"]
    };

    const getVariantBase = function (char) {
        const value = String(char || "");
        const bases = Object.keys(PERSIAN_VARIANTS);
        for (let i = 0; i < bases.length; i += 1) {
            if (PERSIAN_VARIANTS[bases[i]].indexOf(value) !== -1) return bases[i];
        }
        return null;
    };

    const DictationEngine = {
        activity: null,
        content: null,
        state: null,
        runToken: 0,
        finishAuthorized: false,

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

            // Activities can opt into a randomized subset without changing
            // the content order stored in the lesson file.
            const settings = this.content.settings || {};
            const questionCount = Number(settings.questionCount);
            if (settings.randomizeQuestions === true || Number.isFinite(questionCount)) {
                const questions = this.content.questions.slice();
                if (settings.randomizeQuestions === true) {
                    for (let i = questions.length - 1; i > 0; i -= 1) {
                        const j = Math.floor(Math.random() * (i + 1));
                        const temp = questions[i];
                        questions[i] = questions[j];
                        questions[j] = temp;
                    }
                }
                this.content.questions = Number.isFinite(questionCount) && questionCount > 0
                    ? questions.slice(0, Math.min(questionCount, questions.length))
                    : questions;
            }

            this.state = {
                started: true, isFinished: false, locked: false,
                currentIndex: 0, totalQuestions: this.content.questions.length,
                correctAnswers: 0, wrongAnswers: 0, score: 0, attempts: 0,
                characterErrors: 0, currentQuestionCharacterErrors: 0, currentTargetCharacterErrors: 0, answers: [], targetAnswers: [], currentInput: "", inputBlockedAfterWrong: false, currentWrongChar: "",
                missingSlots: [], currentSlotIndex: 0, currentCharIndex: 0,
                currentTargetIndex: 0, contextTargetAnswers: [],
                questionCompleted: false, transitioning: false, showGuide: false
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
            this.state.currentWrongChar = "";
            this.state.currentQuestionCharacterErrors = 0;
            this.state.currentTargetCharacterErrors = 0;
            this.state.currentSlotIndex = 0;
            this.state.currentCharIndex = 0;
            this.state.currentTargetIndex = 0;
            this.state.contextTargetAnswers = [];
            this.state.questionCompleted = false;
            this.state.transitioning = false;
            this.state.showGuide = false;
            this.state.missingSlots = this.buildMissingSlots(this.getCurrentTarget());
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

        getCurrentTarget: function () {
            const q = this.getCurrentQuestion();
            if (!q) return null;
            if (this.getMode() !== "context") return q;
            if (Array.isArray(q.targets) && q.targets.length) {
                return q.targets[this.state.currentTargetIndex] || null;
            }
            return q;
        },

        getContextTargets: function () {
            const q = this.getCurrentQuestion();
            if (!q) return [];
            if (this.getMode() === "context" && Array.isArray(q.targets) && q.targets.length) return q.targets;
            return [q];
        },

        getKeyboardRows: function () {
            const question = this.getCurrentQuestion();
            const active = new Set();
            if (question && !this.state.questionCompleted) {
                if (this.getMode() === "dictation") {
                    PERSIAN_ROWS.flat().forEach(c => active.add(c));
                } else if (this.getMode() === "missing-letter") {
                    const target = this.getCurrentTarget() || question;
                    const ruleLetters = target.spellingRule && window.SpellingRules && typeof window.SpellingRules.getLetters === "function"
                        ? window.SpellingRules.getLetters(target.spellingRule) : [];
                    const candidates = Array.isArray(target.allowedLetters) && target.allowedLetters.length
                        ? target.allowedLetters
                        : ruleLetters.length
                            ? ruleLetters
                            : this.state.missingSlots.map(i => Array.from(target.answer || "")[i]).filter(Boolean);
                    candidates.forEach(c => active.add(c));
                } else {
                    // Guided spelling uses the complete Persian keyboard.
                    // The learner must see and be able to choose from every
                    // letter; correctness is still checked against the target.
                    PERSIAN_ROWS.flat().forEach(c => active.add(c));
                }
            }
            const expected = this.state && !this.state.questionCompleted ? this.getExpectedChar() : "";
            const expectedBase = getVariantBase(expected);
            return PERSIAN_ROWS.map(row => row.map(key => ({
                key: key,
                active: active.has(key),
                expected: key === expected || key === expectedBase,
                variants: PERSIAN_VARIANTS[key] || []
            })));
        },

        getKeyboard: function () {
            return this.getKeyboardRows().flat();
        },

        getExpectedChar: function () {
            const q = this.getCurrentQuestion();
            if (!q || !this.state) return "";
            const target = this.getCurrentTarget() || q;
            const chars = Array.from(target.answer || "");
            if (this.getMode() === "missing-letter") {
                return chars[this.state.missingSlots[this.state.currentSlotIndex]] || "";
            }
            return chars[this.state.currentCharIndex] || "";
        },

        getDisplayText: function () {
            const q = this.getCurrentQuestion();
            if (!q || !this.state) return "";
            const target = this.getCurrentTarget() || q;
            const chars = Array.from(target.answer || "");
            if (this.getMode() === "context" || this.getMode() === "dictation") return this.state.currentInput || "";
            if (this.getMode() === "missing-letter") {
                const pending = new Set(this.state.missingSlots.slice(this.state.currentSlotIndex));
                return chars.map((char, index) => pending.has(index) ? "ـ...ـ" : char).join("");
            }
            return chars.slice(0, this.state.currentCharIndex).join("");
        },

        getContextDisplayText: function () {
            const q = this.getCurrentQuestion();
            if (!q || !this.state) return "";
            const targets = this.getContextTargets();
            const template = q.contextTemplate || q.context || "";
            if (!template) return "";
            const engine = this;
            return template.replace(/\{\{(\d+)\}\}/g, function (match, rawIndex) {
                const index = Number(rawIndex);
                const target = targets[index];
                if (!target) return match;
                if (index < engine.state.currentTargetIndex) return target.answer;
                if (index > engine.state.currentTargetIndex) {
                    const futureSlots = Array.isArray(target.missing) ? target.missing : [];
                    const futureSet = new Set();
                    futureSlots.forEach(function (slot) {
                        const start = Math.max(0, Number(slot.start) || 0);
                        const length = Math.max(1, Number(slot.length) || 1);
                        for (let i = 0; i < length; i += 1) futureSet.add(start + i);
                    });
                    return Array.from(target.answer || "").map(function (char, charIndex) {
                        return futureSet.has(charIndex) ? "ـ...ـ" : char;
                    }).join("");
                }
                const chars = Array.from(target.answer || "");
                const slots = new Set(engine.state.missingSlots.slice(engine.state.currentSlotIndex));
                return chars.map(function (char, charIndex) {
                    return slots.has(charIndex) ? "ـ...ـ" : char;
                }).join("");
            });
        },

        getGuideChar: function () {
            return this.getExpectedChar() || "";
        },

        inputChar: function (char) {
            // Once a question is completed, the keyboard is locked until the
            // learner explicitly moves to the next question. This prevents
            // post-completion clicks from overwriting the final feedback or
            // being recorded as extra attempts.
            if (!this.state || this.state.isFinished || this.state.transitioning || this.state.questionCompleted || !char) return null;
            const q = this.getCurrentQuestion();
            if (!q) return null;
            const expected = this.getExpectedChar();
            const normalizedChar = char === SPACE ? SPACE : this.normalizeChar(char);
            const normalizedExpected = expected === SPACE ? SPACE : this.normalizeChar(expected);
            this.state.attempts += 1;

            if (this.getMode() === "dictation" && this.state.inputBlockedAfterWrong) return null;

            if (normalizedChar !== normalizedExpected) {
                this.state.characterErrors += 1;
                this.state.currentQuestionCharacterErrors += 1;
                this.state.currentTargetCharacterErrors += 1;
                this.state.showGuide = true;
                this.state.currentWrongChar = char;

                if (this.getMode() === "dictation") {
                    this.state.currentInput += char;
                    this.state.inputBlockedAfterWrong = true;
                }

                const result = { correct: false, character: char, expected: expected, questionIndex: this.state.currentIndex };
                EventManager.emit("answer:wrong", result);
                return result;
            }

            // A guide is corrective feedback for the last mistake only.
            // Once the learner enters the correct character, clear the visible wrong character.
            this.state.currentWrongChar = "";
            // Once the learner enters the correct character, hide the guide
            // before moving to the next character.
            this.state.showGuide = false;

            if (this.getMode() === "missing-letter") {
                this.state.currentSlotIndex += 1;
            } else {
                this.state.currentCharIndex += 1;
                if (this.getMode() === "dictation" || this.getMode() === "context") this.state.currentInput += char;

                // In guided-word and phrase/context modes, spaces inside a
                // multi-word answer are structural separators, not learner
                // input. Consume them automatically so "دانش آموز" continues
                // directly to "آ". For context mode the space is also added
                // to currentInput so the final phrase remains exact.
                if (this.getMode() === "context") {
                    const contextAnswerChars = Array.from(q.answer || "");
                    while (
                        this.state.currentCharIndex < contextAnswerChars.length &&
                        /\\s/.test(contextAnswerChars[this.state.currentCharIndex])
                    ) {
                        this.state.currentInput += contextAnswerChars[this.state.currentCharIndex];
                        this.state.currentCharIndex += 1;
                    }
                }

                // In guided-word mode, spaces inside a multi-word answer are
                // structural separators, not learner input. Consume them
                // automatically so "دانش آموز" continues directly to "آ".
                if (this.getMode() === "guided-word") {
                    const answerChars = Array.from(q.answer || "");
                    while (
                        this.state.currentCharIndex < answerChars.length &&
                        /\s/.test(answerChars[this.state.currentCharIndex])
                    ) {
                        this.state.currentCharIndex += 1;
                    }
                }
            }

            const complete = this.isCurrentQuestionComplete();
            const result = { correct: true, character: char, expected: expected, questionIndex: this.state.currentIndex, complete: complete };
            EventManager.emit("answer:correct", result);
            if (complete) {
                const completedState = this.completeCurrentQuestion();
                return {
                    ...completedState,
                    correct: true,
                    complete: true,
                    questionIndex: result.questionIndex
                };
            }
            return result;
        },

        nextQuestion: function () {
            if (!this.state || this.state.isFinished || !this.state.questionCompleted) return false;

            const nextIndex = Number(this.state.currentIndex) + 1;
            if (nextIndex >= this.content.questions.length) {
                this.state.currentIndex = nextIndex;
                this.state.transitioning = false;
                this.finishAuthorized = true;
                this.finish();
                return true;
            }

            this.state.currentIndex = nextIndex;
            this.prepareCurrentQuestion();
            this.state.transitioning = false;
            EventManager.emit("dictationQuestionChanged", this.getState());
            return true;
        },

        inputSpace: function () {
            return this.inputChar(SPACE);
        },

        backspace: function () {
            if (!this.state || this.state.isFinished || this.state.questionCompleted || this.state.transitioning) return false;
            const mode = this.getMode();
            if (mode === "missing-letter") {
                if (this.state.currentSlotIndex <= 0) return false;
                this.state.currentSlotIndex -= 1;
                return true;
            }
            if (mode === "context") {
                if (this.state.currentWrongChar) {
                    this.state.currentWrongChar = "";
                    this.state.showGuide = false;
                    return true;
                }
                const chars = Array.from(this.state.currentInput || "");
                if (!chars.length || this.state.currentCharIndex <= 0) return false;
                chars.pop();
                this.state.currentInput = chars.join("");
                this.state.currentCharIndex -= 1;
                return true;
            }
            if (mode === "guided-word" && this.state.currentWrongChar) {
                // Backspace must remove the visible wrong character first.
                // It must not delete the previously correct character.
                this.state.currentWrongChar = "";
                this.state.showGuide = false;
                return true;
            }

            if (mode === "dictation") {
                const chars = Array.from(this.state.currentInput || "");
                if (!chars.length) return false;
                chars.pop();
                this.state.currentInput = chars.join("");

                // After a wrong character, only remove that visible wrong
                // character and unlock the keyboard. The target index has not
                // advanced, so it must stay unchanged.
                if (this.state.inputBlockedAfterWrong) {
                    this.state.inputBlockedAfterWrong = false;
                    return true;
                }

                if (this.state.currentCharIndex <= 0) return false;
                this.state.currentCharIndex -= 1;
                return true;
            }

            if (this.state.currentCharIndex <= 0) return false;
            this.state.currentCharIndex -= 1;
            return true;
        },

        isCurrentQuestionComplete: function () {
            const mode = this.getMode();
            if (mode === "missing-letter") {
                return this.state.currentSlotIndex >= this.state.missingSlots.length;
            }
            const q = this.getCurrentQuestion();
            return this.state.currentCharIndex >= Array.from(q.answer || "").length;
        },

        completeContextTarget: function () {
            const target = this.getCurrentTarget();
            this.state.contextTargetAnswers.push({
                target: target ? target.answer : "",
                spellingRule: target ? (target.spellingRule || null) : null,
                completed: true,
                characterErrors: this.state.currentTargetCharacterErrors
            });
            this.state.targetAnswers.push({
                questionIndex: this.state.currentIndex,
                target: target ? target.answer : "",
                spellingRule: target ? (target.spellingRule || null) : null,
                completed: true,
                correct: true,
                characterErrors: this.state.currentTargetCharacterErrors
            });
            this.state.currentTargetCharacterErrors = 0;
            this.state.currentTargetIndex += 1;
            this.state.currentSlotIndex = 0;
            this.state.missingSlots = this.buildMissingSlots(this.getCurrentTarget());
            this.state.questionCompleted = false;
            this.state.transitioning = false;
            return {
                correct: true,
                complete: false,
                targetComplete: true,
                questionIndex: this.state.currentIndex,
                state: this.getState()
            };
        },

        completeCurrentQuestion: function () {
            const q = this.getCurrentQuestion();
            this.state.correctAnswers += 1;
            this.state.score += Number(this.content.settings.scorePerCorrect) || 10;
            this.state.answers.push({
                questionIndex: this.state.currentIndex,
                target: (this.getCurrentTarget() && this.getCurrentTarget().answer) || q.answer,
                spellingRule: (this.getCurrentTarget() && this.getCurrentTarget().spellingRule) || q.spellingRule || null,
                completed: true,
                correct: true,
                characterErrors: this.state.currentQuestionCharacterErrors
            });

            this.state.questionCompleted = true;
            this.state.transitioning = true;
            const engine = this;
            const runToken = this.runToken;

            window.setTimeout(function () {
                if (engine.runToken !== runToken) return;
                if (!engine.state || engine.state.isFinished) return;
                engine.state.transitioning = false;
                EventManager.emit("dictationQuestionCompleted", engine.getState());

                // Guided-word stays on the completed word so the learner can
                // see the result and use the explicit «کلمه بعدی» button.
            }, 600);

            return this.getState();
        },

        finish: function () {
            if (!this.state || this.state.isFinished) return this.getResult();

            // A dictation activity may only finish after every question has
            // actually been completed. This is a terminal safety guard against
            // stale/duplicate lifecycle calls finishing a fresh run.
            const total = Number(this.state.totalQuestions) || 0;
            const completed = Number(this.state.correctAnswers) || 0;
            const currentIndex = Number(this.state.currentIndex);
            const questionCompleted = !!this.state.questionCompleted;

            // The only legal finish point is after the final question has been
            // completed and nextQuestion() has advanced past it. This prevents
            // any external/stale lifecycle call from finishing a fresh run.
            const atTerminalPosition =
                total > 0 &&
                currentIndex >= total &&
                questionCompleted &&
                completed >= total;

            if (!this.finishAuthorized || !atTerminalPosition) {
                console.warn("DictationEngine: Premature finish ignored.", {
                    completed: completed,
                    total: total,
                    currentIndex: currentIndex,
                    questionCompleted: questionCompleted
                });
                return null;
            }

            this.finishAuthorized = false;
            this.state.isFinished = true;
            this.state.locked = true;
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
                currentTarget: this.getCurrentTarget(),
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
        reset: function () { this.runToken += 1; this.finishAuthorized = false; this.activity = null; this.content = null; this.state = null; }
    };

    window.DictationEngine = DictationEngine;
})(window);

console.log("Dictation Engine v2.1 Ready");
