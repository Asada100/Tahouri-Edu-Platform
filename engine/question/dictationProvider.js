// =====================================
// Tahouri Edu Platform
// Dictation Provider
// Version 1.0
// =====================================

(function (window) {
    "use strict";

    const DictationProvider = {
        getContent: function (activityData) {
            const source = activityData && activityData.dictation
                ? activityData.dictation
                : activityData && activityData.content
                    ? activityData.content
                    : {};

            const settings = {
                keyboardMode: "target-only",
                distractorCount: 4,
                allowRetry: true,
                scorePerCorrect: 10,
                ...(source.settings || {}),
                ...((activityData && activityData.settings) || {})
            };

            const words = Array.isArray(source.words)
                ? source.words
                    .filter(function (item) {
                        return item && typeof item.answer === "string" && item.answer.trim() !== "";
                    })
                    .map(function (item, index) {
                        return {
                            id: item.id || "word-" + (index + 1),
                            answer: item.answer.trim(),
                            prompt: item.prompt || "کلمه را بنویس.",
                            audio: item.audio || null
                        };
                    })
                : [];

            return {
                mode: source.mode || "word",
                instruction: source.instruction || "کلمه را درست بنویس.",
                settings: settings,
                words: words
            };
        }
    };

    window.DictationProvider = DictationProvider;
})(window);

console.log("Dictation Provider v1.0 Ready");
