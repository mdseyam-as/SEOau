/**
 * Streaming Routes
 * Routes для потоковой генерации контента через SSE
 */

import express from 'express';
import { generateContentStream, generateFAQStream } from '../services/streamingGenerationService.js';
import { createApiError, ERROR_CODES } from '../utils/errors.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/streaming/generate
 * Потоковая генерация контента
 */
router.post('/generate', async (req, res) => {
  try {
    const { topic, keywords, tone, language, model, promptType, useKnowledgeBase, ragTopK } = req.body;
    
    // Валидация
    if (!topic || !keywords || !Array.isArray(keywords)) {
      throw createApiError('GENERATION_FAILED', {
        details: 'Missing required fields: topic or keywords'
      });
    }
    
    if (keywords.length === 0) {
      throw createApiError('GENERATION_FAILED', {
        details: 'Keywords array cannot be empty'
      });
    }
    
    // Запуск потоковой генерации
    await generateContentStream(req, res, {
      topic,
      keywords,
      tone: tone || 'Professional',
      language: language || 'Russian',
      model: model || 'gemini',
      promptType: promptType || 'seo',
      useKnowledgeBase: useKnowledgeBase !== false,
      ragTopK: ragTopK || 5
    });
    
  } catch (error) {
    logger.error({ error: error.message }, 'Streaming generation error');
    
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Ошибка генерации контента',
        code: error.code || 5001
      });
    }
  }
});

/**
 * POST /api/streaming/faq
 * Потоковая генерация FAQ
 */
router.post('/faq', async (req, res) => {
  try {
    const { topic, keywords, language } = req.body;
    
    // Валидация
    if (!topic || !keywords || !Array.isArray(keywords)) {
      throw createApiError('GENERATION_FAILED', {
        details: 'Missing required fields: topic or keywords'
      });
    }
    
    // Запуск потоковой генерации FAQ
    await generateFAQStream(req, res, {
      topic,
      keywords,
      language: language || 'Russian'
    });
    
  } catch (error) {
    logger.error({ error: error.message }, 'FAQ streaming generation error');
    
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Ошибка генерации FAQ',
        code: error.code || 5001
      });
    }
  }
});

export default router;
