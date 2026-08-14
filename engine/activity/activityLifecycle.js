// =====================================
// Tahouri Edu Platform
// Version 4.2
// Activity Lifecycle
// Session + Statistics + Progress
// Sequential Content Lock
// Final Reward Unlock
// =====================================

const ActivityLifecycle = {

    connect: function () {

        // =====================================
        // Activity Started
        // =====================================

        EventManager.on(

            "activityStarted",

            function (activity) {

                console.log(
                    "Activity Started Event",
                    activity
                );

                ActivityState.set(
                    "started"
                );

                ActivityState.set(
                    "playing"
                );

            }

        );


        // =====================================
        // Activity Finished
        // =====================================

        EventManager.on(

            "activityFinished",

            function (result) {

                console.log(
                    "Activity Finished Event",
                    result
                );


                ActivityState.set(
                    "finished"
                );


                // =================================
                // Current Activity
                // =================================

                const activity =
                    ActivityHistory.get();


                if (!activity) {

                    console.error(
                        "Activity History Not Found"
                    );

                    return;

                }


                // =================================
                // Progress
                // =================================

                ProgressTracker.update(

                    activity.id,

                    result

                );


                // =================================
                // Success Condition
                // =================================

                const successful =
                    result.percentage >= 80;


                console.log(
                    "Activity Success:",
                    successful,
                    activity.id,
                    result.percentage
                );


                // =================================
                // Sequential Unlock
                // =================================

                if (successful) {

                    // ---------------------------------
                    // evenOdd → divisibleBy2
                    // ---------------------------------

                    if (
                        activity.id ===
                        "evenOdd"
                    ) {

                        ContentLockManager.unlock(
                            "divisibleBy2"
                        );

                        console.log(
                            "Unlocked: divisibleBy2"
                        );

                    }


                    // ---------------------------------
                    // divisibleBy2 → divisibleBy3
                    // ---------------------------------

                    else if (
                        activity.id ===
                        "divisibleBy2"
                    ) {

                        ContentLockManager.unlock(
                            "divisibleBy3"
                        );

                        console.log(
                            "Unlocked: divisibleBy3"
                        );

                    }


                    // ---------------------------------
                    // divisibleBy3 → divisibleBy5
                    // ---------------------------------

                    else if (
                        activity.id ===
                        "divisibleBy3"
                    ) {

                        ContentLockManager.unlock(
                            "divisibleBy5"
                        );

                        console.log(
                            "Unlocked: divisibleBy5"
                        );

                    }


                    // ---------------------------------
                    // divisibleBy5 → divisibleBy6
                    // ---------------------------------

                    else if (
                        activity.id ===
                        "divisibleBy5"
                    ) {

                        ContentLockManager.unlock(
                            "divisibleBy6"
                        );

                        console.log(
                            "Unlocked: divisibleBy6"
                        );

                    }


                    // ---------------------------------
                    // divisibleBy6 → divisibleBy9
                    // ---------------------------------

                    else if (
                        activity.id ===
                        "divisibleBy6"
                    ) {

                        ContentLockManager.unlock(
                            "divisibleBy9"
                        );

                        console.log(
                            "Unlocked: divisibleBy9"
                        );

                    }


                    // ---------------------------------
                    // divisibleBy9 → divisibleBy10
                    // ---------------------------------

                    else if (
                        activity.id ===
                        "divisibleBy9"
                    ) {

                        ContentLockManager.unlock(
                            "divisibleBy10"
                        );

                        console.log(
                            "Unlocked: divisibleBy10"
                        );

                    }


                    // ---------------------------------
                    // divisibleBy10 → divisibleBy100
                    // ---------------------------------

                    else if (
                        activity.id ===
                        "divisibleBy10"
                    ) {

                        ContentLockManager.unlock(
                            "divisibleBy100"
                        );

                        console.log(
                            "Unlocked: divisibleBy100"
                        );

                    }


                    // ---------------------------------
                    // divisibleBy100 → memoryDemo
                    // FINAL REWARD
                    // ---------------------------------

                    else if (
                        activity.id ===
                        "divisibleBy100"
                    ) {

                        ContentLockManager.unlock(
                            "memoryDemo"
                        );

                        console.log(
                            "Unlocked: memoryDemo"
                        );

                        console.log(
                            "🎉 Divisibility Chain Completed!"
                        );

                    }

                }


                // =================================
                // Session Score
                // =================================

                SessionManager.addActivity(

                    result.score

                );


                // =================================
                // Statistics
                // =================================

                StatisticsManager.addResult(

                    activity,

                    result

                );


                // =================================
                // Completed
                // =================================

                ActivityState.set(
                    "completed"
                );


                // =================================
                // Finish Screen
                // =================================

                Screen.showFinish(
                    result
                );

            }

        );


        console.log(
            "Activity Lifecycle Connected"
        );

    }

};


// =====================================
// Connect
// =====================================

ActivityLifecycle.connect();


// =====================================
// Start Session
// =====================================

SessionManager.start();


// =====================================
// Ready
// =====================================

console.log(
    "Activity Lifecycle Ready"
);