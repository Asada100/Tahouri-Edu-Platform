// =====================================
// Tahouri Edu Platform
// Version 5.0
// Components Manager
// Generic Quiz Button System
// Dynamic Quiz Options
// Dashboard + Home + Memory Integration
// =====================================


const Components = {

    isLocked: false,


    // =====================================
    // Dashboard Button
    // =====================================

    bindDashboardButton: function () {

        const dashboardBtn =
            document.getElementById(
                "dashboardBtn"
            );


        if (!dashboardBtn) {

            console.log(
                "Dashboard Button Not Found"
            );

            return;
        }


        dashboardBtn.onclick = function () {

            Navigation.openDashboard();

        };


        console.log(
            "Dashboard Button Connected"
        );

    },


    // =====================================
    // Quiz Buttons
    // Generic System
    // =====================================

    bindQuizButtons: function () {

        const evenBtn =
            document.getElementById(
                "evenBtn"
            );

        const oddBtn =
            document.getElementById(
                "oddBtn"
            );


        if (!evenBtn || !oddBtn) {

            console.log(
                "Quiz Buttons Container Not Found"
            );

            return;

        }


        // =================================
        // گرفتن سؤال فعلی
        // =================================

        const question =
            QuizEngine.getQuestion();


        if (!question) {

            console.warn(
                "Quiz Question Not Found"
            );

            return;

        }


        // =================================
        // گزینه‌های پیش‌فرض
        // =================================

        let option1 = "زوج";

        let option2 = "فرد";


        // =================================
        // اگر سؤال گزینه داشته باشد
        // =================================

        if (
            question.options &&
            Array.isArray(question.options) &&
            question.options.length >= 2
        ) {

            option1 =
                question.options[0];

            option2 =
                question.options[1];

        }


        // =================================
        // تغییر متن دکمه‌ها
        // =================================

        evenBtn.textContent =
            option1;


        oddBtn.textContent =
            option2;


        // =================================
        // فعال کردن دکمه‌ها
        // =================================

        evenBtn.disabled = false;

        oddBtn.disabled = false;


        // =================================
        // دکمه اول
        // =================================

        evenBtn.onclick = function () {

            Components.answer(
                option1
            );

        };


        // =================================
        // دکمه دوم
        // =================================

        oddBtn.onclick = function () {

            Components.answer(
                option2
            );

        };


        console.log(
            "Quiz Buttons Connected:",
            option1,
            option2
        );

    },


    // =====================================
    // Answer
    // =====================================

    answer: function (answer) {


        if (this.isLocked) {

            return;

        }


        this.isLocked = true;


        const evenBtn =
            document.getElementById(
                "evenBtn"
            );


        const oddBtn =
            document.getElementById(
                "oddBtn"
            );


        if (evenBtn) {

            evenBtn.disabled = true;

        }


        if (oddBtn) {

            oddBtn.disabled = true;

        }


        // =================================
        // بررسی پاسخ توسط موتور
        // =================================

        const result =
            QuizEngine.checkAnswer(
                answer
            );


        // =================================
        // نمایش نتیجه
        // =================================

        if (result) {

            Screen.showMessage(

                "✅ پاسخ صحیح",

                "correct"

            );

        }

        else {

            Screen.showMessage(

                "❌ پاسخ اشتباه",

                "wrong"

            );

        }


        // =================================
        // رفتن به سؤال بعد
        // =================================

        setTimeout(function () {


            const nextQuestion =
                QuizEngine.next();


            // =================================
            // سؤال بعدی وجود دارد
            // =================================

            if (nextQuestion) {


                const activity =
                    QuizEngine.activity;


                Screen.showQuiz({

                    title:
                        activity
                            ?
                            activity.title
                            :
                            "آزمون",


                    score:
                        ScoreManager.score,


                    currentQuestion:
                        QuizEngine.currentQuestion + 1,


                    totalQuestions:
                        QuizEngine.questions.length,


                    question:
                        nextQuestion

                });


                Components.isLocked =
                    false;


                Components.bindQuizButtons();


                Components.bindHomeButton();


            }


            // =================================
            // آزمون تمام شده
            // =================================

            else {


                const finalResult =
                    ResultManager.create(

                        QuizEngine.getResult()

                    );


                Components.isLocked =
                    false;


                ResultModal.show(
                    finalResult
                );


            }


        }, 1200);


    },


    // =====================================
    // Memory Cards
    // =====================================

    bindMemoryCards: function () {


        const cards =
            document.querySelectorAll(
                ".memoryCard"
            );


        cards.forEach(function (card) {


            card.onclick =
                function () {


                    const id =
                        Number(
                            this.dataset.id
                        );


                    MemoryEngine.flipCard(
                        id
                    );


                    MemoryEngine.refresh();


                    Components.bindMemoryCards();


                };


        });


    },


    // =====================================
    // Home Button
    // =====================================

    bindHomeButton: function () {


        const homeBtn =
            document.getElementById(
                "homeBtn"
            );


        if (!homeBtn) {

            return;

        }


        homeBtn.onclick =
            function () {

                App.goHome();

            };


    }


};


// =====================================
// Global Access
// =====================================

window.Components =
    Components;


// =====================================
// Ready
// =====================================

console.log(
    "Components Manager Ready"
);