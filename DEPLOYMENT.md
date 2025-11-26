# Руководство по деплою

Инструкции по развёртыванию SEO Generator в продакшн.

## Структура проекта

- **Frontend** - React приложение (Vite)
- **Backend** - Node.js + Express API
- **Database** - MongoDB

## Деплой Frontend

### Вариант 1: Vercel (Рекомендуется)

1. **Подготовка**
   ```bash
   # Создайте файл .env
   echo "VITE_API_URL=https://your-backend-url.com/api" > .env
   ```

2. **Деплой**
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

3. **Переменные окружения**
   - В Vercel Dashboard → Settings → Environment Variables
   - Добавьте: `VITE_API_URL` = URL вашего backend

### Вариант 2: Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

### Вариант 3: GitHub Pages

```bash
# В vite.config.ts установите base
base: '/repository-name/'

npm run build
npx gh-pages -d dist
```

## Деплой Backend

### Вариант 1: Railway (Простой и быстрый)

1. **Создайте аккаунт на [Railway.app](https://railway.app)**

2. **Новый проект**
   - New Project → Deploy from GitHub repo
   - Выберите ваш репозиторий
   - Root Directory: `/backend`

3. **Переменные окружения**
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

4. **Настройте старт**
   - Railway автоматически определит `npm start` из package.json

5. **Получите URL**
   - Railway предоставит URL типа: `https://your-app.up.railway.app`

### Вариант 2: Render

1. **Создайте [Web Service](https://render.com)**
2. **Настройки**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: `backend`

3. **Environment Variables** - добавьте все переменные из `.env.example`

### Вариант 3: VPS (DigitalOcean, AWS, etc.)

```bash
# На сервере
git clone your-repo.git
cd your-repo/backend
npm install

# PM2 для автозапуска
npm install -g pm2
pm2 start server.js --name seo-backend
pm2 save
pm2 startup

# Nginx reverse proxy
sudo nano /etc/nginx/sites-available/api
```

Nginx config:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Настройка ЮKassa Webhook

1. **Откройте [ЮKassa Dashboard](https://yookassa.ru)**
2. **Настройки → Уведомления**
3. **HTTP-уведомления**
   - URL: `https://your-backend.railway.app/api/webhook/payment`
   - События: `payment.succeeded`
   - Создайте секретный ключ webhook

4. **Сохраните ключ в переменные окружения backend**
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

## Проверка деплоя

1. **Frontend health check**
   ```
   https://your-frontend.vercel.app
   ```

2. **Backend health check**
   ```
   https://your-backend.railway.app/health
   ```
   
3. **Database**
   ```bash
   # В MongoDB Atlas Dashboard
   # Проверьте Collections: users, projects, histories, plans
   ```

4. **Telegram Bot**
   ```
   Отправьте /start боту
   Откройте WebApp
   Проверьте автоматическую авторизацию
   ```

## Мониторинг и логирование

### Railway
- Встроенные логи в реальном времени
- Метрики CPU/RAM

### PM2 (VPS)
```bash
pm2 logs seo-backend
pm2 monit
```

### Sentry (опционально)
```bash
npm install @sentry/node
```

## Обновление

### Frontend
```bash
# Vercel автоматически деплоит при push в main
git push origin main
```

### Backend
```bash
# Railway автоматически деплоит при push
git push origin main

# Или вручную на VPS
cd backend
git pull
pm2 restart seo-backend
```

## Безопасность

1. **HTTPS обязателен** - Railway/Vercel автоматически предоставляют SSL
2. **CORS** - настроен в `server.js`, указать реальный URL frontend
3. **Rate Limiting** (опционально):
   ```bash
   npm install express-rate-limit
   ```

4. **Secrets** - никогда не коммитьте `.env` файлы в git

## Бэкапы

### База данных
MongoDB Atlas делает автоматические бэкапы.

### Код
Git repository - ваш бэкап кода.

## Troubleshooting

### CORS ошибки
- Проверьте `FRONTEND_URL` в backend `.env`
- Убедитесь в правильном URL без trailing slash

### Webhook не работает
- Проверьте URL в ЮKassa Dashboard
- Логи backend: `payment.succeeded` events
- Проверьте `YUKASSA_WEBHOOK_SECRET`

### Bot не отправляет уведомления
- Убедитесь что `BOT_TOKEN` правильный
- Проверьте что bot.ts запущен
- Проверьте логи backend
