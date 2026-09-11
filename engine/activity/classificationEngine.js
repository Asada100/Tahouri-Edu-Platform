// =====================================
// Tahouri Edu Platform
// Classification Engine
// Version 1.1
// =====================================

(function (window) {
    'use strict';

    const ClassificationEngine = {
        state: null,
        activityData: null,
        content: null,
        handler: null,

        start(activityData) {
            this.reset();
            this.activityData = activityData || {};

            if (!window.ClassificationProvider) {
                throw new Error('ClassificationProvider is not available');
            }

            this.content = window.ClassificationProvider.getContent(this.activityData);
            const mode = this.content.mode || 'choice';

            if (!window.ClassificationTypeRegistry || !window.ClassificationTypeRegistry.has(mode)) {
                throw new Error(`Unsupported classification mode: ${mode}`);
            }

            this.handler = window.ClassificationTypeRegistry.get(mode);
            if (this.handler && typeof this.handler.prepare === 'function') {
                this.handler.prepare(this.content);
            }

            this.state = {
                started: true,
                finished: false,
                locked: false,
                totalItems: this.content.items.length,
                classifiedItems: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                moves: 0,
                score: 0,
                items: this.content.items.slice(),
                categories: this.content.categories.slice(),
                currentStage: null,
                classifications: {}
            };

            return this.getState();
        },

        selectCategory(categoryId) {
            if (!this.handler || typeof this.handler.selectCategory !== 'function') {
                return categoryId;
            }
            return this.handler.selectCategory(categoryId);
        },

        classifyItem(itemId, categoryId) {
            if (!this.state || this.state.finished) return null;

            const item = this.state.items.find(i => i.id === itemId);
            if (!item || this.state.classifications[itemId]) return null;

            const category = this.state.categories.find(c => c.id === categoryId);
            if (!category) return null;

            this.state.moves += 1;

            const correct = this.handler && typeof this.handler.classify === 'function'
                ? !!this.handler.classify(item, categoryId)
                : item.categoryId === categoryId;

            this.state.classifications[itemId] = {
                categoryId,
                correct
            };
            this.state.classifiedItems += 1;

            if (correct) {
                this.state.correctAnswers += 1;
                this.state.score += this.getScorePerCorrect();
            } else {
                this.state.wrongAnswers += 1;
            }

            if (this.state.classifiedItems >= this.state.totalItems) {
                return this.finish();
            }

            return {
                itemId,
                categoryId,
                correct,
                state: this.getState()
            };
        },

        finish() {
            if (!this.state || this.state.finished) return this.getResult();

            this.state.finished = true;
            this.state.locked = true;
            const percentage = this.state.totalItems
                ? Math.round((this.state.correctAnswers / this.state.totalItems) * 100)
                : 0;

            let result = {
                activityId: this.activityData && this.activityData.id,
                score: this.state.score,
                percentage,
                correctAnswers: this.state.correctAnswers,
                wrongAnswers: this.state.wrongAnswers,
                totalQuestions: this.state.totalItems,
                moves: this.state.moves,
                completed: true
            };

            if (window.ActivityResult && typeof window.ActivityResult.create === 'function') {
                result = window.ActivityResult.create({
                    activityId: this.activityData && this.activityData.id,
                    score: this.state.score,
                    percentage,
                    correctAnswers: this.state.correctAnswers,
                    wrongAnswers: this.state.wrongAnswers,
                    totalQuestions: this.state.totalItems,
                    moves: this.state.moves,
                    pairs: this.state.totalItems,
                    totalPairs: this.state.totalItems
                });
            }

            this.state.result = result;

            if (typeof EventManager !== 'undefined' && typeof EventManager.emit === 'function') {
                EventManager.emit('activityFinished', result);
            }

            return result;
        },

        getScorePerCorrect() {
            const settings = this.activityData && this.activityData.settings;
            return Number(settings && settings.scorePerCorrect) || 10;
        },

        getState() {
            return this.state ? JSON.parse(JSON.stringify(this.state)) : null;
        },

        getSessionState() {
            return this.getState();
        },

        restoreSession(state) {
            if (!state) return false;
            this.state = JSON.parse(JSON.stringify(state));
            return true;
        },

        getResult() {
            return this.state && this.state.result ? this.state.result : null;
        },

        reset() {
            this.state = null;
            this.activityData = null;
            this.content = null;
            this.handler = null;
        }
    };

    window.ClassificationEngine = ClassificationEngine;
})(window);
