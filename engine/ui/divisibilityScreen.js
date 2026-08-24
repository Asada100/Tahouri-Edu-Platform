// =====================================
// Tahouri Edu Platform
// Version 2.3
// Divisibility Group Screen
//
// Responsibilities:
// - Show Divisibility Group
// - Show Divisibility Activities
// - Content Lock
// - Difficulty Selection
// - Back Navigation
//
// NOT Responsible For:
// - Main Activity List
// - Quiz Rendering
// - Activity Execution
// - Direct ActivityManager Entry
//
// Architecture:
//
// ActivityScreen
//      ↓
// DivisibilityScreen
//      ↓
// DifficultyModal
//      ↓
// App.startActivity()
//      ↓
// ActivityManager
//      ↓
// QuizEngine
//      ↓
// QuizScreen
// =====================================


const DivisibilityScreen = {


    // =====================================
    // SHOW
    // =====================================

    show: function (
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
                "Divisibility Screen: App Container Not Found"
            );

            return;

        }


        // =====================================
        // GET DIVISIBILITY ACTIVITIES
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
        // BUILD CHILDREN
        // =====================================

        const childrenHTML =
            divisibilityActivities
                .map(
                    function (activity) {

                        const locked =
                            typeof ContentLockManager !==
                            "undefined"

                                ?

                                ContentLockManager.isLocked(
                                    activity.id
                                )

                                :

                                false;


                        return `

                            <button

                                class="activityBtn divisibilityChildBtn"

                                data-id="${activity.id}"

                                ${
                                    locked
                                        ? "disabled"
                                        : ""
                                }>

                                ${
                                    locked
                                        ? "🔒"
                                        : "🎮"
                                }

                                ${activity.title}

                            </button>

                        `;

                    }
                )
                .join("");


        // =====================================
        // SCREEN
        // =====================================

        app.innerHTML = `

            <div
                class="screen divisibilityScreen"
                dir="rtl">

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
        // BIND ACTIVITY BUTTONS
        // =====================================

        this.bindActivityButtons(
            divisibilityActivities
        );


        // =====================================
        // BACK
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
            "Divisibility Screen Displayed:",
            divisibilityActivities.length
        );

    },


    // =====================================
    // BIND ACTIVITY BUTTONS
    // =====================================

    bindActivityButtons: function (
        activityList
    ) {

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


                            const activity =
                                activityList.find(
                                    function (
                                        item
                                    ) {

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


                            // =================================
                            // CONTENT LOCK
                            // =================================

                            if (
                                typeof ContentLockManager !==
                                "undefined"
                            ) {

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

                            }


                            // =================================
                            // NAVIGATION
                            // =================================

                            if (
                                typeof Navigation !==
                                "undefined"
                            ) {

                                Navigation.selectActivity(
                                    activityId
                                );

                            }


                            // =================================
                            // DIFFICULTY
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


                                        // =================================
                                        // UNIFIED ACTIVITY ENTRY
                                        // =================================

                                        if (
                                            typeof App !==
                                            "undefined"

                                            &&

                                            typeof App.startActivity ===
                                            "function"
                                        ) {

                                            App.startActivity(
                                                selectedActivity
                                            );

                                            return;

                                        }


                                        console.error(
                                            "Activity Entry System Not Available"
                                        );

                                    }

                                );


                                return;

                            }


                            // =================================
                            // NO DIFFICULTY MODAL
                            // =================================

                            console.warn(
                                "Difficulty Modal Not Available"
                            );


                            if (
                                typeof App !==
                                "undefined"

                                &&

                                typeof App.startActivity ===
                                "function"
                            ) {

                                App.startActivity(
                                    activity
                                );

                                return;

                            }


                            console.error(
                                "Activity Entry System Not Available"
                            );

                        };

                }
            );

    }

};


// =====================================
// GLOBAL
// =====================================

window.DivisibilityScreen =
    DivisibilityScreen;


// =====================================
// SCREEN BRIDGE
// =====================================
//
// فقط برای سازگاری با کدهای فعلی.
// منطق اصلی گروه بخش‌پذیری داخل
// DivisibilityScreen باقی می‌ماند.
// =====================================

Screen.showDivisibility = function (
    gradeId,
    subjectId,
    chapterId
) {

    if (
        typeof DivisibilityScreen !==
        "undefined"
    ) {

        DivisibilityScreen.show(
            gradeId,
            subjectId,
            chapterId
        );

    }

    else {

        console.error(
            "DivisibilityScreen Not Available"
        );

    }

};


// =====================================
// READY
// =====================================

console.log(
    "Divisibility Screen v2.3 Ready"
);