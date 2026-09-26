// =====================================
// Tahouri Edu Platform
// Dictation Provider
// Version 2.0
// =====================================

(function (window) {
    "use strict";

    const DictationProvider = {
        getContent: function (activityData) {
            const source = activityData && activityData.dictation
                ? activityData.dictation
                : activityData && activityData.content
                    ? activityData.content
                    : activityData || {};

            const settings = {
                keyboardMode: "guided",
                allowRetry: true,
                scorePerCorrect: 10,
                ...(source.settings || {}),
                ...((activityData && activityData.settings) || {})
            };

            const rawQuestions = Array.isArray(source.questions)
                ? source.questions
                : Array.isArray(source.words)
                    ? source.words.map(function (item) {
                        return { ...item, mode: item.mode || "guided-word" };
                    })
                    : [];

            const questions = rawQuestions
                .filter(function (item) {
                    return item && typeof item.answer === "string" && item.answer.trim() !== "";
                })
                .map(function (item, index) {
                    const missing = Array.isArray(item.missing)
                        ? item.missing.map(function (slot) {
                            return {
                                start: Math.max(0, Number(slot.start) || 0),
                                length: Math.max(1, Number(slot.length) || 1),
                                answer: slot.answer || null
                            };
                        })
                        : [];

                    let mode = item.mode || source.mode || "guided-word";
                    if (!["missing-letter", "guided-word", "context"].includes(mode)) mode = "guided-word";

                    if ((mode === "missing-letter" || mode === "context") && missing.length === 0) {
                        mode = "guided-word";
                    }

                    return {
                        id: item.id || "spelling-question-" + (index + 1),
                        mode: mode,
                        answer: item.answer.trim(),
                        prompt: item.prompt || source.instruction || "املای کلمه را کامل کن.",
                        context: item.context || null,
                        masked: item.masked || null,
                        missing: missing,
                        allowedLetters: Array.isArray(item.allowedLetters) ? item.allowedLetters : [],
                        spellingRule: item.spellingRule || null,
                        lesson: item.lesson || source.lesson || null,
                        media: item.media || null,
                        audio: item.audio || null
                    };
                });

            return {
                version: "2.0",
                mode: source.mode || "guided-word",
                instruction: source.instruction || "املای کلمات را کامل کنید.",
                settings: settings,
                questions: questions
            };
        }
    };

    window.DictationProvider = DictationProvider;
})(window);

console.log("Dictation Provider v2.0 Ready");
