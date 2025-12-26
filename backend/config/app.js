/**
 * Application Configuration
 * Централизованная конфигурация приложения
 */

export const APP_CONFIG = {
  name: 'SEO Generator',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'https://seogenerator.app',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  webhookUrl: process.env.WEBAPP_URL || 'https://seogenerator.app'
};

export const LIMITS = {
  maxKeywords: 100,
  maxCompetitorUrls: 10,
  maxExampleContentLength: 50000,
  maxTopicLength: 10000,
  maxContentLength: 200000,
  maxInternalLinks: 50,
  maxKnowledgeBaseFiles: 10,
  maxBackgroundTasks: 5
};

export const CACHE_TTL = {
  settings: 300, // 5 минут
  plans: 600, // 10 минут
  users: 300, // 5 минут
  generation: 3600, // 1 час
  serpResults: 1800 // 30 минут
};

export const RATE_LIMITS = {
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 минут
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    skipSuccessfulRequests: true
  },
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20'),
    skipFailedRequests: true
  },
  generate: {
    windowMs: parseInt(process.env.RATE_LIMIT_GENERATE_WINDOW_MS || '60000'), // 1 минута
    max: parseInt(process.env.RATE_LIMIT_GENERATE_MAX || '5'),
    skip: (req) => req.telegramUser?.role === 'admin'
  },
  seoAudit: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUDIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_AUDIT_MAX || '10')
  }
};
