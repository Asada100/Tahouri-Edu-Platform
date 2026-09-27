// =====================================
// Tahouri Edu Platform
// Dictation Screen
// Version 2.0
// =====================================

(function (window) {
    "use strict";

    const DictationScreen = {
        init: function () {
            if (typeof EventManager === "undefined") return;
            EventManager.on("activityReady", function (payload) {
                if (!payload || payload.engineName !== "dictation") return;
                DictationScreen.render(payload.result);
            });

            EventManager.on("dictationQuestionChanged", function (state) {
                if (!state) return;
                DictationScreen.render(state);
            });

            EventManager.on("dictationQuestionCompleted", function (state) {
                if (!state) return;
                DictationScreen.render(state);
            });
        },

        render: function (state) {
            const app = document.getElementById("app");
            if (!app || !state) return;
            const q = state.currentQuestion || {};
            const mode = state.mode || q.mode || "guided-word";
            const rows = Array.isArray(state.keyboardRows) ? state.keyboardRows : [];
            const isGuided = mode === "guided-word";
            const isContext = mode === "context";
            const rule = this.getRuleGuide(q, mode);

            app.innerHTML = `
                <div class="screen dictationScreen" dir="rtl">
                    <div class="dictationCard">
                        <div class="dictationHeader">
                            <span class="dictationIcon" aria-hidden="true">✍️</span>
                            <h1>املا</h1>
                        </div>
                        <div class="dictationQuestionTitle">املای کلمه</div>
                        <p class="dictationInstruction">${this.escape(rule.title)}</p>
                        <div class="dictationRuleGuide">${this.escape(rule.guide)}</div>
                        ${q.context ? `<div class="dictationContext">${this.escape(q.context)}</div>` : ""}
                        ${this.renderMedia(q)}

                        <div class="dictationAnswer${state.questionCompleted ? " is-complete" : ""}" id="dictationAnswer" aria-live="polite">
                            ${this.renderAnswer(state, isGuided)}
                        </div>

                        <div class="dictationFeedback" id="dictationFeedback" aria-live="polite"></div>

                        <div class="dictationKeyboard" id="dictationKeyboard">
                            ${rows.map(row => `<div class="dictationKeyboardRow">${row.map(key => {
                                const cls = ["dictationKey", key.active ? "is-active" : "is-disabled", key.expected ? "is-expected" : ""].filter(Boolean).join(" ");
                                return `<button type="button" class="${cls}" data-key="${this.escape(key.key)}" ${key.active ? "" : "disabled"}>${this.escape(key.key)}</button>`;
                            }).join("")}</div>`).join("")}
                            <div class="dictationUtilityRow">
                                <button type="button" class="dictationUtility dictationSpace" id="dictationSpace" aria-label="کلید فاصله"></button>
                                <button type="button" class="dictationUtility" id="dictationBackspace" aria-label="حذف">⌫</button>
                            </div>
                        </div>

                        <div class="dictationProgress">
                            سؤال ${Number(state.currentIndex) + 1} از ${Number(state.totalQuestions) || 0}
                        </div>
                        ${state.questionCompleted ? `
                            <button type="button" class="dictationNextButton" id="dictationNextButton">
                                ${Number(state.currentIndex) + 1 >= Number(state.totalQuestions) ? "پایان" : "کلمه بعدی"}
                            </button>
                        ` : ""}
                    </div>
                </div>
            `;
            this.bind();
        },

        renderMedia: function (question) {
            const media = window.SpellingMediaProvider && typeof window.SpellingMediaProvider.getForQuestion === "function"
                ? window.SpellingMediaProvider.getForQuestion(question)
                : question && question.media;

            if (!media || media.type !== "image" || !media.src) return "";

            return `
                <figure class="dictationMedia">
                    <img src="${this.escape(media.src)}" alt="${this.escape(media.alt || "تصویر آموزشی")}" loading="lazy">
                    ${media.title ? `<figcaption>${this.escape(media.title)}</figcaption>` : ""}
                </figure>
            `;
        },

        renderContext: function (state) {
            const q = state.currentQuestion || {};
            const targets = Array.isArray(q.targets) && q.targets.length ? q.targets : [q];
            const template = q.contextTemplate || q.context || "";
            if (!template) return "";
            const currentIndex = Number(state.currentTargetIndex) || 0;
            const slots = new Set((state.missingSlots || []).slice(Number(state.currentSlotIndex) || 0));

            return this.escape(template).replace(/\{\{(\d+)\}\}/g, function (match, rawIndex) {
                const index = Number(rawIndex);
                const target = targets[index];
                if (!target) return match;
                const answer = String(target.answer || "");
                const chars = Array.from(answer);

                if (index < currentIndex) {
                    return '<span class="dictationContextTarget is-complete">' + DictationScreen.escape(answer) + '</span>';
                }

                if (index > currentIndex) {
                    const future = target.masked || "....";
                    return '<span class="dictationContextTarget is-pending">' + DictationScreen.escape(future) + '</span>';
                }

                const visible = chars.map(function (char, charIndex) {
                    return slots.has(charIndex)
                        ? '<span class="dictationMissing">....</span>'
                        : DictationScreen.escape(char);
                }).join("");
                return '<span class="dictationContextTarget is-current">' + visible + '</span>';
            });
        },

        renderAnswer: function (state, isGuided) {
            if (isGuided) {
                const actual = state.displayText || "";
                const guide = state.guideChar || "";
                return `<span class="dictationTyped">${this.escape(actual)}</span><span class="dictationGhost">${this.escape(guide)}</span>`;
            }

            const q = state.currentQuestion || {};
            const missingSlots = Array.isArray(state.missingSlots) ? state.missingSlots : [];
            const currentSlot = Math.max(0, Number(state.currentSlotIndex) || 0);
            const answerChars = Array.from(q.answer || "");
            const pendingSlots = new Set(missingSlots.slice(currentSlot));

            if (!missingSlots.length || currentSlot >= missingSlots.length) {
                return DictationScreen.escape(q.answer || "");
            }

            let rendered = "";
            let chunk = "";
            answerChars.forEach(function (char, index) {
                if (pendingSlots.has(index)) {
                    if (chunk) {
                        rendered += DictationScreen.escape(chunk);
                        chunk = "";
                    }
                    rendered += '<span class="dictationMissing" aria-label="جای خالی">ـ.....ـ</span>';
                } else {
                    chunk += char;
                }
            });
            if (chunk) rendered += DictationScreen.escape(chunk);
            return rendered;
        },

        bind: function () {
            const self = this;

            document.querySelectorAll(".dictationKey.is-active").forEach(function (button) {
                button.onclick = function () {
                    self.handleInput(this.dataset.key || "");
                };
            });

            const space = document.getElementById("dictationSpace");
            if (space) space.onclick = function () { self.handleInput(" "); };

            const nextButton = document.getElementById("dictationNextButton");
            if (nextButton) nextButton.onclick = function () {
                if (window.DictationEngine && typeof window.DictationEngine.nextQuestion === "function") {
                    window.DictationEngine.nextQuestion();
                }
            };

            const backspace = document.getElementById("dictationBackspace");
            if (backspace) backspace.onclick = function () {
                const changed = window.DictationEngine.backspace();
                if (changed) self.render(window.DictationEngine.getState());
            };

            document.onkeydown = function (event) {
                if (!window.DictationEngine || !window.DictationEngine.state || window.DictationEngine.state.isFinished) return;

                if (event.key === "Backspace") {
                    event.preventDefault();
                    const changed = window.DictationEngine.backspace();
                    if (changed) self.render(window.DictationEngine.getState());
                    return;
                }

                if (event.key === " ") {
                    event.preventDefault();
                    self.handleInput(" ");
                    return;
                }

                if (event.key && event.key.length === 1) self.handleInput(event.key);
            };
        },

        getRuleGuide: function (question, mode) {
            if (mode === "guided-word") {
                return { title: "کلمه را کامل و با دقت بنویس.", guide: "حرف‌ها را به ترتیب انتخاب کن." };
            }
            const rule = question && question.spellingRule ? question.spellingRule : "";
            const guides = {
                h: { title: "کدام حرف درست است؟ «ه» یا «ح»", guide: "حرف درست را برای جای خالی انتخاب کن." },
                "s-sad-se": { title: "کدام حرف درست است؟ «س»، «ص» یا «ث»", guide: "حرف درست را برای جای خالی انتخاب کن." },
                gh: { title: "کدام حرف درست است؟ «ق» یا «غ»", guide: "حرف درست را برای جای خالی انتخاب کن." },
                z: { title: "کدام حرف درست است؟ «ز»، «ذ»، «ض» یا «ظ»", guide: "حرف درست را برای جای خالی انتخاب کن." }
            };
            return guides[rule] || { title: "حرف درست را برای جای خالی انتخاب کن.", guide: "به کلمه و متن درس دقت کن." };
        },

        handleInput: function (char) {
            const result = window.DictationEngine.inputChar(char);
            if (!result) return;

            if (!result.correct) {
                this.flash("wrong");
                this.showFeedback("اشتباه است؛ دوباره تلاش کن.", "wrong");
                return;
            }

            this.showFeedback("", "");

            if (result.complete || result.completed) {
                this.render(window.DictationEngine.getState());
                return;
            }
            if ((window.DictationEngine.getState() || {}).isFinished) return;
            this.render(window.DictationEngine.getState());
        },

        flash: function (type) {
            const answer = document.getElementById("dictationAnswer");
            if (!answer) return;
            answer.classList.remove("is-wrong");
            void answer.offsetWidth;
            if (type === "wrong") answer.classList.add("is-wrong");
        },

        showFeedback: function (message, type) {
            const box = document.getElementById("dictationFeedback");
            if (!box) return;
            box.textContent = message || "";
            box.className = "dictationFeedback" + (type ? " " + type : "");
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

console.log("Dictation Screen v2.0 Ready");
