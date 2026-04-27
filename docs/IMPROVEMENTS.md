# Документация по улучшениям кода

## Обзор

Этот документ описывает улучшения, внесённые в приложение для повышения безопасности, производительности и поддерживаемости.

---

## Новые файлы и модули

### 1. Конфигурация

#### [`backend/config/ai.js`](../backend/config/ai.js)
Централизованная конфигурация для AI сервисов:
- Конфигурации для Gemini API
- Конфигурации для OpenAI API
- Конфигурации для Claude API
- Общие настройки AI (модель, температура, maxTokens)
- Валидация API ключей

#### [`backend/config/app.js`](../backend/config/app.js)
Централизованная конфигурация приложения:
- `APP_CONFIG`: базовая информация о приложении
- `LIMITS`: лимиты для запросов и контента
- `CACHE_TTL`: время жизни кэша для разных типов данных
- `RATE_LIMITS`: настройки rate limiting

### 2. Логирование

#### [`backend/utils/logger.js`](../backend/utils/logger.js)
Структурированное логирование на базе Pino:
- JSON-формат логов для production
- Красивый вывод для development
- Функция `createLogger()` для создания child logger
- Функция `createRequestLogger()` для логирования запросов

### 3. Обработка ошибок

#### [`backend/utils/errors.js`](../backend/utils/errors.js)
Кастомные API ошибки:
- Класс `ApiError` с кодом, сообщением и HTTP статусом
- Константы `ERROR_CODES` для всех типов ошибок
- Функция `createApiError()` для создания ошибок
- Функция `isApiError()` для проверки типа ошибки

#### [`backend/middleware/errorHandler.js`](../backend/middleware/errorHandler.js)
Централизованный обработчик ошибок:
- `errorHandler()`: главный обработчик всех ошибок
- `notFoundHandler()`: обработчик для 404
- `asyncHandler()`: обёртка для async route handlers

### 4. Middleware

#### [`backend/middleware/requestId.js`](../backend/middleware/requestId.js)
Middleware для генерации уникальных ID запросов:
- Генерация UUID для каждого запроса
- Добавление заголовка `X-Request-Id`
- Логирование времени выполнения запроса

#### [`backend/middleware/rateLimit.js`](../backend/middleware/rateLimit.js)
Rate limiting middleware с централизованной конфигурацией:
- `ipRateLimiter`: защита от DDoS по IP
- `userRateLimiter`: защита от злоупотребления по user ID
- `generateRateLimiter`: строгий лимит для генерации
- `seoAuditRateLimiter`: лимит для SEO аудита

### 5. Промпты

#### [`backend/prompts/seoPrompt.js`](../backend/prompts/seoPrompt.js)
Централизованные промпты для AI:
- `SEO_PROMPT`: базовый промпт для SEO контента
- `AIO_PROMPT`: промпт для AIO оптимизации
- `FAQ_PROMPT`: промпт для генерации FAQ
- `REWRITE_PROMPT`: промпт для переписывания
- `HUMANIZE_PROMPT`: промпт для гуманизации
- `SPAM_CHECK_PROMPT`: промпт для проверки спама
- `RELEVANCE_OPTIMIZATION_PROMPT`: промпт для оптимизации релевантности
- `SEO_AUDIT_PROMPT`: промпт для SEO аудита
- `SOCIAL_MEDIA_PROMPT`: промпт для социальных сетей
- Функции `getPrompt()` и `getPromptWithCustomization()`

---

## Обновлённые файлы

### [`backend/server.js`](../backend/server.js)
Обновлён для использования новых middleware:
- Добавлен импорт новых middleware
- Добавлен middleware `requestId` первым
- Заменены inline rate limiters на централизованные
- Обновлено логирование для использования structured logger
- Заменён error handler на централизованный
- Добавлен notFound handler

### [`backend/utils/encryption.js`](../backend/utils/encryption.js)
Исправлена проблема безопасности:
- Функция `encrypt()` теперь выбрасывает ошибку вместо console.warn
- Это предотвращает сохранение незашифрованных данных

---

## Рекомендации по использованию

### 1. Логирование

```javascript
import logger from './utils/logger.js';
import { createRequestLogger } from './utils/logger.js';

// Базовое логирование
logger.info({ userId: 123 }, 'User logged in');
logger.warn({ userId: 123 }, 'Invalid password attempt');
logger.error({ error: err }, 'Database connection failed');

// Логирование в route
export async function handler(req, res) {
  const log = createRequestLogger(req.id, req.telegramUser?.id);
  log.info({ action: 'generate_content' }, 'Starting generation');
  // ...
}
```

### 2. Обработка ошибок

```javascript
import { createApiError, ERROR_CODES } from './utils/errors.js';

// Создание ошибки
if (!process.env.GEMINI_API_KEY) {
  throw createApiError('INVALID_API_KEY');
}

// В route handler
import { asyncHandler } from './middleware/errorHandler.js';

router.get('/endpoint', asyncHandler(async (req, res) => {
  // Логика
  throw createApiError('GENERATION_FAILED', { details: '...' });
}));
```

### 3. Конфигурация

```javascript
import { APP_CONFIG, LIMITS, CACHE_TTL, RATE_LIMITS } from './config/app.js';

// Использование
console.log(APP_CONFIG.name);
console.log(LIMITS.maxKeywords);
```

### 4. Промпты

```javascript
import { getPrompt, getPromptWithCustomization } from '../prompts/seoPrompt.js';

// Базовый промпт
const prompt = getPrompt('seo');

// Кастомизированный промпт
const customPrompt = getPromptWithCustomization('seo', {
  tone: 'Professional',
  language: 'Russian',
  targetAudience: 'Developers'
});
```

### 5. Rate limiting

```javascript
import { generateRateLimiter } from '../middleware/rateLimit.js';

router.post('/generate', generateRateLimiter, handler);
```

---

## Следующие шаги

### Высокий приоритет

1. **Streaming для генерации (SSE)**
   - Реализовать Server-Sent Events для потоковой генерации
   - Обновить фронтенд для обработки SSE

2. **Message Queue (BullMQ)**
   - Добавить BullMQ для асинхронных задач
   - Реализовать очередь для генерации контента
   - Добавить retry механизмы

3. **Разбить App.tsx на custom hooks**
   - Создать `useProjects()`, `useAuth()`, `useGeneration()` и т.д.
   - Улучшить читаемость и тестируемость

4. **API документация (Swagger)**
   - Добавить Swagger/OpenAPI документацию
   - Автоматическая генерация из JSDoc

### Средний приоритет

5. **Улучшить покрытие тестами**
   - Добавить тесты для новых middleware
   - Улучшить покрытие route handlers
   - Добавить integration tests

6. **Мониторинг и метрики**
   - Добавить Prometheus metrics
   - Интеграция с Grafana
   - Health checks для всех сервисов

7. **Оптимизация базы данных**
   - Добавить индексы для частых запросов
   - Оптимизировать N+1 запросы
   - Добавить connection pooling

### Низкий приоритет

8. **Улучшить документацию**
   - Добавить README для каждого модуля
   - Создать архитектурную документацию
   - Добавить примеры использования

9. **Улучшить UX**
   - Добавить skeleton loaders
   - Улучшить error handling на фронтенде
   - Добавить offline support

---

## Зависимости для установки

```bash
npm install pino pino-pretty
```

---

## Переменные окружения

Добавьте в `.env`:

```env
# Логирование
LOG_LEVEL=info

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_GENERATE_WINDOW_MS=60000
RATE_LIMIT_GENERATE_MAX=5
RATE_LIMIT_AUDIT_WINDOW_MS=60000
RATE_LIMIT_AUDIT_MAX=10
```
