// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Screen
// Version 2.0
// Image jigsaw + attractive word/sentence jigsaw
// =====================================

const JigsawScreen = {
    connected: false,
    dragIndex: null,
    dragElement: null,
    dragStartX: 0,
    dragStartY: 0,
    dragMoved: false,
    selectedIndex: null,
    suppressClick: false,
    dragTargetIndex: null,

    init: function () {
        if (typeof EventManager === "undefined" || this.connected) return;
        EventManager.on("activityReady", function (payload) { JigsawScreen.handleReady(payload); });
        EventManager.on("puzzleChanged", function (state) {
            if (state && state.type === "jigsaw" && !(PuzzleEngine.state && PuzzleEngine.state.isFinished)) JigsawScreen.render(state);
        });
        EventManager.on("activityFinished", function () { JigsawScreen.clearDrag(); });
        this.connected = true;
        console.log("Jigsaw Screen v2.0 Ready");
    },

    handleReady: function (payload) {
        if (!payload) return;
        const engineName = String(payload.engineName || "").toLowerCase();
        if (engineName !== "puzzle" && engineName !== "puzzleengine") return;
        const active = typeof PuzzleEngine !== "undefined" ? PuzzleEngine.puzzle : null;
        if ((payload.result && payload.result.type) !== "jigsaw" && (!active || active.type !== "jigsaw")) return;
        this.selectedIndex = null;
        this.render(payload.result || PuzzleEngine.getState());
    },

    // Compatibility entry point used by ActivitySessionManager when restoring
    // a puzzle session. Jigsaw owns its own renderer, but restore historically
    // called the generic PuzzleScreen.show() method.
    show: function (state) {
        return this.render(state);
    },

    render: function (state) {
        const app = document.getElementById("app");
        const puzzle = typeof PuzzleEngine !== "undefined" ? PuzzleEngine.puzzle : null;
        if (!app || !puzzle || puzzle.type !== "jigsaw") return;
        const core = typeof JigsawPuzzle !== "undefined" ? JigsawPuzzle.getState() : null;
        if (!core) return;
        if (core.mode === "words") this.renderWords(app, puzzle, core, state || {});
        else this.renderImage(app, puzzle, core, state || {});
    },

    renderWords: function (app, puzzle, core, state) {
        const slots = [];
        for (let position = 0; position < core.pieceCount; position += 1) {
            const piece = core.pieces.find(function (item) { return item.currentIndex === position; });
            if (!piece) continue;
            const correct = JigsawPuzzle.normalizeWord(piece.word) === JigsawPuzzle.normalizeWord(core.words[position]);
            slots.push(`
                <button class="wordJigsawPiece${correct ? " isCorrect" : ""}${this.selectedIndex === position ? " isSelected" : ""}" data-position="${position}" type="button" aria-label="واژه ${position + 1}">
                    <span class="wordJigsawIndex">${position + 1}</span>
                    <span class="wordJigsawText">${this.escapeHTML(piece.word)}</span>
                </button>`);
        }

        app.innerHTML = `
            <div class="screen puzzleScreen jigsawScreen wordJigsawScreen" dir="rtl">
                <div class="jigsawHeader wordJigsawHeader">
                    <div class="wordJigsawBadge">جورچین واژه‌ها</div>
                    <h1>${this.escapeHTML(puzzle.title || "جمله را کامل کن")}</h1>
                    <p class="jigsawObjective">${this.escapeHTML(puzzle.objective || "واژه‌ها را در جای درست قرار بده")}</p>
                    <p class="jigsawInstruction">${this.escapeHTML(puzzle.instruction || "هر کارت را بکش و در جای مناسب رها کن.")}</p>
                </div>

                <div class="wordJigsawBoard" id="jigsawBoard" aria-label="جورچین واژه‌ها">
                    ${slots.join("")}
                </div>

                <div class="wordJigsawHint" id="jigsawStatus">واژه‌ها را جابه‌جا کن تا جمله کامل شود.</div>

                <div class="jigsawControls">
                    <button id="jigsawResetBtn" type="button">شروع دوباره</button>
                </div>

                <div class="jigsawMoves">حرکت‌ها: <span id="puzzleMoveCount">${state.moves || core.moves || 0}</span></div>
            </div>`;

        this.bindWordBoard();
    },

    bindWordBoard: function () {
        const board = document.getElementById("jigsawBoard");
        if (!board) return;
        const pieces = board.querySelectorAll(".wordJigsawPiece");
        const screen = this;

        pieces.forEach(function (piece) {
            piece.addEventListener("click", function () {
                if (screen.dragMoved || screen.isFinished()) { screen.dragMoved = false; return; }
                const index = Number(piece.dataset.position);
                if (screen.selectedIndex === null) {
                    screen.selectedIndex = index;
                    screen.render(PuzzleEngine.getState());
                    screen.showStatus("حالا کارت مقصد را انتخاب کن.");
                } else if (screen.selectedIndex === index) {
                    screen.selectedIndex = null;
                    screen.render(PuzzleEngine.getState());
                } else {
                    screen.swap(screen.selectedIndex, index);
                    screen.selectedIndex = null;
                }
            });

            piece.addEventListener("pointerdown", function (event) {
                if (screen.isFinished() || (event.button !== undefined && event.button !== 0)) return;
                screen.dragIndex = Number(piece.dataset.position);
                screen.dragElement = piece;
                screen.dragStartX = event.clientX;
                screen.dragStartY = event.clientY;
                screen.dragMoved = false;
                piece.classList.add("isDragging");
                if (piece.setPointerCapture) { try { piece.setPointerCapture(event.pointerId); } catch (e) {} }
            });

            piece.addEventListener("pointermove", function (event) {
                if (screen.dragElement !== piece || screen.dragIndex === null) return;
                const dx = event.clientX - screen.dragStartX;
                const dy = event.clientY - screen.dragStartY;
                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) screen.dragMoved = true;
                piece.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${Math.max(-2, Math.min(2, dx / 40))}deg)`;
            });

            piece.addEventListener("pointerup", function (event) {
                if (screen.dragIndex === null) return;
                const source = screen.dragIndex;
                const moved = screen.dragMoved;
                piece.style.pointerEvents = "none";
                const targetEl = document.elementFromPoint(event.clientX, event.clientY);
                const targetPiece = targetEl ? targetEl.closest(".wordJigsawPiece") : null;
                screen.clearDrag();
                if (!moved || !targetPiece) return;
                const target = Number(targetPiece.dataset.position);
                if (source !== target) screen.swap(source, target);
            });

            piece.addEventListener("pointercancel", function () { screen.clearDrag(); });
        });

        const reset = document.getElementById("jigsawResetBtn");
        if (reset) reset.onclick = function () {
            if (screen.isFinished()) return;
            if (JigsawPuzzleHandler.reset(PuzzleEngine)) screen.render(PuzzleEngine.getState());
        };
    },

    renderImage: function (app, puzzle, core, state) {
        const rows = Number(puzzle.rows), cols = Number(puzzle.cols), image = puzzle.image;
        if (!Number.isInteger(rows) || !Number.isInteger(cols) || !image) return;
        const pieces = [];
        for (let position = 0; position < core.pieceCount; position += 1) {
            const piece = core.pieces.find(function (item) { return item.currentIndex === position; });
            if (!piece) continue;
            const row = Math.floor(piece.correctIndex / cols), col = piece.correctIndex % cols;
            pieces.push(`<button class="jigsawPiece" data-position="${position}" aria-label="قطعه ${piece.correctIndex + 1}" style="background-image:url('${this.escapeAttribute(image)}');background-position:${(col * 100) / (cols - 1 || 1)}% ${(row * 100) / (rows - 1 || 1)}%;--jigsaw-image-size:${cols * 100}% ${rows * 100}%"></button>`);
        }
        app.innerHTML = `<div class="screen puzzleScreen jigsawScreen" dir="rtl"><div class="jigsawHeader"><h1>${this.escapeHTML(puzzle.title || "پازل تصویری")}</h1><p class="jigsawObjective">${this.escapeHTML(puzzle.objective || "تصویر را کامل کن")}</p><p class="jigsawInstruction">${this.escapeHTML(puzzle.instruction || "قطعه‌ها را جابه‌جا کن تا تصویر کامل شود.")}</p></div><div id="jigsawBoard" class="jigsawBoard" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">${pieces.join("")}</div><div id="jigsawStatus" class="jigsawStatus"></div><div class="jigsawControls"><button id="jigsawResetBtn" type="button">شروع دوباره</button></div><div class="jigsawMoves">حرکت‌ها: <span id="puzzleMoveCount">${state.moves || core.moves || 0}</span></div></div>`;
        this.bindImageBoard();
    },

    bindImageBoard: function () {
        const board = document.getElementById("jigsawBoard");
        if (!board) return;
        const screen = this;
        const puzzle = typeof PuzzleEngine !== "undefined" ? PuzzleEngine.puzzle : null;
        const rows = puzzle ? Number(puzzle.rows) : 0;
        const cols = puzzle ? Number(puzzle.cols) : 0;

        function getTargetIndex(clientX, clientY) {
            if (!rows || !cols) return null;
            const rect = board.getBoundingClientRect();
            if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
            const cellWidth = rect.width / cols;
            const cellHeight = rect.height / rows;
            const col = Math.max(0, Math.min(cols - 1, Math.floor((clientX - rect.left) / cellWidth)));
            const row = Math.max(0, Math.min(rows - 1, Math.floor((clientY - rect.top) / cellHeight)));
            return row * cols + col;
        }

        function finishPointer(event) {
            if (screen.dragElement === null || screen.dragIndex === null) return;
            const source = screen.dragIndex;
            const moved = screen.dragMoved;
            const target = moved ? getTargetIndex(event.clientX, event.clientY) : null;
            console.log("[Jigsaw][DROP]", { source, target, moved });
            screen.clearDrag();
            screen.suppressClick = moved;
            if (moved) setTimeout(function () { screen.suppressClick = false; }, 0);
            if (moved && target !== null && source !== target) screen.swap(source, target);
        }

        board.querySelectorAll(".jigsawPiece").forEach(function (piece) {
            piece.addEventListener("click", function () {
                if (screen.suppressClick) { screen.suppressClick = false; return; }
                if (screen.isFinished()) return;
                const index = Number(piece.dataset.position);
                if (screen.selectedIndex === null) screen.selectedIndex = index;
                else { screen.swap(screen.selectedIndex, index); screen.selectedIndex = null; }
            });
            piece.addEventListener("pointerdown", function (event) {
                if (screen.isFinished() || (event.button !== undefined && event.button !== 0)) return;
                screen.selectedIndex = null;
                screen.suppressClick = false;
                screen.dragIndex = Number(piece.dataset.position);
                screen.dragElement = piece;
                screen.dragStartX = event.clientX;
                screen.dragStartY = event.clientY;
                screen.dragMoved = false;
                screen.dragTargetIndex = null;
                piece.style.zIndex = "20";
                console.log("[Jigsaw][DOWN]", { source: screen.dragIndex, x: event.clientX, y: event.clientY });
            });
        });

        document.addEventListener("pointermove", function (event) {
            if (screen.dragElement === null || screen.dragIndex === null) return;
            const piece = screen.dragElement;
            const dx = event.clientX - screen.dragStartX;
            const dy = event.clientY - screen.dragStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) screen.dragMoved = true;
            piece.style.transform = `translate3d(${dx}px,${dy}px,0)`;
            if (screen.dragMoved) screen.dragTargetIndex = getTargetIndex(event.clientX, event.clientY);
        });
        document.addEventListener("pointerup", finishPointer);
        document.addEventListener("pointercancel", function () {
            if (screen.dragElement !== null) {
                console.log("[Jigsaw][CANCEL]", { source: screen.dragIndex });
                screen.clearDrag();
                screen.suppressClick = true;
                setTimeout(function () { screen.suppressClick = false; }, 0);
            }
        });

        const reset = document.getElementById("jigsawResetBtn");
        if (reset) reset.onclick = function () {
            if (!screen.isFinished() && JigsawPuzzleHandler.reset(PuzzleEngine)) screen.render(PuzzleEngine.getState());
        };
    },

    swap: function (source, target) {
        console.log("[Jigsaw][SWAP]", { source, target });
        const moved = JigsawPuzzleHandler.move(PuzzleEngine, source, target);
        console.log("[Jigsaw][SWAP_RESULT]", {
            moved: moved,
            items: PuzzleEngine && Array.isArray(PuzzleEngine.items) ? PuzzleEngine.items.slice() : [],
            moves: PuzzleEngine ? PuzzleEngine.moves : null
        });
        if (moved) {
            const solved = JigsawPuzzle.isSolved();
            this.showStatus(solved ? "آفرین! تصویر کامل شد 🎉" : "ادامه بده؛ قطعه‌ها را جابه‌جا کن.");
        }
        return moved;
    },

    showStatus: function (text) {
        const status = document.getElementById("jigsawStatus");
        if (status) status.textContent = text || "";
    },

    clearDrag: function () {
        if (this.dragElement) {
            this.dragElement.style.transform = "";
            this.dragElement.style.zIndex = "";
            this.dragElement.style.pointerEvents = "";
            this.dragElement.classList.remove("isDragging");
        }
        this.dragIndex = null;
        this.dragElement = null;
        this.dragMoved = false;
        this.dragTargetIndex = null;
    },

    isFinished: function () {
        return !!(typeof PuzzleEngine !== "undefined" && PuzzleEngine.state && PuzzleEngine.state.isFinished);
    },

    escapeHTML: function (value) {
        return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },

    escapeAttribute: function (value) { return this.escapeHTML(value); }
};

window.JigsawScreen = JigsawScreen;
JigsawScreen.init();
console.log("Jigsaw Screen v2.0 Ready");