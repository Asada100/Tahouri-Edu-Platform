// =====================================
// Tahouri Edu Platform
// Learning Cards Image Adapter v1.0
//
// Responsibilities:
// - Add prepared subject/chapter images to existing buttons
// - Derive image names from grade + subject + chapter
// - Keep existing button/navigation behavior untouched
// - Support jpg/png/webp/jpeg assets
//
// No navigation logic
// No data mutation
// =====================================

const LearningCards = {

    getGradeNumber: function (gradeId) {
        const match = String(gradeId || "").match(/(\d+)$/);
        return match ? match[1] : null;
    },

    getSubjectPrefix: function (subjectId) {
        const prefixes = {
            math: "math",
            persian: "farsi",
            science: "Sciences"
        };

        return prefixes[subjectId] || null;
    },

    getImageKey: function (button, type) {
        const gradeId =
            typeof Screen !== "undefined" &&
            typeof Screen.getProfileGrade === "function"
                ? Screen.getProfileGrade()
                : null;

        const gradeNumber =
            this.getGradeNumber(gradeId);

        if (!gradeNumber) {
            return null;
        }

        if (type === "subject") {
            const subjectPrefix =
                this.getSubjectPrefix(button.dataset.id);

            return subjectPrefix
                ? `${subjectPrefix}${gradeNumber}`
                : null;
        }

        if (type === "chapter") {
            const subjectId =
                typeof AppState !== "undefined"
                    ? AppState.subject
                    : null;

            const subjectPrefix =
                this.getSubjectPrefix(subjectId);

            const chapterMatch =
                String(button.dataset.id || "").match(/(\d+)$/);

            if (!subjectPrefix || !chapterMatch) {
                return null;
            }

            return `${subjectPrefix}${gradeNumber}s${chapterMatch[1]}`;
        }

        return null;
    },

    addImage: function (button, type) {
        if (!button || button.dataset.learningCardReady === "true") {
            return;
        }

        const imageKey =
            this.getImageKey(button, type);

        if (!imageKey) {
            return;
        }

        const title =
            button.textContent.trim();

        button.textContent = "";
        button.dataset.imageKey = imageKey;
        button.dataset.learningCardReady = "true";
        button.classList.add("learning-image-card");

        const media =
            document.createElement("span");

        media.className = "learning-card-media";
        media.setAttribute("aria-hidden", "true");

        const image =
            document.createElement("img");

        image.className = "learning-card-image";
        image.alt = "";
        image.loading = "lazy";

        const extensions = ["jpg", "png", "webp", "jpeg"];
        let extensionIndex = 0;

        image.src =
            `assets/images/${imageKey}.${extensions[extensionIndex]}`;

        image.onerror = function () {
            extensionIndex += 1;

            if (extensionIndex < extensions.length) {
                image.src =
                    `assets/images/${imageKey}.${extensions[extensionIndex]}`;
                return;
            }

            media.classList.add("is-empty");
        };

        media.appendChild(image);

        const label =
            document.createElement("span");

        label.className = "learning-card-label";
        label.textContent = title;

        button.appendChild(media);
        button.appendChild(label);
    },

    enhance: function () {
        document
            .querySelectorAll("#subjectsContainer .subjectBtn")
            .forEach((button) => {
                this.addImage(button, "subject");
            });

        document
            .querySelectorAll("#chaptersContainer .chapterBtn")
            .forEach((button) => {
                this.addImage(button, "chapter");
            });
    },

    start: function () {
        this.enhance();

        const app =
            document.getElementById("app");

        if (!app) {
            return;
        }

        const observer =
            new MutationObserver(() => {
                this.enhance();
            });

        observer.observe(app, {
            childList: true,
            subtree: true
        });

        console.log(
            "Learning Cards Image Adapter v1.0 Ready"
        );
    }
};

window.LearningCards = LearningCards;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        LearningCards.start();
    }, { once: true });
} else {
    LearningCards.start();
}
