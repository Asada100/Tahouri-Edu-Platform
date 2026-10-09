// Tahouri Edu Platform - Composite Activity Provider v1.0
// Normalizes one-question-per-stage activities with independent prompt media.
(function (window) {
    'use strict';

    const PROMPT_MEDIA = new Set(['text', 'image', 'audio']);
    const OPTION_MEDIA = new Set(['text', 'image']);

    const CompositeActivityProvider = {
        getContent(activityData) {
            const source = activityData && (activityData.composite ||
                (activityData.content && activityData.content.composite));
            if (!source || source.mode !== 'composite' || !Array.isArray(source.stages) || !source.stages.length) {
                throw new Error('CompositeActivityProvider: expected composite.stages');
            }

            const stageIds = new Set();
            const stages = source.stages.map((stage, index) => {
                if (!stage || typeof stage !== 'object') throw new Error('Composite stage must be an object');
                const id = String(stage.id || 'stage-' + (index + 1));
                if (stageIds.has(id)) throw new Error('Duplicate composite stage id: ' + id);
                stageIds.add(id);
                if (stage.interaction !== 'choice') {
                    throw new Error('Unsupported composite interaction in stage ' + id + ': ' + stage.interaction);
                }

                const prompt = this.normalizeMedia(stage.prompt, PROMPT_MEDIA, 'prompt in ' + id);
                if (!Array.isArray(stage.options) || stage.options.length < 2) {
                    throw new Error('Composite stage ' + id + ' needs at least two options');
                }
                const optionIds = new Set();
                const options = stage.options.map((option, optionIndex) => {
                    if (!option || typeof option !== 'object') throw new Error('Invalid option in ' + id);
                    const optionId = String(option.id || 'option-' + (optionIndex + 1));
                    if (optionIds.has(optionId)) throw new Error('Duplicate option id in ' + id + ': ' + optionId);
                    optionIds.add(optionId);
                    return { id: optionId, media: this.normalizeMedia(option.media, OPTION_MEDIA, 'option ' + optionId) };
                });
                const answerId = String(stage.answerId ?? '');
                if (!optionIds.has(answerId)) throw new Error('answerId is not an option in ' + id);
                return {
                    id, title: String(stage.title || 'مرحله ' + (index + 1)),
                    instruction: String(stage.instruction || 'پاسخ درست را انتخاب کن.'),
                    interaction: 'choice', prompt, options, answerId
                };
            });
            return { mode: 'composite', instruction: String(source.instruction || ''), stages };
        },

        normalizeMedia(media, allowedTypes, label) {
            if (!media || typeof media !== 'object' || !allowedTypes.has(media.type)) {
                throw new Error('Unsupported media type for ' + label);
            }
            const type = media.type;
            if (type === 'text') {
                const value = String(media.value ?? '').trim();
                if (!value) throw new Error('Text media is empty for ' + label);
                return { type, value };
            }
            const src = String(media.src || '').trim();
            if (!src) throw new Error('Media source is missing for ' + label);
            return { type, src, alt: String(media.alt || '') };
        },

        validate(activityData) { this.getContent(activityData); return true; }
    };

    window.CompositeActivityProvider = CompositeActivityProvider;
    console.log('Composite Activity Provider v1.0 Ready');
})(window);
