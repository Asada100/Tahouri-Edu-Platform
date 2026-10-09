// Tahouri Edu Platform - Composite Activity Screen v1.0
(function (window) {
    'use strict';

    const CompositeActivityScreen = {
        connected: false,
        activity: null,
        state: null,

        init() {
            if (this.connected || !window.EventManager) return;
            window.EventManager.on('activityReady', payload => {
                if (!payload || payload.engineName !== 'composite' || !payload.result) return;
                this.activity = payload.activity || {};
                this.state = payload.result;
                this.render();
            });
            this.connected = true;
            console.log('Composite Activity Screen v1.0 Ready');
        },

        escape(value) {
            return String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[char]));
        },

        renderMedia(media, isPrompt) {
            if (!media) return '';
            if (media.type === 'text') return '<span>' + this.escape(media.value) + '</span>';
            if (media.type === 'image') return '<img class="compositeMediaImage" src="' +
                this.escape(media.src) + '" alt="' + this.escape(media.alt || '') + '">';
            if (media.type === 'audio' && isPrompt) return '<audio class="compositePromptAudio" controls preload="none" aria-label="پخش صدای پرسش" src="' +
                this.escape(media.src) + '">مرورگر شما پخش صدا را پشتیبانی نمی‌کند.</audio><span class="compositeAudioFallback" hidden>پخش این صدا ممکن نیست؛ فایل صوتی را بررسی کنید.</span>';
            return '';
        },

        render() {
            const app = document.getElementById('app');
            const state = this.state;
            const stage = state && state.stage;
            if (!app || !state || !stage) return;
            const answer = state.answers[state.currentStage];
            const options = stage.options.map(option => {
                const selected = answer && answer.optionId === option.id;
                const status = selected ? (answer.correct ? ' is-correct' : ' is-wrong') : '';
                return '<button type="button" class="compositeOption' + status + '" data-composite-option="' +
                    this.escape(option.id) + '"' + (answer ? ' disabled' : '') + '>' +
                    this.renderMedia(option.media, false) + '</button>';
            }).join('');
            const progress = 'مرحله ' + (state.currentStage + 1) + ' از ' + state.totalStages;
            const feedback = !answer ? '' : '<p class="compositeFeedback ' +
                (answer.correct ? 'correct' : 'wrong') + '" role="status">' +
                (answer.correct ? 'آفرین! پاسخ درست است.' : 'اشکالی ندارد؛ پاسخ درست را در مرحلهٔ بعد به خاطر بسپار.') +
                '</p>';
            const nextLabel = state.currentStage + 1 < state.totalStages ? 'مرحلهٔ بعد' : 'پایان فعالیت';
            app.innerHTML = '<section class="screen compositeActivityScreen" dir="rtl">' +
                '<h1>' + this.escape(this.activity.title || 'فعالیت ترکیبی') + '</h1>' +
                '<div class="compositeProgress">' + progress + '</div>' +
                (stage.title ? '<h2>' + this.escape(stage.title) + '</h2>' : '') +
                '<p class="compositeInstruction">' + this.escape(stage.instruction) + '</p>' +
                '<div class="compositePrompt">' + this.renderMedia(stage.prompt, true) + '</div>' +
                '<div class="compositeOptions">' + options + '</div>' + feedback +
                (answer ? '<button type="button" id="compositeNextBtn" class="compositeNextBtn">' + nextLabel + '</button>' : '') +
                '<button type="button" id="compositeBackBtn" class="compositeBackBtn">بازگشت به فعالیت‌ها</button>' +
                '</section>';
            const audio = app.querySelector('.compositePromptAudio');
            if (audio) audio.addEventListener('error', function () {
                const fallback = app.querySelector('.compositeAudioFallback');
                if (fallback) fallback.hidden = false;
            });
            app.querySelectorAll('[data-composite-option]').forEach(button => {
                button.addEventListener('click', () => {
                    const result = window.CompositeActivityEngine.answer(button.getAttribute('data-composite-option'));
                    if (!result) return;
                    this.state = result.state;
                    this.render();
                });
            });
            const next = document.getElementById('compositeNextBtn');
            if (next) next.addEventListener('click', () => {
                const result = window.CompositeActivityEngine.next();
                if (result && !result.activityId) {
                    this.state = result;
                    this.render();
                }
            });
            const back = document.getElementById('compositeBackBtn');
            if (back) back.addEventListener('click', () => {
                if (window.App && typeof window.App.showActivities === 'function') window.App.showActivities();
            });
        }
    };

    window.CompositeActivityScreen = CompositeActivityScreen;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CompositeActivityScreen.init(), { once: true });
    } else {
        CompositeActivityScreen.init();
    }
})(window);
