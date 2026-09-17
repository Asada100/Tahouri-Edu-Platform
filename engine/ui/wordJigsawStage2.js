// =====================================
// Tahouri Edu Platform
// Word Jigsaw Stage 2
// Version 1.4
// =====================================

(function () {
    "use strict";

    if (typeof PuzzleEngine === "undefined" || typeof JigsawScreen === "undefined" || typeof JigsawPuzzleHandler === "undefined") {
        console.error("Word Jigsaw Stage 2: required modules are not available");
        return;
    }

    const originalReset = JigsawPuzzleHandler.reset.bind(JigsawPuzzleHandler);
    const originalMove = JigsawPuzzleHandler.move.bind(JigsawPuzzleHandler);
    const originalRender = JigsawScreen.render.bind(JigsawScreen);
    const originalBuildResult = typeof PuzzleEngine.buildResult === "function" ? PuzzleEngine.buildResult.bind(PuzzleEngine) : null;

    function getDefinition(engine) {
        const puzzle = engine && engine.puzzle ? engine.puzzle : {};
        if (puzzle.twoStageWordOrder !== true) return null;
        const words = Array.isArray(puzzle.words) ? puzzle.words.map(String) : [];
        const correctOrder = Array.isArray(puzzle.correctOrder) ? puzzle.correctOrder.map(String) : words.slice();
        return { words, correctOrder };
    }

    function enable(engine) {
        const definition = getDefinition(engine);
        if (!definition) return false;
        if (!Number.isInteger(engine.puzzle.stage)) engine.puzzle.stage = 1;
        if (!Array.isArray(engine.puzzle.availableWords)) engine.puzzle.availableWords = [];
        if (!Array.isArray(engine.puzzle.targetWords)) engine.puzzle.targetWords = [];
        if (!Array.isArray(engine.puzzle.history)) engine.puzzle.history = [];
        if (!Array.isArray(engine.puzzle.correctOrder) || !engine.puzzle.correctOrder.length) engine.puzzle.correctOrder = definition.correctOrder.slice();
        if (!Array.isArray(engine.puzzle.words) || !engine.puzzle.words.length) engine.puzzle.words = definition.words.slice();
        if (engine.puzzle.hintUsed !== true) engine.puzzle.hintUsed = false;
        return true;
    }

    function isStage2(engine) {
        return !!(enable(engine) && engine.puzzle.stage === 2);
    }

    function emitChanged(engine) {
        engine.items = [...(engine.puzzle.targetWords || [])];
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
    }

    function enterStage2(engine) {
        if (!enable(engine) || engine.puzzle.stage !== 1) return false;
        const words = [...(engine.puzzle.words || [])];
        engine.puzzle.stage = 2;
        engine.puzzle.availableWords = words;
        engine.puzzle.targetWords = [];
        engine.puzzle.history = [];
        engine.puzzle.hintUsed = false;
        engine.items = [];
        if (engine.state) engine.state.isFinished = false;
        if (typeof JigsawPuzzle !== "undefined" && JigsawPuzzle.state) JigsawPuzzle.state.solved = true;
        EventManager.emit("puzzleChanged", engine.getState());
        console.log("Word Jigsaw Stage 1 Complete → Stage 2 Ready", { wordCount: words.length });
        return true;
    }

    function isCorrect(engine) {
        const current = engine.puzzle.targetWords || [];
        const correct = engine.puzzle.correctOrder || engine.puzzle.words || [];
        return current.length === correct.length && current.every(function (word, index) {
            return String(word).replace(/\u200c/g, " ").trim() === String(correct[index]).replace(/\u200c/g, " ").trim();
        });
    }

    function checkStage2(engine) {
        if (!isStage2(engine)) return false;

        if (isCorrect(engine)) {
            engine.puzzle.stage = 3;
            console.log("Word Jigsaw Stage 2 Correct → Activity Complete");
            if (typeof engine.finish === "function") return engine.finish() !== false;
            return false;
        }

        if (typeof engine.emitWrong === "function") engine.emitWrong();
        const message = document.getElementById("wordBuilderMessage");
        if (message) message.textContent = "این ترتیب درست نیست؛ می‌توانی کلمات را جابه‌جا کنی و دوباره تلاش کنی.";
        return false;
    }

    JigsawPuzzleHandler.check = function (engine) {
        if (!enable(engine)) return false;

        if (engine.puzzle.stage === 1) {
            const solved = typeof JigsawPuzzle !== "undefined" && JigsawPuzzle.check();
            if (solved) {
                enterStage2(engine);
                return true;
            }
            if (typeof engine.emitWrong === "function") engine.emitWrong();
            return false;
        }

        if (engine.puzzle.stage === 2) return checkStage2(engine);
        return false;
    };

    // Stage 2 always has two live boxes at the same time.
    // Source → Target: click a word in «کلمات».
    // Target → Source: click a word in «پاسخ شما».
    // Completion is checked ONLY by «بررسی پاسخ»; moving the last word
    // must never call finish() automatically.
    JigsawPuzzleHandler.moveWordToTarget = function (engine, sourceIndex) {
        if (!isStage2(engine)) return false;
        const index = Number(sourceIndex);
        const source = engine.puzzle.availableWords || [];
        if (!Number.isInteger(index) || index < 0 || index >= source.length) return false;
        engine.puzzle.history.push({ availableWords: [...source], targetWords: [...engine.puzzle.targetWords], hintUsed: !!engine.puzzle.hintUsed });
        engine.puzzle.targetWords.push(source.splice(index, 1)[0]);
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.moveWordToSource = function (engine, targetIndex) {
        if (!isStage2(engine)) return false;
        const index = Number(targetIndex);
        const target = engine.puzzle.targetWords || [];
        if (!Number.isInteger(index) || index < 0 || index >= target.length) return false;
        engine.puzzle.history.push({ availableWords: [...engine.puzzle.availableWords], targetWords: [...target], hintUsed: !!engine.puzzle.hintUsed });
        engine.puzzle.availableWords.push(target.splice(index, 1)[0]);
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.reorderTarget = function (engine, fromIndex, toIndex) {
        if (!isStage2(engine)) return false;
        const from = Number(fromIndex), to = Number(toIndex), target = engine.puzzle.targetWords || [];
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= target.length || to >= target.length || from === to) return false;
        engine.puzzle.history.push({ availableWords: [...engine.puzzle.availableWords], targetWords: [...target], hintUsed: !!engine.puzzle.hintUsed });
        const word = target.splice(from, 1)[0];
        target.splice(to, 0, word);
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.undoStage2 = function (engine) {
        if (!isStage2(engine)) return false;
        const previous = engine.puzzle.history.pop();
        if (!previous) return false;
        engine.puzzle.availableWords = [...previous.availableWords];
        engine.puzzle.targetWords = [...previous.targetWords];
        engine.puzzle.hintUsed = !!previous.hintUsed;
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.alphabeticalHint = function (engine) {
        if (!isStage2(engine)) return false;
        const allWords = [...(engine.puzzle.availableWords || []), ...(engine.puzzle.targetWords || [])];
        engine.puzzle.history.push({ availableWords: [...engine.puzzle.availableWords], targetWords: [...engine.puzzle.targetWords], hintUsed: !!engine.puzzle.hintUsed });
        engine.puzzle.availableWords = [];
        engine.puzzle.targetWords = allWords.sort(function (a, b) { return String(a).localeCompare(String(b), "fa"); });
        engine.puzzle.hintUsed = true;
        emitChanged(engine);
        const message = document.getElementById("wordBuilderMessage");
        if (message) message.textContent = "کلمات به ترتیب الفبایی چیده شدند؛ حالا «بررسی پاسخ» را بزن.";
        return true;
    };

    JigsawPuzzleHandler.reset = function (engine) {
        if (!enable(engine)) return originalReset(engine);
        if (engine.state && engine.state.isFinished) return false;
        engine.puzzle.stage = 1;
        engine.puzzle.availableWords = [];
        engine.puzzle.targetWords = [];
        engine.puzzle.history = [];
        engine.puzzle.hintUsed = false;
        if (typeof JigsawPuzzle !== "undefined") JigsawPuzzle.reset();
        EventManager.emit("puzzleChanged", engine.getState());
        return engine.getState();
    };

    JigsawPuzzleHandler.move = function (engine, fromIndex, toIndex) {
        if (!enable(engine) || engine.puzzle.stage === 1) return originalMove(engine, fromIndex, toIndex);
        return false;
    };

    const originalState = PuzzleEngine.getState.bind(PuzzleEngine);
    PuzzleEngine.getState = function () {
        const state = originalState();
        if (this.puzzle && enable(this)) {
            state.twoStageWordOrder = true;
            state.stage = this.puzzle.stage || 1;
            state.availableWords = [...(this.puzzle.availableWords || [])];
            state.targetWords = [...(this.puzzle.targetWords || [])];
            state.correctWords = [...(this.puzzle.correctOrder || this.puzzle.words || [])];
            state.hintUsed = !!this.puzzle.hintUsed;
        }
        return state;
    };

    JigsawScreen.render = function (state) {
        const engine = PuzzleEngine;
        if (isStage2(engine)) return this.renderWordBuilder(engine.getState());
        return originalRender(state);
    };

    JigsawScreen.renderWordBuilder = function (state) {
        const app = document.getElementById("app");
        if (!app) return;
        const source = Array.isArray(state.availableWords) ? state.availableWords : [];
        const target = Array.isArray(state.targetWords) ? state.targetWords : [];
        const esc = this.escapeHTML.bind(this);
        app.innerHTML = `
            <div class="screen puzzleScreen jigsawScreen wordBuilderScreen" dir="rtl">
                <div class="jigsawHeader wordJigsawHeader">
                    <div class="wordJigsawBadge">مرحله دوم</div>
                    <h1>ساختن شعر</h1>
                    <p class="jigsawObjective">کلمات را به ترتیب درست در «پاسخ شما» قرار بده.</p>
                    <p class="jigsawInstruction">از «کلمات» به «پاسخ شما» منتقل کن؛ با کلیک روی هر کلمه می‌توانی آن را به باکس دیگر برگردانی.</p>
                </div>
                <section class="wordBuilderSection"><h2>کلمات</h2><div id="wordBuilderSource" class="wordBuilderBox">${source.map((w,i)=>`<button class="wordBuilderPiece" data-source-index="${i}" type="button">${esc(w)}</button>`).join("") || '<span class="wordBuilderEmpty">همه کلمات در پاسخ شما هستند.</span>'}</div></section>
                <section class="wordBuilderSection wordBuilderAnswerSection"><h2>پاسخ شما</h2><div id="wordBuilderTarget" class="wordBuilderBox wordBuilderTarget">${target.map((w,i)=>`<button class="wordBuilderPiece wordBuilderTargetPiece" data-target-index="${i}" type="button">${esc(w)}</button>`).join("") || '<span class="wordBuilderEmpty">کلمات را از باکس «کلمات» انتخاب کن.</span>'}</div></section>
                <div class="wordBuilderControls"><button id="wordBuilderCheck" type="button">بررسی پاسخ</button><button id="wordBuilderUndo" type="button">↩ برگشت</button><button id="wordBuilderAlphabet" type="button">مرتب‌سازی الفبایی</button><button id="wordBuilderReset" type="button">شروع دوباره</button></div>
                <div id="wordBuilderMessage" class="wordBuilderMessage" aria-live="polite"></div>
                <div class="jigsawMoves">حرکت‌ها: <span>${state.moves || 0}</span></div>
            </div>`;
        this.bindWordBuilderEvents();
    };

    JigsawScreen.bindWordBuilderEvents = function () {
        const source = document.getElementById("wordBuilderSource");
        const target = document.getElementById("wordBuilderTarget");
        if (!source || !target) return;
        const screen = this;
        source.querySelectorAll("[data-source-index]").forEach(function (button) {
            button.onclick = function () {
                JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, Number(button.dataset.sourceIndex));
                screen.render(PuzzleEngine.getState());
            };
        });
        target.querySelectorAll("[data-target-index]").forEach(function (button) {
            button.onclick = function () {
                JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, Number(button.dataset.targetIndex));
                screen.render(PuzzleEngine.getState());
            };
        });
        const check = document.getElementById("wordBuilderCheck");
        if (check) check.onclick = function () { PuzzleEngine.check(); };
        const undo = document.getElementById("wordBuilderUndo");
        if (undo) undo.onclick = function () {
            if (JigsawPuzzleHandler.undoStage2(PuzzleEngine)) screen.render(PuzzleEngine.getState());
            else screen.showWordBuilderMessage("حرکت قبلی برای برگشت وجود ندارد.");
        };
        const alphabet = document.getElementById("wordBuilderAlphabet");
        if (alphabet) alphabet.onclick = function () { JigsawPuzzleHandler.alphabeticalHint(PuzzleEngine); screen.render(PuzzleEngine.getState()); };
        const reset = document.getElementById("wordBuilderReset");
        if (reset) reset.onclick = function () { if (JigsawPuzzleHandler.reset(PuzzleEngine)) screen.render(PuzzleEngine.getState()); };
    };

    JigsawScreen.showWordBuilderMessage = function (text) {
        const message = document.getElementById("wordBuilderMessage");
        if (message) message.textContent = text || "";
    };

    if (originalBuildResult) {
        PuzzleEngine.buildResult = function () {
            const result = originalBuildResult();
            if (this.puzzle && this.puzzle.twoStageWordOrder && this.puzzle.hintUsed) result.score = Math.max(0, Number(result.score || 0) - 2);
            return result;
        };
    }

    console.log("Word Jigsaw Stage 2 v1.4 Ready");
})();
