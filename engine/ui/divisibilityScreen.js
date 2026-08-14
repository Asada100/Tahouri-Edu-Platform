// =====================================
// Tahouri Edu Platform
// Version 2.1
// Divisibility Group Navigation
// Difficulty Selection Integration
// =====================================


(function () {


    // =====================================
    // Show Main Activity Screen
    // =====================================

    Screen.showActivities = function (
        gradeId,
        subjectId,
        chapterId
    ) {


        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =====================================
        // Get Chapter Activities
        // =====================================

        const chapterActivities =
            activities.filter(
                function (activity) {

                    return (

                        activity.grade ===
                        gradeId

                        &&

                        activity.subject ===
                        subjectId

                        &&

                        activity.chapter ===
                        chapterId

                    );

                }
            );


        // =====================================
        // Divisibility Children
        // =====================================

        const divisibilityActivities =
            chapterActivities.filter(
                function (activity) {

                    return (
                        activity.group ===
                        "divisibility"
                    );

                }
            );


        // =====================================
        // Other Activities
        // =====================================

        const otherActivities =
            chapterActivities.filter(
                function (activity) {

                    return (
                        activity.group !==
                        "divisibility"
                    );

                }
            );


        // =====================================
        // Build Main Activities
        // =====================================

        let mainActivitiesHTML = "";


        otherActivities.forEach(
            function (activity) {


                const locked =
                    ContentLockManager.isLocked(
                        activity.id
                    );


                mainActivitiesHTML += `

                    <button
                        class="activityBtn mainActivityBtn"
                        data-id="${activity.id}"
                        ${locked ? "disabled" : ""}>

                        ${
                            locked
                            ?
                            "🔒"
                            :
                            "🎮"
                        }

                        ${activity.title}

                    </button>

                `;

            }
        );


        // =====================================
        // Divisibility Group
        // =====================================

        if (
            divisibilityActivities.length > 0
        ) {

            mainActivitiesHTML += `

                <button
                    id="divisibilityGroupBtn"
                    class="activityBtn divisibilityGroupBtn">

                    🎮 بخش‌پذیری

                </button>

            `;

        }


        // =====================================
        // Main Screen
        // =====================================

        app.innerHTML = `

            <div class="screen">

                <h1>
                    انتخاب فعالیت
                </h1>

                <div id="mainActivitiesContainer">

                    ${mainActivitiesHTML}

                </div>

                <br>

                <button
                    id="backChaptersBtn">

                    ⬅ بازگشت به فصل‌ها

                </button>

            </div>

        `;


        // =====================================
        // Main Activity Buttons
        // =====================================

        document
            .querySelectorAll(
                ".mainActivityBtn"
            )
            .forEach(
                function (btn) {


                    btn.onclick =
                        function () {


                            const activityId =
                                this.dataset.id;


                            if (
                                !ContentLockManager.canOpen(
                                    activityId
                                )
                            ) {

                                alert(
                                    "این فعالیت هنوز قفل است."
                                );

                                return;

                            }


                            const activity =
                                activities.find(
                                    function (item) {

                                        return (
                                            item.id ===
                                            activityId
                                        );

                                    }
                                );


                            if (!activity) {

                                console.error(
                                    "Activity Not Found:",
                                    activityId
                                );

                                return;

                            }


                            Navigation.selectActivity(
                                activityId
                            );


                            ActivityManager.load(
                                activity
                            );

                        };

                }
            );


        // =====================================
        // Divisibility Group Button
        // =====================================

        const divisibilityBtn =
            document.getElementById(
                "divisibilityGroupBtn"
            );


        if (divisibilityBtn) {

            divisibilityBtn.onclick =
                function () {

                    Screen.showDivisibility(
                        gradeId,
                        subjectId,
                        chapterId
                    );

                };

        }


        // =====================================
        // Back To Chapters
        // =====================================

        const backButton =
            document.getElementById(
                "backChaptersBtn"
            );


        if (backButton) {

            backButton.onclick =
                function () {

                    Screen.showChapters(
                        gradeId,
                        subjectId
                    );

                };

        }


        console.log(
            "Main Activity Screen Displayed"
        );

    };


    // =====================================
    // Show Divisibility Activities
    // =====================================

    Screen.showDivisibility = function (
        gradeId,
        subjectId,
        chapterId
    ) {


        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =====================================
        // Get Divisibility Activities
        // =====================================

        const divisibilityActivities =
            activities.filter(
                function (activity) {

                    return (

                        activity.grade ===
                        gradeId

                        &&

                        activity.subject ===
                        subjectId

                        &&

                        activity.chapter ===
                        chapterId

                        &&

                        activity.group ===
                        "divisibility"

                    );

                }
            );


        // =====================================
        // Build Child Buttons
        // =====================================

        let childrenHTML = "";


        divisibilityActivities.forEach(
            function (activity) {


                const locked =
                    ContentLockManager.isLocked(
                        activity.id
                    );


                childrenHTML += `

                    <button
                        class="activityBtn divisibilityChildBtn"
                        data-id="${activity.id}"
                        ${locked ? "disabled" : ""}>

                        ${
                            locked
                            ?
                            "🔒"
                            :
                            "🎮"
                        }

                        ${activity.title}

                    </button>

                `;

            }
        );


        // =====================================
        // Divisibility Screen
        // =====================================

        app.innerHTML = `

            <div class="screen">

                <h1>
                    بخش‌پذیری
                </h1>

                <p>
                    انتخاب قانون بخش‌پذیری
                </p>

                <div
                    id="divisibilityActivitiesContainer">

                    ${childrenHTML}

                </div>

                <br>

                <button
                    id="backToActivitiesBtn">

                    ⬅ بازگشت به فعالیت‌ها

                </button>

            </div>

        `;


        // =====================================
        // Child Activity Buttons
        // =====================================

        document
            .querySelectorAll(
                ".divisibilityChildBtn"
            )
            .forEach(
                function (btn) {


                    btn.onclick =
                        function () {


                            const activityId =
                                this.dataset.id;


                            if (
                                !ContentLockManager.canOpen(
                                    activityId
                                )
                            ) {

                                alert(
                                    "این فعالیت هنوز قفل است."
                                );

                                return;

                            }


                            const activity =
                                activities.find(
                                    function (item) {

                                        return (
                                            item.id ===
                                            activityId
                                        );

                                    }
                                );


                            if (!activity) {

                                console.error(
                                    "Divisibility Activity Not Found:",
                                    activityId
                                );

                                return;

                            }


                            Navigation.selectActivity(
                                activityId
                            );


                            // =================================
                            // Difficulty Selection
                            // =================================

                            if (

                                typeof DifficultyModal !==
                                "undefined"

                                &&

                                typeof DifficultyModal.open ===
                                "function"

                            ) {


                                console.log(
                                    "Opening Difficulty Modal:",
                                    activity.id
                                );


                                DifficultyModal.open(

                                    activity,

                                    function (
                                        selectedActivity
                                    ) {


                                        console.log(
                                            "Difficulty Selected:",
                                            selectedActivity
                                                .settings
                                                .difficulty
                                        );


                                        ActivityManager.load(
                                            selectedActivity
                                        );

                                    }

                                );


                                return;

                            }


                            // =================================
                            // Fallback
                            // =================================

                            console.warn(
                                "Difficulty Modal Not Available"
                            );


                            ActivityManager.load(
                                activity
                            );

                        };

                }
            );


        // =====================================
        // Back To Main Activities
        // =====================================

        const backButton =
            document.getElementById(
                "backToActivitiesBtn"
            );


        if (backButton) {

            backButton.onclick =
                function () {

                    Screen.showActivities(
                        gradeId,
                        subjectId,
                        chapterId
                    );

                };

        }


        console.log(
            "Divisibility Screen Displayed"
        );

    };


    console.log(
        "Divisibility Screen Ready"
    );

})();