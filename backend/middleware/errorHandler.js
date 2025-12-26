/**
 * Centralized Error Handler
 * Унифицированная обработка всех ошибок API
 */

import logger from '../utils/logger.js';
import { isApiError } from '../utils/errors.js';

/**
 * Главный обработчик ошибок
 */
export function errorHandler(err, req, res, next) {
  const requestId = req.id || 'unknown';
  
  // Если ошибка уже обработана, пропускаем
  if (res.headersSent) {
    return;
  }
  
  // Логируем ошибку
  if (isApiError(err)) {
    logger.warn({
      requestId,
      error: err.message,
      code: err.code,
      httpStatus: err.httpStatus,
      userId: req.telegramUser?.id,
      path: req.path,
      method: req.method,
      details: err.details
    }, 'API error');
  } else {
    logger.error({
      requestId,
      error: err.message,
      stack: err.stack,
      userId: req.telegramUser?.id,
      path: req.path,
      method: req.method
    }, 'Unexpected error');
  }
  
  // Отправляем ответ
  const statusCode = isApiError(err) ? err.httpStatus : 500;
  const message = isApiError(err) 
    ? err.message 
    : (process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка' : err.message);
  
  res.status(statusCode).json({
    error: message,
    code: isApiError(err) ? err.code : 5000,
    requestId
  });
}

/**
 * Обработчик для 404 Not Found
 */
export function notFoundHandler(req, res) {
  logger.warn({
    requestId: req.id,
    path: req.path,
    method: req.method,
    userId: req.telegramUser?.id
  }, 'Route not found');
  
  res.status(404).json({
    error: 'Route not found',
    code: 4040,
    requestId: req.id
  });
}

/**
 * Обработчик для асинхронных ошибок
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
