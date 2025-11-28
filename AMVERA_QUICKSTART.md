# Быстрый старт: Деплой на Amvera

## Предварительные требования

✅ Учетная запись на [amvera.io](https://amvera.io)  
✅ Код загружен в GitHub  
✅ Telegram bot создан через @BotFather  
✅ Google Gemini API ключ

## Шаги деплоя

### 1️⃣ MongoDB (5 минут)

```
1. Amvera → Создать проект → Databases → MongoDB
2. Переменные:
   - MONGO_INITDB_ROOT_USERNAME = admin
   - MONGO_INITDB_ROOT_PASSWORD = [ваш пароль]
3. Развернуть
4. Info → Скопировать Internal domain name
5. Connection string: mongodb://admin:пароль@internal-domain:27017/seo-generator
```

### 2️⃣ Backend (10 минут)

```
1. Создать проект → Приложение → GitHub repo
2. Amvera найдет: backend/amvera.yml
3. Переменные окружения:
   
   MONGODB_URI         = [connection string из шага 1]
   BOT_TOKEN          = [токен от @BotFather]
   ADMIN_TELEGRAM_IDS = [ваш Telegram ID]
   JWT_SECRET         = [случайная строка 32+ символа]
   PORT               = 3000
   NODE_ENV           = production

4. Развернуть
5. Скопировать URL backend
6. Проверить: https://backend-url/health
```

### 3️⃣ Frontend (10 минут)

```
1. Создать проект → Статический сайт → GitHub repo
2. Amvera найдет: amvera.yml
3. Переменные окружения:
   
   VITE_API_URL    = https://backend-url/api  (⚠️ с /api!)
   GEMINI_API_KEY  = [ключ Google Gemini]

4. Развернуть
5. Скопировать URL frontend
```

### 4️⃣ Финализация (5 минут)

```
1. Backend → Добавить переменную:
   FRONTEND_URL = https://frontend-url
   → Перезапустить

2. Backend Console → Выполнить:
   node initDb.js

3. Telegram @BotFather → Ваш бот:
   /setmenubutton → URL: https://frontend-url

4. Готово! 🎉
```

## Проверка

✅ Backend health: `https://backend-url/health` → `{"status":"ok"}`  
✅ Frontend: Открывается в браузере  
✅ Telegram bot: WebApp запускается и работает  

## Помощь

📄 Детальная инструкция: [DEPLOYMENT.md](DEPLOYMENT.md)  
📋 План деплоя: См. implementation_plan.md  
🗄️ Настройка БД: [DATABASE_SETUP.md](DATABASE_SETUP.md)  
🤖 Telegram интеграция: [TELEGRAM_BOT_INTEGRATION.md](TELEGRAM_BOT_INTEGRATION.md)

## Частые проблемы

| Проблема | Решение |
|----------|---------|
| CORS ошибки | Проверьте `FRONTEND_URL` в backend |
| База не подключается | Проверьте `MONGODB_URI` и доступ |
| API 404 | В `VITE_API_URL` должно быть `/api` |
| Bot не открывается | Проверьте URL в @BotFather |
