/**
 * BullMQ Configuration
 * Конфигурация для очередей задач
 * 
 * ВАЖНО: Очереди создаются лениво только при наличии Redis
 */

import { Queue, Worker } from 'bullmq';

// Проверка наличия Redis
const REDIS_URL = process.env.REDIS_URL;
const REDIS_AVAILABLE = !!REDIS_URL;

// Конфигурация Redis для BullMQ
const getConnection = () => {
  if (!REDIS_AVAILABLE) {
    return null;
  }
  
  // Parse Redis URL or use individual env vars
  if (REDIS_URL) {
    return REDIS_URL;
  }
  
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
};

// Конфигурация очередей
export const QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,
      age: 3600, // 1 час
    },
    removeOnFail: {
      count: 5000,
      age: 86400, // 24 часа
    },
  },
  connection: getConnection(),
};

// Имена очередей
export const QUEUE_NAMES = {
  GENERATION: 'generation',
  SEO_AUDIT: 'seo-audit',
  FAQ_GENERATION: 'faq-generation',
  CONTENT_REWRITE: 'content-rewrite',
  BACKGROUND_TASKS: 'background-tasks',
};

// Кэш для ленивой инициализации очередей
const queueCache = new Map();

/**
 * Создание очереди (ленивая инициализация)
 */
export function createQueue(name) {
  if (!REDIS_AVAILABLE) {
    console.warn(`[Queue] Redis not available, queue "${name}" disabled`);
    return null;
  }
  return new Queue(name, QUEUE_CONFIG);
}

/**
 * Получение или создание очереди
 */
function getOrCreateQueue(name) {
  if (!REDIS_AVAILABLE) {
    return null;
  }
  
  if (!queueCache.has(name)) {
    queueCache.set(name, createQueue(name));
  }
  return queueCache.get(name);
}

/**
 * Создание воркера
 */
export function createWorker(name, processor, options = {}) {
  if (!REDIS_AVAILABLE) {
    console.warn(`[Worker] Redis not available, worker "${name}" disabled`);
    return null;
  }
  
  return new Worker(
    name,
    processor,
    {
      ...QUEUE_CONFIG,
      concurrency: options.concurrency || 1,
      limiter: options.limiter || undefined,
    }
  );
}

// Ленивые геттеры для очередей (создаются только при первом обращении)
export const generationQueue = { get: () => getOrCreateQueue(QUEUE_NAMES.GENERATION) };
export const seoAuditQueue = { get: () => getOrCreateQueue(QUEUE_NAMES.SEO_AUDIT) };
export const faqGenerationQueue = { get: () => getOrCreateQueue(QUEUE_NAMES.FAQ_GENERATION) };
export const contentRewriteQueue = { get: () => getOrCreateQueue(QUEUE_NAMES.CONTENT_REWRITE) };
export const backgroundTasksQueue = { get: () => getOrCreateQueue(QUEUE_NAMES.BACKGROUND_TASKS) };

/**
 * Проверка доступности Redis/очередей
 */
export function isQueueAvailable() {
  return REDIS_AVAILABLE;
}

/**
 * Добавление задачи в очередь
 */
export async function addJob(queueName, jobName, data, options = {}) {
  if (!REDIS_AVAILABLE) {
    throw new Error('Queue system not available (Redis not configured)');
  }
  
  const queue = getOrCreateQueue(queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  return await queue.add(jobName, data, options);
}

/**
 * Получение статистики очереди
 */
export async function getQueueStats(queueName) {
  if (!REDIS_AVAILABLE) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, available: false };
  }
  
  const queue = getOrCreateQueue(queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    available: true,
  };
}

/**
 * Очистка очереди
 */
export async function cleanQueue(queueName, grace = 5000) {
  if (!REDIS_AVAILABLE) {
    return;
  }
  
  const queue = getOrCreateQueue(queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  await queue.clean(grace, 0, 'completed');
  await queue.clean(grace, 0, 'failed');
}

/**
 * Закрытие всех очередей
 */
export async function closeAllQueues() {
  if (!REDIS_AVAILABLE) {
    return;
  }
  
  const closePromises = [];
  for (const queue of queueCache.values()) {
    if (queue) {
      closePromises.push(queue.close());
    }
  }
  await Promise.all(closePromises);
  queueCache.clear();
}
