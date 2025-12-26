/**
 * Queue Routes
 * Routes для управления очередями задач
 */

import express from 'express';
import { 
  addJob, 
  getQueueStats, 
  cleanQueue,
  QUEUE_NAMES 
} from '../config/queue.js';
import { createApiError, ERROR_CODES } from '../utils/errors.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/queue/generation
 * Добавление задачи генерации в очередь
 */
router.post('/generation', async (req, res) => {
  try {
    const { 
      projectId, 
      topic, 
      keywords, 
      tone, 
      language, 
      model, 
      promptType 
    } = req.body;
    
    // Валидация
    if (!projectId || !topic || !keywords || !Array.isArray(keywords)) {
      throw createApiError('GENERATION_FAILED', {
        details: 'Missing required fields: projectId, topic or keywords'
      });
    }
    
    if (keywords.length === 0) {
      throw createApiError('GENERATION_FAILED', {
        details: 'Keywords array cannot be empty'
      });
    }
    
    // Добавление задачи в очередь
    const job = await addJob(
      QUEUE_NAMES.GENERATION,
      'generate-content',
      {
        projectId,
        topic,
        keywords,
        tone: tone || 'Professional',
        language: language || 'Russian',
        model: model || 'gemini',
        promptType: promptType || 'seo',
        userId: req.telegramUser?.id,
      },
      {
        priority: 1,
        delay: 0,
      }
    );
    
    logger.info({ 
      jobId: job.id, 
      projectId, 
      userId: req.telegramUser?.id 
    }, 'Generation job added to queue');
    
    res.json({
      jobId: job.id,
      status: 'queued',
      message: 'Задача добавлена в очередь',
    });
    
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to add generation job');
    
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Ошибка добавления задачи',
        code: error.code || 5001
      });
    }
  }
});

/**
 * GET /api/queue/stats/:queueName
 * Получение статистики очереди
 */
router.get('/stats/:queueName', async (req, res) => {
  try {
    const { queueName } = req.params;
    
    // Проверка валидности имени очереди
    const validQueues = Object.values(QUEUE_NAMES);
    if (!validQueues.includes(queueName)) {
      throw createApiError('GENERATION_FAILED', {
        details: `Invalid queue name: ${queueName}`
      });
    }
    
    const stats = await getQueueStats(queueName);
    
    res.json({
      queueName,
      stats,
    });
    
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get queue stats');
    
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Ошибка получения статистики',
        code: error.code || 5001
      });
    }
  }
});

/**
 * GET /api/queue/stats
 * Получение статистики всех очередей
 */
router.get('/stats', async (req, res) => {
  try {
    const queueNames = Object.values(QUEUE_NAMES);
    const stats = {};
    
    for (const queueName of queueNames) {
      stats[queueName] = await getQueueStats(queueName);
    }
    
    res.json(stats);
    
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get all queue stats');
    
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Ошибка получения статистики',
        code: error.code || 5001
      });
    }
  }
});

/**
 * POST /api/queue/clean/:queueName
 * Очистка очереди
 */
router.post('/clean/:queueName', async (req, res) => {
  try {
    const { queueName } = req.params;
    const { grace } = req.body;
    
    // Проверка валидности имени очереди
    const validQueues = Object.values(QUEUE_NAMES);
    if (!validQueues.includes(queueName)) {
      throw createApiError('GENERATION_FAILED', {
        details: `Invalid queue name: ${queueName}`
      });
    }
    
    await cleanQueue(queueName, grace || 5000);
    
    logger.info({ queueName, userId: req.telegramUser?.id }, 'Queue cleaned');
    
    res.json({
      queueName,
      message: 'Очередь очищена',
    });
    
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to clean queue');
    
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Ошибка очистки очереди',
        code: error.code || 5001
      });
    }
  }
});

export default router;
