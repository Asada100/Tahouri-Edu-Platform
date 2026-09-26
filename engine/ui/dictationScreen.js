// =====================================
// Tahouri Edu Platform
// Dictation Screen
// Version 1.0
// =====================================

(function (window) {
    "use strict";

    const DictationScreen = {
        currentAnswer: "",

        init: function () {
            if (typeof EventManager === "undefined") return;

            EventManager.on("activityReady", function (payload) {
                if (!payload || payload.engineName !== "dictation") return;
                DictationScreen.render(payload.result);
            });
        },

        render: function (state) {
            const app = document.getElementById("app");
            if (!app || !state) return;

            this.currentAnswer = "";
            const keyboard = Array.isArray(state.keyboard) ? state.keyboard : [];

            app.innerHTML = `
                <div class="screen dictationScreen" dir="rtl">
                    <div class="dictationCard">
                        <div class="dictationHeader">
                            <span class="dictationIcon">✍️</span>
                            <h1>املای کلمه</h1>
                        </div>
                        <p class="dictationInstruction">${this.escape(state.currentWord && state.currentWord.prompt || "کلمه را درست بنویس.")}</p>

                        <div class="dictationAnswer" id="dictationAnswer" aria-live="polite"></div>

                        <div class="dictationKeyboard" id="dictationKeyboard">
                            ${keyboard.map(function (letter) {
                                return `<button type="button" class="dictationKey" data-letter="${DictationScreen.escape(letter)}">${DictationScreen.escape(letter)}</button>`;
                            }).join("")}
                        </div>

                        <div class="dictationActions">
                            <button type="button" class="dictationAction dictationBackspace" id="dictationBackspace">⌫</button>
                            <button type="button" class="dictationAction dictationSubmit" id="dictationSubmit">ثبت پاسخ</button>
                        </div>

                        <div class="dictationProgress">
                            سؤال ${Number(state.currentIndex) + 1} از ${Number(state.totalQuestions) || 0}
                        </div>
                    </div>
                </div>
            `;

            this.bind();
        },

        bind: function () {
            const self = this;

            document.querySelectorAll(".dictationKey").forEach(function (button) {
                button.onclick = function () {
                    self.currentAnswer += this.dataset.letter || "";
                    self.updateAnswer();
                };
            });

            const backspace = document.getElementById("dictationBackspace");
            if (backspace) {
                backspace.onclick = function () {
                    self.currentAnswer = Array.from(self.currentAnswer).slice(0, -1).join("");
                    self.updateAnswer();
                };
            }

            const submit = document.getElementById("dictationSubmit");
            if (submit) {
                submit.onclick = function () {
                    if (!self.currentAnswer) return;
                    const result = window.DictationEngine.submitAnswer(self.currentAnswer);
                    if (!result) return;

                    if (!result.correct && result.retryAllowed) {
                        self.showFeedback("دوباره تلاش کن.");
                        return;
                    }

                    if (result.correct) {
                        self.showFeedback("درست است ✓");
                    } else {
                        self.showFeedback("پاسخ درست: " + result.target);
                    }

                    setTimeout(function () {
                        const next = window.DictationEngine.getState();
                        if (next && !next.isFinished) self.render(next);
                    }, 350);
                };
            }
        },

        updateAnswer: function () {
            const box = document.getElementById("dictationAnswer");
            if (box) box.textContent = this.currentAnswer || " ";
        },

        showFeedback: function (message) {
            const box = document.getElementById("dictationAnswer");
            if (box) box.textContent = message;
        },

        escape: function (value) {
            return String(value == null ? "" : value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }
    };

    window.DictationScreen = DictationScreen;
    DictationScreen.init();
})(window);

console.log("Dictation Screen v1.0 Ready");
