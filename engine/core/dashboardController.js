// =====================================
// Tahouri Edu Platform
// Dashboard Controller
// Version 6.4
//
// Student Friendly Dashboard
// ProgressTracker as source of truth
// Resumable Activity integration
// =====================================

const DashboardController = {

    open: function () {

        console.log("Opening Dashboard...");

        if (typeof DashboardScreen === "undefined") {
            console.error("DashboardScreen Not Available");
            return;
        }

        let overall = {};

        if (
            typeof StatisticsManager !== "undefined" &&
            typeof StatisticsManager.get === "function"
        ) {
            overall = StatisticsManager.get() || {};
        }

        const currentGrade =
            typeof AppState !== "undefined"
                ? AppState.grade
                : (
                    typeof ProfileManager !== "undefined" &&
                    typeof ProfileManager.get === "function"
                        ? (ProfileManager.get() || {}).grade
                        : null
                );

        const currentSubject =
            typeof AppState !== "undefined" ? AppState.subject : null;

        const currentChapter =
            typeof AppState !== "undefined" ? AppState.chapter : null;

        let activities = [];

        if (
            typeof App !== "undefined" &&
            Array.isArray(App.activities)
        ) {
            activities = App.activities;
        }

        const gradeActivities = activities.filter(function (activity) {
            if (!activity) return false;
            if (!currentGrade) return true;
            return activity.grade === currentGrade;
        });

        let completedCount = 0;

        for (let i = 0; i < gradeActivities.length; i++) {
            const activity = gradeActivities[i];
            if (!activity || !activity.id) continue;

            let completed = false;

            if (
                typeof ProgressTracker !== "undefined" &&
                typeof ProgressTracker.isCompleted === "function"
            ) {
                completed = ProgressTracker.isCompleted(activity.id);
            }

            if (completed) completedCount++;
        }

        const progressPercentage =
            gradeActivities.length > 0
                ? Math.round((completedCount / gradeActivities.length) * 100)
                : 0;

        // =====================================
        // CONTINUE LEARNING
        // Separate from an in-progress session.
        // =====================================

        let nextActivity = null;

        for (let i = 0; i < gradeActivities.length; i++) {

            const activity = gradeActivities[i];
            if (!activity || !activity.id) continue;

            let completed = false;

            if (
                typeof ProgressTracker !== "undefined" &&
                typeof ProgressTracker.isCompleted === "function"
            ) {
                completed = ProgressTracker.isCompleted(activity.id);
            }

            let unlocked = true;

            if (typeof ContentLockManager !== "undefined") {
                if (typeof ContentLockManager.isUnlocked === "function") {
                    unlocked = ContentLockManager.isUnlocked(activity.id);
                }
                else if (typeof ContentLockManager.isLocked === "function") {
                    unlocked = !ContentLockManager.isLocked(activity.id);
                }
            }

            if (unlocked && !completed) {
                nextActivity = activity;
                break;
            }
        }

        let continueLearning = {};

        if (nextActivity) {
            continueLearning = {
                activityId: nextActivity.id,
                activityTitle:
                    nextActivity.title ||
                    nextActivity.name ||
                    nextActivity.id,
                subject: nextActivity.subject || "",
                chapter: nextActivity.chapter || ""
            };
        }

        // =====================================
        // RESUMABLE ACTIVITY
        // =====================================

        let resumableActivity = null;

        if (
            typeof ActivitySessionManager !== "undefined" &&
            typeof ActivitySessionManager.getResumable === "function"
        ) {
            const session = ActivitySessionManager.getResumable();

            if (session) {
                const found = activities.find(function (activity) {
                    return activity && activity.id === session.activityId;
                });

                if (found) {
                    resumableActivity = {
                        activityId: found.id,
                        activityTitle:
                            found.title ||
                            found.name ||
                            found.id,
                        activityType:
                            session.activityType ||
                            found.engine ||
                            found.type ||
                            "",
                        updatedAt: session.updatedAt || null
                    };
                }
                else {
                    console.warn(
                        "Dashboard: Resumable activity no longer exists:",
                        session.activityId
                    );
                    ActivitySessionManager.clear();
                }
            }
        }

        DashboardScreen.show({
            overall: overall,
            currentGrade: currentGrade,
            completedCount: completedCount,
            totalGradeActivities: gradeActivities.length,
            progressPercentage: progressPercentage,
            continueLearning: continueLearning,
            resumableActivity: resumableActivity
        });

        // =====================================
        // RESUME CARD
        // =====================================

        this.renderResumableActivity(resumableActivity);

        console.log("Dashboard Progress:", {
            completed: completedCount,
            total: gradeActivities.length,
            percentage: progressPercentage
        });

        console.log("Dashboard Continue Learning:", continueLearning);
        console.log("Dashboard Resumable Activity:", resumableActivity);
    },

    // =====================================
    // CONTINUE LEARNING
    // =====================================
    // Starts the next unlocked, incomplete activity selected by open().
    // This is intentionally separate from ActivitySessionManager.resume(),
    // because Continue Learning means starting the next learning item,
    // while Continue Activity means restoring an interrupted session.

    continueLearning: async function (data) {

        if (!data || !data.activityId) {
            console.warn("Dashboard: No activity available for Continue Learning.");
            return false;
        }

        if (
            typeof App === "undefined" ||
            typeof App.resolveActivityById !== "function"
        ) {
            console.error("Dashboard: App activity resolver unavailable.");
            return false;
        }

        const activity =
            App.resolveActivityById(data.activityId);

        if (!activity) {
            console.error(
                "Dashboard: Continue Learning activity not found:",
                data.activityId
            );
            return false;
        }

        console.log(
            "Dashboard: Continuing Learning Activity:",
            activity.id
        );

        try {
            await App.startActivity(activity);
            return true;
        }
        catch (error) {
            console.error(
                "Dashboard: Continue Learning failed:",
                error
            );
            return false;
        }
    },

    // =====================================
    // RESUMABLE CARD
    // =====================================

    renderResumableActivity: function (data) {

        const oldCard = document.getElementById("activityResumeCard");
        if (oldCard) oldCard.remove();

        if (!data) return;

        const app = document.getElementById("app");
        if (!app) return;

        const card = document.createElement("section");
        card.id = "activityResumeCard";
        card.className = "dashboard-card activity-resume-card";
        card.dir = "rtl";

        const title = document.createElement("h2");
        title.textContent = "▶ ادامه فعالیت";

        const activityTitle = document.createElement("p");
        activityTitle.textContent = data.activityTitle;

        const description = document.createElement("p");
        description.textContent = "آخرین وضعیت فعالیت ذخیره شده و آماده ادامه است.";

        const button = document.createElement("button");
        button.id = "activityResumeBtn";
        button.type = "button";
        button.textContent = "ادامه فعالیت";

        button.onclick = async function () {

            if (
                typeof ActivitySessionManager === "undefined" ||
                typeof ActivitySessionManager.resume !== "function"
            ) {
                console.error("ActivitySessionManager is not available.");
                return;
            }

            button.disabled = true;

            try {
                const restored =
                    await ActivitySessionManager.resume();

                if (!restored) {
                    button.disabled = false;
                    console.error("Dashboard: Activity resume failed.");
                    return;
                }
            }
            catch (error) {
                button.disabled = false;
                console.error(
                    "Dashboard: Activity resume threw an error:",
                    error
                );
            }
        };

        card.appendChild(title);
        card.appendChild(activityTitle);
        card.appendChild(description);
        card.appendChild(button);

        const screen = app.querySelector(".dashboard-screen");

        if (screen) {
            screen.insertBefore(card, screen.firstChild);
        }
        else {
            app.insertBefore(card, app.firstChild);
        }
    },

    resolveActivityById: function (activityId) {

        if (!activityId) return null;

        if (
            typeof App === "undefined" ||
            !Array.isArray(App.activities)
        ) {
            return null;
        }

        return App.activities.find(function (activity) {
            return activity && activity.id === activityId;
        }) || null;
    }
};

window.DashboardController = DashboardController;
console.log("Dashboard Controller v6.4 Ready");
