/**
 * Streaming Generation Service
 * Сервис для потоковой генерации контента через SSE
 */

import { SSEConnection } from '../utils/sse.js';
import logger from '../utils/logger.js';
import { createApiError, ERROR_CODES } from '../utils/errors.js';
import { getPrompt } from '../prompts/seoPrompt.js';

/**
 * Генерация контента с потоковой передачей
 */
export async function generateContentStream(req, res, options) {
  const { 
    topic, 
    keywords, 
    tone, 
    language, 
    model = 'gemini',
    promptType = 'seo'
  } = options;
  
  const sse = new SSEConnection(req, res);
  const log = logger.child({ requestId: req.id, userId: req.telegramUser?.id });
  
  try {
    log.info({ topic, keywords, model }, 'Starting streaming generation');
    
    // Отправка начального прогресса
    sse.progress(10, 'Подготовка к генерации...');
    
    // Получение промпта
    const basePrompt = getPrompt(promptType);
    const fullPrompt = `${basePrompt}\n\nTopic: ${topic}\nKeywords: ${keywords.join(', ')}\nTone: ${tone}\nLanguage: ${language}`;
    
    sse.progress(20, 'Формирование запроса...');
    
    // Генерация контента (здесь должна быть интеграция с AI API)
    const content = await generateWithAI(model, fullPrompt, (progress, message, chunk) => {
      // Отправка прогресса
      sse.progress(progress, message);
      
      // Если есть чанк данных, отправляем его
      if (chunk) {
        sse.chunk(chunk);
      }
    });
    
    // Отправка завершения
    sse.complete({
      content,
      metadata: {
        model,
        promptType,
        wordCount: content.split(/\s+/).length,
        characterCount: content.length
      }
    });
    
    log.info({ wordCount: content.split(/\s+/).length }, 'Streaming generation completed');
    
  } catch (error) {
    log.error({ error: error.message }, 'Streaming generation failed');
    sse.error(5001, error.message || 'Ошибка генерации контента');
  }
}

/**
 * Генерация с AI API (заглушка - нужно интегрировать с реальным API)
 */
async function generateWithAI(model, prompt, onProgress) {
  // Здесь должна быть интеграция с Gemini/OpenAI/Claude API
  // Для примера - эмуляция генерации
  
  return new Promise((resolve, reject) => {
    try {
      let progress = 30;
      const chunks = [];
      
      // Эмуляция потоковой генерации
      const interval = setInterval(() => {
        progress += 10;
        
        // Генерация случайного чанка
        const chunk = generateRandomChunk();
        chunks.push(chunk);
        
        onProgress(progress, 'Генерация контента...', chunk);
        
        if (progress >= 100) {
          clearInterval(interval);
          resolve(chunks.join('\n\n'));
        }
      }, 500);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Генерация случайного чанка (для тестирования)
 */
function generateRandomChunk() {
  const sentences = [
    'SEO оптимизация является ключевым аспектом цифрового маркетинга.',
    'Правильное использование ключевых слов помогает улучшить позиции в поисковой выдаче.',
    'Качественный контент должен быть полезным для пользователей.',
    'Структура текста играет важную роль в SEO.',
    'Мета-теги и заголовки должны быть оптимизированы.',
    'Внутренние ссылки помогают улучшить навигацию и SEO.',
    'Мобильная оптимизация становится всё более важной.',
    'Скорость загрузки страницы влияет на пользовательский опыт и SEO.',
    'Регулярное обновление контента помогает поддерживать актуальность.',
    'Аналитика данных помогает отслеживать эффективность SEO стратегий.'
  ];
  
  const numSentences = Math.floor(Math.random() * 3) + 2;
  const selectedSentences = [];
  
  for (let i = 0; i < numSentences; i++) {
    const randomIndex = Math.floor(Math.random() * sentences.length);
    selectedSentences.push(sentences[randomIndex]);
  }
  
  return selectedSentences.join(' ');
}

/**
 * Генерация FAQ с потоковой передачей
 */
export async function generateFAQStream(req, res, options) {
  const { topic, keywords, language } = options;
  
  const sse = new SSEConnection(req, res);
  const log = logger.child({ requestId: req.id });
  
  try {
    log.info({ topic }, 'Starting FAQ streaming generation');
    
    sse.progress(10, 'Подготовка к генерации FAQ...');
    
    const prompt = getPrompt('faq');
    const fullPrompt = `${prompt}\n\nTopic: ${topic}\nKeywords: ${keywords.join(', ')}\nLanguage: ${language}`;
    
    sse.progress(30, 'Генерация FAQ...');
    
    // Генерация FAQ (заглушка)
    const faqs = await generateFAQWithAI(fullPrompt, (progress, message) => {
      sse.progress(progress, message);
    });
    
    sse.complete({ faqs });
    
    log.info({ count: faqs.length }, 'FAQ streaming generation completed');
    
  } catch (error) {
    log.error({ error: error.message }, 'FAQ streaming generation failed');
    sse.error(5001, error.message || 'Ошибка генерации FAQ');
  }
}

/**
 * Генерация FAQ с AI API (заглушка)
 */
async function generateFAQWithAI(prompt, onProgress) {
  return new Promise((resolve) => {
    const faqs = [];
    let progress = 40;
    
    const interval = setInterval(() => {
      progress += 15;
      onProgress(progress, 'Генерация FAQ...');
      
      const faq = {
        question: `Вопрос ${faqs.length + 1}: Как оптимизировать контент для SEO?`,
        answer: 'Для оптимизации контента для SEO необходимо использовать релевантные ключевые слова, создавать качественный контент, оптимизировать мета-теги и заголовки, а также следить за структурой текста.'
      };
      
      faqs.push(faq);
      
      if (progress >= 100) {
        clearInterval(interval);
        resolve(faqs);
      }
    }, 800);
  });
}
