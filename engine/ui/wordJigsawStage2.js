// =====================================
// Tahouri Edu Platform
// Word Jigsaw Stage 2
// Version 1.1
//
// Two-stage word Jigsaw:
// Stage 1: solve the existing Jigsaw.
// Stage 2: move and order the words in a target box.
// =====================================

(function () {
    "use strict";

    if (typeof PuzzleEngine === "undefined" || typeof JigsawScreen === "undefined" || typeof JigsawPuzzleHandler === "undefined") {
        console.error("Word Jigsaw Stage 2: required modules are not available");
        return;
    }

    const originalFinish = PuzzleEngine.finish.bind(PuzzleEngine);
    const originalCheck = typeof PuzzleEngine.check === "function" ? PuzzleEngine.check.bind(PuzzleEngine) : null;
    const originalReset = JigsawPuzzleHandler.reset.bind(JigsawPuzzleHandler);
    const originalMove = JigsawPuzzleHandler.move.bind(JigsawPuzzleHandler);
    const originalGetState = PuzzleEngine.getState.bind(PuzzleEngine);
    const originalRender = JigsawScreen.render.bind(JigsawScreen);
    const originalBuildResult = typeof PuzzleEngine.buildResult === "function" ? PuzzleEngine.buildResult.bind(PuzzleEngine) : null;

    function getTwoStageDefinition(engine) {
        const puzzle = engine && engine.puzzle ? engine.puzzle : {};
        const nested = puzzle.content && typeof puzzle.content === "object" ? puzzle.content : {};
        const definition = puzzle.definition && typeof puzzle.definition === "object" ? puzzle.definition : {};
        const definitionContent = definition.content && typeof definition.content === "object" ? definition.content : {};

        const enabled = puzzle.twoStageWordOrder === true ||
            nested.twoStageWordOrder === true ||
            definitionContent.twoStageWordOrder === true;

        if (!enabled) return null;

        const words = Array.isArray(puzzle.words) ? puzzle.words.map(String) :
            Array.isArray(nested.words) ? nested.words.map(String) :
            Array.isArray(definitionContent.words) ? definitionContent.words.map(String) : [];

        const correctOrder = Array.isArray(puzzle.correctOrder) ? puzzle.correctOrder.map(String) :
            Array.isArray(nested.correctOrder) ? nested.correctOrder.map(String) :
            Array.isArray(definitionContent.correctOrder) ? definitionContent.correctOrder.map(String) : words.slice();

        return { words: words, correctOrder: correctOrder };
    }

    function ensureTwoStage(engine) {
        const definition = getTwoStageDefinition(engine);
        if (!definition || !engine.puzzle || engine.puzzle.type !== "jigsaw") return false;

        if (engine.puzzle.twoStageWordOrder !== true) {
            engine.puzzle.twoStageWordOrder = true;
            engine.puzzle.stage = 1;
            engine.puzzle.availableWords = [];
            engine.puzzle.targetWords = [];
            engine.puzzle.history = [];
            engine.puzzle.hintUsed = false;
            engine.puzzle.correctOrder = definition.correctOrder.slice();
            if (!Array.isArray(engine.puzzle.words) || !engine.puzzle.words.length) {
                engine.puzzle.words = definition.words.slice();
            }
            console.log("Word Jigsaw Stage 2 Enabled", {
                stage: 1,
                wordCount: definition.words.length
            });
        }

        return true;
    }

    function isTwoStage(engine) {
        return !!(ensureTwoStage(engine) && engine.puzzle.stage !== undefined);
    }

    function pushHistory(engine) {
        if (!isTwoStage(engine) || engine.puzzle.stage !== 2) return;
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

    function enterStage2(engine) {
        if (!isTwoStage(engine) || engine.puzzle.stage !== 1) return false;

        const words = Array.isArray(engine.puzzle.words) ? engine.puzzle.words.map(String) : [];
        engine.puzzle.stage = 2;
        engine.puzzle.availableWords = words.slice();
        engine.puzzle.targetWords = [];
        engine.puzzle.history = [];
        engine.puzzle.hintUsed = false;
        engine.items = [];

        if (typeof JigsawPuzzle !== "undefined" && JigsawPuzzle.state) {
            JigsawPuzzle.state.solved = true;
        }

        if (engine.state) engine.state.isFinished = false;
        EventManager.emit("puzzleChanged", engine.getState());
        console.log("Word Jigsaw Stage 1 Complete → Stage 2 Ready");
        return true;
    }

    // The normal PuzzleEngine finishes immediately when a Jigsaw becomes solved.
    // Intercept that finish only for Stage 1 and turn it into the Stage 2 transition.
    PuzzleEngine.finish = function () {
        if (enterStage2(this)) return this.getState();
        return originalFinish();
    };

    // Keep an explicit check available for the Stage 2 button.
    if (originalCheck) {
        PuzzleEngine.check = function () {
            if (!isTwoStage(this)) return originalCheck();

            if (this.puzzle.stage === 1) {
                if (typeof JigsawPuzzle !== "undefined" && JigsawPuzzle.check()) {
                    enterStage2(this);
                    return true;
                }
                if (typeof this.emitWrong === "function") this.emitWrong();
                return false;
            }

            if (this.puzzle.stage === 2) {
                const current = this.puzzle.targetWords || [];
                const correct = this.puzzle.correctOrder || this.puzzle.words || [];
                const solved = current.length === correct.length && current.every(function (word, index) {
                    return String(word) === String(correct[index]);
                });

                if (solved) {
                    this.puzzle.stage = 3;
                    originalFinish();
                    return true;
                }

                if (typeof this.emitWrong === "function") this.emitWrong();
                return false;
            }

            return false;
        };
    }

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
        const word = target.splice(from, 1)[0];
        target.splice(to, 0, word);
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
        engine.puzzle.stage2Complete = false;

        if (typeof JigsawPuzzle !== "undefined") {
            JigsawPuzzle.reset();
        }

        EventManager.emit("puzzleChanged", engine.getState());
        return engine.getState();
    };

    JigsawPuzzleHandler.move = function (engine, fromIndex, toIndex) {
        if (!isTwoStage(engine) || engine.puzzle.stage === 1) {
            return originalMove(engine, fromIndex, toIndex);
        }
        return false;
    };

    const originalState = PuzzleEngine.getState.bind(PuzzleEngine);
    PuzzleEngine.getState = function () {
        const state = originalState();
        if (this.puzzle && isTwoStage(this)) {
            state.twoStageWordOrder = true;
            state.stage = this.puzzle.stage || 1;
            state.availableWords = [...(this.puzzle.availableWords || [])];
            state.targetWords = [...(this.puzzle.targetWords || [])];
            state.correctWords = [...(this.puzzle.correctOrder || this.puzzle.words || [])];
            state.hintUsed = !!this.puzzle.hintUsed;
        }
        return state;
    };

    // The first render is the safest place to detect the flag because the
    // content has already been normalized into PuzzleEngine.puzzle.
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
                    <p class="jigsawInstruction">کلمه‌ها را بکش، جابه‌جا کن یا دوباره به باکس اولیه برگردان.</p>
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

                <div id="wordBuilderMessage" class="wordBuilderMessage" aria-live="polite"></div>
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
            if (!correct) screen.showWordBuilderMessage("هنوز ترتیب کلمات درست نیست؛ دوباره تلاش کن.");
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

        this.bindWordBuilderPointerDrag(source, "source");
        this.bindWordBuilderPointerDrag(target, "target");
    };

    JigsawScreen.bindWordBuilderPointerDrag = function (container, kind) {
        container.querySelectorAll(".wordBuilderPiece").forEach(function (button) {
            let moved = false;
            let startX = 0;
            let startY = 0;

            button.addEventListener("pointerdown", function (event) {
                moved = false;
                startX = event.clientX;
                startY = event.clientY;
                try { button.setPointerCapture(event.pointerId); } catch (e) {}
            });

            button.addEventListener("pointermove", function (event) {
                if (Math.abs(event.clientX - startX) > 5 || Math.abs(event.clientY - startY) > 5) moved = true;
            });

            button.addEventListener("pointerup", function (event) {
                if (!moved) return;
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

    if (originalBuildResult) {
        PuzzleEngine.buildResult = function () {
            const result = originalBuildResult();
            if (this.puzzle && this.puzzle.twoStageWordOrder && this.puzzle.hintUsed) {
                result.score = Math.max(0, Number(result.score || 0) - 2);
                result.message = "🎉 پازل تمام شد — با استفاده از راهنمای الفبایی";
            }
            return result;
        };
    }

    console.log("Word Jigsaw Stage 2 v1.1 Ready");
})();
