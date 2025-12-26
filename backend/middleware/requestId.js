/**
 * Request ID Middleware
 * Генерирует уникальный ID для каждого запроса
 */

import crypto from 'crypto';
import logger from '../utils/logger.js';

export function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  
  req.startTime = Date.now();
  
  logger.info({
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.telegramUser?.id
  }, 'Request started');
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info({
      requestId: req.id,
      action: 'response_sent',
      duration: `${duration}ms`,
      statusCode: res.statusCode
    }, 'Request completed');
  });
  
  next();
}
