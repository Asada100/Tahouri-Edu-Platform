// =====================================
// Tahouri Edu Platform
// Version 3.8
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
        const displayItems = [];
        const seenGroups = {};

        // Preserve the order from data/activities.json while collapsing each
        // group into one button at the position of its first activity.
        activityList.forEach(function (activity) {
            if (activity.group) {
                if (!groupedActivities[activity.group]) {
                    groupedActivities[activity.group] = [];
                }
                groupedActivities[activity.group].push(activity);

                if (!seenGroups[activity.group]) {
                    seenGroups[activity.group] = true;
                    displayItems.push({ type: "group", id: activity.group });
                }
            } else {
                displayItems.push({ type: "activity", activity: activity });
            }
        });

        let activitiesHTML = "";

        displayItems.forEach(function (item) {
            if (item.type === "activity") {
                const activity = item.activity;
                const locked = ActivityScreen.isLocked(activity);

                activitiesHTML += `
                    <button
                        class="activitySelectBtn"
                        data-id="${activity.id}"
                        type="button">
                        ${locked ? "🔒" : ""}
                        ${activity.title}
                    </button>
                `;
                return;
            }

            const groupId = item.id;
            const groupActivities = groupedActivities[groupId] || [];
            const groupLocked = groupActivities.every(function (activity) {
                return ActivityScreen.isLocked(activity);
            });
            const groupTitle = ActivityScreen.getGroupTitle(groupId);
            const groupIcon = ActivityScreen.getGroupIcon(groupId);

            activitiesHTML += `
                <button
                    class="activityGroupBtn"
                    data-group="${groupId}"
                    type="button">
                    ${groupLocked ? "🔒" : ""}
                    <span class="activityGroupIcon" aria-hidden="true">${groupIcon}</span>
                    <span>${groupTitle}</span>
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

        this.bindActivityButtons(activityList);
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

    // =====================================
    // LOCK RESOLUTION
    // =====================================
    isLocked: function (activity) {
        if (!activity || !activity.id) {
            return true;
        }

        if (activity.locked === false) {
            return false;
        }

        if (typeof ContentLockManager === "undefined") {
            return activity.locked === true;
        }

        return ContentLockManager.isLocked(activity.id);
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

                if (ActivityScreen.isLocked(activity)) {
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
                    return ActivityScreen.isLocked(activity);
                });

                if (groupLocked) {
                    alert("🔒 این بخش هنوز قفل است.\n\nبرای ورود، ابتدا شرایط باز شدن آن را کامل کنید.");
                    return;
                }

                ActivityScreen.openGroup(groupId, groupActivities);
            };
        });
    },

    // =====================================
    // GENERIC ACTIVITY GROUP SCREEN
    // =====================================
    openGroup: function (groupId, activities) {
        if (!Array.isArray(activities) || activities.length === 0) {
            return;
        }

        // Keep the existing divisibility flow untouched.
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

        ActivityScreen.showGroupActivities(groupId, activities);
    },

    showGroupActivities: function (groupId, activities) {
        const app = document.getElementById("app");
        if (!app) {
            console.error("Activity Screen: App Container Not Found");
            return;
        }

        const groupTitle = this.getGroupTitle(groupId);
        const groupIcon = this.getGroupIcon(groupId);

        let buttonsHTML = "";

        activities.forEach(function (activity) {
            const locked = ActivityScreen.isLocked(activity);
            buttonsHTML += `
                <button
                    class="activitySelectBtn"
                    data-id="${activity.id}"
                    type="button">
                    ${locked ? "🔒" : ""}
                    <span>${activity.title}</span>
                </button>
            `;
        });

        app.innerHTML = `
            <div class="screen activityScreen activityGroupScreen" dir="rtl">
                <div class="activityGroupHeading">
                    <div class="activityGroupHeadingIcon" aria-hidden="true">${groupIcon}</div>
                    <h1>${groupTitle}</h1>
                    <p>یک بازی را انتخاب کن و شروع کن!</p>
                </div>

                <div id="activityList" class="activityList">
                    ${buttonsHTML}
                </div>

                <button id="backToActivitiesBtn" type="button">
                    ⬅ بازگشت به فعالیت‌ها
                </button>
            </div>
        `;

        this.bindActivityButtons(activities);

        const backButton = document.getElementById("backToActivitiesBtn");
        if (backButton) {
            backButton.onclick = function () {
                if (typeof Screen !== "undefined" && typeof Screen.showActivities === "function") {
                    Screen.showActivities(AppState.grade, AppState.subject, AppState.chapter);
                    return;
                }

                if (typeof Navigation !== "undefined" && typeof Navigation.selectChapter === "function") {
                    Navigation.selectChapter(AppState.chapter);
                }
            };
        }

        console.log("Activity Group Displayed:", groupId, activities.length);
    },

    getGroupTitle: function (groupId) {
        const titles = {
            divisibility: "بخش‌پذیری",
            setayesh: "ستایش"
        };

        return titles[groupId] || groupId;
    },

    getGroupIcon: function (groupId) {
        const icons = {
            divisibility: "➗",
            setayesh: "📖"
        };

        return icons[groupId] || "🎮";
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

console.log("Activity Screen v3.8 Ready");
