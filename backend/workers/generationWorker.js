/**
 * Generation Worker
 * Воркер для обработки задач генерации контента
 */

import { createWorker, QUEUE_NAMES } from '../config/queue.js';
import logger from '../utils/logger.js';
import { getPrompt } from '../prompts/seoPrompt.js';
import { prisma } from '../lib/prisma.js';

/**
 * Обработчик задачи генерации
 */
async function processGeneration(job) {
  const { 
    projectId, 
    topic, 
    keywords, 
    tone, 
    language, 
    model, 
    promptType 
  } = job.data;
  
  const log = logger.child({ jobId: job.id, projectId });
  
  try {
    log.info({ topic, keywords, model }, 'Processing generation job');
    
    // Обновление статуса задачи
    await updateJobStatus(job.id, 'processing', 10);
    
    // Получение промпта
    const basePrompt = getPrompt(promptType);
    const fullPrompt = `${basePrompt}\n\nTopic: ${topic}\nKeywords: ${keywords.join(', ')}\nTone: ${tone}\nLanguage: ${language}`;
    
    await updateJobStatus(job.id, 'processing', 30);
    
    // Генерация контента
    const content = await generateWithAI(model, fullPrompt, async (progress) => {
      await updateJobStatus(job.id, 'processing', progress);
    });
    
    await updateJobStatus(job.id, 'processing', 90);
    
    // Сохранение результата в базу данных
    const result = await saveGenerationResult(projectId, {
      content,
      metadata: {
        model,
        promptType,
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
        keywords,
        tone,
        language,
      },
    });
    
    await updateJobStatus(job.id, 'completed', 100);
    
    log.info({ resultId: result.id }, 'Generation job completed');
    
    return result;
    
  } catch (error) {
    log.error({ error: error.message }, 'Generation job failed');
    await updateJobStatus(job.id, 'failed', 0, error.message);
    throw error;
  }
}

/**
 * Генерация с AI API
 */
async function generateWithAI(model, prompt, onProgress) {
  // Здесь должна быть интеграция с реальным AI API
  // Для примера - эмуляция генерации
  
  return new Promise((resolve, reject) => {
    try {
      let progress = 40;
      const chunks = [];
      
      const interval = setInterval(() => {
        progress += 10;
        onProgress(progress);
        
        const chunk = generateRandomChunk();
        chunks.push(chunk);
        
        if (progress >= 90) {
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
 * Обновление статуса задачи
 */
async function updateJobStatus(jobId, status, progress, error = null) {
  try {
    await prisma.backgroundTask.update({
      where: { jobId },
      data: {
        status,
        progress,
        error,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error({ error: error.message, jobId }, 'Failed to update job status');
  }
}

/**
 * Сохранение результата генерации
 */
async function saveGenerationResult(projectId, data) {
  const { content, metadata } = data;
  
  return await prisma.generationHistory.create({
    data: {
      projectId,
      content,
      metadata: JSON.stringify(metadata),
      createdAt: new Date(),
    },
  });
}

/**
 * Создание воркера
 */
export const generationWorker = createWorker(
  QUEUE_NAMES.GENERATION,
  processGeneration,
  {
    concurrency: 2, // Обработка 2 задач одновременно
  }
);

// Обработка событий воркера
generationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Generation job completed');
});

generationWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, 'Generation job failed');
});

generationWorker.on('error', (error) => {
  logger.error({ error: error.message }, 'Generation worker error');
});
