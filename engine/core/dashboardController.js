// =====================================
// Tahouri Edu Platform
// Dashboard Controller
// Version 6.2
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

        console.log("Dashboard: Current Context:", {
            grade: currentGrade,
            subject: currentSubject,
            chapter: currentChapter
        });

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

        let progressPercentage = 0;

        if (gradeActivities.length > 0) {
            progressPercentage = Math.round(
                (completedCount / gradeActivities.length) * 100
            );
        }

        // =====================================
        // CONTINUE LEARNING
        // First unlocked + incomplete activity.
        // This remains separate from resumable activity.
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

        // The existing DashboardScreen remains responsible for its own
        // calendar/path layout. The resume card is added independently so
        // that the existing dashboard architecture is not replaced.
        if (
            typeof ActivitySessionManager !== "undefined" &&
            typeof ActivitySessionManager.renderDashboardResume === "function"
        ) {
            ActivitySessionManager.renderDashboardResume(resumableActivity);
        }

        console.log("Dashboard Progress:", {
            completed: completedCount,
            total: gradeActivities.length,
            percentage: progressPercentage
        });

        console.log("Dashboard Continue Learning:", continueLearning);
        console.log("Dashboard Resumable Activity:", resumableActivity);

    },

    // =====================================
    // ACTIVITY RESOLVER
    // =====================================

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
console.log("Dashboard Controller v6.2 Ready");
