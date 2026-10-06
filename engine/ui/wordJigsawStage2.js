// =====================================
// Tahouri Edu Platform
// Word Jigsaw Stage 2
// Version 2.8
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
        if (!Number.isInteger(engine.puzzle.stage)) engine.puzzle.stage = 2;
        if (!Array.isArray(engine.puzzle.availableWords)) engine.puzzle.availableWords = [];
        if (!Array.isArray(engine.puzzle.targetWords)) engine.puzzle.targetWords = [];
        if (!Array.isArray(engine.puzzle.targetGroups)) engine.puzzle.targetGroups = [];
        if (!Array.isArray(engine.puzzle.history)) engine.puzzle.history = [];
        if (!Array.isArray(engine.puzzle.correctOrder) || !engine.puzzle.correctOrder.length) engine.puzzle.correctOrder = definition.correctOrder.slice();
        if (!Array.isArray(engine.puzzle.words) || !engine.puzzle.words.length) engine.puzzle.words = definition.words.slice();
        if (engine.puzzle.hintUsed !== true) engine.puzzle.hintUsed = false;
        if (!engine.puzzle.punctuation || typeof engine.puzzle.punctuation !== "object") engine.puzzle.punctuation = {};
        return true;
    }

    function isStage2(engine) { return !!(enable(engine) && engine.puzzle.stage === 2); }

    function getHardGroupLengths(engine) {
        const puzzle = engine && engine.puzzle ? engine.puzzle : {};
        const lengths = Array.isArray(puzzle.groupLengths)
            ? puzzle.groupLengths.map(Number).filter(function (n) { return Number.isInteger(n) && n > 0; })
            : [];
        if (lengths.length) return lengths;
        const first = Number(puzzle.firstLineLength || 0);
        const total = Array.isArray(puzzle.correctOrder) ? puzzle.correctOrder.length : 0;
        return first > 0 && first < total ? [first, total - first] : [];
    }

    function isHardGroupedBoard(engine) {
        return !!(engine && engine.puzzle && Number(engine.puzzle.wordJigsawDifficulty || 3) >= 3 && getHardGroupLengths(engine).length >= 2);
    }

    function emitChanged(engine) {
        engine.items = [...(engine.puzzle.targetWords || [])];
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
    }

    function shuffleWords(words) {
        const shuffled = words.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        if (shuffled.length > 1 && shuffled.every((word, i) => word === words[i])) [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
        return shuffled;
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
        if (message) message.textContent = "این ترتیب درست نیست؛ کلمات را جابه‌جا کن و دوباره «بررسی پاسخ» را بزن.";
        return false;
    }

    JigsawPuzzleHandler.check = function (engine) {
        if (!enable(engine)) return false;
        if (engine.puzzle.stage === 2) return checkStage2(engine);
        return false;
    };

    JigsawPuzzleHandler.moveWordToTarget = function (engine, sourceIndex, targetIndex, targetGroup) {
        if (!isStage2(engine)) return false;
        const source = engine.puzzle.availableWords || [];
        const index = Number(sourceIndex);
        if (!Number.isInteger(index) || index < 0 || index >= source.length) return false;

        const target = engine.puzzle.targetWords || [];
        const partialBoard = Array.isArray(engine.puzzle.movableIndexes) &&
            target.length === (engine.puzzle.correctOrder || engine.puzzle.words || []).length;
        // Hard Stage 2 is a grouped board whenever the drag layer supplies
        // a hemistich (targetGroup). Do not depend on a second difficulty or
        // group-length predicate here: those values are already resolved by
        // the rendered two-row board, and partial levels call a different
        // override before reaching this method.
        const group = Number(targetGroup);
        const requested = Number(targetIndex);

        if (Number.isInteger(group) && group >= 0) {
            // The puzzle handler originally initializes targetGroups as
            // [[], []]. The visual target is compact, so normalize that shape
            // to one numeric group value per word before inserting.
            if (!Array.isArray(engine.puzzle.targetGroups) ||
                engine.puzzle.targetGroups.length !== target.length ||
                engine.puzzle.targetGroups.some(function (g) { return !Number.isFinite(Number(g)); })) {
                engine.puzzle.targetGroups = target.map(function () { return 0; });
            }

            const currentGroups = engine.puzzle.targetGroups;
            const groupPositions = [];
            for (let i = 0; i < currentGroups.length; i++) {
                if (Number(currentGroups[i]) === group) groupPositions.push(i);
            }

            const groupStart = currentGroups.filter(function (g) {
                return Number(g) < group;
            }).length;

            let insertAt = groupStart + groupPositions.length;
            if (Number.isInteger(requested)) {
                insertAt = Math.max(groupStart, Math.min(requested, groupStart + groupPositions.length));
            }

            engine.puzzle.history.push({
                availableWords: [...source],
                targetWords: [...target],
                targetGroups: [...currentGroups],
                hintUsed: !!engine.puzzle.hintUsed
            });

            const word = source.splice(index, 1)[0];
            target.splice(insertAt, 0, word);
            currentGroups.splice(insertAt, 0, group);
            emitChanged(engine);
            return true;
        }

        // In the full (hard) word-builder board, empty positions before the
        // second hemistich are preserved as nulls instead of being removed.
        const slot = targetIndex == null || targetIndex === ""
            ? target.length
            : Number(targetIndex);

        const correctLength = (engine.puzzle.correctOrder || engine.puzzle.words || []).length;
        if (!Number.isInteger(slot) || slot < 0 || slot >= correctLength) return false;
        if (partialBoard && target[slot] != null) return false;

        engine.puzzle.history.push({
            availableWords: [...source],
            targetWords: [...target],
            targetGroups: [...(engine.puzzle.targetGroups || [])],
            hintUsed: !!engine.puzzle.hintUsed
        });

        const word = source.splice(index, 1)[0];

        // Partial Setayesh board uses fixed positions (including null slots).
        // Never splice the target array here: doing so shifts the second hemistich
        // and can move a repeated word such as "حق" across the hemistich boundary.
        if (partialBoard) {
            while (target.length <= slot) target.push(null);
            target[slot] = word;
        } else {
            target.splice(slot, 0, word);
        }

        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.moveWordToSource = function (engine, targetIndex) {
        if (!isStage2(engine)) return false;
        const target = engine.puzzle.targetWords || [];
        const index = Number(targetIndex);
        if (!Number.isInteger(index) || index < 0 || index >= target.length) return false;
        if (target[index] == null) return false;

        engine.puzzle.history.push({
            availableWords: [...engine.puzzle.availableWords],
            targetWords: [...target],
            targetGroups: [...(engine.puzzle.targetGroups || [])],
            hintUsed: !!engine.puzzle.hintUsed
        });

        engine.puzzle.availableWords.push(
            target[index]
        );

        // Partial Setayesh board keeps its fixed position; clear the slot
        // instead of removing it from the array.
        const partialBoard = Array.isArray(engine.puzzle.movableIndexes) &&
            target.length === (engine.puzzle.correctOrder || engine.puzzle.words || []).length;

        const hardGroupedBoard = isHardGroupedBoard(engine);
        if (hardGroupedBoard) {
            target.splice(index, 1);
            engine.puzzle.targetGroups.splice(index, 1);
        } else if (partialBoard) {
            target[index] = null;
        } else {
            target.splice(index, 1);
        }

        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.reorderTarget = function (engine, fromIndex, toIndex) {
        if (!isStage2(engine)) return false;
        const from = Number(fromIndex), to = Number(toIndex), target = engine.puzzle.targetWords || [];
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= target.length || to >= target.length || from === to) return false;
        const hardGroupedBoard = isHardGroupedBoard(engine);
        const groups = engine.puzzle.targetGroups || [];
        if (hardGroupedBoard && groups.length === target.length && Number(groups[from]) !== Number(groups[to])) return false;
        engine.puzzle.history.push({ availableWords:[...engine.puzzle.availableWords], targetWords:[...target], targetGroups:[...groups], hintUsed:!!engine.puzzle.hintUsed });
        const word = target.splice(from, 1)[0];
        const group = groups.splice(from, 1)[0];
        target.splice(to, 0, word);
        if (hardGroupedBoard) groups.splice(to, 0, group);
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.undoStage2 = function (engine) {
        if (!isStage2(engine)) return false;
        const previous = engine.puzzle.history.pop();
        if (!previous) return false;
        engine.puzzle.availableWords = [...previous.availableWords];
        engine.puzzle.targetWords = [...previous.targetWords];
        engine.puzzle.targetGroups = [...(previous.targetGroups || [])];
        engine.puzzle.hintUsed = !!previous.hintUsed;
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.alphabeticalHint = function (engine) {
        if (!isStage2(engine)) return false;
        const allWords = [...(engine.puzzle.availableWords || []), ...(engine.puzzle.targetWords || []).filter(function (w) { return w != null; })];
        engine.puzzle.history.push({ availableWords: [...engine.puzzle.availableWords], targetWords: [...engine.puzzle.targetWords], targetGroups: [...(engine.puzzle.targetGroups || [])], hintUsed: !!engine.puzzle.hintUsed });
        engine.puzzle.availableWords = [];
        engine.puzzle.targetWords = allWords.sort(function (a, b) { return String(a).localeCompare(String(b), "fa"); });
        engine.puzzle.targetGroups = engine.puzzle.targetWords.map(function () { return 0; });
        engine.puzzle.hintUsed = true;
        emitChanged(engine);
        return true;
    };

    JigsawPuzzleHandler.reset = function (engine) {
        if (!enable(engine)) return originalReset(engine);
        if (engine.state && engine.state.isFinished) return false;
        const words = engine.puzzle.words.slice();
        engine.puzzle.stage = 2;
        engine.puzzle.availableWords = shuffleWords(words);
        engine.puzzle.targetWords = [];
        engine.puzzle.targetGroups = [];
        engine.puzzle.history = [];
        engine.puzzle.hintUsed = false;
        engine.items = [];
        engine.moves = 0;
        if (typeof JigsawPuzzle !== "undefined") JigsawPuzzle.reset();
        if (engine.state) engine.state.isFinished = false;
        EventManager.emit("puzzleChanged", engine.getState());
        return engine.getState();
    };

    JigsawPuzzleHandler.move = function (engine, fromIndex, toIndex) {
        if (!enable(engine) || engine.puzzle.stage === 2) return false;
        return originalMove(engine, fromIndex, toIndex);
    };

    const originalState = PuzzleEngine.getState.bind(PuzzleEngine);
    PuzzleEngine.getState = function () {
        const state = originalState();
        if (this.puzzle && enable(this)) {
            state.twoStageWordOrder = true;
            state.stage = this.puzzle.stage || 2;
            state.availableWords = [...(this.puzzle.availableWords || [])];
            state.targetWords = [...(this.puzzle.targetWords || [])];
            state.targetGroups = [...(this.puzzle.targetGroups || [])];
            state.correctWords = [...(this.puzzle.correctOrder || this.puzzle.words || [])];
            state.hintUsed = !!this.puzzle.hintUsed;
            state.punctuation = { ...(this.puzzle.punctuation || {}) };
        }
        return state;
    };

    JigsawScreen.render = function (state) {
        const engine = PuzzleEngine;
        if (isStage2(engine)) return this.renderWordBuilder(engine.getState());
        return originalRender(state);
    };

    // Word text must never display Arabic tatweel/kashida (U+0640).
    // This is a display-only normalization; the puzzle data/order remains unchanged.
    function displayWord(word) {
        return String(word == null ? "" : word)
            .replace(/\u0640/g, "")
            .replace(/\u064A/g, "\u06CC")
            .replace(/\u0649/g, "\u06CC");
    }

    function punctuationForTarget(state, word, targetIndex) {
        const marks = state && state.punctuation ? state.punctuation : {};
        const correct = Array.isArray(state && state.correctWords) ? state.correctWords.map(String) : [];
        const target = Array.isArray(state && state.targetWords) ? state.targetWords.map(String) : [];
        if (!Object.keys(marks).length || !correct.length) return "";
        const occurrence = target.slice(0, targetIndex + 1).filter(function (item) { return item === String(word); }).length;
        let seen = 0;
        for (let i = 0; i < correct.length; i++) {
            if (correct[i] !== String(word)) continue;
            seen++;
            if (seen === occurrence) return marks[String(i)] || "";
        }
        return "";
    }

    JigsawScreen.renderWordBuilder = function (state) {
        const app = document.getElementById("app");
        if (!app) return;
        const source = Array.isArray(state.availableWords) ? state.availableWords : [];
        const target = Array.isArray(state.targetWords) ? state.targetWords : [];
        const difficulty = Number(PuzzleEngine && PuzzleEngine.puzzle && PuzzleEngine.puzzle.wordJigsawDifficulty || 3);
        const hardGroupedBoard = difficulty >= 3 && getHardGroupLengths(PuzzleEngine).length >= 2;
        const esc = this.escapeHTML.bind(this);
        let targetMarkup = "";
        if (hardGroupedBoard) {
            const groups = Array.isArray(state.targetGroups) ? state.targetGroups : [];
            const lengths = getHardGroupLengths(PuzzleEngine);
            targetMarkup = lengths.map(function (_, groupIndex) {
                const buttons = target.map(function (w, i) {
                    if (w == null || Number(groups[i]) !== groupIndex) return "";
                    return `<button class="wordBuilderPiece wordBuilderTargetPiece" draggable="true" data-target-index="${i}" type="button"><span class="wordBuilderWord">${esc(displayWord(w))}</span></button>`;
                }).join("");
                return `<div class="wordBuilderPoetryLine wordBuilderPoetryLineGroup" data-group-index="${groupIndex}">${buttons || '<span class="wordBuilderEmpty">کلمات این مصرع را اینجا رها کن.</span>'}</div>`;
            }).join("");
        } else {
            targetMarkup = target.map(function (w,i) { return w == null ? "" : `<button class="wordBuilderPiece wordBuilderTargetPiece" draggable="true" data-target-index="${i}" type="button"><span class="wordBuilderWord">${esc(displayWord(w))}</span>${esc(punctuationForTarget(state, w, i)) ? `<span class="wordBuilderPunctuation">${esc(displayWord(punctuationForTarget(state, w, i)))}</span>` : ""}</button>`; }).join("") || '<span class="wordBuilderEmpty">کلمات را اینجا رها کن.</span>';
        }
        app.innerHTML = `
            <div class="screen puzzleScreen jigsawScreen wordBuilderScreen" dir="rtl">
                <div class="jigsawHeader wordJigsawHeader">
                    <div class="wordJigsawBadge">جورچین واژه‌ها</div>
                    <h1>ساختن شعر</h1>
                    <p class="jigsawObjective">کلمات را با کشیدن و رها کردن به «پاسخ شما» منتقل کن و ترتیب درست را بساز.</p>
                </div>
                <section class="wordBuilderSection"><h2>کلمات</h2><div id="wordBuilderSource" class="wordBuilderBox" data-drop-zone="source">${source.map((w,i)=>`<button class="wordBuilderPiece" draggable="true" data-source-index="${i}" type="button">${esc(displayWord(w))}</button>`).join("") || '<span class="wordBuilderEmpty">همه کلمات در پاسخ شما هستند.</span>'}</div></section>
                <section class="wordBuilderSection wordBuilderAnswerSection"><h2>پاسخ شما</h2><div id="wordBuilderTarget" class="wordBuilderBox wordBuilderTarget${hardGroupedBoard ? " wordBuilderTargetHard" : ""}" data-drop-zone="target">${targetMarkup}</div></section>
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
        let dragData = null;
        let dragGhost = null;
        let activePointerId = null;
        let lastPointerX = 0;
        let lastPointerY = 0;
        let activeButton = null;
        let startX = 0;
        let startY = 0;
        let dragging = false;

        function rerender() { screen.render(PuzzleEngine.getState()); }

        function clearDrag() {
            if (activeButton) activeButton.classList.remove("is-dragging");
            if (dragGhost && dragGhost.parentNode) dragGhost.parentNode.removeChild(dragGhost);
            source.classList.remove("is-drag-over");
            target.classList.remove("is-drag-over");
            target.querySelectorAll(".is-drag-over").forEach(function (el) { el.classList.remove("is-drag-over"); });
            dragGhost = null;
            dragData = null;
            // Pointer capture is intentionally not used for this drag system.
            activePointerId = null;
            activeButton = null;
            dragging = false;
        }

        function createGhost(button) {
            const rect = button.getBoundingClientRect();
            const ghost = button.cloneNode(true);
            ghost.removeAttribute("data-source-index");
            ghost.removeAttribute("data-target-index");
            ghost.style.position = "fixed";
            ghost.style.left = rect.left + "px";
            ghost.style.top = rect.top + "px";
            ghost.style.width = rect.width + "px";
            ghost.style.height = rect.height + "px";
            ghost.style.margin = "0";
            ghost.style.zIndex = "99999";
            ghost.style.pointerEvents = "none";
            ghost.style.opacity = ".92";
            ghost.style.transform = "scale(1.04) rotate(-1deg)";
            ghost.style.transition = "none";
            document.body.appendChild(ghost);
            return ghost;
        }

        function updateGhost(event) {
            if (!dragGhost) return;
            const rect = activeButton.getBoundingClientRect();
            dragGhost.style.left = (event.clientX - startX + rect.left) + "px";
            dragGhost.style.top = (event.clientY - startY + rect.top) + "px";
        }

        function findDropTarget(event) {
            if (dragGhost) dragGhost.style.display = "none";
            const element = document.elementFromPoint(event.clientX, event.clientY);
            if (dragGhost) dragGhost.style.display = "";
            return element;
        }

        function getHardInsertInfo(event, excludedIndex) {
            const rows = [...target.querySelectorAll(".wordBuilderPoetryLine")];
            const direction = getComputedStyle(target).direction || "rtl";
            let rowIndex = -1;
            let row = null;

            rows.forEach(function (candidate, index) {
                const rect = candidate.getBoundingClientRect();
                if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
                    row = candidate;
                    rowIndex = index;
                }
            });

            if (rowIndex < 0) {
                // If the pointer is in the gap between rows, use the nearest row.
                let best = Infinity;
                rows.forEach(function (candidate, index) {
                    const rect = candidate.getBoundingClientRect();
                    const dy = event.clientY < rect.top ? rect.top - event.clientY :
                        event.clientY > rect.bottom ? event.clientY - rect.bottom : 0;
                    if (dy < best) {
                        best = dy;
                        row = candidate;
                        rowIndex = index;
                    }
                });
            }

            if (rowIndex < 0) return { group: 0, index: 0 };

            const buttons = [...row.querySelectorAll("[data-target-index]")].filter(function (button) {
                return Number(button.dataset.targetIndex) !== Number(excludedIndex);
            });

            // Important: the target array is compact in hard mode. Therefore the
            // start of the second hemistich is the number of words currently in
            // the first hemistich, NOT firstLineLength/group capacity.
            const allRows = rows.map(function (r) {
                return [...r.querySelectorAll("[data-target-index]")].filter(function (button) {
                    return Number(button.dataset.targetIndex) !== Number(excludedIndex);
                });
            });
            let groupStart = 0;
            for (let i = 0; i < rowIndex; i++) groupStart += allRows[i].length;

            if (!buttons.length) {
                return { group: rowIndex, index: groupStart };
            }

            let nearest = null;
            let nearestDistance = Infinity;
            buttons.forEach(function (button) {
                const rect = button.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const dx = event.clientX - centerX;
                const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
                    event.clientY >= rect.top && event.clientY <= rect.bottom;
                const distance = inside ? 0 : Math.abs(dx);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = { button: button, rect: rect };
                }
            });

            const localIndex = buttons.indexOf(nearest.button);
            const center = nearest.rect.left + nearest.rect.width / 2;
            const insertAfter = direction === "rtl"
                ? event.clientX < center
                : event.clientX > center;
            const localInsert = localIndex + (insertAfter ? 1 : 0);

            return {
                group: rowIndex,
                index: groupStart + localInsert
            };
        }

        function getInsertIndexFromPoint(event, excludedIndex) {
            return getHardInsertInfo(event, excludedIndex).index;
        }

        function reorderTargetFromPoint(event, fromIndex) {
            const info = getHardInsertInfo(event, fromIndex);
            let toIndex = info.index;
            if (toIndex > fromIndex) toIndex -= 1;
            if (toIndex !== fromIndex) {
                if (JigsawPuzzleHandler.reorderTarget(PuzzleEngine, fromIndex, toIndex)) rerender();
            }
        }

        function isPointInside(element, event) {
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            return event.clientX >= rect.left && event.clientX <= rect.right &&
                event.clientY >= rect.top && event.clientY <= rect.bottom;
        }

        function finishPointerDrag(event) {
            if (!dragData || activePointerId !== event.pointerId) return;

            // Use the last pointer coordinates captured during the drag. On some
            // browsers the final pointerup can be retargeted to the captured
            // source button, while the last pointermove still contains the real
            // position over the answer box.
            const point = {
                clientX: Number.isFinite(lastPointerX) ? lastPointerX : event.clientX,
                clientY: Number.isFinite(lastPointerY) ? lastPointerY : event.clientY
            };
            const data = dragData;

            if (data.fromZone === "source") {
                if (isPointInside(target, point)) {
                    const info = getHardInsertInfo(point);
                    const moved = JigsawPuzzleHandler.moveWordToTarget(
                        PuzzleEngine,
                        data.index,
                        info.index,
                        info.group
                    );
                    if (moved) rerender();
                    else console.warn("Word Jigsaw: hard drop rejected", {
                        sourceIndex: data.index,
                        group: info.group,
                        index: info.index,
                        target: PuzzleEngine.puzzle.targetWords
                    });
                }
            } else if (data.fromZone === "target") {
                if (isPointInside(source, point)) {
                    if (JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, data.index)) rerender();
                } else if (isPointInside(target, point)) {
                    reorderTargetFromPoint(point, data.index);
                }
            }

            clearDrag();
        }

        function pointerDown(event, button, zone, index) {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            activeButton = button;
            activePointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            dragging = false;
            dragData = { fromZone: zone, index: Number(index) };
            if (event.pointerType === "mouse" && event.preventDefault) event.preventDefault();
            // Do NOT use pointer capture here.
            // The answer box must receive the real pointer trajectory while the
            // word is dragged from the source. Document-level pointer listeners
            // handle the drag globally.
        }

        function pointerMove(event) {
            if (!dragData || activePointerId !== event.pointerId || !activeButton) return;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (!dragging && Math.hypot(dx, dy) < 6) return;

            dragging = true;
            activeButton.classList.add("is-dragging");
            if (!dragGhost) dragGhost = createGhost(activeButton);
            updateGhost(event);
            event.preventDefault();
        }

        function pointerUp(event) {
            if (!dragData || activePointerId !== event.pointerId) return;
            if (!dragging) { clearDrag(); return; }
            event.preventDefault();
            finishPointerDrag(event);
        }

        function bindButton(button, zone, index) {
            button.draggable = false;
            button.addEventListener("pointerdown", function (event) {
                pointerDown(event, button, zone, index);
            });
            button.addEventListener("pointermove", pointerMove, { passive: false });
            button.addEventListener("pointerup", pointerUp);
            button.addEventListener("pointercancel", clearDrag);
        }

        source.querySelectorAll("[data-source-index]").forEach(function (button) {
            bindButton(button, "source", button.dataset.sourceIndex);
        });
        target.querySelectorAll("[data-target-index]").forEach(function (button) {
            bindButton(button, "target", button.dataset.targetIndex);
        });

        source.addEventListener("pointermove", function (event) {
            if (dragData && dragging && dragData.fromZone === "target") {
                source.classList.add("is-drag-over");
            }
        }, { passive: false });

        target.addEventListener("pointermove", function (event) {
            if (dragData && dragging) {
                target.classList.add("is-drag-over");
                event.preventDefault();
            }
        }, { passive: false });

        document.addEventListener("pointermove", function (event) {
            if (dragData && activePointerId === event.pointerId) pointerMove(event);
        }, { passive: false });

        window.addEventListener("pointerup", function (event) {
            if (!dragData || activePointerId !== event.pointerId) return;
            if (dragging) {
                event.preventDefault();
                finishPointerDrag(event);
            } else {
                clearDrag();
            }
        }, { capture: true, passive: false });

        const check = document.getElementById("wordBuilderCheck");
        if (check) check.onclick = function () { PuzzleEngine.check(); };
        const undo = document.getElementById("wordBuilderUndo");
        if (undo) undo.onclick = function () {
            if (JigsawPuzzleHandler.undoStage2(PuzzleEngine)) rerender();
            else screen.showWordBuilderMessage("حرکت قبلی برای برگشت وجود ندارد.");
        };
        const alphabet = document.getElementById("wordBuilderAlphabet");
        if (alphabet) alphabet.onclick = function () { JigsawPuzzleHandler.alphabeticalHint(PuzzleEngine); rerender(); };
        const reset = document.getElementById("wordBuilderReset");
        if (reset) reset.onclick = function () { if (JigsawPuzzleHandler.reset(PuzzleEngine)) rerender(); };
    };

    JigsawScreen.showWordBuilderMessage = function (text) { const message = document.getElementById("wordBuilderMessage"); if (message) message.textContent = text || ""; };

    if (originalBuildResult) {
        PuzzleEngine.buildResult = function () { const result = originalBuildResult(); if (this.puzzle && this.puzzle.twoStageWordOrder && this.puzzle.hintUsed) result.score = Math.max(0, Number(result.score || 0) - 2); return result; };
    }

    console.log("Word Jigsaw Stage 2 v2.8 Ready");
})();
