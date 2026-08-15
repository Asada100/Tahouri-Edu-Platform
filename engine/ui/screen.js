// =====================================
// Tahouri Edu Platform
// Version 4.5
// Screen Manager
// Home + Grades + Profile
// Continue Learning Navigation Fix
// =====================================



const Screen = {



    // =====================================
    // Home Screen
    // =====================================


    showHome: function () {



        const app =
            document.getElementById("app");



        if (!app) {



            console.error(
                "App Container Not Found"
            );



            return;


        }



        app.innerHTML = `



<div class="screen">



    <h1>


        پلتفرم آموزشی طهوری


    </h1>



    <p>


        به مرکز کنترل پلتفرم خوش آمدید


    </p>



    <hr>



    <div class="home-buttons">



        <button
            id="continueLearningBtn">


            ▶ ادامه یادگیری


        </button>



        <button
            id="gradesBtn">


            🎓 انتخاب پایه


        </button>



        <button
            id="profileBtn">


            👤 پروفایل من


        </button>



        <button
            id="dashboardBtn">


            📊 داشبورد


        </button>



        <button
            id="reportsBtn">


            📈 گزارش‌ها


        </button>



        <button
            id="achievementBtn">


            🏆 دستاوردها


        </button>



        <button
            id="settingsBtn">


            ⚙ تنظیمات


        </button>



    </div>



</div>



        `;



        // ============================
        // Grades
        // ============================


        document
            .getElementById("gradesBtn")
            .onclick = function () {



                Screen.showGrades();



            };



        // ============================
        // Profile
        // ============================


        document
            .getElementById("profileBtn")
            .onclick = function () {



                Screen.showProfile();



            };



        // ============================
        // Dashboard
        // ============================


        document
            .getElementById("dashboardBtn")
            .onclick = function () {



                Navigation.openDashboard();



            };



        // ============================
        // Reports
        // ============================


        document
            .getElementById("reportsBtn")
            .onclick = function () {



                if (
                    typeof ReportsController !==
                    "undefined"
                ) {



                    ReportsController.open();



                }



            };



        // ============================
        // Continue Learning
        // ============================


        document
            .getElementById("continueLearningBtn")
            .onclick = function () {



                // ============================
                // Check Activity History
                // ============================


                if (
                    typeof ActivityHistory ===
                    "undefined"
                ) {



                    alert(
                        "سیستم سابقه فعالیت در دسترس نیست."
                    );



                    return;


                }



                const activity =
                    ActivityHistory.get();



                // ============================
                // No Activity
                // ============================


                if (!activity) {



                    alert(
                        "هنوز فعالیتی برای ادامه وجود ندارد."
                    );



                    return;


                }



                // ============================
                // Check Content Lock
                // ============================


                if (
                    typeof ContentLockManager !==
                    "undefined"
                    &&
                    !ContentLockManager.canOpen(
                        activity.id
                    )
                ) {



                    alert(
                        "این فعالیت در حال حاضر قفل است."
                    );



                    return;


                }



                // ============================
                // Activity Manager
                // ============================


                if (
                    typeof ActivityManager !==
                    "undefined"
                    &&
                    typeof ActivityManager.load ===
                    "function"
                ) {



                    console.log(
                        "Continue Learning:",
                        activity
                    );



                    // =================================
                    // Restore Full Navigation History
                    // =================================
                    //
                    // مسیر واقعی فعالیت را دوباره
                    // در Navigation ایجاد می‌کنیم:
                    //
                    // Grade
                    //   ↓
                    // Subject
                    //   ↓
                    // Chapter
                    //   ↓
                    // Activity
                    //
                    // این باعث می‌شود بعد از پایان
                    // فعالیت، دکمه بازگشت کار کند.
                    // =================================


                    if (
                        typeof Navigation !==
                        "undefined"
                    ) {



                        if (activity.grade) {



                            Navigation.selectGrade(
                                activity.grade
                            );



                        }



                        if (activity.subject) {



                            Navigation.selectSubject(
                                activity.subject
                            );



                        }



                        if (activity.chapter) {



                            Navigation.selectChapter(
                                activity.chapter
                            );



                        }



                        Navigation.selectActivity(
                            activity.id
                        );



                    }



                    // ============================
                    // Load Activity
                    // ============================


                    ActivityManager.load(
                        activity
                    );



                    return;


                }



                console.error(
                    "ActivityManager Not Available"
                );


            };



        // ============================
        // Achievement
        // ============================


        document
            .getElementById("achievementBtn")
            .onclick = function () {



                alert(
                    "در نسخه بعدی فعال می‌شود."
                );



            };



        // ============================
        // Settings
        // ============================


        document
            .getElementById("settingsBtn")
            .onclick = function () {



                alert(
                    "در نسخه بعدی فعال می‌شود."
                );



            };



        console.log(
            "Home Screen Displayed"
        );



    },



    // =====================================
    // Profile Screen
    // =====================================


    showProfile: function () {



        if (
            typeof ProfileScreen ===
            "undefined"
        ) {



            console.error(
                "ProfileScreen Not Found"
            );



            return;


        }



        ProfileScreen.show();



        console.log(
            "Profile Screen Opened"
        );



    },



    // =====================================
    // Grades Screen
    // =====================================


    showGrades: function () {



        const app =
            document.getElementById("app");



        app.innerHTML = `



<div class="screen">



<h1>



پلتفرم آموزشی طهوری



</h1>



<h2>



انتخاب پایه



</h2>



<div id="gradesContainer">



${grades.map(function (grade) {



return `



<button



class="gradeBtn"



data-id="${grade.id}">



${grade.title}



</button>



`;



}).join("")}



</div>



<br>



<button
id="backHomeBtn">



🏠 بازگشت به خانه



</button>



</div>



`;



        document
            .querySelectorAll(".gradeBtn")
            .forEach(function (btn) {



                btn.onclick = function () {



                    const gradeId =
                        this.dataset.id;



                    Navigation.selectGrade(
                        gradeId
                    );



                    Screen.showSubjects(
                        gradeId
                    );



                };



            });



        document
            .getElementById(
                "backHomeBtn"
            )
            .onclick = function () {



                Screen.showHome();



            };



        console.log(
            "Grades Displayed",
            grades.length
        );



    },



    // =====================================
    // Subjects Screen
    // =====================================


    showSubjects: function (gradeId) {



        const app =
            document.getElementById("app");



        const gradeSubjects =
            subjects.filter(function (subject) {



                return subject.grades.includes(
                    gradeId
                );



            });



        app.innerHTML = `



<div class="screen">



<h1>



انتخاب درس



</h1>



<div id="subjectsContainer">



${gradeSubjects.map(function(subject){



return `



<button



class="subjectBtn"



data-id="${subject.id}">



${subject.title}



</button>



`;



}).join("")}



</div>



<br>



<button
id="backGradesBtn">



⬅ بازگشت به پایه‌ها



</button>



</div>



`;



        document
            .querySelectorAll(".subjectBtn")
            .forEach(function (btn) {



                btn.onclick = function () {



                    const subjectId =
                        this.dataset.id;



                    Navigation.selectSubject(
                        subjectId
                    );



                    Screen.showChapters(
                        gradeId,
                        subjectId
                    );



                };



            });



        document
            .getElementById(
                "backGradesBtn"
            )
            .onclick = function () {



                Screen.showGrades();



            };



    },



    // =====================================
    // Chapters Screen
    // =====================================


    showChapters: function (
        gradeId,
        subjectId
    ) {



        const app =
            document.getElementById("app");



        const subjectChapters =
            chapters.filter(function (chapter) {



                return (



                    chapter.grade === gradeId &&



                    chapter.subject === subjectId



                );



            });



        app.innerHTML = `



<div class="screen">



<h1>



انتخاب فصل



</h1>



<div id="chaptersContainer">



${subjectChapters.map(function(chapter){



return `



<button



class="chapterBtn"



data-id="${chapter.id}">



${chapter.title}



</button>



`;



}).join("")}



</div>



<br>



<button
id="backSubjectsBtn">



⬅ بازگشت به درس‌ها



</button>



</div>



`;



        document
            .querySelectorAll(".chapterBtn")
            .forEach(function (btn) {



                btn.onclick = function () {



                    const chapterId =
                        this.dataset.id;



                    Navigation.selectChapter(
                        chapterId
                    );



                    Screen.showActivities(
                        gradeId,
                        subjectId,
                        chapterId
                    );



                };



            });



        document
            .getElementById(
                "backSubjectsBtn"
            )
            .onclick = function () {



                Screen.showSubjects(
                    gradeId
                );



            };



    },



    // =====================================
    // Activities Screen
    // =====================================


    showActivities: function (


        gradeId,


        subjectId,


        chapterId


    ) {



        const app =
            document.getElementById("app");



        const chapterActivities =
            activities.filter(function(activity){



                return (



                    activity.grade === gradeId &&



                    activity.subject === subjectId &&



                    activity.chapter === chapterId



                );



            });



        app.innerHTML = `



<div class="screen">



<h1>



انتخاب فعالیت



</h1>



<div id="activitiesContainer">



${chapterActivities.map(function(activity){



const locked =



ContentLockManager.isLocked(
    activity.id
);



return `



<button



class="activityBtn"



data-id="${activity.id}"



${locked ? "disabled" : ""}>



${locked ? "🔒" : "🎮"}



${activity.title}



</button>



`;



}).join("")}



</div>



<br>



<button
id="backChaptersBtn">



⬅ بازگشت به فصل‌ها



</button>



</div>



`;



        document
            .querySelectorAll(".activityBtn")
            .forEach(function(btn){



                btn.onclick = function(){



                    const activityId =
                        this.dataset.id;



                    if(



                        !ContentLockManager.canOpen(
                            activityId
                        )



                    ){



                        alert(
                            "این فعالیت هنوز قفل است."
                        );



                        return;



                    }



                    Navigation.selectActivity(
                        activityId
                    );



                    const activity =



                    activities.find(function(item){



                        return item.id === activityId;



                    });



                    ActivityManager.load(
                        activity
                    );



                };



            });



        document
            .getElementById(
                "backChaptersBtn"
            )
            .onclick = function(){



                Screen.showChapters(



                    gradeId,



                    subjectId



                );



            };



    },



    // =====================================
    // Quiz Screen
    // =====================================


    showQuiz: function(data){



        const app =
            document.getElementById("app");



        app.innerHTML = `



<div class="quizScreen">



    <h1>



        پلتفرم آموزشی طهوری



    </h1>



    <h2>



        ${data.title}



    </h2>



    <div class="scoreBox">



        امتیاز:
        ${data.score}



    </div>



    <div class="questionBox">



        سؤال
        ${data.currentQuestion}



        از



        ${data.totalQuestions}



    </div>



    <h2>



        ${data.question.text}



    </h2>



    <button id="evenBtn">



        زوج



    </button>



    <button id="oddBtn">



        فرد



    </button>



    <div id="messageBox"></div>



</div>



        `;



    },



    // =====================================
    // Memory Screen
    // =====================================


    showMemory: function(data){



        const app =
            document.getElementById("app");



        app.innerHTML = `



<div class="memoryScreen">



<h1>



پلتفرم آموزشی طهوری



</h1>



<hr>



<h2>



${data.title}



</h2>



<div class="scoreBox">



امتیاز:



${ScoreManager.score}



</div>



<div class="memoryBoard">



${data.cards.map(function(card){



return `



<button



class="memoryCard"



data-id="${card.id}">



${



card.flipped ||



card.matched



?



card.value



:



"❓"



}



</button>



`;



}).join("")}



</div>



</div>



`;



    },



    // =====================================
    // Dashboard Screen
    // =====================================


    showDashboard: function(){



        Navigation.openDashboard();



    },



    // =====================================
    // Reports Screen
    // =====================================


    showReports: function(){



        if(



            typeof ReportsController !==
            "undefined"



        ){



            ReportsController.open();



        }



    },



    // =====================================
    // Message
    // =====================================


    showMessage: function(



        message,



        type



    ){



        const box =



            document.getElementById(



                "messageBox"



            );



        if(!box){



            return;



        }



        box.innerHTML =
            message;



        box.className =
            type;



    },



    // =====================================
    // Finish Screen
    // =====================================


    showFinish: function(result){



        console.log(



            "SHOW FINISH",



            result



        );



        ResultModal.show(



            result



        );



    }



};



// =====================================
// Global Access
// =====================================


window.Screen =
    Screen;



// =====================================
// Ready
// =====================================


console.log(



    "Screen Manager Ready"



);
// =====================================
// Puzzle Screen Bridge
// =====================================

Screen.showPuzzle = function (state) {

    if (
        typeof PuzzleScreen !==
        "undefined"
    ) {

        PuzzleScreen.show(
            state
        );

    }
    else {

        console.error(
            "PuzzleScreen Not Available"
        );

    }

};