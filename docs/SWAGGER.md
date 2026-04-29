# Swagger/OpenAPI Documentation

## Обзор

Swagger (OpenAPI) - это спецификация для документации REST API. Она позволяет автоматически генерировать интерактивную документацию для всех endpoints.

## Установка зависимостей

```bash
npm install swagger-jsdoc swagger-ui-express
```

## Конфигурация

Конфигурация находится в [`apps/backend/swagger.js`](../apps/backend/swagger.js):

```javascript
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
```

## Использование JSDoc для документации

Для автоматической генерации документации используйте JSDoc комментарии в коде:

```javascript
/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Проверка авторизации Telegram
 *     description: Проверяет валидность initData от Telegram WebApp
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [initData]
 *             properties:
 *               initData:
 *                 type: string
 *                 description: Telegram WebApp initData
 *     responses:
 *       200:
 *         description: Успешная проверка
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       401:
 *         description: Неверные данные авторизации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/verify', async (req, res) => {
  // ...
});
```

## Доступ к документации

После запуска сервера документация доступна по адресу:

- **Swagger UI:** `http://localhost:3000/api-docs`
- **OpenAPI JSON:** `http://localhost:3000/api-docs/swagger.json`

## Примеры документации endpoints

### POST /api/auth/verify

```javascript
/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Проверка авторизации
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               initData:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешная проверка
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     telegramId:
 *                       type: number
 *                     planId:
 *                       type: string
 */
```

### POST /api/generate

```javascript
/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Генерация контента
 *     tags: [Generation]
 *     security:
 *       - telegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               config:
 *                 $ref: '#/components/schemas/GenerationConfig'
 *               keywords:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/KeywordRow'
 *     responses:
 *       200:
 *         description: Успешная генерация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   $ref: '#/components/schemas/SeoResult'
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       429:
 *         description: Превышен лимит запросов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: integer
 */
```

### POST /api/streaming/generate

```javascript
/**
 * @swagger
 * /api/streaming/generate:
 *   post:
 *     summary: Потоковая генерация контента
 *     tags: [Streaming]
 *     security:
 *       - telegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               tone:
 *                 type: string
 *                 enum: [Professional, Casual, Formal]
 *               language:
 *                 type: string
 *                 enum: [Russian, English, Kazakh]
 *               model:
 *                 type: string
 *                 enum: [gemini, openai, claude]
 *               promptType:
 *                 type: string
  *                 enum: [seo, aio, faq]
 *     responses:
 *       200:
 *         description: SSE stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       429:
 *         description: Превышен лимит запросов
 */
```

### POST /api/queue/generation

```javascript
/**
 * @swagger
 * /api/queue/generation:
 *   post:
 *     summary: Добавление задачи генерации в очередь
 *     tags: [Queue]
 *     security:
 *       - telegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *               topic:
 *                 type: string
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               tone:
 *                 type: string
 *               language:
 *                 type: string
 *               model:
 *                 type: string
 *               promptType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Задача добавлена в очередь
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [queued]
 *                 message:
 *                   type: string
 */
```

### GET /api/queue/stats

```javascript
/**
 * @swagger
 * /api/queue/stats:
 *   get:
 *     summary: Получение статистики всех очередей
 *     tags: [Queue]
 *     security:
 *       - telegramAuth: []
 *     responses:
 *       200:
 *         description: Статистика очередей
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   waiting:
 *                     type: integer
 *                   active:
 *                     type: integer
 *                   completed:
 *                     type: integer
 *                   failed:
 *                     type: integer
 *                   delayed:
 *                     type: integer
 */
```

## Компоненты схем

### User Schema

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID пользователя
 *         telegramId:
 *           type: number
 *           description: Telegram ID пользователя
 *         planId:
 *           type: string
 *           description: ID плана подписки
 *         subscriptionExpiry:
 *           type: string
 *           format: date-time
 *           description: Дата окончания подписки
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: Роль пользователя
 */
```

### GenerationConfig Schema

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     GenerationConfig:
 *       type: object
 *       properties:
 *         websiteName:
 *           type: string
 *           description: Название сайта/бренда
 *         topic:
 *           type: string
 *           description: Тема для генерации
 *         tone:
 *           type: string
 *           enum: [Professional, Casual, Formal]
 *           description: Тон текста
 *         language:
 *           type: string
 *           enum: [Russian, English, Kazakh]
 *           description: Язык контента
 *         model:
 *           type: string
 *           enum: [gemini-3-flash, gemini-4-flash, openai-gpt-4, claude-3-opus]
 *           description: AI модель для генерации
 *         minChars:
 *           type: integer
 *           minimum: 100
 *           maximum: 100000
 *           description: Минимальное количество символов
 *         maxChars:
 *           type: integer
 *           minimum: 100
 *           maximum: 100000
 *           description: Максимальное количество символов
 */
```

### SeoResult Schema

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     SeoResult:
 *       type: object
 *       properties:
 *         content:
 *           type: string
 *           description: Сгенерированный контент
 *         title:
 *           type: string
 *           description: Мета-заголовок
 *         description:
 *           type: string
 *           description: Мета-описание
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           description: Использованные ключевые слова
 *         metrics:
 *           $ref: '#/components/schemas/SeoMetrics'
 *         spamScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Оценка спама (0-100)
 *         spamAnalysis:
 *           type: string
 *           description: Анализ спама
 */
```

## Советы по документации

1. **Используйте JSDoc** - для автоматической генерации документации
2. **Добавляйте примеры** - для каждого endpoint
3. **Документируйте ошибки** - для всех возможных кодов ошибок
4. **Используйте теги** - для группировки endpoints
5. **Добавляйте схемы** - для компонентов и ответов
6. **Обновляйте версию** - при изменении API

## Тестирование API

Используйте Swagger UI для тестирования API:

1. Откройте `http://localhost:3000/api-docs`
2. Выберите endpoint
3. Нажмите "Try it out"
4. Заполните параметры
5. Нажмите "Execute"

## Генерация клиента

Swagger может генерировать клиентские библиотеки:

```bash
# Генерация TypeScript клиента
swagger-codegen generate -i http://localhost:3000/api-docs/swagger.json \
  -l typescript-axios \
  -o ./client

# Генерация JavaScript клиента
swagger-codegen generate -i http://localhost:3000/api-docs/swagger.json \
  -l javascript \
  -o ./client
```

## Интеграция с CI/CD

```yaml
# .github/workflows/swagger.yml
name: Generate Swagger Docs

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate Swagger
        run: |
          npm run swagger:generate
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-workflow-page@v3
        with:
          path: './swagger-output'
```

## Дополнительные ресурсы

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [JSDoc Documentation](https://jsdoc.app/)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)
