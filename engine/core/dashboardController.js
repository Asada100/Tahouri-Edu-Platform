// =====================================
// Tahouri Edu Platform
// Dashboard Controller
// Version 5.1
// =====================================

const DashboardController = {

    open: function () {

        console.log(
            "Opening Dashboard..."
        );


        // =====================================
        // Dashboard Screen Check
        // =====================================

        if (
            typeof DashboardScreen === "undefined"
        ) {

            console.error(
                "DashboardScreen Not Available"
            );

            return;
        }


        // =====================================
        // Statistics
        // =====================================

        let overall = {};

        if (
            typeof StatisticsManager !== "undefined" &&
            typeof StatisticsManager.get === "function"
        ) {

            overall =
                StatisticsManager.get() || {};

        }


        // =====================================
        // CURRENT CONTEXT
        // =====================================

        const currentGrade =
            typeof AppState !== "undefined"
                ? AppState.grade
                : null;

        const currentSubject =
            typeof AppState !== "undefined"
                ? AppState.subject
                : null;

        const currentChapter =
            typeof AppState !== "undefined"
                ? AppState.chapter
                : null;


        console.log(
            "Dashboard: Current Context:",
            {
                grade: currentGrade,
                subject: currentSubject,
                chapter: currentChapter
            }
        );


        // =====================================
        // CONTINUE LEARNING
        //
        // Priority:
        // 1. Find an unlocked activity
        //    that is not completed.
        //
        // 2. Preserve the order of activities
        //    as the educational path.
        //
        // 3. Do NOT limit search to the
        //    last-used subject.
        // =====================================

        let continueLearning = {};

        let activities =
            typeof App !== "undefined" &&
            Array.isArray(App.activities)
                ? App.activities
                : [];


        // =====================================
        // FILTER BY CURRENT GRADE
        // =====================================

        let gradeActivities =
            activities.filter(
                function (activity) {

                    if (!activity) {
                        return false;
                    }

                    if (!currentGrade) {
                        return true;
                    }

                    return (
                        activity.grade ===
                        currentGrade
                    );

                }
            );


        console.log(
            "Dashboard: Grade Activities:",
            gradeActivities.length
        );


        // =====================================
        // FIND NEXT LEARNING ACTIVITY
        //
        // IMPORTANT:
        // We intentionally iterate in the
        // original activities.json order.
        // This order represents the
        // educational path.
        // =====================================

        let nextActivity = null;


        for (
            let i = 0;
            i < gradeActivities.length;
            i++
        ) {

            const activity =
                gradeActivities[i];


            if (!activity.id) {
                continue;
            }


            // ---------------------------------
            // Progress information
            // ---------------------------------

            let progress = null;


            if (
                typeof ProgressManager !== "undefined"
            ) {

                if (
                    typeof ProgressManager.getActivity ===
                    "function"
                ) {

                    progress =
                        ProgressManager.getActivity(
                            activity.id
                        );

                }

                else if (
                    typeof ProgressManager.get ===
                    "function"
                ) {

                    progress =
                        ProgressManager.get(
                            activity.id
                        );

                }

            }


            // ---------------------------------
            // Completed
            // ---------------------------------

            let completed = false;


            if (
                progress &&
                (
                    progress.completed === true ||
                    Number(progress.completed) > 0
                )
            ) {

                completed = true;

            }


            // ---------------------------------
            // Unlocked
            // ---------------------------------

            let unlocked = true;


            if (
                typeof ContentLockManager !==
                "undefined"
            ) {

                if (
                    typeof ContentLockManager.isUnlocked ===
                    "function"
                ) {

                    unlocked =
                        ContentLockManager.isUnlocked(
                            activity.id
                        );

                }

                else if (
                    typeof ContentLockManager.isLocked ===
                    "function"
                ) {

                    unlocked =
                        !ContentLockManager.isLocked(
                            activity.id
                        );

                }

            }


            console.log(
                "Dashboard Activity Check:",
                activity.id,
                {
                    completed:
                        completed,

                    unlocked:
                        unlocked,

                    subject:
                        activity.subject,

                    chapter:
                        activity.chapter
                }
            );


            // ---------------------------------
            // FIRST:
            // unlocked + not completed
            // ---------------------------------

            if (
                unlocked &&
                !completed
            ) {

                nextActivity =
                    activity;

                break;

            }

        }


        // =====================================
        // BUILD CONTINUE LEARNING
        // =====================================

        if (nextActivity) {

            continueLearning = {

                activityId:
                    nextActivity.id,

                activityTitle:
                    nextActivity.title ||
                    nextActivity.name ||
                    nextActivity.id,

                subject:
                    nextActivity.subject ||
                    "",

                chapter:
                    nextActivity.chapter ||
                    ""

            };


            console.log(
                "Dashboard: Next Learning Activity:",
                nextActivity.id
            );

        }

        else {

            console.log(
                "Dashboard: No Uncompleted Activity Found"
            );

        }


        // =====================================
        // OPEN DASHBOARD
        // =====================================

        DashboardScreen.show({

            overall:
                overall,

            continueLearning:
                continueLearning

        });


        // =====================================
        // LOG
        // =====================================

        console.log(
            "Dashboard Continue Learning:",
            continueLearning
        );

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.DashboardController =
    DashboardController;


// =====================================
// READY
// =====================================

console.log(
    "Dashboard Controller v5.1 Ready"
);
