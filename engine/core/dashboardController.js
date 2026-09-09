// =====================================
// Tahouri Edu Platform
// Dashboard Controller
// =====================================

const DashboardController = {

    open: function () {
        if (typeof DashboardScreen === "undefined" || typeof DashboardScreen.show !== "function") {
            console.error("Dashboard: DashboardScreen unavailable.");
            return false;
        }

        console.log("Dashboard Controller Opening");
        DashboardScreen.show();
        return true;
    },

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

        const activity = App.resolveActivityById(data.activityId);

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
            // An unfinished activity must keep its existing session and
            // difficulty, so resume continues through the normal restore path.
            if (data.mode === "resume") {
                await App.startActivity(activity);
                return true;
            }

            // A new activity started from Continue Learning must use the same
            // difficulty-selection flow as direct activity entry.
            if (
                typeof DifficultyModal !== "undefined" &&
                typeof DifficultyModal.open === "function"
            ) {
                DifficultyModal.open(activity, async function (selectedActivity) {
                    try {
                        await App.startActivity(selectedActivity);
                    }
                    catch (error) {
                        console.error(
                            "Dashboard: Activity start failed after difficulty selection:",
                            error
                        );
                    }
                });
                return true;
            }

            // Safe compatibility fallback if the difficulty modal is unavailable.
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
    }
};

window.DashboardController = DashboardController;
console.log("Dashboard Controller Ready");