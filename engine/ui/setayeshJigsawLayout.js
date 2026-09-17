// =====================================
// Tahouri Edu Platform
// Setayesh Jigsaw Poetry Layout
// =====================================

(function () {
    "use strict";

    if (typeof JigsawScreen === "undefined") return;

    const originalRenderWordBuilder = JigsawScreen.renderWordBuilder.bind(JigsawScreen);

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

        function getInsertIndex(event) {
            const pieces = [...target.querySelectorAll("[data-target-index]")];
            if (!pieces.length) return 0;

            let nearest = null;
            let nearestDistance = Infinity;
            pieces.forEach(function (piece, index) {
                const rect = piece.getBoundingClientRect();
                const dx = event.clientX - (rect.left + rect.width / 2);
                const dy = event.clientY - (rect.top + rect.height / 2);
                const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
                const distance = inside ? 0 : (dx * dx + dy * dy);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = { index: index, rect: rect };
                }
            });

            const direction = getComputedStyle(target).direction || "ltr";
            const center = nearest.rect.left + nearest.rect.width / 2;
            if (direction === "rtl") {
                return event.clientX > center ? nearest.index : nearest.index + 1;
            }
            return event.clientX < center ? nearest.index : nearest.index + 1;
        }

        target.addEventListener("dragover", function (event) {
            if (!dragData) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        }, true);

        target.addEventListener("drop", function (event) {
            if (!dragData) return;
            event.preventDefault();
            event.stopImmediatePropagation();

            if (dragData.zone === "source") {
                const insertAt = getInsertIndex(event);
                if (JigsawPuzzleHandler.moveWordToTarget(engine, dragData.index, insertAt)) {
                    JigsawScreen.render(engine.getState());
                }
            } else if (dragData.zone === "target") {
                const insertAt = getInsertIndex(event);
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

        firstRow.style.width = "100%";
        secondRow.style.width = "100%";
        firstRow.style.display = "flex";
        secondRow.style.display = "flex";
        firstRow.style.flexWrap = "wrap";
        secondRow.style.flexWrap = "wrap";
        firstRow.style.justifyContent = "center";
        secondRow.style.justifyContent = "center";
        firstRow.style.alignItems = "center";
        secondRow.style.alignItems = "center";
        firstRow.style.gap = "10px";
        secondRow.style.gap = "10px";

        pieces.forEach(function (piece, index) {
            if (index < firstLineLength) firstRow.appendChild(piece);
            else secondRow.appendChild(piece);
        });

        target.appendChild(firstRow);
        if (secondRow.children.length) target.appendChild(secondRow);
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

        installInsertionDrag(target, source, engine);
    };

    console.log("Setayesh Jigsaw Poetry Layout Ready");
})();
