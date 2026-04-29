/**
 * Swagger Configuration
 * Конфигурация для Swagger/OpenAPI документации
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SEO Generator API',
      version: '1.0.0',
      description: 'API для генерации SEO-оптимизированного контента с использованием AI',
      contact: {
        name: 'SEO Generator',
        email: 'support@seogenerator.app',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.seogenerator.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        telegramAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-telegram-init-data',
          description: 'Telegram WebApp initData для аутентификации',
        },
      },
    },
    security: [
      {
        telegramAuth: [],
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Аутентификация пользователей',
      },
      {
        name: 'Projects',
        description: 'Управление проектами',
      },
      {
        name: 'Generation',
        description: 'Генерация контента',
      },
      {
        name: 'Streaming',
        description: 'Потоковая генерация через SSE',
      },
      {
        name: 'Queue',
        description: 'Управление очередями задач',
      },
      {
        name: 'History',
        description: 'История генераций',
      },
      {
        name: 'Settings',
        description: 'Настройки пользователя',
      },
    ],
  },
  apis: [
    './routes/*.js',
    './middleware/*.js',
  ],
};

const specs = swaggerJsdoc(options);

/**
 * Middleware для Swagger UI
 */
export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve);
  app.use('/api-docs', swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SEO Generator API Documentation',
  }));
}

export { specs };
