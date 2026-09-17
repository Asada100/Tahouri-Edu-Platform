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
            piece.addEventListener("dragstart", function (event) {
                dragData = { zone: "target", index: Number(piece.dataset.targetIndex) };
            }, true);
        });

        source.querySelectorAll("[data-source-index]").forEach(function (piece) {
            piece.addEventListener("dragstart", function (event) {
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
                const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
                const dx = event.clientX - (rect.left + rect.width / 2);
                const dy = event.clientY - (rect.top + rect.height / 2);
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
            if (!dragData || dragData.zone !== "source") return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        }, true);

        target.addEventListener("drop", function (event) {
            if (!dragData || dragData.zone !== "source") return;
            event.preventDefault();
            event.stopImmediatePropagation();

            const insertAt = getInsertIndex(event);
            if (JigsawPuzzleHandler.moveWordToTarget(engine, dragData.index, insertAt)) {
                JigsawScreen.render(engine.getState());
            }
            dragData = null;
        }, true);

        target.addEventListener("dragover", function (event) {
            if (!dragData || dragData.zone !== "target") return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        }, true);

        target.addEventListener("drop", function (event) {
            if (!dragData || dragData.zone !== "target") return;
            event.preventDefault();
            event.stopImmediatePropagation();

            const pieces = [...target.querySelectorAll("[data-target-index]")];
            if (pieces.length) {
                const insertAt = getInsertIndex(event);
                let toIndex = insertAt;
                if (toIndex > dragData.index) toIndex--;
                if (toIndex !== dragData.index) {
                    JigsawPuzzleHandler.reorderTarget(engine, dragData.index, toIndex);
                    JigsawScreen.render(engine.getState());
                }
            }
            dragData = null;
        }, true);
    }

    JigsawScreen.renderWordBuilder = function (state) {
        originalRenderWordBuilder(state);

        const target = document.getElementById("wordBuilderTarget");
        const source = document.getElementById("wordBuilderSource");
        const engine = typeof PuzzleEngine !== "undefined" ? PuzzleEngine : null;
        const puzzle = engine && engine.puzzle ? engine.puzzle : null;
        if (!target || !source || !puzzle || puzzle.twoStageWordOrder !== true) return;

        installInsertionDrag(target, source, engine);

        const firstLineLength = Number(puzzle.firstLineLength || 0);
        if (!Number.isInteger(firstLineLength) || firstLineLength <= 0) return;

        const pieces = [...target.querySelectorAll("[data-target-index]")];
        if (pieces.length <= firstLineLength) return;

        const breakElement = document.createElement("span");
        breakElement.className = "wordBuilderHemistichBreak";
        breakElement.setAttribute("aria-hidden", "true");
        breakElement.style.flexBasis = "100%";
        breakElement.style.width = "0";
        breakElement.style.height = "0";
        breakElement.style.padding = "0";
        breakElement.style.margin = "0";
        pieces[firstLineLength - 1].insertAdjacentElement("afterend", breakElement);
    };

    console.log("Setayesh Jigsaw Poetry Layout Ready");
})();
