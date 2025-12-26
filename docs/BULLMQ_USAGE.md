# Использование BullMQ (Message Queue)

## Обзор

BullMQ - это библиотека для управления очередями задач на базе Redis. Она позволяет выполнять задачи асинхронно, с retry механизмом и приоритетами.

## Установка зависимостей

```bash
npm install bullmq
```

## Конфигурация

### Настройка Redis

```env
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### Конфигурация очередей

Конфигурация находится в [`backend/config/queue.js`](../backend/config/queue.js):

```javascript
export const QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,
      age: 3600,
    },
    removeOnFail: {
      count: 5000,
      age: 86400,
    },
  },
  connection,
};
```

### Имена очередей

```javascript
export const QUEUE_NAMES = {
  GENERATION: 'generation',
  SEO_AUDIT: 'seo-audit',
  FAQ_GENERATION: 'faq-generation',
  CONTENT_REWRITE: 'content-rewrite',
  BACKGROUND_TASKS: 'background-tasks',
};
```

## API Endpoints

### POST /api/queue/generation

Добавление задачи генерации в очередь.

**Request:**
```json
{
  "projectId": 1,
  "topic": "SEO оптимизация для начинающих",
  "keywords": ["SEO", "оптимизация"],
  "tone": "Professional",
  "language": "Russian",
  "model": "gemini",
  "promptType": "seo"
}
```

**Response:**
```json
{
  "jobId": "1",
  "status": "queued",
  "message": "Задача добавлена в очередь"
}
```

### GET /api/queue/stats/:queueName

Получение статистики конкретной очереди.

**Response:**
```json
{
  "queueName": "generation",
  "stats": {
    "waiting": 5,
    "active": 2,
    "completed": 100,
    "failed": 3,
    "delayed": 0
  }
}
```

### GET /api/queue/stats

Получение статистики всех очередей.

**Response:**
```json
{
  "generation": {
    "waiting": 5,
    "active": 2,
    "completed": 100,
    "failed": 3,
    "delayed": 0
  },
  "seo-audit": {
    "waiting": 1,
    "active": 0,
    "completed": 50,
    "failed": 1,
    "delayed": 0
  }
}
```

### POST /api/queue/clean/:queueName

Очистка очереди.

**Request:**
```json
{
  "grace": 5000
}
```

**Response:**
```json
{
  "queueName": "generation",
  "message": "Очередь очищена"
}
```

## Воркеры

### Generation Worker

Воркер для обработки задач генерации находится в [`backend/workers/generationWorker.js`](../backend/workers/generationWorker.js).

```javascript
export const generationWorker = createWorker(
  QUEUE_NAMES.GENERATION,
  processGeneration,
  {
    concurrency: 2, // Обработка 2 задач одновременно
  }
);
```

### Обработка событий воркера

```javascript
generationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Generation job completed');
});

generationWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, 'Generation job failed');
});
```

## Использование на бэкенде

### Добавление задачи в очередь

```javascript
import { addJob, QUEUE_NAMES } from '../config/queue.js';

const job = await addJob(
  QUEUE_NAMES.GENERATION,
  'generate-content',
  {
    projectId: 1,
    topic: 'SEO оптимизация',
    keywords: ['SEO', 'оптимизация'],
    userId: 123,
  },
  {
    priority: 1,
    delay: 0,
  }
);
```

### Получение статистики очереди

```javascript
import { getQueueStats } from '../config/queue.js';

const stats = await getQueueStats(QUEUE_NAMES.GENERATION);
console.log(stats);
// { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 0 }
```

### Очистка очереди

```javascript
import { cleanQueue } from '../config/queue.js';

await cleanQueue(QUEUE_NAMES.GENERATION, 5000);
```

## Использование на фронтенде

### Добавление задачи в очередь

```typescript
async function addToQueue(data: GenerationData) {
  const response = await fetch('/api/queue/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  const result = await response.json();
  console.log('Job ID:', result.jobId);
  return result;
}
```

### Отслеживание статуса задачи

```typescript
async function checkJobStatus(jobId: string) {
  const response = await fetch(`/api/tasks/${jobId}`);
  const task = await response.json();
  
  console.log('Status:', task.status);
  console.log('Progress:', task.progress);
  return task;
}
```

### Получение статистики очереди

```typescript
async function getQueueStats() {
  const response = await fetch('/api/queue/stats');
  const stats = await response.json();
  
  console.log('Queue stats:', stats);
  return stats;
}
```

## Опции задачи

### Priority

```javascript
await addJob(QUEUE_NAMES.GENERATION, 'job-name', data, {
  priority: 1, // Чем меньше число, тем выше приоритет
});
```

### Delay

```javascript
await addJob(QUEUE_NAMES.GENERATION, 'job-name', data, {
  delay: 5000, // Задержка 5 секунд
});
```

### Attempts

```javascript
await addJob(QUEUE_NAMES.GENERATION, 'job-name', data, {
  attempts: 5, // Количество попыток
});
```

### Backoff

```javascript
await addJob(QUEUE_NAMES.GENERATION, 'job-name', data, {
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
});
```

## Retry механизм

BullMQ автоматически повторяет неудачные задачи с экспоненциальной задержкой:

1. Первая попытка: немедленно
2. Вторая попытка: через 2 секунды
3. Третья попытка: через 4 секунды
4. Четвёртая попытка: через 8 секунд

## Мониторинг

### Статистика очереди

```javascript
const stats = await getQueueStats(QUEUE_NAMES.GENERATION);
console.log('Waiting:', stats.waiting);
console.log('Active:', stats.active);
console.log('Completed:', stats.completed);
console.log('Failed:', stats.failed);
```

### Логирование

```javascript
generationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});

generationWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, 'Job failed');
});
```

## Graceful Shutdown

```javascript
import { closeAllQueues } from '../config/queue.js';

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closeAllQueues();
  process.exit(0);
});
```

## Примеры

### Генерация с отслеживанием статуса

```typescript
async function generateWithTracking(data: GenerationData) {
  // Добавляем задачу в очередь
  const { jobId } = await addToQueue(data);
  
  // Отслеживаем статус
  const interval = setInterval(async () => {
    const task = await checkJobStatus(jobId);
    
    if (task.status === 'completed') {
      clearInterval(interval);
      console.log('Generation completed:', task.result);
    } else if (task.status === 'failed') {
      clearInterval(interval);
      console.error('Generation failed:', task.error);
    }
  }, 2000);
}
```

### Множественные задачи

```typescript
async function generateMultiple(topics: string[]) {
  const promises = topics.map(topic => 
    addToQueue({ topic, keywords: ['SEO'] })
  );
  
  const results = await Promise.all(promises);
  console.log('Jobs added:', results);
}
```

## Советы

1. **Используйте приоритеты** - для важных задач
2. **Мониторьте очереди** - для предотвращения перегрузки
3. **Очищайте старые задачи** - для экономии памяти
4. **Логируйте события** - для отладки
5. **Используйте retry** - для обработки временных ошибок

## Устранение проблем

### Задачи не обрабатываются

Проверьте, что воркер запущен:

```bash
# Проверьте логи на наличие сообщений от воркера
```

### Задачи застревают

Проверьте Redis:

```bash
redis-cli
> KEYS bull:*
> LLEN bull:generation:waiting
```

### Очередь переполнена

Очистите очередь:

```bash
curl -X POST http://localhost:3000/api/queue/clean/generation
```

## Зависимости

- `bullmq` - библиотека для очередей задач
- `redis` - клиент для Redis

## Дополнительные ресурсы

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/documentation)
