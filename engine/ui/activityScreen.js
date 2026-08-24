// =====================================
// Tahouri Edu Platform
// Version 3.3
// Activity Screen
//
// Responsibilities:
// - Activity List UI
// - Activity Groups
// - Content Lock
// - Activity Selection
// - Back Navigation
// - Unified Activity Entry
//
// Group example:
// - divisibility
//
// Activity execution:
// App.startActivity()
//
// Architecture:
//
// ActivityScreen
//      ↓
// App.startActivity()
//      ↓
// ActivityManager
//      ↓
// EngineManager
//      ↓
// Engine
//      ↓
// activityReady
//      ↓
// Activity UI
//
// ActivityScreen does NOT call
// ActivityManager.load() directly.
// =====================================


const ActivityScreen = {


    // =====================================
    // SHOW
    // =====================================

    show: function (
        activityList
    ) {

        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "Activity Screen: App Container Not Found"
            );

            return;

        }


        if (
            !Array.isArray(
                activityList
            )
        ) {

            console.error(
                "Activity Screen: Invalid Activity List"
            );

            return;

        }


        // =====================================
        // SEPARATE GROUPS
        // =====================================

        const groupedActivities = {};

        const normalActivities = [];


        activityList.forEach(
            function (
                activity
            ) {

                if (
                    activity.group
                ) {

                    if (
                        !groupedActivities[
                            activity.group
                        ]
                    ) {

                        groupedActivities[
                            activity.group
                        ] = [];

                    }


                    groupedActivities[
                        activity.group
                    ].push(
                        activity
                    );

                }

                else {

                    normalActivities.push(
                        activity
                    );

                }

            }
        );


        // =====================================
        // BUILD NORMAL ACTIVITIES
        // =====================================

        let activitiesHTML =
            "";


        normalActivities.forEach(
            function (
                activity
            ) {

                const locked =
                    typeof ContentLockManager !==
                    "undefined"

                        ?

                        ContentLockManager.isLocked(
                            activity.id
                        )

                        :

                        false;


                activitiesHTML += `

                    <button
                        class="activitySelectBtn"
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
        );


        // =====================================
        // BUILD ACTIVITY GROUPS
        // =====================================

        Object.keys(
            groupedActivities
        ).forEach(
            function (
                groupId
            ) {

                const groupActivities =
                    groupedActivities[
                        groupId
                    ];


                let groupLocked =
                    true;


                groupActivities.forEach(
                    function (
                        activity
                    ) {

                        if (
                            typeof ContentLockManager ===
                            "undefined"
                        ) {

                            groupLocked =
                                false;

                            return;

                        }


                        if (
                            ContentLockManager.canOpen(
                                activity.id
                            )
                        ) {

                            groupLocked =
                                false;

                        }

                    }
                );


                const groupTitle =
                    ActivityScreen.getGroupTitle(
                        groupId
                    );


                activitiesHTML += `

                    <button
                        class="activityGroupBtn"
                        data-group="${groupId}"
                        ${
                            groupLocked
                                ? "disabled"
                                : ""
                        }>

                        ${
                            groupLocked
                                ? "🔒"
                                : "📚"
                        }

                        ${groupTitle}

                    </button>

                `;

            }
        );


        // =====================================
        // EMPTY STATE
        // =====================================

        if (
            activitiesHTML === ""
        ) {

            activitiesHTML = `

                <p class="activityEmptyMessage">

                    فعالیتی برای این فصل وجود ندارد.

                </p>

            `;

        }


        // =====================================
        // RENDER
        // =====================================

        app.innerHTML = `

            <div
                class="screen activityScreen"
                dir="rtl">

                <h1>

                    انتخاب فعالیت

                </h1>


                <div
                    id="activityList"
                    class="activityList">

                    ${activitiesHTML}

                </div>


                <div
                    id="activityScreenMessage"
                    class="activityScreenMessage">
                </div>


                <br>


                <button
                    id="backChaptersBtn">

                    ⬅ بازگشت به فصل‌ها

                </button>

            </div>

        `;


        // =====================================
        // BIND NORMAL ACTIVITIES
        // =====================================

        this.bindActivityButtons(
            normalActivities
        );


        // =====================================
        // BIND GROUPS
        // =====================================

        this.bindGroupButtons(
            groupedActivities
        );


        // =====================================
        // BACK TO CHAPTERS
        // =====================================

        const backButton =
            document.getElementById(
                "backChaptersBtn"
            );


        if (backButton) {

            backButton.onclick =
                function () {

                    if (
                        typeof Screen !==
                        "undefined"

                        &&

                        typeof Screen.showChapters ===
                        "function"
                    ) {

                        const gradeId =
                            AppState.grade;

                        const subjectId =
                            AppState.subject;


                        Screen.showChapters(
                            gradeId,
                            subjectId
                        );

                        return;

                    }


                    console.error(
                        "Activity Screen: Back To Chapters Not Available"
                    );

                };

        }


        console.log(
            "Activity Screen Displayed:",
            activityList.length
        );

    },


    // =====================================
    // ACTIVITY BUTTONS
    // =====================================

    bindActivityButtons: function (
        activityList
    ) {

        document
            .querySelectorAll(
                ".activitySelectBtn"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            const id =
                                this.dataset.id;


                            const activity =
                                activityList.find(
                                    function (
                                        item
                                    ) {

                                        return (
                                            item.id ===
                                            id
                                        );

                                    }
                                );


                            if (!activity) {

                                console.error(
                                    "Activity Screen: Activity Not Found:",
                                    id
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
                                        id
                                    )
                                ) {

                                    ActivityScreen.showMessage(
                                        "🔒 این فعالیت هنوز باز نشده است."
                                    );

                                    return;

                                }

                            }


                            // =================================
                            // START ACTIVITY
                            // =================================

                            ActivityScreen.startActivity(
                                activity
                            );

                        };

                }
            );

    },


    // =====================================
    // GROUP BUTTONS
    // =====================================

    bindGroupButtons: function (
        groupedActivities
    ) {

        document
            .querySelectorAll(
                ".activityGroupBtn"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            const groupId =
                                this.dataset.group;


                            const groupActivities =
                                groupedActivities[
                                    groupId
                                ];


                            if (
                                !groupActivities

                                ||

                                groupActivities.length === 0
                            ) {

                                return;

                            }


                            ActivityScreen.openGroup(
                                groupId,
                                groupActivities
                            );

                        };

                }
            );

    },


    // =====================================
    // OPEN GROUP
    // =====================================

    openGroup: function (
        groupId,
        activities
    ) {

        console.log(
            "Opening Activity Group:",
            groupId
        );


        // =================================
        // DIVISIBILITY
        // =================================

        if (
            groupId ===
            "divisibility"
        ) {

            if (
                typeof DivisibilityScreen !==
                "undefined"

                &&

                typeof DivisibilityScreen.show ===
                "function"
            ) {

                const firstActivity =
                    activities[0];


                DivisibilityScreen.show(

                    firstActivity.grade,

                    firstActivity.subject,

                    firstActivity.chapter

                );


                return;

            }


            if (
                typeof Screen !==
                "undefined"

                &&

                typeof Screen.showDivisibility ===
                "function"
            ) {

                const firstActivity =
                    activities[0];


                Screen.showDivisibility(

                    firstActivity.grade,

                    firstActivity.subject,

                    firstActivity.chapter

                );


                return;

            }


            console.error(
                "Divisibility Screen Not Available"
            );


            return;

        }


        // =================================
        // UNSUPPORTED GROUP
        // =================================

        console.warn(
            "Activity Group Not Supported Yet:",
            groupId
        );

    },


    // =====================================
    // GROUP TITLE
    // =====================================

    getGroupTitle: function (
        groupId
    ) {

        const titles = {

            divisibility:
                "بخش‌پذیری"

        };


        return (

            titles[groupId]

            ||

            groupId

        );

    },


    // =====================================
    // START ACTIVITY
    // =====================================

    startActivity: function (
        activity
    ) {

        if (!activity) {

            console.error(
                "Activity Screen: Activity Missing"
            );

            return;

        }


        // =================================
        // NAVIGATION
        // =================================

        if (
            typeof Navigation !==
            "undefined"
        ) {

            Navigation.selectActivity(
                activity.id
            );

        }


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

            console.log(
                "Activity Screen: Start Activity:",
                activity
            );


            App.startActivity(
                activity
            );


            return;

        }


        // =================================
        // NO FALLBACK TO ACTIVITY MANAGER
        // =================================
        //
        // ActivityScreen must not bypass
        // the official Activity Entry Point.
        //
        // Official path:
        //
        // App.startActivity()
        //
        // =================================

        console.error(
            "Activity Screen: App.startActivity Not Available"
        );

    },


    // =====================================
    // MESSAGE
    // =====================================

    showMessage: function (
        message
    ) {

        const element =
            document.getElementById(
                "activityScreenMessage"
            );


        if (!element) {

            return;

        }


        element.textContent =
            message;

    }

};


// =====================================
// GLOBAL
// =====================================

window.ActivityScreen =
    ActivityScreen;


// =====================================
// READY
// =====================================

console.log(
    "Activity Screen v3.3 Ready"
);