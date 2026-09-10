// =====================================
// Tahouri Edu Platform
// Smart Question Selector v1.0
// Smart Content — Adaptive Question Ordering
//
// Responsibilities:
// - Use question-level performance data
// - Prioritize previously weak questions
// - Keep unseen questions in the middle
// - Keep well-mastered questions later
//
// Scope:
// - Quiz questions only
// - Does not modify QuizEngine
// - Does not modify Memory / Puzzle
// - Does not modify Statistics / Progress
//
// Important:
// This selector changes ORDER only.
// It never removes questions and never changes
// the educational content itself.
// =====================================

const SmartQuestionSelector = {

    VERSION: "1.0",

    initialized: false,

    init: function () {

        if (this.initialized) {
            return;
        }

        if (
            typeof QuestionProvider === "undefined" ||
            typeof QuestionProvider.getQuestions !== "function"
        ) {
            console.error(
                "SmartQuestionSelector: QuestionProvider Not Available"
            );
            return;
        }

        if (
            typeof QuestionPerformanceManager === "undefined" ||
            typeof QuestionPerformanceManager.get !== "function"
        ) {
            console.error(
                "SmartQuestionSelector: QuestionPerformanceManager Not Available"
            );
            return;
        }

        const originalGetQuestions =
            QuestionProvider.getQuestions.bind(QuestionProvider);

        const selector = this;

        QuestionProvider.getQuestions = async function (activityData) {

            const questions =
                await originalGetQuestions(activityData);

            return selector.select(
                questions,
                activityData
            );
        };

        this.initialized = true;

        console.log(
            "Smart Question Selector v1.0 Ready"
        );
    },

    select: function (questions, activityData) {

        if (!Array.isArray(questions) || questions.length < 2) {
            return Array.isArray(questions) ? questions : [];
        }

        const activityId =
            activityData && activityData.id
                ? activityData.id
                : null;

        if (!activityId) {
            return questions;
        }

        const scored = questions.map((question, index) => ({
            question: question,
            index: index,
            score: this.getPriorityScore(
                question,
                activityId
            )
        }));

        const hasKnownPerformance = scored.some(
            item => item.score !== null
        );

        if (!hasKnownPerformance) {
            return questions;
        }

        scored.sort((a, b) => {

            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return a.index - b.index;
        });

        const result = scored.map(
            item => item.question
        );

        console.log(
            "Smart Content: Question Order Adapted",
            activityId
        );

        return result;
    },

    getPriorityScore: function (question, activityId) {

        if (!question) {
            return null;
        }

        let record = null;

        try {
            record = QuestionPerformanceManager.get(
                question,
                activityId
            );
        }
        catch (error) {
            console.warn(
                "SmartQuestionSelector: Performance lookup failed",
                error
            );
            return null;
        }

        // Unseen questions are deliberately kept below
        // known weak questions but above mastered questions.
        if (!record) {
            return 50;
        }

        const attempts =
            Number(record.attempts) || 0;

        const correct =
            Number(record.correct) || 0;

        const wrong =
            Number(record.wrong) || 0;

        if (attempts <= 0) {
            return 50;
        }

        const accuracy =
            correct / attempts;

        // Priority range:
        // 100 = repeatedly wrong
        // 50  = unseen
        // 0   = fully mastered
        let priority =
            Math.round((1 - accuracy) * 100);

        // A recent wrong answer receives a small additional
        // priority so the system revisits it sooner.
        if (record.lastAnswerCorrect === false) {
            priority += 15;
        }

        // Repeated wrong attempts are a stronger signal.
        if (wrong >= 2) {
            priority += 10;
        }

        return Math.min(
            125,
            Math.max(0, priority)
        );
    }
};

window.SmartQuestionSelector =
    SmartQuestionSelector;

SmartQuestionSelector.init();
