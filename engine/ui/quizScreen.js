// =====================================
// Tahouri Edu Platform
// Version 1.2
// Quiz Screen
//
// Responsible for:
// - Quiz UI Rendering
// - Question Display
// - Score Display
// - Answer Buttons
// - Activity Ready Integration
// - Generic Session Resume Integration
//
// Execution remains in QuizEngine
// =====================================

const QuizScreen = {

    init: function () {
        if (typeof EventManager === "undefined") {
            console.error("Quiz Screen: EventManager Not Available");
            return;
        }

        if (this.activityReadyConnected) return;

        EventManager.on("activityReady", function (payload) {
            QuizScreen.handleActivityReady(payload);
        });

        EventManager.on("activitySessionRestored", function (payload) {
            QuizScreen.handleSessionRestored(payload);
        });

        this.activityReadyConnected = true;

        console.log("Quiz Screen: Activity Ready Listener Connected");
    },

    handleActivityReady: function (payload) {
        if (!payload) return;

        const engineName = payload.engineName;
        if (engineName !== "QuizEngine" && engineName !== "quiz") return;

        const activity = payload.activity;
        const engine = payload.engine;
        const result = payload.result;

        if (!activity) {
            console.error("Quiz Screen: Activity Missing");
            return;
        }

        if (!engine) {
            console.error("Quiz Screen: Engine Missing");
            return;
        }

        if (!result) {
            console.error("Quiz Screen: Question Missing");
            return;
        }

        console.log("Quiz Screen: Activity Ready Received", activity.id);

        this.reset();
        this.show({
            title: activity.title,
            score: ScoreManager.score,
            currentQuestion: engine.currentQuestion + 1,
            totalQuestions: engine.questions.length,
            question: result
        });
    },

    handleSessionRestored: function (payload) {
        if (!payload) return;

        const engineName = String(payload.engineName || "").toLowerCase();
        if (engineName !== "quiz" && engineName !== "quizengine") return;

        const activity = payload.activity;
        const engine = payload.engine;
        const question = payload.result || (engine && typeof engine.getQuestion === "function" ? engine.getQuestion() : null);

        if (!activity || !engine || !question) {
            console.error("Quiz Screen: Restored session data incomplete");
            return;
        }

        this.reset();
        this.show({
            title: activity.title,
            score: ScoreManager.score,
            currentQuestion: engine.currentQuestion + 1,
            totalQuestions: engine.questions.length,
            question: question
        });

        console.log("Quiz Screen: Session Restored", {
            activityId: activity.id,
            currentQuestion: engine.currentQuestion + 1,
            totalQuestions: engine.questions.length,
            score: ScoreManager.score
        });
    },

    show: function (data) {
        if (!data) {
            console.error("Quiz Screen: Data Missing");
            return;
        }

        const app = document.getElementById("app");
        if (!app) {
            console.error("Quiz Screen: App Container Not Found");
            return;
        }

        const question = data.question;
        if (!question) {
            console.error("Quiz Screen: Question Missing");
            return;
        }

        const options = Array.isArray(question.options)
            ? question.options
            : ["زوج", "فرد"];

        app.innerHTML = `
            <div class="quizScreen" dir="rtl">
                <h1>پلتفرم آموزشی طهوری</h1>
                <h2>${data.title || "آزمون"}</h2>
                <div class="scoreBox">امتیاز: ${data.score || 0}</div>
                <div class="questionBox">سؤال ${data.currentQuestion || 1} از ${data.totalQuestions || 1}</div>
                <h2 class="quizQuestion">${question.text || ""}</h2>
                <div id="quizOptions" class="quizOptions">
                    ${options.map(function (option) {
                        return `
                            <button class="quizOptionBtn" data-option="${String(option)}">
                                ${option}
                            </button>
                        `;
                    }).join("")}
                </div>
                <div id="messageBox" class="quizMessage"></div>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents: function () {
        const buttons = document.querySelectorAll(".quizOptionBtn");

        if (!buttons.length) {
            console.warn("Quiz Screen: No Option Buttons Found");
            return;
        }

        buttons.forEach(function (button) {
            button.onclick = function () {
                QuizScreen.answer(this.dataset.option);
            };
        });

        console.log("Quiz Screen Buttons Connected:", buttons.length);
    },

    answer: function (answer) {
        if (this.isLocked) return;

        this.isLocked = true;

        const buttons = document.querySelectorAll(".quizOptionBtn");
        buttons.forEach(function (button) {
            button.disabled = true;
        });

        const correct = QuizEngine.checkAnswer(answer);

        if (correct) {
            this.showMessage("✅ پاسخ صحیح", "correct");
        } else {
            this.showMessage("❌ پاسخ اشتباه", "wrong");
        }

        setTimeout(function () {
            QuizScreen.next();
        }, 1200);
    },

    next: function () {
        const nextQuestion = QuizEngine.next();

        if (nextQuestion) {
            const activity = QuizEngine.activity;

            this.isLocked = false;
            this.show({
                title: activity ? activity.title : "آزمون",
                score: ScoreManager.score,
                currentQuestion: QuizEngine.currentQuestion + 1,
                totalQuestions: QuizEngine.questions.length,
                question: nextQuestion
            });
            return;
        }

        this.isLocked = false;
    },

    showMessage: function (message, type) {
        const box = document.getElementById("messageBox");
        if (!box) return;

        box.textContent = message;
        box.className = "quizMessage " + (type || "");
    },

    reset: function () {
        this.isLocked = false;
    },

    isLocked: false,
    activityReadyConnected: false
};

window.QuizScreen = QuizScreen;
QuizScreen.init();

console.log("Quiz Screen v1.2 Ready");