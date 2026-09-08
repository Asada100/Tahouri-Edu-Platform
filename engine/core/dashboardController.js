// =====================================
// Tahouri Edu Platform
// Dashboard Controller
// Version 6.6
//
// Student Friendly Dashboard
// ProgressTracker as source of truth
// Single Continue Activity card
// Resumable activity takes priority
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
                        subject: found.subject || "",
                        chapter: found.chapter || "",
                        updatedAt: session.updatedAt || null
                    };
                }
                else {
                    console.warn(
                        "Dashboard: Resumable activity no longer exists:",
                        session.activityId
                    );
                    ActivitySessionManager.clear(session.activityId);
                }
            }
        }

        // =====================================
        // NEXT UNCOMPLETED ACTIVITY
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

        // =====================================
        // SINGLE CONTINUE CARD
        //
        // A resumable session always has priority.
        // Otherwise show the next unlocked activity.
        // This intentionally avoids two separate
        // Continue cards on the dashboard.
        // =====================================

        let continueLearning = {};

        if (resumableActivity) {
            continueLearning = {
                activityId: resumableActivity.activityId,
                activityTitle: resumableActivity.activityTitle,
                activityType: resumableActivity.activityType,
                subject: resumableActivity.subject,
                chapter: resumableActivity.chapter,
                mode: "resume"
            };
        }
        else if (nextActivity) {
            continueLearning = {
                activityId: nextActivity.id,
                activityTitle:
                    nextActivity.title ||
                    nextActivity.name ||
                    nextActivity.id,
                subject: nextActivity.subject || "",
                chapter: nextActivity.chapter || "",
                mode: "start"
            };
        }

        DashboardScreen.show({
            overall: overall,
            currentGrade: currentGrade,
            currentSubject: currentSubject,
            currentChapter: currentChapter,
            completedCount: completedCount,
            totalGradeActivities: gradeActivities.length,
            progressPercentage: progressPercentage,
            continueLearning: continueLearning,
            resumableActivity: resumableActivity
        });

        console.log("Dashboard Progress:", {
            completed: completedCount,
            total: gradeActivities.length,
            percentage: progressPercentage
        });

        console.log("Dashboard Continue Learning:", continueLearning);
        console.log("Dashboard Resumable Activity:", resumableActivity);
    },

    // =====================================
    // CONTINUE / START ACTIVITY
    // =====================================

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
                "Dashboard: Activity not found:",
                data.activityId
            );
            return false;
        }

        console.log(
            data.mode === "resume"
                ? "Dashboard: Resuming Activity:"
                : "Dashboard: Starting Next Activity:",
            activity.id
        );

        try {
            // App.startActivity / ActivityManager handles an existing
            // unfinished session and resumes it instead of creating
            // a duplicate attempt.
            await App.startActivity(activity);
            return true;
        }
        catch (error) {
            console.error(
                "Dashboard: Activity start/resume failed:",
                error
            );
            return false;
        }
    },

    // Kept for compatibility with older callers.
    // The dashboard no longer renders a separate resumable card.
    renderResumableActivity: function () {
        const oldCard = document.getElementById("activityResumeCard");
        if (oldCard) oldCard.remove();
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
console.log("Dashboard Controller v6.6 Ready");
