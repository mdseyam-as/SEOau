# 🔍 Технические рекомендации для SEO Generator
## Уровень: Senior Technical Review

**Дата:** 26.12.2025  
**Версия приложения:** 1.0.0  
**Статус:** Production-ready с рекомендациями по улучшению

---

## 📊 Резюме проекта

**Тип приложения:** Telegram WebApp для генерации SEO-контента  
**Технологический стек:** React 19.2 + TypeScript + Node.js + Express + Prisma + PostgreSQL  
**Размер кодовой базы:** ~15,000+ строк (backend + frontend)  
**Общая оценка зрелости:** ⭐⭐⭐⭐☆ (4.2/5)

---

## 🏗 1. Архитектура

### 1.1 Общая оценка

**Сильные стороны:**
- ✅ Чёткое разделение на frontend/backend
- ✅ RESTful API дизайн
- ✅ Модульная структура с сервисами
- ✅ Prisma ORM для типобезопасной работы с БД
- ✅ Telegram WebApp интеграция с HMAC-SHA256 валидацией
- ✅ Система подписок и лимитов пользователей
- ✅ Мультимодальная генерация (Writer + Visualizer)
- ✅ Фоновая обработка задач через очередь
- ✅ Knowledge Base / RAG (частично реализована)

**Архитектурные проблемы:**
- ⚠️ **КРИТИЧНО:** Отсутствие слоистой архитектуры (Monolith)
  - Backend и frontend тесно связаны, нет микросервисов
  - Сложность масштабирования: при росте нагрузки придётся переписывать backend целиком
  - Рекомендация: Рассмотреть переход на микросервисную архитектуру при росте нагрузки >1000 RPS

- ⚠️ **ВЫСОКИЙ:** Отсутствие очереди сообщений (Message Queue)
  - Фоновые задачи обрабатываются через `setInterval` (polling), нет надёжной очереди
  - Потеря задач при рестарте сервера
  - Рекомендация: Реализовать BullMQ или RabbitMQ для надёжной обработки задач

- ⚠️ **ВЫСОКИЙ:** Отсутствие WebSocket для real-time обновлений
  - Генерация контента синхронная, блокирует UI при больших текстах
  - Нет возможности показывать прогресс генерации в реальном времени
  - Рекомендация: Реализовать Server-Sent Events (SSE) или WebSocket для streaming

- ⚠️ **СРЕДНИЙ:** Дублирование логики генерации
  - [`generate.js`](backend/routes/generate.js:1) и [`geminiService.ts`](services/geminiService.ts:1) содержат дублирующуюся логику
  - Промпты дублируются в разных файлах
  - Рекомендация: Вынести общую логику в отдельный сервис

### 1.2 Структура директорий

**Текущая структура:**
```
SEOau/
├── backend/              # Node.js API (Express + Prisma)
│   ├── lib/           # Prisma клиент
│   ├── middleware/     # Auth, validation
│   ├── routes/        # API endpoints
│   ├── services/      # Business logic
│   ├── utils/         # Helpers (auth, cache, encryption, etc.)
│   ├── prisma/        # Schema (дубликат, см. ниже)
│   └── tests/         # Unit tests
├── components/           # React компоненты (40+ файлов)
├── services/            # Frontend API сервисы
├── hooks/              # React hooks
├── types.ts            # TypeScript типы
├── frontend/tests/      # Frontend тесты
└── plans/              # Документация
```

**Проблемы:**
1. ❌ Дублирование [`prisma/schema.prisma`](backend/prisma/schema.prisma:1) в корне проекта
2. ❌ Отсутствие директории `config/` для конфигурации
3. ❌ Отсутствие директории `errors/` для кастомных ошибок
4. ❌ Отсутствие директории `prompts/` для промптов AI

**Рекомендуемая структура:**
```
SEOau/
├── backend/
│   ├── config/         # Конфигурация (env, constants, ai config)
│   ├── errors/         # Кастомные ошибки и обработчики
│   ├── lib/            # Prisma клиент
│   ├── middleware/     # Auth, validation, rate limiting
│   ├── routes/         # API endpoints (разбиты по доменам)
│   ├── services/       # Business logic (domain services)
│   ├── utils/          # Helpers (auth, cache, encryption)
│   ├── prompts/        # AI промпты (SEO, AIO, FAQ, etc.)
│   ├── tests/          # Unit и integration тесты
│   └── prisma/         # Schema (только здесь!)
├── frontend/
│   ├── components/     # UI компоненты
│   ├── hooks/          # Custom hooks
│   ├── services/       # API сервисы
│   ├── utils/          # Frontend helpers
│   ├── types/          # TypeScript типы
│   ├── contexts/       # React Context providers
│   └── tests/          # Frontend тесты
├── shared/             # Общий код между backend и frontend
│   ├── types/          # Общие типы
│   └── constants/      # Общие константы
└── plans/              # Документация
```

### 1.3 Рекомендации по архитектуре

#### 1.3.1 Реализовать слоистую архитектуру

```javascript
// backend/routes/generate/
// ├── index.js (главный router)
// ├── validation.js (валидация запросов)
// ├── controllers/ (контроллеры)
// │   ├── generateController.js
// │   ├── spamController.js
// │   └── humanizeController.js
// └── services/ (бизнес-логика)
//     ├── generationService.js
//     ├── spamService.js
//     └── humanizeService.js

// Пример структуры:
// backend/routes/generate/index.js
import express from 'express';
import { validate } from '../../middleware/validate.js';
import { generateSchema } from '../../schemas/index.js';
import { generateController } from './controllers/generateController.js';

const router = express.Router();

router.post('/', validate(generateSchema), generateController.generate);
router.post('/spam-check', validate(spamCheckSchema), generateController.spamCheck);
router.post('/humanize', validate(humanizeSchema), generateController.humanize);

export default router;
```

#### 1.3.2 Реализовать Message Queue (BullMQ)

```bash
npm install bullmq ioredis
```

```javascript
// backend/queues/generationQueue.js
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

export const generationQueue = new Queue('generation', { connection });

// Worker для обработки задач
export const generationWorker = new Worker('generation', async (job) => {
  const { type, config, userId } = job.data;
  
  switch (type) {
    case 'generate':
      return await processGeneration(config, userId);
    case 'rewrite':
      return await processRewrite(config, userId);
    case 'humanize':
      return await processHumanize(config, userId);
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}, { connection });

generationWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

generationWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});
```

#### 1.3.3 Реализовать Server-Sent Events (SSE) для streaming

```javascript
// backend/routes/generate/stream.js
import express from 'express';

const router = express.Router();

router.post('/stream', async (req, res) => {
  const { config, keywords } = req.body;
  
  // Устанавливаем SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  try {
    // Генерируем контент с streaming
    const stream = await generateWithStreaming(config, keywords);
    
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

async function* generateWithStreaming(config, keywords) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: getHeaders(apiKey, siteName),
    body: JSON.stringify({
      model: config.model,
      messages: [...],
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    yield chunk;
  }
}

export default router;
```

---

## 🔒 2. Безопасность

### 2.1 Аутентификация и авторизация

**Текущая реализация:**
- ✅ Telegram WebApp initData валидация через HMAC-SHA256 ([`telegramAuth.js`](backend/utils/telegramAuth.js:1))
- ✅ Проверка возраста initData (max 1 час по умолчанию)
- ✅ Защита от replay-атак (future timestamps)
- ✅ Dev mode bypass для локальной разработки
- ✅ Middleware [`validateTelegramAuth`](backend/middleware/auth.js:1) для всех защищённых routes

**Проблемы:**

#### 2.1.1 КРИТИЧНО: `DEV_BYPASS_TELEGRAM` в production

**Файл:** [`backend/server.js`](backend/server.js:42-53)

```javascript
// ❌ ПРОБЛЕМА: Dev bypass может быть включён в production
if (process.env.DEV_BYPASS_TELEGRAM === 'true') {
  console.warn('⚠️ DEV BYPASS ENABLED - ONLY FOR DEVELOPMENT!');
  app.use((req, res, next) => {
    const devId = req.headers['x-dev-telegram-id'];
    if (devId) {
      req.telegramUser = { id: parseInt(devId), role: 'admin' };
    }
    next();
  });
}
```

**Риск:** Если `DEV_BYPASS_TELEGRAM=true` случайно попадёт в production, любой сможет получить admin доступ.

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Жёсткая проверка окружения
if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_TELEGRAM === 'true') {
  console.warn('⚠️ DEV BYPASS ENABLED - ONLY FOR DEVELOPMENT!');
  app.use((req, res, next) => {
    const devId = req.headers['x-dev-telegram-id'];
    if (devId) {
      req.telegramUser = { id: parseInt(devId), role: 'admin' };
    }
    next();
  });
} else if (process.env.DEV_BYPASS_TELEGRAM === 'true') {
  // Блокируем если DEV_BYPASS включён в production
  console.error('❌ DEV_BYPASS_TELEGRAM is enabled in production! This is a security risk.');
  process.exit(1);
}
```

#### 2.1.2 ВЫСОКИЙ: Нет rate limiting по IP

**Текущая реализация:** Rate limiting только по user ID.

**Проблема:** Атакующий может создавать множество пользователей и обходить rate limiting.

**Решение:**
```javascript
// backend/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

// Rate limiting по IP (для защиты от DDoS)
export const ipRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  keyGenerator: (req) => req.ip,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем если это Telegram WebApp (initData присутствует)
    return !!req.headers['x-telegram-init-data'];
  }
});

// Rate limiting по user ID (для защиты от злоупотребления)
export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 50, // максимум 50 запросов от одного пользователя
  keyGenerator: (req) => req.telegramUser?.id?.toString() || req.ip,
  message: 'Too many requests from this user',
  skip: (req) => req.telegramUser?.role === 'admin'
});

// Rate limiting для генерации (более строгий)
export const generateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 5, // максимум 5 генераций в минуту
  keyGenerator: (req) => req.telegramUser?.id?.toString() || req.ip,
  message: 'Too many generation requests',
  skip: (req) => req.telegramUser?.role === 'admin'
});
```

#### 2.1.3 СРЕДНИЙ: Отсутствие логирования неудачных попыток авторизации

**Проблема:** Нет возможности отследить подозрительную активность.

**Решение:**
```javascript
// backend/middleware/auth.js
import logger from '../utils/logger.js';

export function validateTelegramAuth(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];
  
  if (!initData) {
    logger.warn({
      requestId: req.id,
      ip: req.ip,
      action: 'auth_failed',
      reason: 'missing_init_data'
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const isValid = validateTelegramWebAppData(initData, botToken);
  
  if (!isValid) {
    logger.warn({
      requestId: req.id,
      ip: req.ip,
      action: 'auth_failed',
      reason: 'invalid_init_data'
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const user = extractTelegramUser(initData);
  req.telegramUser = user;
  
  logger.info({
    requestId: req.id,
    userId: user.id,
    action: 'auth_success'
  });
  
  next();
}
```

### 2.2 CSRF защита

**Текущая реализация:**
- ✅ CSRF токены с expiry 15 минут ([`server.js`](backend/server.js:126-154))
- ✅ Double-submit cookie pattern
- ✅ Валидация CSRF для state-changing операций
- ✅ Пропуск для Telegram WebApp (initData присутствует)

**Проблемы:**

#### 2.2.1 СРЕДНИЙ: CSRF токены хранятся в памяти

**Файл:** [`backend/server.js`](backend/server.js:126-154)

```javascript
// ❌ ПРОБЛЕМА: Потеря токенов при рестарте сервера
const csrfTokens = new Map();
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Хранить CSRF токены в Redis
import { cacheGet, cacheSet } from './utils/cache.js';

async function generateCsrfToken() {
  const tokenId = crypto.randomBytes(16).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  
  await cacheSet(`csrf:${tokenId}`, {
    token,
    expires: Date.now() + (15 * 60 * 1000) // 15 минут
  }, 15 * 60);
  
  return { tokenId, token };
}

async function validateCsrf(req, res, next) {
  const { 'x-csrf-token-id': tokenId, 'x-csrf-token': token } = req.headers;
  
  if (!tokenId || !token) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  const stored = await cacheGet(`csrf:${tokenId}`);
  
  if (!stored || stored.expires < Date.now()) {
    return res.status(403).json({ error: 'CSRF token expired' });
  }
  
  if (stored.token !== token) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  req.csrfValidated = true;
  next();
}
```

#### 2.2.2 НИЗКИЙ: Нет SameSite cookie атрибута

**Решение:**
```javascript
// backend/server.js
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 минут
  }
}));
```

### 2.3 Валидация и санитизация ввода

**Текущая реализация:**
- ✅ Zod схемы для всех API endpoints ([`schemas/index.js`](backend/schemas/index.js:1))
- ✅ Prompt sanitizer ([`promptSanitizer.js`](backend/utils/promptSanitizer.js:1)) с детекцией инъекций
- ✅ Ограничение длины полей (topic: 10000, content: 200000)
- ✅ Удаление опасных символов (null bytes, control chars)
- ✅ Защита от prompt injection (30+ паттернов)

**Оценка:** ⭐⭐⭐⭐⭐ (5/5) - Отличная реализация!

**Рекомендации:**

#### 2.3.1 Добавить rate limiting на основе контента

```javascript
// backend/middleware/contentRateLimit.js
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

export function createContentRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 5, // максимум 5 генераций в минуту
    keyGenerator: (req) => {
      // Хешируем контент для предотвращения дублирования
      const content = req.body?.config?.topic || '';
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      return `${req.telegramUser?.id}:${hash}`;
    },
    message: 'Too many similar generation requests',
    skip: (req) => req.telegramUser?.role === 'admin'
  });
}
```

### 2.4 Шифрование чувствительных данных

**Текущая реализация:**
- ✅ AES-256-GCM шифрование для API ключей ([`encryption.js`](backend/utils/encryption.js:1))
- ✅ Auth tag для верификации целостности
- ✅ Хранение зашифрованных ключей в БД
- ✅ Проверка длины ключа (минимум 32 символа)

**Проблемы:**

#### 2.4.1 КРИТИЧНО: Если `ENCRYPTION_KEY` не установлен, данные хранятся в открытом виде

**Файл:** [`backend/utils/encryption.js`](backend/utils/encryption.js:25-27)

```javascript
// ❌ ПРОБЛЕМА: Данные хранятся в открытом виде если нет ключа
if (!encryptionKey || encryptionKey.length < 32) {
  console.warn('[Encryption] ENCRYPTION_KEY not set or too short. Storing unencrypted.');
  return text; // Возвращаем незашифрованный текст!
}
```

**Риск:** Если `ENCRYPTION_KEY` случайно удалён из env, все API ключи будут храниться в открытом виде.

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Бросать ошибку если ключ не установлен
if (!encryptionKey || encryptionKey.length < 32) {
  throw new Error('ENCRYPTION_KEY not set or too short. Cannot encrypt data.');
}
```

#### 2.4.2 СРЕДНИЙ: Нет ротации ключей шифрования

**Проблема:** Если ключ скомпрометирован, все зашифрованные данные уязвимы.

**Решение:**
```javascript
// backend/utils/encryption.js
import crypto from 'crypto';

const KEY_ROTATION_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 дней

export async function rotateEncryptionKey() {
  const currentKey = process.env.ENCRYPTION_KEY;
  
  // Генерируем новый ключ
  const newKey = crypto.randomBytes(32).toString('hex');
  
  // Получаем все зашифрованные данные
  const settings = await prisma.systemSetting.findFirst({ where: { id: 'global' } });
  
  if (settings?.openRouterApiKey) {
    // Расшифровываем старым ключом
    const decrypted = decrypt(settings.openRouterApiKey);
    
    // Шифруем новым ключом
    const encrypted = encryptWithKey(decrypted, newKey);
    
    // Обновляем в БД
    await prisma.systemSetting.update({
      where: { id: 'global' },
      data: { openRouterApiKey: encrypted }
    });
  }
  
  // Логируем (без ключа!)
  logger.info('[Encryption] Key rotated successfully');
  
  // Возвращаем новый ключ для использования в текущем процессе
  return newKey;
}

function encryptWithKey(text, key) {
  const salt = crypto.randomBytes(32);
  const derivedKey = crypto.scryptSync(key, salt, 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':');
}
```

#### 2.4.3 НИЗКИЙ: Отсутствие HSM (Hardware Security Module)

**Рекомендация:** Для enterprise-level безопасности рассмотреть использование HSM для хранения ключей шифрования.

### 2.5 Rate Limiting

**Текущая реализация:**
- ✅ express-rate-limit для разных типов запросов (общий, auth, generate)
- ✅ Разные лимиты (100 req/15min, 20 req/15min, 5 req/min)
- ✅ Trust proxy support

**Проблемы:**

#### 2.5.1 СРЕДНИЙ: Лимиты жёстко заданы в коде

**Файл:** [`backend/server.js`](backend/server.js:100-124)

```javascript
// ❌ ПРОБЛЕМА: Лимиты жёстко заданы в коде
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Конфигурация через env
// backend/config/rateLimits.js
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
    keyGenerator: (req) => req.telegramUser?.id?.toString() || req.ip,
    skip: (req) => req.telegramUser?.role === 'admin'
  },
  seoAudit: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUDIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_AUDIT_MAX || '10'),
    keyGenerator: (req) => req.ip // SEO аудит требует более строгие лимиты
  }
};
```

#### 2.5.2 НИЗКИЙ: Нет distributed rate limiting

**Проблема:** При горизонтальном масштабировании rate limiting работает только в рамках одного процесса.

**Решение:**
```javascript
// backend/middleware/distributedRateLimit.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

export const distributedRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rate_limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
```

---

## ⚡ 3. Производительность и масштабируемость

### 3.1 Кэширование

**Текущая реализация:**
- ✅ Redis с fallback в память ([`cache.js`](backend/utils/cache.js:1))
- ✅ Разные TTL для разных типов данных (settings: 5min, plans: 10min)
- ✅ Graceful degradation при недоступности Redis

**Проблемы:**

#### 3.1.1 ВЫСОКИЙ: Redis connection не проверяется перед использованием

**Файл:** [`backend/utils/cache.js`](backend/utils/cache.js:74-92)

```javascript
// ❌ ПРОБЛЕМА: Нет проверки соединения
let redis = null;

export async function cacheGet(key) {
  if (redis) {
    // Может выбросить ошибку если Redis недоступен
    return await redis.get(key);
  }
  return null;
}
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Проверка соединения с retry
let redis = null;
let redisConnected = false;

async function initRedis() {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redis.on('connect', () => {
      redisConnected = true;
      logger.info('✅ Redis connected');
    });

    redis.on('error', (err) => {
      redisConnected = false;
      logger.error('❌ Redis error:', err);
    });

    // Проверяем соединение
    await redis.ping();
    return redis;
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    return null;
  }
}

export async function cacheGet(key) {
  if (!redis || !redisConnected) {
    return null;
  }
  
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
}
```

#### 3.1.2 ВЫСОКИЙ: Нет кэширования результатов генерации

**Проблема:** Каждый запрос вызывает AI API, даже если генерация с такими же параметрами уже выполнялась.

**Решение:**
```javascript
// backend/services/generationCache.js
import crypto from 'crypto';
import { cacheGet, cacheSet } from '../utils/cache.js';

const CACHE_TTL_GENERATION = 3600; // 1 час

export function generateCacheKey(config, keywords) {
  const keyData = {
    model: config.model,
    topic: config.topic,
    tone: config.tone,
    style: config.style,
    language: config.language,
    keywords: keywords.map(k => k.keyword).sort().join(',')
  };
  
  const hash = crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  return `gen:${hash}`;
}

export async function getCachedGeneration(config, keywords) {
  const cacheKey = generateCacheKey(config, keywords);
  const cached = await cacheGet(cacheKey);
  
  if (cached) {
    logger.info('✅ Cache hit for generation');
    return cached;
  }
  
  return null;
}

export async function setCachedGeneration(config, keywords, result) {
  const cacheKey = generateCacheKey(config, keywords);
  await cacheSet(cacheKey, result, CACHE_TTL_GENERATION);
}

// Использование в generate.js
export async function generate(req, res) {
  const { config, keywords } = req.body;
  
  // Проверяем кэш
  const cached = await getCachedGeneration(config, keywords);
  if (cached) {
    return res.json({ result: cached, cached: true });
  }
  
  // Генерируем
  const result = await performGeneration(config, keywords);
  
  // Сохраняем в кэш
  await setCachedGeneration(config, keywords, result);
  
  res.json({ result, cached: false });
}
```

#### 3.1.3 СРЕДНИЙ: Memory cache без LRU eviction

**Проблема:** Memory cache может расти бесконечно и потреблять всю память.

**Решение:**
```javascript
// backend/utils/lruCache.js
export class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    // Перемещаем в конец (самые используемые)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Удаляем самый старый элемент
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const memoryCache = new LRUCache(100);
```

#### 3.1.4 НИЗКИЙ: Нет кэширования Prisma query results

**Решение:**
```javascript
// backend/services/userCache.js
import { cacheGet, cacheSet } from '../utils/cache.js';

const USER_CACHE_TTL = 300; // 5 минут

export async function getUserWithCache(userId) {
  const cacheKey = `user:${userId}`;
  
  // Проверяем кэш
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Загружаем из БД
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(userId) },
    include: { plan: true }
  });
  
  // Сохраняем в кэш
  await cacheSet(cacheKey, user, USER_CACHE_TTL);
  
  return user;
}
```

### 3.2 База данных

**Текущая реализация:**
- ✅ PostgreSQL через Prisma ORM
- ✅ Индексы на часто используемых полях (telegramId, planId, userId в User)
- ✅ Connection pooling через Prisma (настраивается автоматически)
- ✅ Cascade delete для связанных данных

**Проблемы:**

#### 3.2.1 ВЫСОКИЙ: N+1 queries для каждой генерации

**Файл:** [`backend/routes/generate.js`](backend/routes/generate.js:1)

```javascript
// ❌ ПРОБЛЕМА: Много отдельных запросов
const user = await prisma.user.findUnique({ where: { telegramId: BigInt(userId) } });
const plan = await prisma.plan.findUnique({ where: { id: user.planId } });
const settings = await prisma.systemSetting.findFirst({ where: { id: 'global' } });
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Один запрос с include
export async function getUserWithPlanAndSettings(userId) {
  return await prisma.user.findUnique({
    where: { telegramId: BigInt(userId) },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          maxGenerationsPerMonth: true,
          maxGenerationsPerDay: true,
          allowedModels: true,
          canCheckSpam: true,
          canOptimizeRelevance: true,
          canUseAioMode: true
        }
      }
    },
    // Добавляем settings через отдельный запрос (это нормально)
  });
}

// Получаем settings отдельно (это не N+1, settings - singleton)
const settings = await getGlobalSettings();
```

#### 3.2.2 ВЫСОКИЙ: Нет connection pool configuration

**Проблема:** Prisma использует дефолтные значения connection pool, которые могут быть неоптимальными.

**Решение:**
```javascript
// backend/lib/prisma.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error'],
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  // Connection pool configuration
  // DATABASE_URL должен содержать connection pool параметры:
  // postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20
});

export default prisma;
```

**Пример DATABASE_URL:**
```
postgresql://user:password@localhost:5432/seogenerator?connection_limit=10&pool_timeout=20&connect_timeout=10
```

#### 3.2.3 СРЕДНИЙ: Отсутствие read replica

**Проблема:** Все запросы идут на primary, нет горизонтального масштабирования чтения.

**Решение:**
```javascript
// backend/lib/prisma.js
import { PrismaClient } from '@prisma/client';

// Primary connection для записи
const prismaWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_WRITE
    }
  }
});

// Read replica connection для чтения
const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_READ
    }
  }
});

// Автоматически использовать read replica для чтения
export const prisma = new Proxy({}, {
  get(target, prop) {
    // Для операций чтения используем read replica
    if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(prop)) {
      return prismaRead[prop];
    }
    // Для операций записи используем primary
    return prismaWrite[prop];
  }
});

export default prisma;
```

#### 3.2.4 НИЗКИЙ: Нет database migrations version control

**Рекомендация:** Использовать Prisma Migrate для управления миграциями.

```bash
# Создать миграцию
npx prisma migrate dev --name add_soft_delete

# Применить миграцию в production
npx prisma migrate deploy
```

### 3.3 API Performance

**Текущая реализация:**
- ✅ Promise.allSettled для параллельных запросов (Writer + Visualizer)
- ✅ Timeout для внешних запросов (15 секунд для SERP)
- ✅ Streaming не реализован (генерация блокирует UI)

**Проблемы:**

#### 3.3.1 КРИТИЧНО: Генерация синхронная, UI блокируется на 30-120 секунд

**Проблема:** Пользователь не видит прогресс генерации, UI кажется зависшим.

**Решение:** Реализовать Server-Sent Events (SSE) для streaming (см. раздел 1.3.3)

#### 3.3.2 ВЫСОКИЙ: Нет retry logic для failed AI requests

**Файл:** [`backend/routes/generate.js`](backend/routes/generate.js:1)

```javascript
// ❌ ПРОБЛЕМА: Нет retry logic
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: getHeaders(apiKey, siteName),
  body: JSON.stringify({ ... })
});

if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Retry logic с exponential backoff
import pRetry from 'p-retry';

export async function fetchWithRetry(url, options, maxRetries = 3) {
  return pRetry(
    async () => {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = new Error(`API error: ${response.status}`);
        error.statusCode = response.status;
        error.response = await response.text();
        throw error;
      }
      
      return response;
    },
    {
      retries: maxRetries,
      onRetry: (error, attempt) => {
        logger.warn(`Retry attempt ${attempt}/${maxRetries}:`, error.message);
      },
      minTimeout: 1000, // 1 секунда
      maxTimeout: 10000  // 10 секунд
    }
  );
}

// Использование
const response = await fetchWithRetry(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    method: "POST",
    headers: getHeaders(apiKey, siteName),
    body: JSON.stringify({ ... })
  },
  3 // максимум 3 попытки
);
```

#### 3.3.3 СРЕДНИЙ: Нет circuit breaker для OpenRouter API

**Проблема:** Если OpenRouter API недоступен, все запросы будут повторяться и блокировать пользователей.

**Решение:**
```javascript
// backend/utils/circuitBreaker.js
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 30000) {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'closed'; // closed, open, half-open
  }

  async execute(request) {
    if (this.state === 'open') {
      // Проверяем, прошло ли время timeout
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open. Service unavailable.');
      }
    }

    try {
      const result = await request();
      
      // Успешный запрос - сбрасываем счётчик
      this.failureCount = 0;
      this.state = 'closed';
      this.lastFailureTime = null;
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      // Если превышен порог - открываем circuit breaker
      if (this.failureCount >= this.threshold) {
        this.state = 'open';
        logger.error(`Circuit breaker opened after ${this.failureCount} failures`);
      }
      
      throw error;
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.failureCount = 0;
    this.state = 'closed';
    this.lastFailureTime = null;
  }
}

// Использование
const openRouterCircuitBreaker = new CircuitBreaker(5, 30000);

export async function callOpenRouterWithCircuitBreaker(request) {
  return openRouterCircuitBreaker.execute(request);
}
```

#### 3.3.4 НИЗКИЙ: Отсутствие timeout для Prisma queries

**Решение:**
```javascript
// backend/lib/prisma.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error'],
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  // Timeout для запросов (в секундах)
  // DATABASE_URL должен содержать statement_timeout параметр
});

export default prisma;
```

**Пример DATABASE_URL:**
```
postgresql://user:password@localhost:5432/seogenerator?statement_timeout=30
```

---

## 🧹 4. Качество кода и технический долг

### 4.1 Общая оценка

**Качество кода:** ⭐⭐⭐⭐☆ (4/5)
- Чистый, читаемый код с хорошей организацией
- Модульная архитектура
- TypeScript для типобезопасности
- Comprehensive error handling
- Good separation of concerns

**Технический долг:** ⚠️ Средний
- Дублирование логики генерации
- Отсутствие некоторых best practices
- Legacy код без удаления

### 4.2 Конкретные проблемы

#### 4.2.1 ВЫСОКИЙ: Дублирование промптов генерации

**Файлы:** [`backend/routes/generate.js`](backend/routes/generate.js:1), [`services/geminiService.ts`](services/geminiService.ts:1)

```javascript
// ❌ ПРОБЛЕМА: Промпты дублируются
// generate.js:1419-1421
const DEFAULT_PROMPT_TEMPLATE = `You are a Senior SEO Copywriter...`;

// geminiService.ts:8
const DEFAULT_PROMPT_TEMPLATE = `You are a Senior SEO Copywriter...`;
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Вынести промпты в отдельный файл
// backend/prompts/seoPrompt.js
export const SEO_PROMPT = `You are a Senior SEO Copywriter with expertise in:
- Search Engine Optimization (SEO)
- Content Strategy
- User Experience (UX)
- Conversion Rate Optimization (CRO)

Your task is to create high-quality, SEO-optimized content that:
1. Ranks well in search engines
2. Provides value to readers
3. Engages and converts visitors
4. Follows E-E-A-T principles (Experience, Expertise, Authoritativeness, Trustworthiness)`;

export const AIO_PROMPT = `You are a Artificial Intelligence Optimization (AIO) Specialist.
Your task is to create content optimized for AI-powered search engines like Google SGE, Bing Chat, and Perplexity.

AIO optimization includes:
1. Structured data (schema.org)
2. Clear hierarchy (H1, H2, H3)
3. Concise answers to common questions
4. Visual elements (tables, diagrams)
5. Citations and references`;

export const FAQ_PROMPT = `You are an FAQ Generator Specialist.
Your task is to create Frequently Asked Questions that:
1. Address real user concerns
2. Are concise and clear
3. Include schema.org markup
4. Help with featured snippets`;

export const REWRITE_PROMPT = `You are a Content Rewriting Specialist.
Your task is to rewrite content while:
1. Maintaining the original meaning
2. Improving readability
3. Optimizing for SEO
4. Ensuring uniqueness`;

export const HUMANIZE_PROMPT = `You are a Content Humanization Specialist.
Your task is to make AI-generated content more human by:
1. Varying sentence structure
2. Adding natural transitions
3. Removing robotic patterns
4. Injecting personality`;
```

#### 4.2.2 ВЫСОКИЙ: Отсутствие централизованной конфигурации

**Файлы:** [`backend/routes/generate.js`](backend/routes/generate.js:1419-1421), [`services/geminiService.ts`](services/geminiService.ts:132-136), [`backend/services/htmlExportService.js`](backend/services/htmlExportService.js:9-147)

```javascript
// ❌ ПРОБЛЕМА: Конфигурация разбросана по файлам
// generate.js:1419-1421 (getApiKey)
// geminiService.ts:132-136 (getApiKey)
// htmlExportService.js:9-147 (getHeaders)
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Централизовать конфигурацию
// backend/config/ai.js
export const AI_CONFIG = {
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  defaultModel: 'google/gemini-3-flash-preview',
  timeout: 30000,
  maxRetries: 3,
  models: {
    writer: ['google/gemini-3-flash-preview', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    visualizer: ['anthropic/claude-3.5-sonnet', 'anthropic/claude-opus-4.1'],
    spam: ['x-ai/grok-2-1212']
  },
  streaming: {
    enabled: true,
    chunkSize: 100
  }
};

export const AIO_CONFIG = {
  enabled: true,
  defaultVisualizerModel: 'anthropic/claude-3.5-sonnet',
  generateVisuals: true,
  generateSchema: true
};

export const RAG_CONFIG = {
  enabled: true,
  topK: 3,
  similarityThreshold: 0.7,
  maxContextLength: 4000
};

// backend/config/app.js
export const APP_CONFIG = {
  name: 'SEO Generator',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'https://seogenerator.app',
  apiUrl: process.env.API_URL || 'http://localhost:3000'
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
```

#### 4.2.3 СРЕДНИЙ: Жёстко закодированные типы и сообщения об ошибках

**Файл:** [`backend/routes/generate.js`](backend/routes/generate.js:196-197)

```javascript
// ❌ ПРОБЛЕМА: Русские сообщения об ошибках без i18n
return res.status(500).json({ error: 'Не удалось обработать ответ AI' });
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Использовать коды ошибок
// backend/utils/errors.js
export class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

export const ERROR_CODES = {
  // Authentication errors (4xxx)
  INVALID_API_KEY: { 
    code: 4001, 
    message: 'API ключ не настроен', 
    httpStatus: 400 
  },
  INVALID_INIT_DATA: { 
    code: 4002, 
    message: 'Неверные данные авторизации Telegram', 
    httpStatus: 401 
  },
  SUBSCRIPTION_EXPIRED: { 
    code: 4003, 
    message: 'Подписка истекла', 
    httpStatus: 403 
  },
  
  // Rate limiting errors (429x)
  RATE_LIMIT_EXCEEDED: { 
    code: 4291, 
    message: 'Превышен лимит запросов', 
    httpStatus: 429 
  },
  GENERATION_LIMIT_EXCEEDED: { 
    code: 4292, 
    message: 'Превышен лимит генераций', 
    httpStatus: 429 
  },
  
  // Generation errors (5xxx)
  GENERATION_FAILED: { 
    code: 5001, 
    message: 'Не удалось сгенерировать контент', 
    httpStatus: 500 
  },
  AI_API_ERROR: { 
    code: 5002, 
    message: 'Ошибка AI API', 
    httpStatus: 500 
  },
  AI_API_TIMEOUT: { 
    code: 5003, 
    message: 'Таймаут AI API', 
    httpStatus: 504 
  },
  
  // Database errors (5xxx)
  DATABASE_ERROR: { 
    code: 5004, 
    message: 'Ошибка базы данных', 
    httpStatus: 500 
  },
  DATABASE_CONNECTION_ERROR: { 
    code: 5005, 
    message: 'Ошибка подключения к базе данных', 
    httpStatus: 503 
  }
};

export function createApiError(errorCode, details = {}) {
  const errorInfo = ERROR_CODES[errorCode];
  return new ApiError(
    errorInfo.code,
    errorInfo.message,
    { ...details, httpStatus: errorInfo.httpStatus }
  );
}

// Использование
throw createApiError('GENERATION_FAILED', { model: config.model });
```

#### 4.2.4 СРЕДНИЙ: Отсутствие типизации для Prisma client

**Файл:** [`backend/lib/prisma.js`](backend/lib/prisma.js:1)

```javascript
// ❌ ПРОБЛЕМА: Prisma client создаётся в каждом файле
import { prisma } from './lib/prisma.js'; // generate.js:10
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Создать singleton instance
// backend/lib/prismaSingleton.js
import { PrismaClient } from '@prisma/client';

let prismaInstance = null;

export function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: process.env.DATABASE_URL,
      },
      log: ['query', 'info', 'warn', 'error'],
      logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    });
  }
  return prismaInstance;
}

export async function disconnectPrisma() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

// Использование
import { getPrisma } from './lib/prismaSingleton.js';

const prisma = getPrisma();
```

#### 4.2.5 НИЗКИЙ: Отсутствие graceful shutdown для всех процессов

**Файл:** [`backend/server.js`](backend/server.js:347-358)

```javascript
// ✅ Есть graceful shutdown для Prisma и taskQueue
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  taskQueue.stop();
  await prisma.$disconnect();
  process.exit(0);
});
```

**Проблема:** Нет graceful shutdown для:
- Redis connection
- OpenAI API requests
- Background tasks

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Полный graceful shutdown
// backend/server.js
import { disconnectPrisma } from './lib/prismaSingleton.js';
import { closeRedis } from './utils/cache.js';
import { closeCircuitBreakers } from './utils/circuitBreaker.js';

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('⚠️ Already shutting down...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`🛑 ${signal} received. Shutting down gracefully...`);
  
  try {
    // 1. Останавливаем приём новых запросов
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
    
    // 2. Останавливаем task queue
    taskQueue.stop();
    console.log('✅ Task queue stopped');
    
    // 3. Закрываем Redis connection
    await closeRedis();
    console.log('✅ Redis connection closed');
    
    // 4. Закрываем circuit breakers
    closeCircuitBreakers();
    console.log('✅ Circuit breakers closed');
    
    // 5. Закрываем Prisma connection
    await disconnectPrisma();
    console.log('✅ Prisma connection closed');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 4.3 Frontend проблемы

#### 4.3.1 ВЫСОКИЙ: Большой компонент App.tsx (687 строк)

**Файл:** [`App.tsx`](App.tsx:1)

**Проблемы:**
- Смешивает бизнес-логику, UI state, API calls
- Содержит 25+ useEffect hooks
- Сложно тестировать и поддерживать

**Решение:**
```typescript
// ✅ РЕШЕНИЕ: Вынести бизнес-логику в custom hooks
// hooks/useGeneration.ts
import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import type { GenerationConfig, KeywordRow, SeoResult } from '../types';

export function useGeneration() {
  const [result, setResult] = useState<SeoResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generate = useCallback(async (config: GenerationConfig, keywords: KeywordRow[]) => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      const response = await apiService.generate(config, keywords);
      setResult(response.result);
      return response.result;
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать контент');
      throw err;
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    result,
    isGenerating,
    error,
    progress,
    generate,
    reset
  };
}

// hooks/useProjects.ts
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import type { Project } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.getProjects();
      setProjects(response.projects);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить проекты');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string, description?: string) => {
    try {
      const response = await apiService.createProject({ name, description });
      setProjects(prev => [...prev, response.project]);
      return response.project;
    } catch (err: any) {
      setError(err.message || 'Не удалось создать проект');
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (projectId: string, data: { name?: string; description?: string }) => {
    try {
      const response = await apiService.updateProject(projectId, data);
      setProjects(prev => prev.map(p => p.id === projectId ? response.project : p));
      return response.project;
    } catch (err: any) {
      setError(err.message || 'Не удалось обновить проект');
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await apiService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err: any) {
      setError(err.message || 'Не удалось удалить проект');
      throw err;
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    isLoading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject
  };
}

// hooks/useUser.ts
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import type { User } from '../types';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.getUser();
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить пользователя');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (data: { firstName?: string; username?: string }) => {
    try {
      const response = await apiService.updateUser(data);
      setUser(response.user);
      return response.user;
    } catch (err: any) {
      setError(err.message || 'Не удалось обновить пользователя');
      throw err;
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return {
    user,
    isLoading,
    error,
    loadUser,
    updateUser
  };
}

// App.tsx (упрощённая версия)
import { useGeneration } from './hooks/useGeneration';
import { useProjects } from './hooks/useProjects';
import { useUser } from './hooks/useUser';

function App() {
  const { user, isLoading: isUserLoading } = useUser();
  const { projects, isLoading: isProjectsLoading } = useProjects();
  const { result, isGenerating, generate, reset } = useGeneration();

  if (isUserLoading || isProjectsLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app">
      <Header user={user} />
      <main>
        <ProjectList projects={projects} />
        <GenerationForm onGenerate={generate} isGenerating={isGenerating} />
        {result && <ResultView result={result} onReset={reset} />}
      </main>
    </div>
  );
}
```

#### 4.3.2 СРЕДНИЙ: Отсутствие error boundary для всего приложения

**Файл:** [`components/ErrorBoundary.tsx`](components/ErrorBoundary.tsx:1)

```typescript
// ✅ Есть ErrorBoundary, но только для ResultView
```

**Проблема:** ErrorBoundary должен оборачивать всё приложение.

**Решение:**
```typescript
// ✅ РЕШЕНИЕ: Обернуть App.tsx в ErrorBoundary
// index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

#### 4.3.3 НИЗКИЙ: Отсутствие React Query для кэширования API responses

**Решение:**
```typescript
// ✅ РЕШЕНИЕ: Использовать React Query
// npm install @tanstack/react-query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// hooks/useProjects.ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000 // 10 минут
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => 
      apiService.createProject(data),
    onSuccess: () => {
      // Инвалидируем кэш проектов
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}
```

---

## 🧪 5. Frontend (React/TypeScript)

### 5.1 Архитектура

**Сильные стороны:**
- ✅ TypeScript с хорошей типизацией ([`types.ts`](types.ts:1))
- ✅ API сервис с централизованными запросами ([`apiService.ts`](services/apiService.ts:1))
- ✅ Custom hooks для Telegram WebApp ([`useTelegramWebApp.ts`](hooks/useTelegramWebApp.ts:1))
- ✅ Компонентная архитектура (40+ компонентов)
- ✅ Vite для быстрой сборки

**Проблемы:**

#### 5.1.1 ВЫСОКИЙ: Отсутствие state management (Redux/Zustand)

**Проблема:** Состояние разбросано по компонентам, сложно синхронизировать.

**Решение:**
```typescript
// ✅ РЕШЕНИЕ: Использовать Zustand для state management
// npm install zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  user: User | null;
  projects: Project[];
  currentProject: Project | null;
  generationResult: SeoResult | null;
  isGenerating: boolean;
  
  setUser: (user: User | null) => void;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setGenerationResult: (result: SeoResult | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  
  reset: () => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      projects: [],
      currentProject: null,
      generationResult: null,
      isGenerating: false,
      
      setUser: (user) => set({ user }),
      setProjects: (projects) => set({ projects }),
      setCurrentProject: (project) => set({ currentProject: project }),
      setGenerationResult: (result) => set({ generationResult: result }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      
      reset: () => set({
        user: null,
        projects: [],
        currentProject: null,
        generationResult: null,
        isGenerating: false
      })
    }),
    {
      name: 'seo-generator-storage',
      partialize: (state) => ({
        user: state.user,
        projects: state.projects,
        currentProject: state.currentProject
      })
    }
  )
);

export default useAppStore;
```

#### 5.1.2 СРЕДНИЙ: Нет React Query для кэширования API responses

**Решение:** (см. раздел 4.3.3)

#### 5.1.3 НИЗКИЙ: Отсутствие виртуализации списка

**Проблема:** ProjectList рендерит все проекты, может быть медленным при большом количестве.

**Решение:**
```typescript
// ✅ РЕШЕНИЕ: Использовать виртуализацию
// npm install @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function ProjectList() {
  const { projects } = useProjects();
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Высота одного проекта
    overscan: 5
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <ProjectItem project={projects[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5.2 Качество кода

**Оценка:** ⭐⭐⭐⭐☆ (4/5)
- TypeScript строго типизирован
- Хорошие практики React (хуки, компоненты)
- Чистый код, понятные названия

**Проблемы:**

#### 5.2.1 СРЕДНИЙ: Некоторые компоненты слишком большие

**Файлы:** [`App.tsx`](App.tsx:1) (687 строк), [`ResultView.tsx`](components/ResultView.tsx:1)

**Решение:** Разбить на более мелкие компоненты (см. раздел 4.3.1)

#### 5.2.2 НИЗКИЙ: Отсутствие Storybook или документации компонентов

**Решение:**
```bash
# Установить Storybook
npx storybook@latest init
```

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  }
};

export default config;

// components/ProjectItem.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ProjectItem } from './ProjectItem';

const meta: Meta<typeof ProjectItem> = {
  title: 'Components/ProjectItem',
  component: ProjectItem,
  tags: ['autodocs'],
  argTypes: {
    project: {
      control: 'object'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ProjectItem>;

export const Default: Story = {
  args: {
    project: {
      id: '1',
      name: 'SEO Project',
      description: 'Test project',
      createdAt: new Date().toISOString()
    }
  }
};

export const WithLongDescription: Story = {
  args: {
    project: {
      id: '2',
      name: 'SEO Project with Long Description',
      description: 'This is a very long description that should wrap properly in the UI component',
      createdAt: new Date().toISOString()
    }
  }
};
```

---

## 🗄️ 6. Backend (Node.js/Express)

### 6.1 Архитектура

**Сильные стороны:**
- ✅ Express с middleware (auth, validation, rate limiting, CSRF)
- ✅ Prisma ORM с типобезопасными запросами
- ✅ Сервисная архитектура (separation of concerns)
- ✅ Telegram Bot интеграция с webhook
- ✅ Фоновая обработка задач через [`taskQueueService`](backend/services/taskQueueService.js:1)
- ✅ HTML export сервис
- ✅ Knowledge Base сервис с RAG

**Проблемы:**

#### 6.1.1 КРИТИЧНО: 3406 строк в generate.js - "God file"

**Файл:** [`backend/routes/generate.js`](backend/routes/generate.js:1)

**Проблемы:**
- Смешивает бизнес-логику, валидацию, генерацию, парсинг
- Сложно поддерживать и тестировать
- Отсутствие модульного тестирования для core логики

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Разбить generate.js на модули
// backend/routes/generate/
// ├── index.js (главный router)
// ├── validation.js (валидация)
// ├── controllers/
// │   ├── generateController.js
// │   ├── spamController.js
// │   ├── rewriteController.js
// │   └── humanizeController.js
// └── services/
//     ├── generationService.js (основная логика генерации)
//     ├── spamService.js (проверка спама)
//     ├── rewriteService.js (рерайт)
//     └── humanizeService.js (хьюманизация)

// backend/routes/generate/index.js
import express from 'express';
import { validate } from '../../middleware/validate.js';
import { generateSchema, spamCheckSchema, rewriteSchema, humanizeSchema } from '../../schemas/index.js';
import { generateController } from './controllers/generateController.js';
import { spamController } from './controllers/spamController.js';
import { rewriteController } from './controllers/rewriteController.js';
import { humanizeController } from './controllers/humanizeController.js';

const router = express.Router();

// Основная генерация
router.post('/', validate(generateSchema), generateController.generate);
router.post('/stream', validate(generateSchema), generateController.generateStream);

// Проверка спама
router.post('/spam-check', validate(spamCheckSchema), spamController.check);
router.post('/fix-spam', validate(fixSpamSchema), spamController.fix);

// Рерайт
router.post('/rewrite', validate(rewriteSchema), rewriteController.rewrite);

// Хьюманизация
router.post('/humanize', validate(humanizeSchema), humanizeController.humanize);

export default router;

// backend/routes/generate/controllers/generateController.js
import { generationService } from '../../services/generationService.js';
import { getCachedGeneration, setCachedGeneration } from '../../services/generationCache.js';

export const generateController = {
  async generate(req, res) {
    try {
      const { config, keywords } = req.body;
      const userId = req.telegramUser.id;

      // Проверяем кэш
      const cached = await getCachedGeneration(config, keywords);
      if (cached) {
        return res.json({ result: cached, cached: true });
      }

      // Генерируем
      const result = await generationService.generate(config, keywords, userId);

      // Сохраняем в кэш
      await setCachedGeneration(config, keywords, result);

      res.json({ result, cached: false });
    } catch (error) {
      logger.error('Generate error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async generateStream(req, res) {
    // Реализация SSE streaming
    // ...
  }
};

// backend/routes/generate/services/generationService.js
import { getApiKey } from '../../config/ai.js';
import { fetchWithRetry } from '../../utils/http.js';
import { AIO_PROMPT, SEO_PROMPT } from '../../prompts/seoPrompt.js';

export const generationService = {
  async generate(config, keywords, userId) {
    const apiKey = await getApiKey();

    if (!apiKey) {
      throw new Error('API ключ не настроен');
    }

    // Проверяем лимиты
    await this.checkLimits(userId, config);

    // Генерируем контент
    const result = await this.performGeneration(config, keywords, apiKey);

    // Инкрементируем счётчик
    await this.incrementUsage(userId);

    return result;
  },

  async checkLimits(userId, config) {
    // Проверка лимитов пользователя
    // ...
  },

  async performGeneration(config, keywords, apiKey) {
    // Основная логика генерации
    // ...
  },

  async incrementUsage(userId) {
    // Инкрементация счётчика генераций
    // ...
  }
};
```

#### 6.1.2 СРЕДНИЙ: Отсутствие структурированного логирования

**Проблема:** Использование `console.log` вместо winston/pino.

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить структурированное логирование
// npm install pino pino-pretty
// backend/utils/logger.js
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production'
    ? pino.transport({ target: 'pino/file', options: { destination: './logs/app.log' } })
    : pino.transport({ target: 'pino-pretty', options: { colorize: true } }),
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
});

export default logger;

// Использование
logger.info({ requestId, userId, action: 'generate', duration: 1234 });
logger.error({ requestId, error: err.message, stack: err.stack });
```

#### 6.1.3 НИЗКИЙ: Нет request ID для трассировки запросов

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить request ID middleware
// backend/middleware/requestId.js
import crypto from 'crypto';

export function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

// Использование в server.js
import { requestId } from './middleware/requestId.js';
import logger from './utils/logger.js';

app.use(requestId);

app.use((req, res, next) => {
  req.startTime = Date.now();
  
  logger.info({
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.telegramUser?.id
  });
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info({
      requestId: req.id,
      action: 'response_sent',
      duration: `${duration}ms`,
      statusCode: res.statusCode
    });
  });
  
  next();
});
```

### 6.2 Качество кода

**Оценка:** ⭐⭐⭐⭐ (3.5/5)
- Чистый Node.js код
- Good error handling
- Async/await везде
- Использование современных ES6+ features

**Проблемы:**

#### 6.2.1 СРЕДНИЙ: Отсутствие структурированного логирования

**Решение:** (см. раздел 6.1.2)

#### 6.2.2 НИЗКИЙ: Нет request ID для трассировки запросов

**Решение:** (см. раздел 6.1.3)

### 6.3 API Design

**Проблемы:**

#### 6.3.1 ВЫСОКИЙ: Отсутствие versioning API

**Проблема:** При изменении API придётся ломать обратную совместимость.

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить versioning API
// backend/routes/v1/generate.js
import express from 'express';
import generateRouter from '../generate/index.js';

const router = express.Router();
router.use('/generate', generateRouter);

export default router;

// backend/routes/v2/generate.js
import express from 'express';
import generateRouterV2 from '../generate/indexV2.js';

const router = express.Router();
router.use('/generate', generateRouterV2);

export default router;

// server.js
import v1Routes from './routes/v1/index.js';
import v2Routes from './routes/v2/index.js';

app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);
```

#### 6.3.2 СРЕДНИЙ: Нет API documentation (Swagger/OpenAPI)

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить OpenAPI/Swagger
// npm install swagger-jsdoc swagger-ui-express
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SEO Generator API',
      version: '1.0.0',
      description: 'API для генерации SEO-контента'
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        telegramAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Telegram-Init-Data'
        }
      }
    }
  },
  apis: ['./routes/**/*.js']
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

#### 6.3.3 НИЗКИЙ: Нестандартные HTTP status codes

**Проблема:** Хотя status codes используются корректно, нет документации.

**Решение:** Добавить документацию в Swagger (см. выше)

---

## 🗄️ 7. База данных

### 7.1 Схема Prisma

**Сильные стороны:**
- ✅ Хорошая нормализация (User, Plan, Project, History, BackgroundTask)
- ✅ Cascade delete для целостности данных
- ✅ Индексы на ключевые поля
- ✅ Отношения: User → Projects → History, User → KnowledgeBase, User → InternalLinks, User → BackgroundTask
- ✅ JSON поля для сложных структур (config, result в History)

**Проблемы:**

#### 7.1.1 ВЫСОКИЙ: Дублирование schema.prisma в корне проекта

**Файлы:** [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma:1), [`prisma/schema.prisma`](prisma/schema.prisma:1)

**Решение:**
```bash
# ❌ Удалить дубликат
rm prisma/schema.prisma

# ✅ Использовать только backend/prisma/schema.prisma
```

#### 7.1.2 СРЕДНИЙ: Нет soft delete

**Проблема:** При удалении данные теряются безвозвратно.

**Решение:**
```prisma
// ✅ РЕШЕНИЕ: Добавить soft delete
model BackgroundTask {
  id          String   @id @default(uuid())
  type         String
  status       String   @default("pending")
  config       Json
  result       Json?
  error        String?
  createdAt     DateTime @default(now())
  startedAt    DateTime?
  completedAt  DateTime?
  deletedAt    DateTime?  // Добавить это поле
  updatedAt     DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, type, status, createdAt])
  @@index([userId, deletedAt]) // Для soft delete
}
```

#### 7.1.3 НИЗКИЙ: Нет audit trail

**Проблема:** Нет информации о том, кто и когда изменил запись.

**Решение:**
```prisma
// ✅ РЕШЕНИЕ: Добавить audit trail
model AuditLog {
  id          String   @id @default(uuid())
  entity      String   // Тип сущности (User, Project, etc.)
  entityId    String   // ID сущности
  action      String   // Действие (create, update, delete)
  changes     Json     // Изменения
  userId      String   // Кто сделал изменение
  createdAt   DateTime @default(now())

  @@index([entity, entityId])
  @@index([userId, createdAt])
}
```

---

## 🧪 8. Telegram WebApp Интеграция

### 8.1 Реализация

**Сильные стороны:**
- ✅ Правильная валидация initData (HMAC-SHA256)
- ✅ Dev mode bypass для локальной разработки
- ✅ Использование Telegram Bot API для уведомлений
- ✅ Inline кнопки для быстрых действий
- ✅ Graceful degradation при недоступности бота

**Проблемы:**

#### 8.1.1 СРЕДНИЙ: Webhook не всегда устанавливается корректно

**Файл:** [`backend/utils/subscriptionManager.js`](backend/utils/subscriptionManager.js:30-34)

```javascript
// ❌ ПРОБЛЕМА: Нет retry logic для webhook
bot.setWebHook(webhookUrl)
  .then(() => console.log(`✅ Webhook set to: ${webhookUrl}`))
  .catch(err => console.error('❌ Failed to set webhook:', err.message));
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить retry logic для webhook
import pRetry from 'p-retry';

export async function setWebhookWithRetry(bot, webhookUrl, maxRetries = 3) {
  return pRetry(
    async () => {
      await bot.setWebHook(webhookUrl);
      console.log(`✅ Webhook set to: ${webhookUrl}`);
    },
    {
      retries: maxRetries,
      onRetry: (err) => {
        console.error(`Retry webhook setup:`, err.message);
      },
      minTimeout: 1000,
      maxTimeout: 10000
    }
  );
}

// Использование
if (isProduction && process.env.WEBAPP_URL) {
  const webhookUrl = `${process.env.WEBAPP_URL}/api/webhook/telegram`;
  await setWebhookWithRetry(bot, webhookUrl);
}
```

#### 8.1.2 НИЗКИЙ: Нет retry logic для отправки уведомлений в Telegram

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить retry logic для уведомлений
import pRetry from 'p-retry';

export async function sendTelegramNotificationWithRetry(telegramId, message, options = {}, maxRetries = 3) {
  return pRetry(
    async () => sendTelegramMessage(telegramId, message, options),
    {
      retries: maxRetries,
      onRetry: (err, attempt) => {
        console.error(`Retry ${attempt}/${maxRetries}:`, err.message);
        // Задержка перед retry
        return new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  );
}
```

---

## 📊 9. Мониторинг и логирование

### 9.1 Текущее состояние

**Реализация:**
- ✅ Health check endpoint ([`server.js`](backend/server.js:280-294))
- ✅ Request logging в middleware
- ✅ Error logging в routes
- ✅ Console логирование для отладки

**Проблемы:**

#### 9.1.1 ВЫСОКИЙ: Нет структурированного логирования

**Проблема:** Все логи через `console.log`, нет возможности анализировать.

**Решение:** (см. раздел 6.1.2)

#### 9.1.2 ВЫСОКИЙ: Нет метрик (request duration, error rates, AI API latency)

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить метрики
// npm install prom-client
import promClient from 'prom-client';

// Создаём реестр
const register = new promClient.Registry();

// HTTP метрики
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// AI API метрики
const aiApiDuration = new promClient.Histogram({
  name: 'ai_api_duration_seconds',
  help: 'Duration of AI API requests in seconds',
  labelNames: ['model', 'provider'],
  buckets: [0.5, 1, 2.5, 5, 10, 30, 60]
});

const aiApiErrors = new promClient.Counter({
  name: 'ai_api_errors_total',
  help: 'Total number of AI API errors',
  labelNames: ['model', 'provider', 'error_type']
});

// База данных метрики
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
});

// Регистрируем метрики
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(aiApiDuration);
register.registerMetric(aiApiErrors);
register.registerMetric(dbQueryDuration);

// Middleware для HTTP метрик
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    }, duration);
    
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });
  
  next();
}

// Endpoint для метрик
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

#### 9.1.3 ВЫСОКИЙ: Нет alerting (Sentry, PagerDuty)

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить Sentry
// npm install @sentry/node
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Фильтруем чувствительные данные
    if (event.request) {
      delete event.request.headers;
      delete event.request.cookies;
    }
    return event;
  }
});

// Middleware для Sentry
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

#### 9.1.4 СРЕДНИЙ: Логи не централизованы

**Решение:** Использовать ELK Stack (Elasticsearch, Logstash, Kibana) или Loki + Grafana

### 9.2 Логирование ошибок

**Проблемы:**

#### 9.2.1 СРЕДНИЙ: Ошибки логируются, но не всегда с контекстом

**Файл:** [`backend/routes/generate.js`](backend/routes/generate.js:196-197)

```javascript
// ❌ ПРОБЛЕМА: Нет контекста при логировании ошибок
console.error('Failed to parse AI response:', error);
```

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить контекст
logger.error({
  requestId: req.id,
  userId: req.telegramUser?.id,
  action: 'parse_ai_response',
  model: config.model,
  error: error.message,
  stack: error.stack
});
```

#### 9.2.2 НИЗКИЙ: Нет централизованной обработки ошибок

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Создать централизованный обработчик ошибок
// backend/middleware/errorHandler.js
import logger from '../utils/logger.js';
import * as Sentry from '@sentry/node';

export function errorHandler(err, req, res, next) {
  const requestId = req.id || 'unknown';
  
  logger.error({
    requestId,
    error: err.message,
    stack: err.stack,
    userId: req.telegramUser?.id,
    path: req.path,
    method: req.method
  });
  
  // Отправляем ошибку в Sentry
  Sentry.captureException(err, {
    tags: {
      userId: req.telegramUser?.id,
      path: req.path,
      method: req.method
    },
    extra: {
      requestId,
      body: req.body
    }
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Внутренняя ошибка' 
      : err.message,
    requestId
  });
}

// Использование в server.js
import { errorHandler } from './middleware/errorHandler.js';

app.use(errorHandler);
```

---

## 🎯 10. AI/ML Интеграция

### 10.1 Реализация

**Сильные стороны:**
- ✅ Мультимодальная генерация (Writer + Visualizer параллельно)
- ✅ Strict JSON mode для структурированных ответов
- ✅ Fallback механизмы для парсинга JSON
- ✅ Model mapping для поддержки старых моделей
- ✅ AIO режим с оптимизацией для AI search engines
- ✅ Knowledge Base с RAG (частично)

**Проблемы:**

#### 10.1.1 ВЫСОКИЙ: Нет streaming ответов (UI блокируется)

**Проблема:** Генерация блокирует UI на 30-120 секунд.

**Решение:** Реализовать Server-Sent Events (SSE) для streaming (см. раздел 1.3.3)

#### 10.1.2 ВЫСОКИЙ: Жёстко закодированные промпты

**Файл:** [`backend/routes/generate.js`](backend/routes/generate.js:117-240)

```javascript
// ❌ ПРОБЛЕМА: Промпты жёстко закодированы в коде
const seoPrompt = `You are a Senior SEO Copywriter...`;
const aioPrompt = `You are a Artificial Intelligence Optimization Specialist...`;
```

**Решение:** Вынести промпты в отдельные файлы (см. раздел 4.2.1)

#### 10.1.3 СРЕДНИЙ: Отсутствие A/B тестирования моделей

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Добавить A/B тестирование моделей
// backend/utils/modelTester.js
import { getApiKey } from '../config/ai.js';
import { fetchWithRetry } from './http.js';

export async function testModel(model, prompt, maxTokens = 500) {
  const apiKey = await getApiKey();
  const start = Date.now();
  
  try {
    const response = await fetchWithRetry(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'https://seogenerator.app'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a test assistant." },
            { role: "user", content: prompt }
          ],
          max_tokens: maxTokens
        })
      }
    );

    const duration = Date.now() - start;
    const data = await response.json();
    
    return {
      success: true,
      duration,
      model,
      tokens: data.usage?.total_tokens || 0,
      cost: data.usage?.total_tokens * getModelCost(model)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - start,
      model
    };
  }
}

function getModelCost(model) {
  // Стоимость за 1K токенов
  const costs = {
    'google/gemini-3-flash-preview': 0.0001,
    'openai/gpt-4o': 0.005,
    'anthropic/claude-3.5-sonnet': 0.003,
    'x-ai/grok-2-1212': 0.0005
  };
  
  return costs[model] || 0.001;
}

// Использование
const results = await Promise.all([
  testModel('google/gemini-3-flash-preview', 'Test prompt'),
  testModel('openai/gpt-4o', 'Test prompt'),
  testModel('anthropic/claude-3.5-sonnet', 'Test prompt')
]);

console.table(results);
```

#### 10.1.4 НИЗКИЙ: Нет кэширования успешных промптов

**Решение:**
```javascript
// ✅ РЕШЕНИЕ: Кэшировать успешные промпты
// backend/services/promptCache.js
import { cacheGet, cacheSet } from '../utils/cache.js';

const PROMPT_CACHE_KEY = 'prompt:';
const PROMPT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

export async function getCachedPrompt(templateName, variables) {
  const cacheKey = `${PROMPT_CACHE_KEY}${templateName}:${JSON.stringify(variables)}`;
  return await cacheGet(cacheKey);
}

export async function setCachedPrompt(templateName, variables, prompt) {
  const cacheKey = `${PROMPT_CACHE_KEY}${templateName}:${JSON.stringify(variables)}`;
  await cacheSet(cacheKey, prompt, PROMPT_CACHE_TTL);
}
```

---

## 🚀 11. Рекомендации по приоритетам

### 11.1 Критический приоритет (немедленно)

#### 1. Реализовать streaming для генерации контента
- **Причина:** UI блокируется на 30-120 секунд при генерации больших текстов
- **Решение:** Server-Sent Events (SSE) для потоковой передачи данных
- **Ожидаемый эффект:** Улучшение UX, возможность видеть прогресс генерации
- **Время реализации:** 2-3 дня
- **Файлы для изменения:**
  - `backend/routes/generate/stream.js` (новый)
  - `services/apiService.ts` (добавить SSE поддержку)
  - `App.tsx` (добавить SSE клиент)

#### 2. Добавить message queue для фоновых задач
- **Причина:** setInterval не надёжен для production, потеря задач при рестарте
- **Решение:** Использовать BullMQ или RabbitMQ
- **Ожидаемый эффект:** Надёжная обработка задач, масштабируемость
- **Время реализации:** 3-5 дней
- **Файлы для изменения:**
  - `backend/queues/generationQueue.js` (новый)
  - `backend/services/taskQueueService.js` (переписать)
  - `backend/routes/tasks.js` (обновить)

#### 3. Добавить Redis Cluster для distributed rate limiting
- **Причина:** Текущий rate limiting работает в памяти одного процесса
- **Решение:** Redis Sentinel или Redis Cluster
- **Ожидаемый эффект:** Масштабируемость, корректная работа при горизонтальном масштабировании
- **Время реализации:** 2-3 дня
- **Файлы для изменения:**
  - `backend/middleware/distributedRateLimit.js` (новый)
  - `backend/utils/cache.js` (обновить)

#### 4. Улучшить обработку ошибок и мониторинг
- **Причина:** Ошибки логируются в console, нет alerting
- **Решение:** Sentry для error tracking, Prometheus для метрик
- **Ожидаемый эффект:** Быстрое обнаружение проблем, улучшение времени реакции
- **Время реализации:** 3-4 дня
- **Файлы для изменения:**
  - `backend/middleware/errorHandler.js` (новый)
  - `backend/utils/logger.js` (новый)
  - `server.js` (добавить middleware)

### 11.2 Высокий приоритет (в течение 1-2 недель)

#### 5. Разбить App.tsx на более мелкие компоненты
- **Причина:** 687 строк, смешивает бизнес-логику, UI state, API calls
- **Решение:** Custom hooks для бизнес-логики, Context API для state management
- **Ожидаемый эффект:** Улучшение тестируемости, поддержка кода
- **Время реализации:** 2-3 дня
- **Файлы для изменения:**
  - `App.tsx` (переписать)
  - `hooks/useGeneration.ts` (новый)
  - `hooks/useProjects.ts` (новый)
  - `hooks/useUser.ts` (новый)

#### 6. Добавить unit тесты для сервисов
- **Причина:** Core логика не покрыта тестами
- **Решение:** Написать тесты для generationService, spamService, optimizationService
- **Ожидаемый эффект:** Уверенность в коде, предотвращение регрессий
- **Время реализации:** 5-7 дней
- **Файлы для изменения:**
  - `backend/tests/services/generationService.test.js` (новый)
  - `backend/tests/services/spamService.test.js` (новый)
  - `backend/tests/services/optimizationService.test.js` (новый)

#### 7. Добавить API документацию (Swagger/OpenAPI)
- **Причина:** Нет документации для API endpoints
- **Решение:** Swagger UI для разработчиков и автоматическая генерация docs
- **Ожидаемый эффект:** Ускорение разработки интеграций, улучшение DX
- **Время реализации:** 2-3 дня
- **Файлы для изменения:**
  - `backend/swagger.js` (новый)
  - `server.js` (добавить Swagger UI)

### 11.3 Средний приоритет (в течение 1 месяца)

#### 8. Реализовать graceful shutdown для всех процессов
- **Причина:** Нет корректного завершения фоновых задач при shutdown
- **Решение:** Добавить cleanup middleware для graceful shutdown
- **Ожидаемый эффект:** Надёжное завершение процессов, сохранение данных
- **Время реализации:** 1-2 дня
- **Файлы для изменения:**
  - `server.js` (обновить graceful shutdown)

#### 9. Добавить virtualization для длинных списков
- **Причина:** ProjectList рендерит все проекты, может быть медленным
- **Решение:** react-window или react-virtual
- **Ожидаемый эффект:** Улучшение производительности UI
- **Время реализации:** 1-2 дня
- **Файлы для изменения:**
  - `components/ProjectList.tsx` (обновить)

#### 10. Улучшить кэширование Redis
- **Причина:** Нет кэширования результатов генерации, планов, пользователей
- **Решение:** Кэшировать частые результаты (5-15 минут), инвалидация при изменениях
- **Ожидаемый эффект:** Снижение нагрузки на AI API, улучшение response time
- **Время реализации:** 2-3 дня
- **Файлы для изменения:**
  - `backend/services/generationCache.js` (новый)
  - `backend/services/userCache.js` (новый)

### 11.4 Низкий приоритет (когда будет время)

#### 11. Добавить Storybook для компонентов
- **Причина:** Нет документации для 40+ компонентов
- **Решение:** Storybook для визуальной документации и тестирования компонентов
- **Ожидаемый эффект:** Улучшение DX, автоматическое тестирование UI
- **Время реализации:** 2-3 дня
- **Файлы для изменения:**
  - `.storybook/` (новая директория)
  - `components/*.stories.tsx` (добавить stories)

#### 12. Реализовать автоматические тесты (E2E)
- **Причина:** Тесты есть только для auth и projects
- **Решение:** Playwright или Cypress для E2E тестирования
- **Ожидаемый эффект:** Предотвращение регрессий, уверенность в релизах
- **Время реализации:** 5-7 дней
- **Файлы для изменения:**
  - `e2e/` (новая директория)

---

## 📈 12. Итоговая оценка

### 12.1 Общая оценка зрелости проекта: ⭐⭐⭐⭐☆ (4.2/5)

**Сильные стороны:**
- ✅ Чистая архитектура с хорошим разделением ответственности
- ✅ TypeScript для типобезопасности
- ✅ Comprehensive security (auth, CSRF, rate limiting, encryption)
- ✅ Продвинутые функции (AIO, Knowledge Base, фоновые задачи)
- ✅ Хороший код с error handling
- ✅ Telegram WebApp интеграция

**Области для улучшения:**
1. **Архитектура** - Переход на микросервисы, message queue
2. **Производительность** - Streaming, кэширование, connection pooling
3. **Качество кода** - Разбивка компонентов, unit тесты, документация
4. **Мониторинг** - Структурированное логирование, метрики, alerting
5. **Масштабируемость** - Distributed rate limiting, graceful shutdown

### 12.2 Технический долг: ⚠️ Средний

**Критические проблемы:**
- Отсутствие streaming (UX проблема)
- Отсутствие message queue (надёжность)
- Ограниченное тестирование (только 2 endpoints)
- Дублирование промптов (maintainability issue)

**Средние проблемы:**
- Отсутствие структурированного логирования
- Отсутствие API документации
- Отсутствие soft delete и audit trail

**Низкие проблемы:**
- Отсутствие virtualization для списков
- Отсутствие Storybook
- Отсутствие E2E тестов

### 12.3 Рекомендуемый путь развития

#### Этап 1: Критические улучшения (1-2 недели)
1. Streaming генерация для улучшения UX
2. Message Queue (BullMQ/RabbitMQ) для надёжной фоновой обработки
3. Distributed Rate Limiting (Redis Cluster)
4. Мониторинг (Sentry + Prometheus)

#### Этап 2: Высокие улучшения (2-4 недели)
5. Разбивка App.tsx на более мелкие компоненты с custom hooks
6. Unit тестирование сервисов
7. API Documentation (Swagger)

#### Этап 3: Средние улучшения (1-2 месяца)
8. Virtualization для длинных списков
9. Storybook для компонентов
10. E2E тесты
11. Graceful Shutdown
12. Redis cache tuning

#### Этап 4: Низкие улучшения (когда будет время)
13. Sentry integration
14. Prompt caching
15. A/B тестирование моделей

---

## 🎯 13. Заключение

Ваше приложение **SEO Generator** демонстрирует **хороший уровень зрелости** с чистой архитектурой и продвинутыми функциями. Основные сильные стороны:

1. ✅ **Безопасность** - Комплексная защита (auth, CSRF, rate limiting, encryption)
2. ✅ **Архитектура** - Модульная структура с сервисами и middleware
3. ✅ **Интеграции** - Telegram WebApp, AI модели, Knowledge Base/RAG
4. ✅ **База данных** - Prisma ORM с индексами и cascade delete
5. ✅ **Функционал** - AIO режим, фоновые задачи, HTML export

Для достижения production-ready уровня на enterprise рекомендую сосредоточиться на:

1. **Streaming генерацию** для улучшения UX
2. **Message Queue (BullMQ/RabbitMQ)** для надёжной фоновой обработки
3. **Разбивку App.tsx** на более мелкие компоненты с custom hooks
4. **Unit тестирование** для покрытия core бизнес-логики
5. **API Documentation** (Swagger) для улучшения DX
6. **Мониторинг** (Sentry + Prometheus) для быстрого обнаружения проблем

Эти улучшения значительно повысят качество, надёжность и поддерживаемость кода, а также улучшат пользовательский опыт.

---

## 📚 14. Дополнительные ресурсы

### 14.1 Документация и best practices
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Express Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)

### 14.2 Инструменты и библиотеки
- [BullMQ](https://docs.bullmq.io/) - Message queue для Node.js
- [Redis](https://redis.io/) - In-memory data store
- [Sentry](https://sentry.io/) - Error tracking
- [Prometheus](https://prometheus.io/) - Metrics and monitoring
- [Swagger](https://swagger.io/) - API documentation
- [Storybook](https://storybook.js.org/) - Component documentation
- [Playwright](https://playwright.dev/) - E2E testing
- [Vitest](https://vitest.dev/) - Unit testing

### 14.3 Архитектурные паттерны
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [CQRS](https://martinfowler.com/bliki/CQRS.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)

---

**Дата создания:** 26.12.2025  
**Автор:** Senior Technical Review  
**Версия:** 1.0.0
