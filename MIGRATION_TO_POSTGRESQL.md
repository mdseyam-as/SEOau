# Миграция на PostgreSQL (Supabase)

## 1. Настройка Supabase

1. Создай проект на [supabase.com](https://supabase.com)
2. Скопируй `DATABASE_URL` из Settings → Database → Connection string (URI)
3. Добавь в `.env`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## 2. Установка зависимостей

```bash
npm install @prisma/client
npm install -D prisma
```

## 3. Инициализация базы данных

```bash
# Генерация Prisma Client
npm run db:generate

# Применение схемы к базе данных
npm run db:push

# Заполнение начальными данными (планы, настройки)
npm run db:seed
```

## 4. Структура базы данных

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

## 5. Обновление бэкенда

Замени импорты mongoose на Prisma:

```javascript
// Было:
import User from '../models/User.js';

// Стало:
import { prisma } from '../lib/prisma.js';

// Было:
const user = await User.findOne({ telegramId });

// Стало:
const user = await prisma.user.findUnique({ 
  where: { telegramId: BigInt(telegramId) } 
});
```

## 6. Примеры запросов

### Создание пользователя:
```javascript
const user = await prisma.user.create({
  data: {
    telegramId: BigInt(telegramId),
    username,
    firstName,
    planId: 'free'
  }
});
```

### Получение истории с проектом:
```javascript
const history = await prisma.history.findMany({
  where: { projectId },
  orderBy: { createdAt: 'desc' },
  include: { project: true }
});
```

### Обновление лимитов:
```javascript
await prisma.user.update({
  where: { id: userId },
  data: {
    generationsUsed: { increment: 1 },
    lastGenerationDate: new Date().toISOString().slice(0, 10)
  }
});
```

## 7. Полезные команды

```bash
# Открыть Prisma Studio (GUI для БД)
npm run db:studio

# Создать миграцию
npm run db:migrate

# Сбросить БД и пересоздать
npx prisma migrate reset
```

## 8. Особенности

- `telegramId` хранится как `BigInt` (Telegram ID могут быть большими)
- JSON поля (`config`, `result`) автоматически сериализуются/десериализуются
- Каскадное удаление: удаление User удаляет все его Projects и History
- Индексы оптимизированы для частых запросов
