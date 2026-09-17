// =====================================
// Tahouri Edu Platform
// Setayesh Jigsaw Poetry Layout
// =====================================

(function () {
    "use strict";

    if (typeof JigsawScreen === "undefined") return;

    const originalRenderWordBuilder = JigsawScreen.renderWordBuilder.bind(JigsawScreen);

    JigsawScreen.renderWordBuilder = function (state) {
        originalRenderWordBuilder(state);

        const target = document.getElementById("wordBuilderTarget");
        const engine = typeof PuzzleEngine !== "undefined" ? PuzzleEngine : null;
        const puzzle = engine && engine.puzzle ? engine.puzzle : null;
        if (!target || !puzzle || puzzle.twoStageWordOrder !== true) return;

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
