// =====================================
// Tahouri Edu Platform
// Word Jigsaw Difficulty
// Version 1.0
// Word-only difficulty layer.
// Image Jigsaw and all other puzzle types are untouched.
// =====================================

(function () {
    "use strict";

    if (typeof PuzzleEngine === "undefined" || typeof JigsawPuzzleHandler === "undefined" || typeof JigsawScreen === "undefined") {
        console.error("Word Jigsaw Difficulty: required modules are not available");
        return;
    }

    const originalStart = JigsawPuzzleHandler.start.bind(JigsawPuzzleHandler);
    const originalReset = JigsawPuzzleHandler.reset.bind(JigsawPuzzleHandler);
    const originalMoveToTarget = JigsawPuzzleHandler.moveWordToTarget.bind(JigsawPuzzleHandler);
    const originalMoveToSource = JigsawPuzzleHandler.moveWordToSource.bind(JigsawPuzzleHandler);
    const originalUndo = JigsawPuzzleHandler.undoStage2.bind(JigsawPuzzleHandler);
    const originalAlphabet = JigsawPuzzleHandler.alphabeticalHint.bind(JigsawPuzzleHandler);
    const originalCheck = JigsawPuzzleHandler.check.bind(JigsawPuzzleHandler);
    const originalRenderWordBuilder = JigsawScreen.renderWordBuilder.bind(JigsawScreen);
    const originalGetState = PuzzleEngine.getState.bind(PuzzleEngine);

    function isWordJigsaw(engine) {
        return !!(
            engine &&
            engine.puzzle &&
            engine.puzzle.type === "jigsaw" &&
            engine.puzzle.dataType === "text" &&
            engine.puzzle.twoStageWordOrder === true
        );
    }

    function level(engine) {
        if (!isWordJigsaw(engine)) return 3;
        const value = Number(engine.puzzle.wordJigsawDifficulty || engine.puzzle.difficulty || 3);
        return Math.min(3, Math.max(1, Math.round(value)));
    }

    function partial(engine) {
        return isWordJigsaw(engine) && level(engine) < 3;
    }

    function shuffle(list) {
        const result = Array.isArray(list) ? list.slice() : [];
        for (let i = result.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        if (result.length > 1 && result.every(function (v, i) { return v === list[i]; })) {
            [result[0], result[1]] = [result[1], result[0]];
        }
        return result;
    }

    function configure(engine) {
        if (!partial(engine)) return;

        const words = Array.isArray(engine.puzzle.correctOrder)
            ? engine.puzzle.correctOrder.map(String)
            : (Array.isArray(engine.puzzle.words) ? engine.puzzle.words.map(String) : []);

        const count = level(engine) === 1 ? 4 : Math.min(8, words.length);
        const indexes = Array.from({ length: words.length }, function (_, i) { return i; });
        const movable = shuffle(indexes).slice(0, count).sort(function (a, b) { return a - b; });
        const movableSet = new Set(movable);

        engine.puzzle.movableIndexes = movable;
        engine.puzzle.fixedIndexes = indexes.filter(function (i) { return !movableSet.has(i); });
        engine.puzzle.availableWords = shuffle(movable.map(function (i) { return words[i]; }));
        engine.puzzle.targetWords = words.map(function (word, i) { return movableSet.has(i) ? null : word; });
        engine.puzzle.history = [];
        engine.puzzle.hintUsed = false;
        engine.items = [...engine.puzzle.targetWords];
        engine.moves = 0;
    }

    function snapshot(engine) {
        return {
            availableWords: [...(engine.puzzle.availableWords || [])],
            targetWords: [...(engine.puzzle.targetWords || [])],
            hintUsed: !!engine.puzzle.hintUsed
        };
    }

    // Normalize Arabic Yeh variants only for Word Jigsaw display.
    // Persian UI must consistently show Persian Yeh (ی), while the
    // underlying puzzle data/order remains unchanged.
    function displayWord(word) {
        return String(word == null ? "" : word)
            .replace(/\\u064A/g, "\\u06CC")
            .replace(/\\u0649/g, "\\u06CC");
    }

    function punctuation(state, index) {
        const marks = state && state.punctuation ? state.punctuation : {};
        return marks[String(index)] || "";
    }

    function renderPartial(state) {
        const app = document.getElementById("app");
        if (!app) return;

        const engine = PuzzleEngine;
        const correct = Array.isArray(state.correctWords) ? state.correctWords : [];
        const target = Array.isArray(state.targetWords) ? state.targetWords : [];
        const source = Array.isArray(state.availableWords) ? state.availableWords : [];
        const movable = new Set(Array.isArray(state.movableIndexes) ? state.movableIndexes : []);
        const esc = JigsawScreen.escapeHTML.bind(JigsawScreen);
        const firstLineLength = Number(engine.puzzle.firstLineLength || 0);
        const groups = Array.isArray(engine.puzzle.groupLengths) && engine.puzzle.groupLengths.length
            ? engine.puzzle.groupLengths.map(Number)
            : (firstLineLength > 0 && firstLineLength < correct.length
                ? [firstLineLength, correct.length - firstLineLength]
                : [correct.length]);

        let cursor = 0;
        const lines = groups.map(function (length) {
            const html = correct.slice(cursor, cursor + length).map(function (word, offset) {
                const index = cursor + offset;
                const mark = punctuation(state, index);
                if (!movable.has(index)) {
                    return '<span class="wordBuilderPiece wordBuilderFixedPiece">' +
                        '<span class="wordBuilderWord">' + esc(displayWord(word)) + '</span>' +
                        (mark ? '<span class="wordBuilderPunctuation">' + esc(mark) + '</span>' : '') +
                        '</span>';
                }

                if (target[index] != null) {
                    return '<button class="wordBuilderPiece wordBuilderTargetPiece" draggable="true" data-target-index="' + index + '" type="button">' +
                        '<span class="wordBuilderWord">' + esc(displayWord(target[index])) + '</span>' +
                        (mark ? '<span class="wordBuilderPunctuation">' + esc(mark) + '</span>' : '') +
                        '</button>';
                }

                return '<div class="wordBuilderSlot" data-target-slot="' + index + '">جای خالی</div>';
            }).join("");

            cursor += length;
            return '<div class="wordBuilderPoetryLine">' + html + '</div>';
        }).join("");

        app.innerHTML =
            '<div class="screen puzzleScreen jigsawScreen wordBuilderScreen" dir="rtl">' +
            '<div class="jigsawHeader wordJigsawHeader">' +
            '<div class="wordJigsawBadge">جورچین واژه‌ها</div>' +
            '<h1>ساختن شعر</h1>' +
            '<p class="jigsawObjective">کلمات مشخص‌شده را در جای درست قرار بده.</p>' +
            '<div class="wordBuilderLevelNote">سطح ' + (level(engine) === 1 ? 'ساده — ۴ کلمه' : 'متوسط — ۸ کلمه') + ' قابل جابه‌جایی است.</div>' +
            '</div>' +
            '<section class="wordBuilderSection"><h2>کلمات</h2><div id="wordBuilderSource" class="wordBuilderBox" data-drop-zone="source">' +
            source.map(function (word, i) {
                return '<button class="wordBuilderPiece" draggable="true" data-source-index="' + i + '" type="button">' + esc(displayWord(word)) + '</button>';
            }).join("") +
            (source.length ? "" : '<span class="wordBuilderEmpty">همه کلمات در پاسخ شما هستند.</span>') +
            '</div></section>' +
            '<section class="wordBuilderSection wordBuilderAnswerSection"><h2>پاسخ شما</h2><div id="wordBuilderTarget" class="wordBuilderBox wordBuilderTarget wordBuilderPartialTarget">' +
            lines +
            '</div></section>' +
            '<div class="wordBuilderControls"><button id="wordBuilderCheck" type="button">بررسی پاسخ</button><button id="wordBuilderUndo" type="button">↩ برگشت</button><button id="wordBuilderAlphabet" type="button">مرتب‌سازی الفبایی</button><button id="wordBuilderReset" type="button">شروع دوباره</button></div>' +
            '<div id="wordBuilderMessage" class="wordBuilderMessage" aria-live="polite"></div>' +
            '<div class="jigsawMoves">حرکت‌ها: <span>' + (state.moves || 0) + '</span></div>' +
            '</div>';

        bindPartialEvents();
    }

    function bindPartialEvents() {
        const source = document.getElementById("wordBuilderSource");
        const target = document.getElementById("wordBuilderTarget");
        if (!source || !target) return;

        let dragData = null;
        function rerender() { JigsawScreen.render(PuzzleEngine.getState()); }

        source.querySelectorAll("[data-source-index]").forEach(function (button) {
            button.addEventListener("dragstart", function (event) {
                dragData = { zone: "source", index: Number(button.dataset.sourceIndex) };
                button.classList.add("is-dragging");
                if (event.dataTransfer) event.dataTransfer.setData("text/plain", "word");
            });
            button.addEventListener("dragend", function () { button.classList.remove("is-dragging"); dragData = null; });
        });

        target.querySelectorAll("[data-target-index]").forEach(function (button) {
            button.addEventListener("dragstart", function (event) {
                dragData = { zone: "target", index: Number(button.dataset.targetIndex) };
                button.classList.add("is-dragging");
                if (event.dataTransfer) event.dataTransfer.setData("text/plain", "word");
            });
            button.addEventListener("dragend", function () { button.classList.remove("is-dragging"); dragData = null; });
        });

        target.querySelectorAll("[data-target-slot]").forEach(function (slot) {
            slot.addEventListener("dragover", function (event) { event.preventDefault(); slot.classList.add("is-drag-over"); });
            slot.addEventListener("dragleave", function () { slot.classList.remove("is-drag-over"); });
            slot.addEventListener("drop", function (event) {
                event.preventDefault();
                slot.classList.remove("is-drag-over");
                if (!dragData) return;

                const index = Number(slot.dataset.targetSlot);
                if (dragData.zone === "source") {
                    if (JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, dragData.index, index)) rerender();
                } else if (dragData.zone === "target" && dragData.index !== index) {
                    const current = PuzzleEngine.puzzle.targetWords[index];
                    if (current == null) {
                        JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, dragData.index);
                        const sourceIndex = PuzzleEngine.puzzle.availableWords.length - 1;
                        JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, sourceIndex, index);
                        rerender();
                    }
                }
            });
        });

        target.querySelectorAll("[data-target-index]").forEach(function (button) {
            button.addEventListener("dragover", function (event) { event.preventDefault(); button.classList.add("is-drag-over"); });
            button.addEventListener("dragleave", function () { button.classList.remove("is-drag-over"); });
            button.addEventListener("drop", function (event) {
                event.preventDefault();
                button.classList.remove("is-drag-over");
                if (!dragData || dragData.zone !== "source") return;
                const index = Number(button.dataset.targetIndex);
                JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, index);
                const sourceIndex = PuzzleEngine.puzzle.availableWords.length - 1;
                if (JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, sourceIndex, index)) rerender();
            });
        });

        source.addEventListener("dragover", function (event) { event.preventDefault(); });
        source.addEventListener("drop", function (event) {
            event.preventDefault();
            if (dragData && dragData.zone === "target") {
                if (JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, dragData.index)) rerender();
            }
        });

        const check = document.getElementById("wordBuilderCheck");
        if (check) check.onclick = function () { PuzzleEngine.check(); };

        const undo = document.getElementById("wordBuilderUndo");
        if (undo) undo.onclick = function () {
            if (JigsawPuzzleHandler.undoStage2(PuzzleEngine)) rerender();
            else JigsawScreen.showWordBuilderMessage("حرکت قبلی برای برگشت وجود ندارد.");
        };

        const alphabet = document.getElementById("wordBuilderAlphabet");
        if (alphabet) alphabet.onclick = function () { JigsawPuzzleHandler.alphabeticalHint(PuzzleEngine); rerender(); };

        const reset = document.getElementById("wordBuilderReset");
        if (reset) reset.onclick = function () { if (JigsawPuzzleHandler.reset(PuzzleEngine)) rerender(); };
    }

    JigsawPuzzleHandler.start = function (engine, data) {
        const result = originalStart(engine, data);
        if (!result) return result;

        if (isWordJigsaw(engine)) {
            engine.puzzle.wordJigsawDifficulty = Number(data.difficulty || (data.content && data.content.difficulty) || 3);
            configure(engine);
            engine.items = [...(engine.puzzle.targetWords || [])];
        }

        return engine.getState();
    };

    JigsawPuzzleHandler.reset = function (engine) {
        if (!partial(engine)) return originalReset(engine);
        configure(engine);
        EventManager.emit("puzzleChanged", engine.getState());
        return engine.getState();
    };

    JigsawPuzzleHandler.moveWordToTarget = function (engine, sourceIndex, targetIndex) {
        if (!partial(engine)) return originalMoveToTarget(engine, sourceIndex, targetIndex);

        const source = engine.puzzle.availableWords || [];
        const target = engine.puzzle.targetWords || [];
        const slot = Number(targetIndex);
        const sourcePos = Number(sourceIndex);

        if (!Number.isInteger(sourcePos) || sourcePos < 0 || sourcePos >= source.length) return false;
        if (!Number.isInteger(slot) || !engine.puzzle.movableIndexes.includes(slot) || target[slot] != null) return false;

        engine.puzzle.history.push(snapshot(engine));
        target[slot] = source.splice(sourcePos, 1)[0];
        engine.items = [...target];
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    };

    JigsawPuzzleHandler.moveWordToSource = function (engine, targetIndex) {
        if (!partial(engine)) return originalMoveToSource(engine, targetIndex);

        const target = engine.puzzle.targetWords || [];
        const slot = Number(targetIndex);

        if (!Number.isInteger(slot) || !engine.puzzle.movableIndexes.includes(slot) || target[slot] == null) return false;

        engine.puzzle.history.push(snapshot(engine));
        engine.puzzle.availableWords.push(target[slot]);
        target[slot] = null;
        engine.items = [...target];
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    };

    JigsawPuzzleHandler.undoStage2 = function (engine) {
        if (!partial(engine)) return originalUndo(engine);
        const previous = engine.puzzle.history.pop();
        if (!previous) return false;
        engine.puzzle.availableWords = [...previous.availableWords];
        engine.puzzle.targetWords = [...previous.targetWords];
        engine.puzzle.hintUsed = !!previous.hintUsed;
        engine.items = [...engine.puzzle.targetWords];
        engine.moves = Math.max(0, Number(engine.moves || 0) - 1);
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    };

    JigsawPuzzleHandler.alphabeticalHint = function (engine) {
        if (!partial(engine)) return originalAlphabet(engine);
        engine.puzzle.history.push(snapshot(engine));
        engine.puzzle.availableWords = [...(engine.puzzle.availableWords || [])].sort(function (a, b) {
            return String(a).localeCompare(String(b), "fa");
        });
        engine.puzzle.hintUsed = true;
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    };

    JigsawPuzzleHandler.check = function (engine) {
        if (!partial(engine)) return originalCheck(engine);
        const target = engine.puzzle.targetWords || [];
        const correct = engine.puzzle.correctOrder || engine.puzzle.words || [];
        const solved = target.length === correct.length && target.every(function (word, index) {
            return word != null && String(word).replace(/‌/g, " ").trim() === String(correct[index]).replace(/‌/g, " ").trim();
        });
        if (solved) {
            engine.puzzle.stage = 3;
            engine.puzzle.hintUsed = !!engine.puzzle.hintUsed;
            engine.finish();
            return true;
        }
        engine.emitWrong();
        return false;
    };

    PuzzleEngine.getState = function () {
        const state = originalGetState();
        if (isWordJigsaw(this)) {
            state.wordJigsawDifficulty = level(this);
            state.fixedIndexes = Array.isArray(this.puzzle.fixedIndexes) ? [...this.puzzle.fixedIndexes] : [];
            state.movableIndexes = Array.isArray(this.puzzle.movableIndexes) ? [...this.puzzle.movableIndexes] : [];
            state.availableWords = [...(this.puzzle.availableWords || [])];
            state.targetWords = [...(this.puzzle.targetWords || [])];
        }
        return state;
    };

    JigsawScreen.renderWordBuilder = function (state) {
        if (!partial(PuzzleEngine)) return originalRenderWordBuilder(state);
        renderPartial(state);
    };

    console.log("Word Jigsaw Difficulty v1.0 Ready");
})();
