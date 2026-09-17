// =====================================
// Tahouri Edu Platform
// Word Jigsaw Stage 2
// Version 1.0
//
// Purpose:
// - Extend word Jigsaw with a second sentence-building stage
// - Keep the existing Jigsaw engine and lifecycle intact
// - Source box -> target box -> validation
// - Undo / return / alphabetical hint
// =====================================

(function () {
    "use strict";

    if (typeof JigsawPuzzleHandler === "undefined" || typeof PuzzleEngine === "undefined" || typeof JigsawScreen === "undefined") {
        console.error("Word Jigsaw Stage 2: Required modules are not available");
        return;
    }

    const originalStart = JigsawPuzzleHandler.start.bind(JigsawPuzzleHandler);
    const originalCheck = JigsawPuzzleHandler.check.bind(JigsawPuzzleHandler);
    const originalReset = JigsawPuzzleHandler.reset.bind(JigsawPuzzleHandler);
    const originalMove = JigsawPuzzleHandler.move.bind(JigsawPuzzleHandler);
    const originalGetState = PuzzleEngine.getState.bind(PuzzleEngine);

    function isTwoStage(engine) {
        return !!(engine && engine.puzzle && engine.puzzle.twoStageWordOrder);
    }

    function pushHistory(engine) {
        if (!engine.puzzle || !isTwoStage(engine)) return;
        if (!Array.isArray(engine.puzzle.history)) engine.puzzle.history = [];
        engine.puzzle.history.push({
            availableWords: [...(engine.puzzle.availableWords || [])],
            targetWords: [...(engine.puzzle.targetWords || [])],
            hintUsed: !!engine.puzzle.hintUsed
        });
        if (engine.puzzle.history.length > 30) engine.puzzle.history.shift();
    }

    function emitChanged(engine) {
        engine.items = [...(engine.puzzle.targetWords || [])];
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
    }

    JigsawPuzzleHandler.start = function (engine, data) {
        const result = originalStart(engine, data);
        if (!result || !engine.puzzle) return result;

        const content = data && data.content ? data.content : {};
        if (content.twoStageWordOrder !== true || result.mode !== "words") return result;

        engine.puzzle.twoStageWordOrder = true;
        engine.puzzle.stage = 1;
        engine.puzzle.availableWords = [];
        engine.puzzle.targetWords = [];
        engine.puzzle.history = [];
        engine.puzzle.hintUsed = false;
        engine.puzzle.correctOrder = Array.isArray(content.correctOrder)
            ? [...content.correctOrder]
            : [...result.words];

        return engine.getState();
    };

    JigsawPuzzleHandler.check = function (engine) {
        if (!isTwoStage(engine)) return originalCheck(engine);

        if (engine.puzzle.stage === 1) {
            const solved = typeof JigsawPuzzle !== "undefined" && JigsawPuzzle.check();
            if (!solved) {
                engine.emitWrong();
                return false;
            }

            engine.puzzle.stage = 2;
            engine.puzzle.availableWords = Array.isArray(engine.puzzle.words)
                ? [...engine.puzzle.words]
                : [];
            engine.puzzle.targetWords = [];
            engine.puzzle.history = [];
            engine.puzzle.hintUsed = false;
            engine.items = [];
            EventManager.emit("puzzleChanged", engine.getState());
            console.log("Word Jigsaw Stage 1 Complete → Stage 2 Ready");
            return true;
        }

        if (engine.puzzle.stage === 2) {
            const current = engine.puzzle.targetWords || [];
            const correct = engine.puzzle.correctOrder || engine.puzzle.words || [];
            const solved = PuzzleEngine.areArraysEqual(current, correct);

            if (solved) {
                engine.finish();
                return true;
            }

            engine.emitWrong();
            return false;
        }

        return false;
    };

    JigsawPuzzleHandler.moveWordToTarget = function (engine, sourceIndex) {
        if (!isTwoStage(engine) || engine.puzzle.stage !== 2) return false;
        const source = Number(sourceIndex);
        const available = engine.puzzle.availableWords || [];
        if (!Number.isInteger(source) || source < 0 || source >= available.length) return false;

        pushHistory(engine);
        const word = available.splice(source, 1)[0];
        engine.puzzle.targetWords.push(word);
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.moveWordToSource = function (engine, targetIndex) {
        if (!isTwoStage(engine) || engine.puzzle.stage !== 2) return false;
        const target = Number(targetIndex);
        const targetWords = engine.puzzle.targetWords || [];
        if (!Number.isInteger(target) || target < 0 || target >= targetWords.length) return false;

        pushHistory(engine);
        const word = targetWords.splice(target, 1)[0];
        engine.puzzle.availableWords.push(word);
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.reorderTarget = function (engine, fromIndex, toIndex) {
        if (!isTwoStage(engine) || engine.puzzle.stage !== 2) return false;
        const from = Number(fromIndex), to = Number(toIndex);
        const target = engine.puzzle.targetWords || [];
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= target.length || to >= target.length || from === to) return false;

        pushHistory(engine);
        const item = target.splice(from, 1)[0];
        target.splice(to, 0, item);
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.undoStage2 = function (engine) {
        if (!isTwoStage(engine) || engine.puzzle.stage !== 2) return false;
        const history = engine.puzzle.history || [];
        const previous = history.pop();
        if (!previous) return false;

        engine.puzzle.availableWords = [...previous.availableWords];
        engine.puzzle.targetWords = [...previous.targetWords];
        engine.puzzle.hintUsed = !!previous.hintUsed;
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.alphabeticalHint = function (engine) {
        if (!isTwoStage(engine) || engine.puzzle.stage !== 2) return false;

        pushHistory(engine);
        const allWords = [
            ...(engine.puzzle.availableWords || []),
            ...(engine.puzzle.targetWords || [])
        ];

        engine.puzzle.availableWords = [];
        engine.puzzle.targetWords = allWords.sort(function (a, b) {
            return String(a).localeCompare(String(b), "fa");
        });
        engine.puzzle.hintUsed = true;
        emitChanged(engine);
        console.log("Word Jigsaw Alphabetical Hint Used");
        return true;
    };

    JigsawPuzzleHandler.reset = function (engine) {
        if (!isTwoStage(engine)) return originalReset(engine);
        if (engine.state && engine.state.isFinished) return false;

        engine.puzzle.stage = 1;
        engine.puzzle.availableWords = [];
        engine.puzzle.targetWords = [];
        engine.puzzle.history = [];
        engine.puzzle.hintUsed = false;
        engine.items = [];

        if (typeof JigsawPuzzle !== "undefined") {
            JigsawPuzzle.state.solved = false;
        }

        return originalReset(engine);
    };

    // Expose Stage 2 fields through the existing PuzzleEngine state contract.
    PuzzleEngine.getState = function () {
        const state = originalGetState();
        if (this.puzzle && this.puzzle.type === "jigsaw" && this.puzzle.twoStageWordOrder) {
            state.twoStageWordOrder = true;
            state.stage = this.puzzle.stage || 1;
            state.availableWords = [...(this.puzzle.availableWords || [])];
            state.targetWords = [...(this.puzzle.targetWords || [])];
            state.correctWords = [...(this.puzzle.correctOrder || this.puzzle.words || [])];
            state.hintUsed = !!this.puzzle.hintUsed;
        }
        return state;
    };

    // A small compatibility wrapper: Stage 2 never sends its actions through
    // the old Jigsaw piece mover because Stage 1 has already been solved.
    JigsawPuzzleHandler.move = function (engine, fromIndex, toIndex) {
        if (!isTwoStage(engine) || engine.puzzle.stage === 1) {
            return originalMove(engine, fromIndex, toIndex);
        }
        return false;
    };

    // =====================================
    // Stage 2 UI
    // =====================================

    const originalRender = JigsawScreen.render.bind(JigsawScreen);
    JigsawScreen.render = function (state) {
        const engine = typeof PuzzleEngine !== "undefined" ? PuzzleEngine : null;
        if (isTwoStage(engine) && engine.puzzle.stage === 2) {
            return this.renderWordBuilder(engine.getState());
        }
        return originalRender(state);
    };

    JigsawScreen.renderWordBuilder = function (state) {
        const app = document.getElementById("app");
        if (!app) return;

        const source = Array.isArray(state.availableWords) ? state.availableWords : [];
        const target = Array.isArray(state.targetWords) ? state.targetWords : [];
        const hintUsed = !!state.hintUsed;
        const screen = this;

        const sourceHTML = source.map(function (word, index) {
            return `<button class="wordBuilderPiece" data-source-index="${index}" type="button">${screen.escapeHTML(word)}</button>`;
        }).join("");

        const targetHTML = target.map(function (word, index) {
            return `<button class="wordBuilderPiece wordBuilderTargetPiece" data-target-index="${index}" type="button">${screen.escapeHTML(word)}</button>`;
        }).join("");

        app.innerHTML = `
            <div class="screen puzzleScreen jigsawScreen wordBuilderScreen" dir="rtl">
                <div class="jigsawHeader wordJigsawHeader">
                    <div class="wordJigsawBadge">مرحله دوم</div>
                    <h1>ساختن شعر</h1>
                    <p class="jigsawObjective">کلمات را به ترتیب درست در بخش پاسخ قرار بده.</p>
                    <p class="jigsawInstruction">می‌توانی کلمات را جابه‌جا کنی یا دوباره به باکس اولیه برگردانی.</p>
                </div>

                <section class="wordBuilderSection">
                    <h2>کلمات</h2>
                    <div id="wordBuilderSource" class="wordBuilderBox">${sourceHTML || '<span class="wordBuilderEmpty">همه کلمات منتقل شده‌اند.</span>'}</div>
                </section>

                <section class="wordBuilderSection wordBuilderAnswerSection">
                    <h2>پاسخ شما</h2>
                    <div id="wordBuilderTarget" class="wordBuilderBox wordBuilderTarget">${targetHTML || '<span class="wordBuilderEmpty">کلمات را اینجا قرار بده.</span>'}</div>
                </section>

                <div class="wordBuilderControls">
                    <button id="wordBuilderCheck" type="button">بررسی پاسخ</button>
                    <button id="wordBuilderUndo" type="button">↩ برگشت</button>
                    <button id="wordBuilderAlphabet" type="button">مرتب‌سازی الفبایی</button>
                    <button id="wordBuilderReset" type="button">شروع دوباره</button>
                </div>

                <div id="wordBuilderMessage" class="wordBuilderMessage" aria-live="polite">
                    ${hintUsed ? "راهنمای الفبایی استفاده شده است." : ""}
                </div>
                <div class="jigsawMoves">حرکت‌ها: <span>${state.moves || 0}</span></div>
            </div>`;

        this.bindWordBuilderEvents();
    };

    JigsawScreen.bindWordBuilderEvents = function () {
        const screen = this;
        const source = document.getElementById("wordBuilderSource");
        const target = document.getElementById("wordBuilderTarget");
        if (!source || !target) return;

        source.querySelectorAll("[data-source-index]").forEach(function (button) {
            button.onclick = function () {
                JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, Number(button.dataset.sourceIndex));
            };
        });

        target.querySelectorAll("[data-target-index]").forEach(function (button) {
            button.onclick = function () {
                JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, Number(button.dataset.targetIndex));
            };
        });

        const check = document.getElementById("wordBuilderCheck");
        if (check) check.onclick = function () {
            const correct = PuzzleEngine.check();
            const message = document.getElementById("wordBuilderMessage");
            if (message && !correct) message.textContent = "هنوز ترتیب کلمات درست نیست؛ دوباره تلاش کن.";
        };

        const undo = document.getElementById("wordBuilderUndo");
        if (undo) undo.onclick = function () {
            if (!JigsawPuzzleHandler.undoStage2(PuzzleEngine)) {
                screen.showWordBuilderMessage("حرکت قبلی برای برگشت وجود ندارد.");
            }
        };

        const alphabet = document.getElementById("wordBuilderAlphabet");
        if (alphabet) alphabet.onclick = function () {
            JigsawPuzzleHandler.alphabeticalHint(PuzzleEngine);
        };

        const reset = document.getElementById("wordBuilderReset");
        if (reset) reset.onclick = function () {
            if (JigsawPuzzleHandler.reset(PuzzleEngine)) screen.render(PuzzleEngine.getState());
        };

        // Pointer drag: source -> target and target -> source.
        this.bindWordBuilderPointerDrag(source, "source");
        this.bindWordBuilderPointerDrag(target, "target");
    };

    JigsawScreen.bindWordBuilderPointerDrag = function (container, kind) {
        const screen = this;
        let dragButton = null;
        let moved = false;
        let startX = 0;
        let startY = 0;

        container.querySelectorAll(".wordBuilderPiece").forEach(function (button) {
            button.addEventListener("pointerdown", function (event) {
                dragButton = button;
                moved = false;
                startX = event.clientX;
                startY = event.clientY;
                button.setPointerCapture?.(event.pointerId);
            });

            button.addEventListener("pointermove", function (event) {
                if (dragButton !== button) return;
                if (Math.abs(event.clientX - startX) > 5 || Math.abs(event.clientY - startY) > 5) moved = true;
            });

            button.addEventListener("pointerup", function (event) {
                if (dragButton !== button) return;
                const wasMoved = moved;
                dragButton = null;
                if (!wasMoved) return;

                const targetEl = document.elementFromPoint(event.clientX, event.clientY);
                if (!targetEl) return;

                if (kind === "source" && targetEl.closest("#wordBuilderTarget")) {
                    JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, Number(button.dataset.sourceIndex));
                } else if (kind === "target" && targetEl.closest("#wordBuilderSource")) {
                    JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, Number(button.dataset.targetIndex));
                } else if (kind === "target") {
                    const targetButton = targetEl.closest(".wordBuilderTargetPiece");
                    if (targetButton && targetButton !== button) {
                        JigsawPuzzleHandler.reorderTarget(PuzzleEngine, Number(button.dataset.targetIndex), Number(targetButton.dataset.targetIndex));
                    }
                }
            });
        });
    };

    JigsawScreen.showWordBuilderMessage = function (text) {
        const message = document.getElementById("wordBuilderMessage");
        if (message) message.textContent = text || "";
    };

    // Alphabetical help is a hint, not a wrong answer. It reduces the raw
    // score by 2 points after successful completion and is recorded in state.
    const originalBuildResult = PuzzleEngine.buildResult.bind(PuzzleEngine);
    PuzzleEngine.buildResult = function () {
        const result = originalBuildResult();
        if (this.puzzle && this.puzzle.twoStageWordOrder && this.puzzle.hintUsed) {
            result.score = Math.max(0, Number(result.score || 0) - 2);
            result.message = "🎉 پازل تمام شد — با استفاده از راهنمای الفبایی";
        }
        return result;
    };

    console.log("Word Jigsaw Stage 2 v1.0 Ready");
})();
