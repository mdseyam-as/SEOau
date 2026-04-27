/**
 * AI Configuration
 * Централизованная конфигурация для AI API и моделей
 */

export const AI_CONFIG = {
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  defaultModel: 'google/gemini-3-flash-preview',
  timeout: 30000,
  maxRetries: 3,
  models: {
    writer: ['google/gemini-3-flash-preview', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    visualizer: ['anthropic/claude-3.5-sonnet', 'anthropic/claude-opus-4.1'],
    spam: ['x-ai/grok-2-1212']
  },
  streaming: {
    enabled: true,
    chunkSize: 100
  }
};

export const AIO_CONFIG = {
  enabled: true,
  defaultVisualizerModel: 'anthropic/claude-3.5-sonnet',
  generateVisuals: true,
  generateSchema: true
};

export const RAG_CONFIG = {
  enabled: true,
  topK: 3,
  similarityThreshold: 0.7,
  maxContextLength: 4000
};

/**
 * Получение API ключа для OpenRouter
 * Приоритет: SystemSetting > Environment Variable
 */
export async function getApiKey() {
  const [{ prisma }, { decrypt }] = await Promise.all([
    import('../lib/prisma.js'),
    import('../utils/encryption.js')
  ]);
  
  try {
    const settings = await prisma.systemSetting.findFirst({ where: { id: 'global' } });
    const encryptedKey = settings?.openRouterApiKey;
    const apiKey = encryptedKey ? decrypt(encryptedKey) : process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('API ключ не настроен. Установите OPENROUTER_API_KEY или настройте через админ-панель.');
    }
    
    return apiKey;
  } catch (error) {
    if (error.message.includes('API ключ не настроен')) {
      throw error;
    }
    console.error('[AI Config] Error getting API key:', error);
    throw new Error('Не удалось получить API ключ');
  }
}

/**
 * Получение заголовков для OpenRouter API
 */
export function getHeaders(apiKey, siteName = 'SEO Generator') {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.FRONTEND_URL || 'https://seogenerator.app',
    'X-Title': siteName
  };
}

/**
 * Получение модели для генерации
 */
export function getModelForGeneration(config) {
  const model = config.model || AI_CONFIG.defaultModel;
  
  // Проверяем, что модель в списке разрешённых
  const allowedModels = [...AI_CONFIG.models.writer, ...AI_CONFIG.models.visualizer];
  if (!allowedModels.includes(model)) {
    console.warn(`[AI Config] Model ${model} not in allowed list, using default`);
    return AI_CONFIG.defaultModel;
  }
  
  return model;
}

/**
 * Получение модели для визуализации (AIO)
 */
export function getVisualizerModel(config) {
  return config.visualizerModel || AIO_CONFIG.defaultVisualizerModel;
}

/**
 * Получение модели для проверки спама
 */
export function getSpamModel() {
  return AI_CONFIG.models.spam[0];
}
