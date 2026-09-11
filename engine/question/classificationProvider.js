// Tahouri Edu Platform - Classification Provider v1.0
(function (window) {
    'use strict';
    const ClassificationProvider = {
        lastContent: null,
        getContent(activityData) {
            const data = this.extractClassificationData(activityData);
            const content = this.normalize(data);
            this.lastContent = content;
            return content;
        },
        extractClassificationData(activityData) {
            if (activityData && activityData.classification) return activityData.classification;
            if (activityData && activityData.content && activityData.content.classification) return activityData.content.classification;
            throw new Error('Classification data not found');
        },
        normalize(data) {
            if (!data || !Array.isArray(data.categories) || !Array.isArray(data.items)) {
                throw new Error('Invalid classification structure');
            }
            const categories = data.categories.map((c, i) => ({ id: String(c.id ?? i), title: String(c.title ?? c.name ?? c.id ?? i) }));
            const categoryIds = new Set(categories.map(c => c.id));
            const items = data.items.map((item, i) => {
                const normalized = { id: String(item.id ?? i), content: item.content ?? item.text ?? '', type: item.type || 'text', categoryId: String(item.categoryId ?? '') };
                if (!categoryIds.has(normalized.categoryId)) throw new Error(`Invalid categoryId for item: ${normalized.id}`);
                return normalized;
            });
            return { type: 'classification', mode: data.mode || 'choice', instruction: data.instruction || '', categories, items };
        },
        validate(data) { this.normalize(data); return true; },
        getLastContent() { return this.lastContent; },
        reset() { this.lastContent = null; }
    };
    window.ClassificationProvider = ClassificationProvider;
})(window);
