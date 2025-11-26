# Настройка базы данных

Руководство по настройке MongoDB для SEO Generator.

## Вариант 1: MongoDB Atlas (Облако - Рекомендуется)

### Преимущества
- Бесплатный tier (512 MB)
- Автоматические бэкапы
- Не требует локальной установки
- Доступ из любой точки мира

### Шаги настройки

1. **Создайте аккаунт на [MongoDB Atlas](https://www.mongodb.com/atlas)**

2. **Создайте новый кластер**
   - Выберите FREE tier (M0)
   - Выберите регион ближайший к вашим пользователям
   - Название кластера: `seo-generator`

3. **Настройте доступ**
   - Database Access: создайте пользователя БД
   - Network Access: добавьте IP `0.0.0.0/0` (разрешить все) или конкретные IP

4. **Получите Connection String**
   - Нажмите "Connect" → "Connect your application"
   - Скопируйте строку подключения:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/seo-generator
   ```

5. **Настройте backend `.env`**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/seo-generator
   ```

## Вариант 2: Локальный MongoDB

### Установка

**Windows:**
1. Скачайте [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Установите с настройками по умолчанию
3. MongoDB будет запущен как сервис

**Linux (Ubuntu):**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

### Connection String для локального MongoDB

``env
MONGODB_URI=mongodb://localhost:27017/seo-generator
```

## Инициализация базы данных

После настройки подключения, инициализируйте БД с дефолтными планами:

```bash
cd backend
node initDb.js
```

Это создаст:
- 4 тарифных плана (Free, Базовый, PRO, Unlimited)
- Необходимые индексы для оптимизации

## Проверка подключения

Запустите backend:

```bash
cd backend
npm install
npm start
```

Откройте в браузере:
```
http://localhost:3000/health
```

Должно вернуть:
```json
{
  "status": "ok",
  "timestamp": "2025-...",
  "database": "connected"
}
```

## Структура базы данных

### Коллекции

1. **users** - Пользователи Telegram
   - Индексы: `telegramId`
   - TTL индекс на подписку (опционально)

2. **projects** - Проекты пользователей
   - Индексы: `userId`, `createdAt`

3. **histories** - История генераций
   - Индексы: `projectId`, `timestamp`

4. **plans** - Тарифные планы
   - Индексы: `id`

## Резервное копирование

### MongoDB Atlas
Автоматические ежедневные бэкапы включены в FREE tier.

### Локальный MongoDB
```bash
mongodump --db seo-generator --out /path/to/backup
```

Восстановление:
```bash
mongorestore --db seo-generator /path/to/backup/seo-generator
```

## Мониторинг

### Atlas Dashboard
Доступ через веб-интерфейс Atlas:
- Метрики производительности
- Использование storage
- Медленные запросы

### Локальный
Используйте MongoDB Compass:
```bash
mongodb-compass
```

## Оптимизация производительности

Backend автоматически создаёт индексы при запуске. Для дополнительной оптимизации:

```javascript
// В MongoDB Shell или Compass
db.histories.createIndex({ projectId: 1, timestamp: -1 })
db.projects.createIndex({ userId: 1, createdAt: -1 })
```

## Миграция данных

Если у вас есть данные из localStorage (не требуется для нового проекта):

1. Экспортируйте данные из localStorage в JSON
2. Используйте `mongoimport` для импорта:

```bash
mongoimport --db seo-generator --collection users --file users.json --jsonArray
```

## Troubleshooting

### Ошибка подключения
- Проверьте правильность Connection String
- Убедитесь, что IP разрешён в Network Access (Atlas)
- Проверьте firewall/антивирус (локальный MongoDB)

### Медленные запросы
- Проверьте установлены ли индексы
- Используйте `explain()` для анализа запросов
- Atlas: смотрите Performance Advisor
