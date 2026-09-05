// =====================================
// Tahouri Edu Platform
// Dashboard Controller
// Version 6.1
//
// Student Friendly Dashboard
// ProgressTracker as source of truth
// =====================================


const DashboardController = {


    // =====================================
    // OPEN DASHBOARD
    // =====================================

    open: function () {

        console.log(
            "Opening Dashboard..."
        );


        // =====================================
        // Dashboard Screen Check
        // =====================================

        if (
            typeof DashboardScreen ===
            "undefined"
        ) {

            console.error(
                "DashboardScreen Not Available"
            );

            return;

        }


        // =====================================
        // STATISTICS
        // =====================================

        let overall = {};


        if (
            typeof StatisticsManager !==
            "undefined" &&

            typeof StatisticsManager.get ===
            "function"
        ) {

            overall =
                StatisticsManager.get() || {};

        }


        // =====================================
        // CURRENT GRADE
        // =====================================

        const currentGrade =

            typeof AppState !==
            "undefined"

                ? AppState.grade

                : (

                    typeof ProfileManager !==
                    "undefined" &&

                    typeof ProfileManager.get ===
                    "function"

                        ? (
                            ProfileManager.get() || {}
                          ).grade

                        : null
                  );


        // =====================================
        // CURRENT CONTEXT
        // =====================================

        const currentSubject =

            typeof AppState !==
            "undefined"

                ? AppState.subject

                : null;


        const currentChapter =

            typeof AppState !==
            "undefined"

                ? AppState.chapter

                : null;


        console.log(
            "Dashboard: Current Context:",
            {
                grade:
                    currentGrade,

                subject:
                    currentSubject,

                chapter:
                    currentChapter
            }
        );


        // =====================================
        // ALL ACTIVITIES
        // =====================================

        let activities = [];


        if (
            typeof App !==
            "undefined" &&

            Array.isArray(App.activities)
        ) {

            activities =
                App.activities;

        }


        // =====================================
        // ACTIVITIES OF CURRENT GRADE
        // =====================================

        const gradeActivities =
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
        // COMPLETED ACTIVITIES
        // ProgressTracker is the single source
        // of truth for activity completion.
        // =====================================

        let completedCount = 0;


        for (
            let i = 0;
            i < gradeActivities.length;
            i++
        ) {

            const activity =
                gradeActivities[i];


            if (
                !activity ||
                !activity.id
            ) {

                continue;

            }


            let completed = false;


            if (
                typeof ProgressTracker !==
                "undefined" &&

                typeof ProgressTracker.isCompleted ===
                "function"
            ) {

                completed =
                    ProgressTracker.isCompleted(
                        activity.id
                    );

            }


            if (completed) {

                completedCount++;

            }

        }


        // =====================================
        // PROGRESS PERCENTAGE
        // =====================================

        let progressPercentage = 0;


        if (
            gradeActivities.length > 0
        ) {

            progressPercentage =
                Math.round(
                    (
                        completedCount /
                        gradeActivities.length
                    ) * 100
                );

        }


        // =====================================
        // CONTINUE LEARNING
        //
        // Priority:
        // First unlocked + incomplete activity
        // in educational order.
        // =====================================

        let nextActivity = null;


        for (
            let i = 0;
            i < gradeActivities.length;
            i++
        ) {

            const activity =
                gradeActivities[i];


            if (
                !activity ||
                !activity.id
            ) {

                continue;

            }


            // ---------------------------------
            // Completed
            // ---------------------------------

            let completed = false;


            if (
                typeof ProgressTracker !==
                "undefined" &&

                typeof ProgressTracker.isCompleted ===
                "function"
            ) {

                completed =
                    ProgressTracker.isCompleted(
                        activity.id
                    );

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
                        unlocked
                }
            );


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
        // CONTINUE LEARNING DATA
        // =====================================

        let continueLearning = {};


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
        // OPEN SCREEN
        // =====================================

        DashboardScreen.show({

            overall:
                overall,

            currentGrade:
                currentGrade,

            completedCount:
                completedCount,

            totalGradeActivities:
                gradeActivities.length,

            progressPercentage:
                progressPercentage,

            continueLearning:
                continueLearning

        });


        // =====================================
        // LOG
        // =====================================

        console.log(
            "Dashboard Progress:",
            {
                completed:
                    completedCount,

                total:
                    gradeActivities.length,

                percentage:
                    progressPercentage
            }
        );


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
    "Dashboard Controller v6.1 Ready"
);
