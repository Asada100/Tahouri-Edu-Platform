// =====================================
// Tahouri Edu Platform
// Difficulty Modal v1.2
// CSS is owned by difficultyModal.css
// =====================================

const DifficultyModal = {
    isOpen: false,
    escapeHandler: null,

    init: function () {
        console.log("Difficulty Modal Ready");
    },

    open: function (activityData, onSelect) {
        if (!activityData) {
            console.error("Difficulty Modal: Activity Missing");
            return;
        }

        if (this.isOpen) return;
        this.isOpen = true;

        const overlay = document.createElement("div");
        overlay.id = "difficultyModalOverlay";
        overlay.innerHTML = `
            <div class="difficultyModal" role="dialog" aria-modal="true">
                <h2>انتخاب سطح سؤال</h2>
                <p>${activityData.title || ""}</p>
                <div class="difficultyOptions">
                    <button class="difficultyOption" data-difficulty="easy" type="button">🟢 آسان</button>
                    <button class="difficultyOption" data-difficulty="medium" type="button">🟡 معمولی</button>
                    <button class="difficultyOption" data-difficulty="hard" type="button">🔴 سخت</button>
                </div>
                <button id="difficultyCancelBtn" type="button">انصراف</button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll(".difficultyOption").forEach(function (button) {
            button.onclick = function () {
                const difficulty = this.dataset.difficulty;
                const selectedActivity = {
                    ...activityData,
                    settings: {
                        ...(activityData.settings || {}),
                        difficulty: difficulty
                    }
                };

                DifficultyModal.close();
                if (typeof onSelect === "function") onSelect(selectedActivity);
            };
        });

        const cancelBtn = overlay.querySelector("#difficultyCancelBtn");
        if (cancelBtn) cancelBtn.onclick = function () { DifficultyModal.close(); };

        overlay.onclick = function (event) {
            if (event.target === overlay) DifficultyModal.close();
        };

        this.escapeHandler = function (event) {
            if (event.key === "Escape") DifficultyModal.close();
        };
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
