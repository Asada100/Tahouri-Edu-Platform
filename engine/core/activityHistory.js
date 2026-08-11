// =====================================
// Tahouri Edu Platform
// Version 4.3
// Activity History Manager
// =====================================


const ActivityHistory = {

    // =====================================
    // Current Activity
    // =====================================

    currentActivity: null,


    // =====================================
    // Set Activity
    // =====================================

    set: function (activity) {

        if (!activity) {

            console.error(
                "Invalid Activity History Data"
            );

            return false;

        }

        this.currentActivity = activity;

        console.log(
            "Activity History Saved:",
            activity.id
        );

        return true;

    },


    // =====================================
    // Get Activity
    // =====================================

    get: function () {

        return this.currentActivity;

    },


    // =====================================
    // Clear History
    // =====================================

    clear: function () {

        this.currentActivity = null;

        console.log(
            "Activity History Cleared"
        );

    }

};


// =====================================
// Global Access
// =====================================

window.ActivityHistory =
    ActivityHistory;


// =====================================
// Ready
// =====================================

console.log(
    "Activity History Ready"
);