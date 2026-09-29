// Tahouri Edu Platform - Dictation Audio Provider v1.0
(function (window) {
    "use strict";

    const DictationAudioProvider = {
        version: "1.0",
        current: null,

        getForQuestion: function (question) {
            if (!question || !question.audio) return null;
            const audio = question.audio;
            if (typeof audio === "string") return { src: audio, type: "audio/mpeg" };
            if (!audio.src) return null;
            return {
                src: String(audio.src),
                type: audio.type || "audio/mpeg",
                label: audio.label || "پخش واژه"
            };
        },

        stop: function () {
            if (!this.current) return;
            try {
                this.current.pause();
                this.current.currentTime = 0;
            } catch (error) {
                console.warn("DictationAudioProvider: stop failed", error);
            }
            this.current = null;
        },

        play: function (question) {
            const source = this.getForQuestion(question);
            if (!source) return Promise.reject(new Error("Dictation audio is not configured"));

            this.stop();

            const audio = new Audio();
            audio.preload = "metadata";
            audio.src = source.src;
            this.current = audio;

            return audio.play().catch(function (error) {
                return Promise.reject(error);
            });
        }
    };

    window.DictationAudioProvider = DictationAudioProvider;
    console.log("Dictation Audio Provider v1.0 Ready");
})(window);
