/**
 * Rate Limiting Middleware
 * Использует централизованную конфигурацию из config/rateLimits.js
 */

import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/app.js';
import logger from '../utils/logger.js';

/**
 * Rate limiting по IP (для защиты от DDoS)
 */
export const ipRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.general.windowMs,
  max: RATE_LIMITS.general.max,
  keyGenerator: (req) => req.ip,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем если это Telegram WebApp (initData присутствует)
    return !!req.headers['x-telegram-init-data'];
  },
  handler: (req, res) => {
    logger.warn({
      requestId: req.id,
      ip: req.ip,
      action: 'rate_limit_exceeded',
      type: 'ip'
    }, 'IP rate limit exceeded');
    res.status(429).json({ 
      error: 'Too many requests from this IP',
      code: 4291
    });
  }
});

/**
 * Rate limiting по user ID (для защиты от злоупотребления)
 */
export const userRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.general.windowMs,
  max: RATE_LIMITS.general.max,
  keyGenerator: (req) => req.telegramUser?.id?.toString() || req.ip,
  message: 'Too many requests from this user',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.telegramUser?.role === 'admin',
  handler: (req, res) => {
    logger.warn({
      requestId: req.id,
      userId: req.telegramUser?.id,
      action: 'rate_limit_exceeded',
      type: 'user'
    }, 'User rate limit exceeded');
    res.status(429).json({ 
      error: 'Too many requests from this user',
      code: 4291
    });
  }
});

/**
 * Rate limiting для генерации (более строгий)
 */
export const generateRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.generate.windowMs,
  max: RATE_LIMITS.generate.max,
  keyGenerator: (req) => req.telegramUser?.id?.toString() || req.ip,
  message: 'Too many generation requests',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.telegramUser?.role === 'admin',
  handler: (req, res) => {
    logger.warn({
      requestId: req.id,
      userId: req.telegramUser?.id,
      action: 'rate_limit_exceeded',
      type: 'generate'
    }, 'Generation rate limit exceeded');
    res.status(429).json({ 
      error: 'Too many generation requests',
      code: 4292
    });
  }
});

/**
 * Rate limiting для SEO аудита
 */
export const seoAuditRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.seoAudit.windowMs,
  max: RATE_LIMITS.seoAudit.max,
  keyGenerator: (req) => req.ip,
  message: 'Too many SEO audit requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      requestId: req.id,
      ip: req.ip,
      action: 'rate_limit_exceeded',
      type: 'seo_audit'
    }, 'SEO audit rate limit exceeded');
    res.status(429).json({ 
      error: 'Too many SEO audit requests',
      code: 4291
    });
  }
});
