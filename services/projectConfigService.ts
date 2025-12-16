import { GenerationConfig } from '../types';

const PROJECT_CONFIG_KEY = 'seo_gen_project_configs';

interface ProjectConfigs {
    [projectId: string]: GenerationConfig;
}

export const projectConfigService = {
    // Получить настройки для конкретного проекта
    getConfig: (projectId: string): GenerationConfig | null => {
        try {
            const configs = localStorage.getItem(PROJECT_CONFIG_KEY);
            if (!configs) return null;

            const parsedConfigs: ProjectConfigs = JSON.parse(configs);
            return parsedConfigs[projectId] || null;
        } catch (e) {
            console.error('Error loading project config:', e);
            return null;
        }
    },

    // Сохранить настройки для проекта
    saveConfig: (projectId: string, config: GenerationConfig): void => {
        try {
            const configs = localStorage.getItem(PROJECT_CONFIG_KEY);
            const parsedConfigs: ProjectConfigs = configs ? JSON.parse(configs) : {};

            // Сохраняем только важные поля конфигурации, исключаем competitorFiles
            const configToSave: GenerationConfig = {
                websiteName: config.websiteName,
                targetCountry: config.targetCountry,
                targetUrl: config.targetUrl,
                topic: config.topic,
                lsiKeywords: config.lsiKeywords,
                competitorUrls: config.competitorUrls,
                exampleContent: config.exampleContent,
                tone: config.tone,
                style: config.style,
                minChars: config.minChars,
                maxChars: config.maxChars,
                minParas: config.minParas,
                maxParas: config.maxParas,
                model: config.model,
                generationMode: config.generationMode || 'seo',
                // competitorFiles не сохраняем, т.к. они занимают много места
            };

            parsedConfigs[projectId] = configToSave;
            localStorage.setItem(PROJECT_CONFIG_KEY, JSON.stringify(parsedConfigs));
        } catch (e) {
            console.error('Error saving project config:', e);
        }
    },

    // Удалить настройки проекта
    deleteConfig: (projectId: string): void => {
        try {
            const configs = localStorage.getItem(PROJECT_CONFIG_KEY);
            if (!configs) return;

            const parsedConfigs: ProjectConfigs = JSON.parse(configs);
            delete parsedConfigs[projectId];
            localStorage.setItem(PROJECT_CONFIG_KEY, JSON.stringify(parsedConfigs));
        } catch (e) {
            console.error('Error deleting project config:', e);
        }
    },

    // Очистить все настройки (для отладки)
    clearAll: (): void => {
        localStorage.removeItem(PROJECT_CONFIG_KEY);
    }
};
