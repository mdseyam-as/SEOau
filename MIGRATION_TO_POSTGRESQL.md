# Миграция на PostgreSQL (Supabase) + Timeweb Cloud

## 1. Настройка Supabase

1. Создай проект на [supabase.com](https://supabase.com)
2. Перейди в Settings → Database → Connection string
3. Скопируй URI (Transaction pooler для serverless)

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## 2. Настройка переменных окружения

Добавь в Timeweb Cloud (или `.env`):

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

## 3. Локальная разработка

```bash
# Установи зависимости
npm install

# Сгенерируй Prisma Client
npm run db:generate

# Примени схему к базе данных
npm run db:push

# Заполни начальными данными (планы, настройки)
npm run db:seed

# Запусти dev сервер
cd backend && npm run dev
```

## 4. Деплой на Timeweb Cloud

### Переменные окружения в Timeweb:

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | `postgresql://...` (из Supabase) |
| `BOT_TOKEN` | Токен Telegram бота |
| `ADMIN_TELEGRAM_IDS` | ID админов через запятую |
| `OPENROUTER_API_KEY` | API ключ OpenRouter |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

### Деплой:

```bash
git push origin main
# Timeweb автоматически соберёт Docker образ
```

## 5. Структура базы данных

### Таблицы:

| Таблица | Описание |
|---------|----------|
| `User` | Пользователи (telegramId, plan, лимиты) |
| `Plan` | Тарифные планы (free, pro, unlimited) |
| `Project` | Проекты пользователей |
| `History` | История генераций (config + result в JSON) |
| `SystemSetting` | Глобальные настройки (API ключи, промпты) |
| `Payment` | Платежи ЮKassa |

### JSON поля:

- `History.config` - полный объект `GenerationConfig`
- `History.result` - полный объект `SeoResult` (включая `article`, `visuals`, `faq`, `seo`)

## 6. Полезные команды

```bash
# Открыть Prisma Studio (GUI для БД)
npm run db:studio

# Применить схему без миграций (dev)
npm run db:push

# Создать миграцию (production)
npm run db:migrate

# Сбросить БД и пересоздать
npx prisma migrate reset

# Посмотреть данные в консоли
npx prisma db pull
```

## 7. Особенности Prisma + Supabase

- Используй **Transaction pooler** (порт 6543) для serverless
- Добавь `?pgbouncer=true` в конец DATABASE_URL
- `telegramId` хранится как `BigInt` (Telegram ID могут быть большими)
- JSON поля автоматически сериализуются/десериализуются

## 8. Troubleshooting

### Ошибка "Can't reach database server"
- Проверь что IP Timeweb добавлен в Supabase (Settings → Database → Network)
- Или включи "Allow all IPs" в Supabase

### Ошибка "prepared statement already exists"
- Добавь `?pgbouncer=true` в DATABASE_URL

### BigInt serialization error
- Все telegramId конвертируются в string перед отправкой в JSON
