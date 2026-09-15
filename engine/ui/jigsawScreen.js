// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Screen
// Version 1.4
// Memory Preview + Completion Lock
// =====================================

const JigsawScreen = {

    connected: false,
    dragIndex: null,
    selectedIndex: null,
    presentationActive: false,
    presentationTimer: null,
    presentationToken: 0,

    init: function () {
        if (typeof EventManager === "undefined") {
            console.error("Jigsaw Screen: EventManager Not Available");
            return;
        }

        if (this.connected) return;

        EventManager.on("activityReady", function (payload) {
            JigsawScreen.handleReady(payload);
        });

        EventManager.on("puzzleChanged", function (state) {
            if (state && state.type === "jigsaw") {
                if (!JigsawScreen.presentationActive) {
                    JigsawScreen.render(state);
                }
            }
        });

        EventManager.on("activityFinished", function (result) {
            JigsawScreen.cancelPresentation();

            const activity =
                typeof ActivityManager !== "undefined" &&
                typeof ActivityManager.getCurrent === "function"
                    ? ActivityManager.getCurrent()
                    : null;

            if (
                activity &&
                activity.id === (result && result.activityId) &&
                typeof PuzzleEngine !== "undefined" &&
                PuzzleEngine.puzzle &&
                PuzzleEngine.puzzle.type === "jigsaw"
            ) {
                if (typeof Screen !== "undefined" && typeof Screen.showFinish === "function") {
                    Screen.showFinish(result);
                }
            }
        });

        this.connected = true;
        console.log("Jigsaw Screen v1.4 Ready");
    },

    isFinished: function () {
        return !!(
            (typeof PuzzleEngine !== "undefined" &&
                PuzzleEngine.state &&
                PuzzleEngine.state.isFinished) ||
            (typeof JigsawPuzzle !== "undefined" &&
                JigsawPuzzle.state &&
                JigsawPuzzle.state.solved)
        );
    },

    handleReady: function (payload) {
        if (!payload) return;

        const engineName = String(payload.engineName || "").toLowerCase();
        if (engineName !== "puzzle" && engineName !== "puzzleengine") return;

        const activePuzzle =
            typeof PuzzleEngine !== "undefined"
                ? PuzzleEngine.puzzle
                : null;

        const result = payload.result;
        const resultType = result && result.type;
        const activeType = activePuzzle && activePuzzle.type;

        if (resultType !== "jigsaw" && activeType !== "jigsaw") return;

        this.selectedIndex = null;
        this.dragIndex = null;
        this.startPresentation(result || {});
    },

    getPreviewSeconds: function () {
        const puzzle = typeof PuzzleEngine !== "undefined" ? PuzzleEngine.puzzle : null;
        const difficulty = Number(puzzle && puzzle.difficulty ? puzzle.difficulty : 1);

        if (difficulty <= 1) return 5;
        if (difficulty === 2) return 4;
        if (difficulty === 3) return 3;
        return 2;
    },

    startPresentation: function (state) {
        this.cancelPresentation();

        const coreState = typeof JigsawPuzzle !== "undefined"
            ? JigsawPuzzle.getState()
            : null;

        if (!coreState || !Array.isArray(coreState.pieces)) return;

        this.presentationActive = true;
        this.selectedIndex = null;
        this.dragIndex = null;

        // First show the complete image so the learner can observe it.
        this.render(state, { preview: true });

        const previewSeconds = this.getPreviewSeconds();
        const token = ++this.presentationToken;
        let remaining = previewSeconds;

        this.showStatus(
            `تصویر را به خاطر بسپار — ${remaining} ثانیه`
        );

        this.presentationTimer = setInterval(function () {
            if (token !== JigsawScreen.presentationToken) return;

            remaining -= 1;

            if (remaining > 0) {
                JigsawScreen.showStatus(
                    `تصویر را به خاطر بسپار — ${remaining} ثانیه`
                );
                return;
            }

            clearInterval(JigsawScreen.presentationTimer);
            JigsawScreen.presentationTimer = null;
            JigsawScreen.startCountdown(token, state);
        }, 1000);
    },

    startCountdown: function (token, state) {
        let count = 3;

        const tick = function () {
            if (token !== JigsawScreen.presentationToken) return;

            JigsawScreen.showStatus(String(count));

            if (count === 0) {
                JigsawScreen.finishPresentation(state);
                return;
            }

            count -= 1;
            JigsawScreen.presentationTimer = setTimeout(tick, 700);
        };

        tick();
    },

    finishPresentation: function (state) {
        this.presentationActive = false;
        this.presentationTimer = null;
        this.selectedIndex = null;
        this.dragIndex = null;

        this.render(state, { scrambleReveal: true });
        this.showStatus("حالا تصویر را کامل کن");
    },

    cancelPresentation: function () {
        this.presentationToken += 1;
        this.presentationActive = false;

        if (this.presentationTimer !== null) {
            clearInterval(this.presentationTimer);
            clearTimeout(this.presentationTimer);
            this.presentationTimer = null;
        }
    },

    render: function (state, options) {
        const app = document.getElementById("app");
        if (!app) return;

        const puzzle = PuzzleEngine.puzzle;
        if (!puzzle || puzzle.type !== "jigsaw") return;

        const rows = Number(puzzle.rows);
        const cols = Number(puzzle.cols);
        const image = puzzle.image;
        const config = options || {};

        if (!Number.isInteger(rows) || !Number.isInteger(cols) || !image) {
            console.error("Jigsaw Screen: Invalid Puzzle State");
            return;
        }

        const coreState = typeof JigsawPuzzle !== "undefined"
            ? JigsawPuzzle.getState()
            : null;

        if (!coreState || !Array.isArray(coreState.pieces)) return;

        const pieceByPosition = {};
        coreState.pieces.forEach(function (piece) {
            const position = config.preview
                ? piece.correctIndex
                : piece.currentIndex;
            pieceByPosition[position] = piece;
        });

        let boardHTML = "";

        for (let position = 0; position < rows * cols; position += 1) {
            const piece = pieceByPosition[position];
            if (!piece) continue;

            const correctRow = Math.floor(piece.correctIndex / cols);
            const correctCol = piece.correctIndex % cols;
            const left = (correctCol * 100) / (cols - 1 || 1);
            const top = (correctRow * 100) / (rows - 1 || 1);

            boardHTML += `
                <button
                    class="jigsawPiece"
                    data-position="${position}"
                    aria-label="قطعه ${piece.correctIndex + 1}"
                    style="background-image:url('${this.escapeAttribute(image)}');background-position:${left}% ${top}%;--jigsaw-image-size:${cols * 100}% ${rows * 100}%">
                </button>
            `;
        }

        const boardClass = config.scrambleReveal
            ? "jigsawBoard jigsawScrambleReveal"
            : "jigsawBoard";

        app.innerHTML = `
            <div class="screen puzzleScreen jigsawScreen" dir="rtl">
                <div class="jigsawHeader">
                    <h1>${this.escapeHTML(puzzle.title || "پازل تصویری")}</h1>
                    <p class="jigsawObjective">${this.escapeHTML(puzzle.objective || "تصویر را کامل کن")}</p>
                    <p class="jigsawInstruction">${this.escapeHTML(puzzle.instruction || "قطعه‌ها را جابه‌جا کن تا تصویر کامل شود.")}</p>
                </div>

                <div
                    id="jigsawBoard"
                    class="${boardClass}"
                    style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)"
                    aria-label="صفحه پازل تصویری">
                    ${boardHTML}
                </div>

                <div id="jigsawStatus" class="jigsawStatus"></div>

                <div class="jigsawControls">
                    <button id="jigsawResetBtn" type="button">شروع دوباره</button>
                </div>

                <div class="jigsawMoves">
                    حرکت‌ها: <span id="puzzleMoveCount">${state.moves || 0}</span>
                </div>
            </div>
        `;

        this.bindBoard();

        if (config.preview) {
            this.showStatus("");
        }

        this.updateCorrectPieces(coreState);
    },

    bindBoard: function () {
        const board = document.getElementById("jigsawBoard");
        if (!board) return;

        const pieces = board.querySelectorAll(".jigsawPiece");

        pieces.forEach(function (piece) {
            piece.addEventListener("click", function () {
                if (JigsawScreen.presentationActive || JigsawScreen.isFinished()) return;
                const index = Number(this.dataset.position);
                JigsawScreen.handleSelection(index);
            });

            piece.addEventListener("pointerdown", function (event) {
                if (JigsawScreen.presentationActive || JigsawScreen.isFinished()) return;
                if (event.button !== undefined && event.button !== 0) return;

                JigsawScreen.dragIndex = Number(this.dataset.position);
                this.classList.add("jigsawSource");

                if (typeof this.setPointerCapture === "function") {
                    try {
                        this.setPointerCapture(event.pointerId);
                    } catch (error) {}
                }
            });

            piece.addEventListener("pointerup", function (event) {
                if (JigsawScreen.presentationActive || JigsawScreen.isFinished()) {
                    this.classList.remove("jigsawSource");
                    JigsawScreen.dragIndex = null;
                    return;
                }

                if (JigsawScreen.dragIndex === null) return;

                const source = JigsawScreen.dragIndex;
                const targetElement = document.elementFromPoint(event.clientX, event.clientY);
                const targetPiece = targetElement
                    ? targetElement.closest(".jigsawPiece")
                    : null;

                this.classList.remove("jigsawSource");
                JigsawScreen.dragIndex = null;

                if (!targetPiece) return;

                const target = Number(targetPiece.dataset.position);
                if (source !== target) JigsawScreen.swap(source, target);
            });

            piece.addEventListener("pointercancel", function () {
                this.classList.remove("jigsawSource");
                JigsawScreen.dragIndex = null;
            });
        });

        const reset = document.getElementById("jigsawResetBtn");
        if (reset) {
            reset.onclick = function () {
                if (JigsawScreen.presentationActive || JigsawScreen.isFinished()) return;

                const resetDone = JigsawPuzzleHandler.reset(PuzzleEngine);
                if (!resetDone) return;

                JigsawScreen.startPresentation(PuzzleEngine.getState());
            };
        }
    },

    handleSelection: function (index) {
        if (this.presentationActive || this.isFinished()) return;

        if (this.selectedIndex === null) {
            this.selectedIndex = index;
            this.highlightSelection(index);
            return;
        }

        if (this.selectedIndex === index) {
            this.selectedIndex = null;
            this.highlightSelection(null);
            return;
        }

        const first = this.selectedIndex;
        this.selectedIndex = null;
        this.highlightSelection(null);
        this.swap(first, index);
    },

    swap: function (from, to) {
        if (this.presentationActive || this.isFinished()) return;

        const moved = JigsawPuzzleHandler.move(PuzzleEngine, from, to);
        if (!moved) return;

        if (typeof JigsawPuzzle !== "undefined") {
            const state = JigsawPuzzle.getState();
            this.updateCorrectPieces(state);

            if (state.solved) {
                this.selectedIndex = null;
                this.dragIndex = null;
                this.highlightSelection(null);
                this.showStatus("تصویر کامل شد! 🎉");

                if (
                    typeof PuzzleEngine !== "undefined" &&
                    !PuzzleEngine.state.isFinished &&
                    typeof PuzzleEngine.finish === "function"
                ) {
                    PuzzleEngine.finish();
                }
            } else {
                this.showStatus("");
            }
        }
    },

    highlightSelection: function (index) {
        document.querySelectorAll(".jigsawPiece").forEach(function (piece) {
            piece.classList.remove("jigsawTarget");
        });

        if (index === null) return;

        const selected = document.querySelector(
            `.jigsawPiece[data-position="${index}"]`
        );

        if (selected) selected.classList.add("jigsawTarget");
    },

    updateCorrectPieces: function (state) {
        if (!state || !Array.isArray(state.pieces)) return;

        state.pieces.forEach(function (piece) {
            const element = document.querySelector(
                `.jigsawPiece[data-position="${piece.currentIndex}"]`
            );

            if (!element) return;

            element.classList.toggle(
                "jigsawCorrect",
                piece.currentIndex === piece.correctIndex
            );
        });

        const count = document.getElementById("puzzleMoveCount");
        if (count) count.textContent = String(state.moves || 0);
    },

    showStatus: function (message) {
        const status = document.getElementById("jigsawStatus");
        if (status) status.textContent = message || "";
    },

    escapeHTML: function (value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    escapeAttribute: function (value) {
        return this.escapeHTML(value);
    }
};

window.JigsawScreen = JigsawScreen;
JigsawScreen.init();
