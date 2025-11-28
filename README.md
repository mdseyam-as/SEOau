# SEO Generator - Telegram WebApp

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
│   ├── models/          # MongoDB модели
│   ├── routes/          # API маршруты
│   ├── middleware/      # Middleware (валидация Telegram)
│   ├── utils/           # Утилиты (подписки, Telegram auth)
│   └── server.js        # Главный файл сервера
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

# Инициализируйте БД
node initDb.js

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

- **[AMVERA_QUICKSTART.md](./AMVERA_QUICKSTART.md) - Быстрый старт деплоя на Amvera** ⚡
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Детальное руководство по деплою
- [TELEGRAM_BOT_INTEGRATION.md](./TELEGRAM_BOT_INTEGRATION.md) - Интеграция с Telegram ботом
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Настройка MongoDB

## 🔑 Переменные окружения

### Backend (.env)

```env
MONGODB_URI=mongodb://localhost:27017/seo-generator
BOT_TOKEN=your_telegram_bot_token
ADMIN_TELEGRAM_IDS=11,22,33
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
