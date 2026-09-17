// =====================================
// Tahouri Edu Platform
// Setayesh Jigsaw Poetry Layout
// =====================================

(function () {
    "use strict";

    if (typeof JigsawScreen === "undefined") return;

    const originalRenderWordBuilder = JigsawScreen.renderWordBuilder.bind(JigsawScreen);

    function getRowInsertIndex(row, event, direction) {
        const pieces = [...row.querySelectorAll("[data-target-index]")];
        if (!pieces.length) {
            const all = [...document.querySelectorAll("#wordBuilderTarget [data-target-index]")];
            return all.length;
        }

        let nearest = null;
        let nearestDistance = Infinity;
        pieces.forEach(function (piece) {
            const rect = piece.getBoundingClientRect();
            const dx = event.clientX - (rect.left + rect.width / 2);
            const dy = event.clientY - (rect.top + rect.height / 2);
            const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
            const distance = inside ? 0 : (dx * dx + dy * dy);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = { piece: piece, rect: rect };
            }
        });

        const all = [...document.querySelectorAll("#wordBuilderTarget [data-target-index]")];
        const nearestGlobal = all.indexOf(nearest.piece);
        const center = nearest.rect.left + nearest.rect.width / 2;
        if (direction === "rtl") {
            return event.clientX > center ? nearestGlobal : nearestGlobal + 1;
        }
        return event.clientX < center ? nearestGlobal : nearestGlobal + 1;
    }

    function getRowForPoint(target, event, firstLineLength) {
        const rows = [...target.querySelectorAll(".wordBuilderPoetryLine")];
        if (!rows.length) return null;

        for (const row of rows) {
            const rect = row.getBoundingClientRect();
            if (event.clientY >= rect.top && event.clientY <= rect.bottom) return row;
        }

        const first = rows[0].getBoundingClientRect();
        return event.clientY < first.top ? rows[0] : rows[rows.length - 1];
    }

    function installInsertionDrag(target, source, engine) {
        if (!target || !source || !engine || !engine.puzzle || engine.puzzle.twoStageWordOrder !== true) return;

        let dragData = null;

        target.querySelectorAll("[data-target-index]").forEach(function (piece) {
            piece.addEventListener("dragstart", function () {
                dragData = { zone: "target", index: Number(piece.dataset.targetIndex) };
            }, true);
        });

        source.querySelectorAll("[data-source-index]").forEach(function (piece) {
            piece.addEventListener("dragstart", function () {
                dragData = { zone: "source", index: Number(piece.dataset.sourceIndex) };
            }, true);
        });

        target.addEventListener("dragover", function (event) {
            if (!dragData) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        }, true);

        target.addEventListener("drop", function (event) {
            if (!dragData) return;
            event.preventDefault();
            event.stopImmediatePropagation();

            const firstLineLength = Number(engine.puzzle.firstLineLength || 0);
            const row = getRowForPoint(target, event, firstLineLength);
            const direction = getComputedStyle(target).direction || "rtl";
            let insertAt = getRowInsertIndex(row, event, direction);

            // A poetry row is a hard boundary. Never allow a word dropped on
            // the second hemistich to be inserted into the first one.
            if (row && row.classList.contains("wordBuilderPoetryLineSecond")) {
                insertAt = Math.max(firstLineLength, insertAt);
            } else if (row && row.classList.contains("wordBuilderPoetryLineFirst")) {
                insertAt = Math.min(firstLineLength, insertAt);
            }

            if (dragData.zone === "source") {
                if (JigsawPuzzleHandler.moveWordToTarget(engine, dragData.index, insertAt)) {
                    JigsawScreen.render(engine.getState());
                }
            } else if (dragData.zone === "target") {
                let toIndex = insertAt;
                if (toIndex > dragData.index) toIndex--;
                if (toIndex !== dragData.index && JigsawPuzzleHandler.reorderTarget(engine, dragData.index, toIndex)) {
                    JigsawScreen.render(engine.getState());
                }
            }
            dragData = null;
        }, true);
    }

    function applyPoetryRows(target, firstLineLength) {
        const pieces = [...target.querySelectorAll("[data-target-index]")];
        if (!pieces.length || !Number.isInteger(firstLineLength) || firstLineLength <= 0) return;

        const firstRow = document.createElement("div");
        const secondRow = document.createElement("div");
        firstRow.className = "wordBuilderPoetryLine wordBuilderPoetryLineFirst";
        secondRow.className = "wordBuilderPoetryLine wordBuilderPoetryLineSecond";

        [firstRow, secondRow].forEach(function (row) {
            row.style.width = "100%";
            row.style.display = "flex";
            row.style.flexWrap = "wrap";
            row.style.justifyContent = "center";
            row.style.alignItems = "center";
            row.style.gap = "10px";
            row.style.minHeight = "54px";
            row.style.boxSizing = "border-box";
            row.style.border = "2px dashed rgba(120,120,120,.45)";
            row.style.borderRadius = "10px";
            row.style.padding = "8px";
            row.style.marginBottom = "8px";
        });

        pieces.forEach(function (piece, index) {
            if (index < firstLineLength) firstRow.appendChild(piece);
            else secondRow.appendChild(piece);
        });

        target.appendChild(firstRow);
        target.appendChild(secondRow);
    }

    function applyPunctuation(target, punctuation) {
        const pieces = [...target.querySelectorAll("[data-target-index]")];
        pieces.forEach(function (piece) {
            const index = String(piece.dataset.targetIndex);
            const mark = punctuation && punctuation[index] ? String(punctuation[index]) : "";
            piece.querySelectorAll(".wordBuilderPunctuation").forEach(function (node) { node.remove(); });
            if (!mark) return;
            const span = document.createElement("span");
            span.className = "wordBuilderPunctuation";
            span.textContent = mark;
            span.setAttribute("aria-hidden", "true");
            piece.appendChild(span);
        });
    }

    JigsawScreen.renderWordBuilder = function (state) {
        originalRenderWordBuilder(state);

        const target = document.getElementById("wordBuilderTarget");
        const source = document.getElementById("wordBuilderSource");
        const engine = typeof PuzzleEngine !== "undefined" ? PuzzleEngine : null;
        const puzzle = engine && engine.puzzle ? engine.puzzle : null;
        if (!target || !source || !puzzle || puzzle.twoStageWordOrder !== true) return;

        const firstLineLength = Number(puzzle.firstLineLength || 0);
        if (Number.isInteger(firstLineLength) && firstLineLength > 0) {
            applyPoetryRows(target, firstLineLength);
        }

        applyPunctuation(target, puzzle.punctuation || {});
        installInsertionDrag(target, source, engine);
    };

    console.log("Setayesh Jigsaw Poetry Layout v2.0 Ready");
})();
