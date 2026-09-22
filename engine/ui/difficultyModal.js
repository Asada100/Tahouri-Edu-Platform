// =====================================
// Tahouri Edu Platform
// Difficulty Modal v1.3
// Image and Word Jigsaw use isolated difficulty models.
// =====================================

const DifficultyModal = {
    isOpen: false,
    escapeHandler: null,

    init: function () {
        console.log("Difficulty Modal Ready");
    },

    open: function (activityData, onSelect) {
        if (!activityData) return;

        const puzzle = activityData.puzzle || {};
        const mode = activityData.jigsawMode ||
            (puzzle.image ? "image" :
                ((puzzle.content && Array.isArray(puzzle.content.words)) || Array.isArray(puzzle.words) ? "words" : null));

        if (String(puzzle.type || "").toLowerCase() !== "jigsaw" || !mode) {
            if (typeof onSelect === "function") onSelect(activityData);
            return;
        }

        if (this.isOpen) return;
        this.isOpen = true;

        const isWord = mode === "words";
        const options = isWord
            ? '<button class="difficultyOption" data-difficulty="easy" type="button">🟢 ساده <small>۴ کلمه تصادفی</small></button>' +
              '<button class="difficultyOption" data-difficulty="medium" type="button">🟡 متوسط <small>۸ کلمه تصادفی</small></button>' +
              '<button class="difficultyOption" data-difficulty="hard" type="button">🔴 سخت <small>همه کلمات تصادفی</small></button>'
            : '<button class="difficultyOption" data-difficulty="easy" type="button">🟢 ساده <small>۳×۳</small></button>' +
              '<button class="difficultyOption" data-difficulty="medium" type="button">🟡 متوسط <small>۳×۴ / ۴×۳ / ۴×۴</small></button>' +
              '<button class="difficultyOption" data-difficulty="hard" type="button">🔴 سخت <small>۴×۵ / ۵×۴ / ۵×۵</small></button>';

        const overlay = document.createElement("div");
        overlay.id = "difficultyModalOverlay";
        overlay.innerHTML = '<div class="difficultyModal" role="dialog" aria-modal="true">' +
            '<h2>انتخاب سطح سؤال</h2><p>' + (activityData.title || "") + '</p>' +
            '<div class="difficultyOptions">' + options + '</div>' +
            '<button id="difficultyCancelBtn" type="button">انصراف</button></div>';
        document.body.appendChild(overlay);

        overlay.querySelectorAll(".difficultyOption").forEach(function (button) {
            button.onclick = async function () {
                const difficulty = this.dataset.difficulty;
                const selectedActivity = {
                    ...activityData,
                    settings: { ...(activityData.settings || {}), difficulty: difficulty, jigsawLevelSelected: true }
                };

                if (isWord) {
                    selectedActivity.settings.wordJigsawDifficulty =
                        difficulty === "hard" ? 3 : difficulty === "medium" ? 2 : 1;
                    DifficultyModal.close();
                    if (typeof onSelect === "function") onSelect(selectedActivity);
                    return;
                }

                selectedActivity.settings.jigsawRows = difficulty === "hard" ? 5 : difficulty === "medium" ? 4 : 3;
                selectedActivity.settings.jigsawCols = difficulty === "hard" ? 5 : difficulty === "medium" ? 4 : 3;

                if (activityData.path && typeof DataManager !== "undefined" && typeof DataManager.loadJSON === "function") {
                    try {
                        const config = await DataManager.loadJSON(activityData.path + "/activity.json");
                        const configPuzzle = config && config.puzzle ? config.puzzle : null;
                        if (configPuzzle && configPuzzle.image) {
                            const image = new Image();
                            image.onload = function () {
                                const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
                                const orientation = ratio > 1.08 ? "landscape" : (ratio < 0.92 ? "portrait" : "square");
                                let rows = 3, cols = 3;
                                if (difficulty === "medium") {
                                    if (orientation === "landscape") { rows = 3; cols = 4; }
                                    else if (orientation === "portrait") { rows = 4; cols = 3; }
                                    else { rows = 4; cols = 4; }
                                } else if (difficulty === "hard") {
                                    if (orientation === "landscape") { rows = 4; cols = 5; }
                                    else if (orientation === "portrait") { rows = 5; cols = 4; }
                                    else { rows = 5; cols = 5; }
                                }
                                selectedActivity.settings.jigsawRows = rows;
                                selectedActivity.settings.jigsawCols = cols;
                                DifficultyModal.close();
                                if (typeof onSelect === "function") onSelect(selectedActivity);
                            };
                            image.onerror = function () {
                                DifficultyModal.close();
                                if (typeof onSelect === "function") onSelect(selectedActivity);
                            };
                            image.src = configPuzzle.image;
                            return;
                        }
                    } catch (error) {
                        console.warn("Difficulty Modal: Could not inspect Jigsaw image orientation.", error);
                    }
                }

                DifficultyModal.close();
                if (typeof onSelect === "function") onSelect(selectedActivity);
            };
        });

        const cancelBtn = overlay.querySelector("#difficultyCancelBtn");
        if (cancelBtn) cancelBtn.onclick = function () { DifficultyModal.close(); };
        overlay.onclick = function (event) { if (event.target === overlay) DifficultyModal.close(); };
        this.escapeHandler = function (event) { if (event.key === "Escape") DifficultyModal.close(); };
        document.addEventListener("keydown", this.escapeHandler);
    },

    close: function () {
        const overlay = document.getElementById("difficultyModalOverlay");
        if (overlay) overlay.remove();
        if (this.escapeHandler) {
            document.removeEventListener("keydown", this.escapeHandler);
            this.escapeHandler = null;
        }
        this.isOpen = false;
    }
};

window.DifficultyModal = DifficultyModal;
DifficultyModal.init();
