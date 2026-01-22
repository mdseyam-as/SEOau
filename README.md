# SEO Generator - Telegram WebApp 🚀

Мощный генератор SEO-контента, интегрированный с Telegram как WebApp.

## 🚀 Возможности

- Генерация SEO-оптимизированного контента с помощью множества AI моделей
- Анализ и автоматическое улучшение релевантности
- Проверка на спам
- Система управления проектами
- История генераций
- Гибкая система тарифных планов
- Автоматическая выдача подписок через ЮKassa
- Telegram WebApp интеграция

## 📁 Структура проекта

```
SEOau/
├── backend/              # Node.js + Express API
│   ├── routes/          # API маршруты
│   ├── middleware/      # Middleware (валидация Telegram)
│   ├── utils/           # Утилиты (подписки, Telegram auth)
│   ├── lib/             # Prisma клиент
│   └── server.js        # Главный файл сервера
│
├── prisma/               # Prisma ORM
│   └── schema.prisma    # Схема БД (PostgreSQL)
│
├── hooks/               # React hooks
│   └── useTelegram.ts   # Hook для Telegram WebApp API
│
├── services/            # Сервисы
│   ├── apiService.ts    # API клиент
│   ├── authService.ts   # Авторизация (legacy)
│   └── geminiService.ts # AI генерация
│
├── components/          # React компоненты
├── App.tsx              # Главный компонент
└── types.ts             # TypeScript типы
```

## 🛠️ Установка и запуск

### Backend

```bash
cd backend
npm install

# Скопируйте и настройте .env
cp .env.example .env
# Отредактируйте .env файл с вашими настройками

# Сгенерируйте Prisma клиент и примените миграции
npx prisma generate
npx prisma db push

# Заполните БД начальными данными
npm run db:seed

# Запустите сервер
npm start
```

Backend будет доступен на `http://localhost:3000`

### Frontend

```bash
# В корневой директории проекта
npm install

# Скопируйте и настройте .env
cp .env.example .env

# Запустите dev server
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

## 📚 Документация

- [TELEGRAM_BOT_INTEGRATION.md](./TELEGRAM_BOT_INTEGRATION.md) - Интеграция с Telegram ботом
- [MIGRATION_TO_POSTGRESQL.md](./MIGRATION_TO_POSTGRESQL.md) - Миграция на PostgreSQL

## 🔑 Переменные окружения

### Backend (.env)

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
BOT_TOKEN=your_telegram_bot_token
ADMIN_TELEGRAM_IDS=11,22,33
OPENROUTER_API_KEY=your_openrouter_key
YUKASSA_SHOP_ID=your_shop_id
YUKASSA_SECRET_KEY=your_secret_key
YUKASSA_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api
```

## 🎯 API Endpoints

### Авторизация
- `POST /api/auth/login` - Вход через Telegram
- `GET /api/auth/me` - Получить текущего пользователя

### Пользователи
- `GET /api/users/:id` - Получить пользователя
- `PUT /api/users/:id` - Обновить пользователя
- `POST /api/users/:id/increment-usage` - Инкремент лимитов
- `POST /api/users/:id/check-limits` - Проверка лимитов

### Проекты
- `GET /api/projects` - Список проектов
- `POST /api/projects` - Создать проект
- `DELETE /api/projects/:id` - Удалить проект

### История
- `GET /api/history/:projectId` - История проекта
- `POST /api/history` - Добавить в историю
- `DELETE /api/history/:id` - Удалить из истории

### Тарифные планы
- `GET /api/plans` - Список планов
- `GET /api/plans/:id` - Конкретный план

### Webhook
- `POST /api/webhook/payment` - ЮKassa webhook

## 💳 Тарифные планы

1. **Free** - Бесплатный (10 ген/мес, 1 ген/день)
2. **Базовый** - 500₽/мес (50 ген/мес, 5 ген/день)
3. **PRO** - 1500₽/мес (200 ген/мес, 20 ген/день)
4. **Unlimited** - 5000₽/мес (∞ генераций)

## 🔒 Безопасность

- Все API запросы валидируются через Telegram WebApp `initData`
- HMAC-SHA256 проверка подлинности
- Webhook ЮKassa с проверкой подписи
- CORS настроен только для разрешённых доменов

## 📱 Telegram WebApp

Приложение использует Telegram WebApp API для:
- Автоматической авторизации пользователей
- MainButton для основных действий
- BackButton для навигации
- Нативного UI Telegram

## 🤝 Поддержка

Для вопросов и поддержки обращайтесь в Telegram: [@your_support_bot](https://t.me/your_support_bot)

## 📄 Лицензия

Proprietary - Все права защищены

---

## Project Memo (internal)
This section is a quick internal map of the codebase.

### Overview
- Product: SEO Generator Telegram WebApp (frontend + backend)
- Frontend: Vite + React 19, TS, Tailwind (cdn in index.html), main entry `index.tsx`
- Backend: Express 5, Prisma, PostgreSQL, Telegram WebApp auth

### Layout
- Frontend app (root): `App.tsx`, `index.tsx`, `components/`, `services/`, `hooks/`, `types.ts`, `index.css`, `index.html`, `vite.config.ts`
- Backend app: `backend/server.js`, `backend/routes/`, `backend/middleware/`, `backend/utils/`, `backend/services/`, `backend/config/`
- Prisma schema: `backend/prisma/schema.prisma`
- Seed script: `prisma/seed.js`
- Extra SMTP server: `server.js` (port 3001, separate from backend)
- Docs: `docs/`, `plans/`

### Frontend notes
- Auth UI: `components/AuthScreen.tsx` (Telegram WebApp + dev login)
- API wrapper: `services/apiService.ts` adds `X-Telegram-Init-Data`, optional `X-Dev-Telegram-Id`
- User/plan state: `hooks/useAuth.ts`
- Result render: `components/ResultView.tsx` (Mermaid code-only, SVG injected via `dangerouslySetInnerHTML`)
- Export: `services/exportService.ts` (PDF/DOCX)

### Backend notes
- Main server: `backend/server.js` (CORS, CSRF, rate limits, Telegram auth, Swagger, static dist)
- Telegram auth: `backend/middleware/auth.js` + `backend/utils/telegramAuth.js`
- Rate limits config: `backend/config/app.js` + `backend/middleware/rateLimit.js`
- API key encryption: `backend/utils/encryption.js`
- Settings: `backend/routes/settings.js` stores OpenRouter key encrypted
- Generation: `backend/routes/generate.js` (SEO/GEO, spam, optimize, audit, rewrite, social pack)
- Outline: `backend/routes/outline.js`
- Knowledge base: `backend/routes/knowledge-base.js`, `backend/services/knowledgeBaseService.js`

### Data model (Prisma)
- User, Plan, Project, History, SystemSetting, Payment, KnowledgeBase, InternalLinks, BackgroundTask, ProcessLock
- DB: PostgreSQL (Supabase typical), `backend/lib/prisma.js` has retry + singleton

### Queues/background
- DB queue: `backend/services/taskQueueService.js` uses BackgroundTask + processLock
- BullMQ config: `backend/config/queue.js`, worker in `backend/workers/generationWorker.js`
- Queue routes: `backend/routes/queue.js`

### Env vars
- Root `.env.example` contains frontend + backend vars
- Backend `.env.example` contains backend vars
- Key: `DATABASE_URL`, `BOT_TOKEN`, `ADMIN_TELEGRAM_IDS`, `OPENROUTER_API_KEY`, `YUKASSA_*`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `WEBAPP_URL`, `REDIS_URL`

### Tests
- Frontend tests: `frontend/tests/**`
- Backend tests: `backend/tests/**`
- Root `vite.config.ts` includes both; backend `package.json` uses `node --test`

### Known pitfalls (current)
- `backend/utils/processLock.js` uses `uuid` (missing in backend deps)
- `backend/workers/generationWorker.js` expects Prisma models/fields not in schema
- Some OpenRouter reads need `decrypt` when key stored in DB
- SSRF risk: SEO audit/rewrite fetch arbitrary URLs without allowlist
- `/api/queue` and `/api/streaming` bypass plan limits
- CDN importmap + Tailwind CDN in `index.html` can conflict with Vite build

### Typical flow
- Telegram WebApp -> frontend -> `apiService` -> backend -> Prisma
- Generation in `/api/generate` -> OpenRouter -> response stored in History
