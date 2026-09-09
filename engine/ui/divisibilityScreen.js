// =====================================
// Tahouri Edu Platform
// Version 2.4
// Divisibility Group Screen
// =====================================

const DivisibilityScreen = {
    show: function (gradeId, subjectId, chapterId) {
        const app = document.getElementById("app");
        if (!app) {
            console.error("Divisibility Screen: App Container Not Found");
            return;
        }

        const divisibilityActivities = activities.filter(function (activity) {
            return activity.grade === gradeId &&
                activity.subject === subjectId &&
                activity.chapter === chapterId &&
                activity.group === "divisibility";
        });

        const childrenHTML = divisibilityActivities.map(function (activity) {
            const locked = typeof ContentLockManager !== "undefined"
                ? ContentLockManager.isLocked(activity.id)
                : false;

            // Activity titles use Persian digits (۲، ۳، ۵، ...), while the
            // old expression only matched ASCII digits (0-9). As a result
            // the icon fell back to "?" for every divisibility activity.
            const numberMatch = String(activity.title || "").match(/[0-9۰-۹]+/);
            const icon = locked ? "🔒" : (numberMatch ? numberMatch[0] : "؟");

            return `
                <button class="activityBtn divisibilityChildBtn"
                        data-id="${activity.id}"
                        ${locked ? "disabled" : ""}>
                    <span class="divisibilityChildIcon" aria-hidden="true">${icon}</span>
                    <span>${activity.title}</span>
                </button>
            `;
        }).join("");

        app.innerHTML = `
            <div class="screen divisibilityScreen" dir="rtl">
                <h1>بخش‌پذیری</h1>
                <p>انتخاب قانون بخش‌پذیری</p>
                <div id="divisibilityActivitiesContainer">
                    ${childrenHTML}
                </div>
                <button id="backToActivitiesBtn" type="button" class="legacyDivisibilityBack">
                    ← بازگشت به فعالیت‌ها
                </button>
            </div>
        `;

        this.bindActivityButtons(divisibilityActivities);

        const backButton = document.getElementById("backToActivitiesBtn");
        if (backButton) {
            backButton.onclick = function () {
                Screen.showActivities(gradeId, subjectId, chapterId);
            };
        }

        console.log("Divisibility Screen Displayed:", divisibilityActivities.length);
    },

    bindActivityButtons: function (activityList) {
        document.querySelectorAll(".divisibilityChildBtn").forEach(function (btn) {
            btn.onclick = function () {
                const activityId = this.dataset.id;
                const activity = activityList.find(function (item) {
                    return item.id === activityId;
                });
                if (!activity) {
                    console.error("Divisibility Activity Not Found:", activityId);
                    return;
                }

                if (typeof ContentLockManager !== "undefined" &&
                    !ContentLockManager.canOpen(activityId)) {
                    alert("این فعالیت هنوز قفل است.");
                    return;
                }

                if (typeof Navigation !== "undefined") {
                    Navigation.selectActivity(activityId);
                }

                if (typeof DifficultyModal !== "undefined" &&
                    typeof DifficultyModal.open === "function") {
                    DifficultyModal.open(activity, function (selectedActivity) {
                        if (typeof App !== "undefined" && typeof App.startActivity === "function") {
                            App.startActivity(selectedActivity);
                        } else {
                            console.error("Activity Entry System Not Available");
                        }
                    });
                    return;
                }

                if (typeof App !== "undefined" && typeof App.startActivity === "function") {
                    App.startActivity(activity);
                } else {
                    console.error("Activity Entry System Not Available");
                }
            };
        });
    }
};

window.DivisibilityScreen = DivisibilityScreen;

Screen.showDivisibility = function (gradeId, subjectId, chapterId) {
    if (typeof DivisibilityScreen !== "undefined") {
        DivisibilityScreen.show(gradeId, subjectId, chapterId);
    } else {
        console.error("DivisibilityScreen Not Available");
    }
};

console.log("Divisibility Screen v2.4 Ready");
