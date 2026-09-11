// =====================================
// Tahouri Edu Platform
// Version 3.5
// Activity Screen
// =====================================

const ActivityScreen = {

    show: function (activityList) {
        const app = document.getElementById("app");

        if (!app) {
            console.error("Activity Screen: App Container Not Found");
            return;
        }

        if (!Array.isArray(activityList)) {
            console.error("Activity Screen: Invalid Activity List");
            return;
        }

        const groupedActivities = {};
        const normalActivities = [];

        activityList.forEach(function (activity) {
            if (activity.group) {
                if (!groupedActivities[activity.group]) {
                    groupedActivities[activity.group] = [];
                }
                groupedActivities[activity.group].push(activity);
            } else {
                normalActivities.push(activity);
            }
        });

        let activitiesHTML = "";

        normalActivities.forEach(function (activity) {
            const locked = typeof ContentLockManager !== "undefined"
                ? ContentLockManager.isLocked(activity.id)
                : false;

            activitiesHTML += `
                <button
                    class="activitySelectBtn"
                    data-id="${activity.id}"
                    type="button">
                    ${locked ? "🔒" : ""}
                    ${activity.title}
                </button>
            `;
        });

        Object.keys(groupedActivities).forEach(function (groupId) {
            const groupActivities = groupedActivities[groupId];
            let groupLocked = true;

            groupActivities.forEach(function (activity) {
                if (typeof ContentLockManager === "undefined" ||
                    ContentLockManager.canOpen(activity.id)) {
                    groupLocked = false;
                }
            });

            const groupTitle = ActivityScreen.getGroupTitle(groupId);

            activitiesHTML += `
                <button
                    class="activityGroupBtn"
                    data-group="${groupId}"
                    type="button">
                    ${groupLocked ? "🔒" : ""}
                    ${groupTitle}
                </button>
            `;
        });

        if (activitiesHTML === "") {
            activitiesHTML = `
                <p class="activityEmptyMessage">
                    فعالیتی برای این فصل وجود ندارد.
                </p>
            `;
        }

        app.innerHTML = `
            <div class="screen activityScreen" dir="rtl">
                <h1>انتخاب فعالیت</h1>
                <div id="activityList" class="activityList">
                    ${activitiesHTML}
                </div>
                <br>
                <button id="backChaptersBtn">
                    ⬅ بازگشت به فصل‌ها
                </button>
            </div>
        `;

        this.bindActivityButtons(normalActivities);
        this.bindGroupButtons(groupedActivities);

        const backButton = document.getElementById("backChaptersBtn");

        if (backButton) {
            backButton.onclick = function () {
                if (typeof Screen !== "undefined" && typeof Screen.showChapters === "function") {
                    const gradeId = AppState.grade;
                    const subjectId = AppState.subject;
                    Screen.showChapters(gradeId, subjectId);
                    return;
                }

                console.error("Activity Screen: Back To Chapters Not Available");
            };
        }

        console.log("Activity Screen Displayed:", activityList.length);
    },

    bindActivityButtons: function (activityList) {
        document.querySelectorAll(".activitySelectBtn").forEach(function (button) {
            button.onclick = function () {
                const id = this.dataset.id;
                const activity = activityList.find(function (item) {
                    return item.id === id;
                });

                if (!activity) {
                    console.error("Activity Screen: Activity Not Found:", id);
                    return;
                }

                if (typeof ContentLockManager !== "undefined" &&
                    !ContentLockManager.canOpen(id)) {
                    alert("🔒 این فعالیت هنوز قفل است.\n\nبرای ورود، ابتدا شرایط باز شدن آن را کامل کنید.");
                    return;
                }

                ActivityScreen.startActivity(activity);
            };
        });
    },

    bindGroupButtons: function (groupedActivities) {
        document.querySelectorAll(".activityGroupBtn").forEach(function (button) {
            button.onclick = function () {
                const groupId = this.dataset.group;
                const groupActivities = groupedActivities[groupId];

                if (!groupActivities || groupActivities.length === 0) {
                    return;
                }

                const groupLocked = groupActivities.every(function (activity) {
                    return typeof ContentLockManager !== "undefined" &&
                        !ContentLockManager.canOpen(activity.id);
                });

                if (groupLocked) {
                    alert("🔒 این بخش هنوز قفل است.\n\nبرای ورود، ابتدا حداقل ۸۰٪ امتیاز بازی قبلی را کسب کنید.");
                    return;
                }

                ActivityScreen.openGroup(groupId, groupActivities);
            };
        });
    },

    openGroup: function (groupId, activities) {
        console.log("Opening Activity Group:", groupId);

        if (groupId === "divisibility") {
            if (typeof DivisibilityScreen !== "undefined" && typeof DivisibilityScreen.show === "function") {
                const firstActivity = activities[0];
                DivisibilityScreen.show(firstActivity.grade, firstActivity.subject, firstActivity.chapter);
                return;
            }

            if (typeof Screen !== "undefined" && typeof Screen.showDivisibility === "function") {
                const firstActivity = activities[0];
                Screen.showDivisibility(firstActivity.grade, firstActivity.subject, firstActivity.chapter);
                return;
            }

            console.error("Divisibility Screen Not Available");
            return;
        }

        console.warn("Activity Group Not Supported Yet:", groupId);
    },

    getGroupTitle: function (groupId) {
        const titles = {
            divisibility: "بخش‌پذیری"
        };

        return titles[groupId] || groupId;
    },

    startActivity: function (activity) {
        if (!activity) {
            console.error("Activity Screen: Activity Missing");
            return;
        }

        if (typeof Navigation !== "undefined") {
            Navigation.selectActivity(activity.id);
        }

        if (typeof App !== "undefined" && typeof App.startActivity === "function") {
            console.log("Activity Screen: Start Activity:", activity);
            App.startActivity(activity);
            return;
        }

        console.error("Activity Screen: App.startActivity Not Available");
    }
};

window.ActivityScreen = ActivityScreen;

console.log("Activity Screen v3.5 Ready");
