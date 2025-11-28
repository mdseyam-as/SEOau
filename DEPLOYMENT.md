# Руководство по деплою

Инструкции по развёртыванию SEO Generator в продакшн.

## 🇷🇺 Деплой на Amvera Cloud (Рекомендуется для РФ)

Amvera — российский облачный сервис, поддерживающий оплату картами РФ.

> **Конфигурационные файлы:**
> - Backend: [`backend/amvera.yml`](backend/amvera.yml)
> - Frontend: [`amvera.yml`](amvera.yml) (в корне проекта)

### Шаг 1: MongoDB

1.  **Создайте проект на [amvera.io](https://amvera.io)**
    *   Нажмите **"Создать проект"**
    *   Выберите **"Pre-configured application"** → **"Databases"** → **"MongoDB"**

2.  **Настройте переменные окружения**
    ```
    MONGO_INITDB_ROOT_USERNAME = ваш_логин
    MONGO_INITDB_ROOT_PASSWORD = ваш_пароль (как секрет)
    ```

3.  **Запустите деплой**
    *   Нажмите "Развернуть"
    *   После деплоя откройте вкладку **"Info"**
    *   Скопируйте **Internal domain name** (например: `mongodb-xyz.internal`)

4.  **Сформируйте Connection String**
    ```
    mongodb://ваш_логин:ваш_пароль@mongodb-xyz.internal:27017/seo-generator
    ```

### Шаг 2: Backend

1.  **Создайте проект Backend**
    *   Нажмите **"Создать проект"** → **"Приложение"**
    *   Имя: `seo-backend`
    *   Подключите GitHub репозиторий

2.  **Настройка проекта**
    *   Amvera автоматически найдет `backend/amvera.yml`
    *   Или вручную укажите:
        - Среда: **Docker**
        - Dockerfile: `backend/Dockerfile`
        - Контекст: `backend`

3.  **Переменные окружения (Variables)**
    
    Добавьте следующие переменные:
    
    | Переменная | Значение | Тип |
    |------------|----------|-----|
    | `MONGODB_URI` | Connection string из Шага 1 | Secret |
    | `BOT_TOKEN` | Токен вашего Telegram бота | Secret |
    | `ADMIN_TELEGRAM_IDS` | ID админов через запятую | Secret |
    | `JWT_SECRET` | Случайная строка (32+ символов) | Secret |
    | `PORT` | `3000` | Variable |
    | `NODE_ENV` | `production` | Variable |
    | `FRONTEND_URL` | Оставить пустым (заполним позже) | Variable |

4.  **Деплой**
    *   Нажмите **"Развернуть"**
    *   Дождитесь окончания сборки
    *   Скопируйте URL (например: `https://seo-backend-abc.amvera.io`)

5.  **Проверка работоспособности**
    
    Откройте в браузере:
    ```
    https://seo-backend-abc.amvera.io/health
    ```
    
    Должен вернуть:
    ```json
    {
      "status": "ok",
      "database": "connected"
    }
    ```

### Шаг 3: Frontend

1.  **Создайте проект Frontend**
    *   **"Создать проект"** → **"Статический сайт"**
    *   Имя: `seo-frontend`
    *   Подключите тот же GitHub репозиторий

2.  **Настройка сборки**
    
    Amvera автоматически найдет `amvera.yml` в корне, который содержит:
    ```yaml
    build:
      commands:
        - npm install
        - npm run build
    publish:
      directory: dist
    ```

3.  **Переменные окружения**
    
    | Переменная | Значение |
    |------------|----------|
    | `VITE_API_URL` | `https://seo-backend-abc.amvera.io/api` |
    | `GEMINI_API_KEY` | Ваш API ключ Google Gemini |

    > ⚠️ **Важно:** В `VITE_API_URL` обязательно добавьте `/api` в конце!

4.  **Деплой**
    *   Разверните проект
    *   Скопируйте URL frontend (например: `https://seo-frontend-xyz.amvera.io`)

### Шаг 4: Финальная настройка

1.  **Обновите Backend**
    *   Вернитесь в проект **Backend**
    *   Переменные → `FRONTEND_URL` = `https://seo-frontend-xyz.amvera.io`
    *   Перезапустите Backend

2.  **Инициализация БД**
    
    Подключитесь к контейнеру Backend через Amvera Console и выполните:
    ```bash
    node initDb.js
    ```
    Это создаст тарифные планы в MongoDB.

3.  **Настройте Telegram Bot**
    *   Откройте Telegram → @BotFather
    *   Выберите вашего бота
    *   `/setmenubutton` → Укажите URL: `https://seo-frontend-xyz.amvera.io`
    *   Или настройте через `/newapp` для создания WebApp

4.  **Тестирование**
    *   Откройте вашего бота в Telegram
    *   Нажмите кнопку запуска WebApp
    *   Убедитесь, что приложение открывается и работает

---

## 🌍 Деплой на Vercel + Railway (Международный вариант)

### Frontend (Vercel)

1.  **Подготовка**
    ```bash
    # Создайте файл .env
    echo "VITE_API_URL=https://your-backend-url.com/api" > .env
    ```

2.  **Деплой**
    - Установите [Vercel CLI](https://vercel.com/download)
    ```bash
    npm i -g vercel
    vercel login
    vercel
    ```
    
    - Или через GitHub:
      1. Push код в GitHub
      2. Импортируйте проект на [vercel.com](https://vercel.com)
      3. Vercel автоматически определит настройки

3.  **Переменные окружения**
    - В Vercel Dashboard → Settings → Environment Variables
    - Добавьте: `VITE_API_URL` = URL вашего backend

### Backend (Railway)

1.  **Создайте аккаунт на [Railway.app](https://railway.app)**

2.  **Новый проект**
    - New Project → Deploy from GitHub repo
    - Выберите ваш репозиторий
    - Root Directory: `/backend`

3.  **Переменные окружения**
    ```env
    MONGODB_URI=mongodb+srv://...
    BOT_TOKEN=your_telegram_bot_token
    ADMIN_TELEGRAM_IDS=11,22,33
    YUKASSA_SHOP_ID=your_shop_id
    YUKASSA_SECRET_KEY=your_secret_key
    YUKASSA_WEBHOOK_SECRET=your_webhook_secret
    PORT=3000
    NODE_ENV=production
    FRONTEND_URL=https://your-frontend.vercel.app
    ```

4.  **Настройте старт**
    - Railway автоматически определит `npm start` из package.json

5.  **Получите URL**
    - Railway предоставит URL типа: `https://your-app.up.railway.app`

---

## Настройка ЮKassa Webhook

1.  **Откройте [ЮKassa Dashboard](https://yookassa.ru)**
2.  **Настройки → Уведомления**
3.  **HTTP-уведомления**
    - URL: `https://your-backend-domain.com/api/webhook/payment`
    - События: `payment.succeeded`
    - Создайте секретный ключ webhook

4.  **Сохраните ключ в переменные окружения backend**
    ```env
    YUKASSA_WEBHOOK_SECRET=your_generated_secret
    ```

## Telegram Bot

Bot можно запустить отдельно или в том же backend:

### Вариант 1: Вместе с Backend

Добавьте в `backend/server.js`:
```javascript
import { initializeBot } from './utils/subscriptionManager.js';
initializeBot(process.env.BOT_TOKEN);
```

### Вариант 2: Отдельный процесс

Создайте `bot.js` и деплойте отдельно:
```bash
pm2 start bot.js --name telegram-bot
```
