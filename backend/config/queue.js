/**
 * BullMQ Configuration
 * Конфигурация для очередей задач
 */

import { Queue, Worker, QueueScheduler } from 'bullmq';
import { redis } from '../utils/cache.js';

// Конфигурация Redis для BullMQ
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
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
  connection,
};

// Имена очередей
export const QUEUE_NAMES = {
  GENERATION: 'generation',
  SEO_AUDIT: 'seo-audit',
  FAQ_GENERATION: 'faq-generation',
  CONTENT_REWRITE: 'content-rewrite',
  BACKGROUND_TASKS: 'background-tasks',
};

/**
 * Создание очереди
 */
export function createQueue(name) {
  return new Queue(name, QUEUE_CONFIG);
}

/**
 * Создание воркера
 */
export function createWorker(name, processor, options = {}) {
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

/**
 * Создание планировщика очереди
 */
export function createScheduler(name) {
  return new QueueScheduler(name, QUEUE_CONFIG);
}

// Создание очередей
export const generationQueue = createQueue(QUEUE_NAMES.GENERATION);
export const seoAuditQueue = createQueue(QUEUE_NAMES.SEO_AUDIT);
export const faqGenerationQueue = createQueue(QUEUE_NAMES.FAQ_GENERATION);
export const contentRewriteQueue = createQueue(QUEUE_NAMES.CONTENT_REWRITE);
export const backgroundTasksQueue = createQueue(QUEUE_NAMES.BACKGROUND_TASKS);

/**
 * Добавление задачи в очередь
 */
export async function addJob(queueName, jobName, data, options = {}) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  return await queue.add(jobName, data, options);
}

/**
 * Получение очереди по имени
 */
function getQueue(name) {
  const queues = {
    [QUEUE_NAMES.GENERATION]: generationQueue,
    [QUEUE_NAMES.SEO_AUDIT]: seoAuditQueue,
    [QUEUE_NAMES.FAQ_GENERATION]: faqGenerationQueue,
    [QUEUE_NAMES.CONTENT_REWRITE]: contentRewriteQueue,
    [QUEUE_NAMES.BACKGROUND_TASKS]: backgroundTasksQueue,
  };
  
  return queues[name];
}

/**
 * Получение статистики очереди
 */
export async function getQueueStats(queueName) {
  const queue = getQueue(queueName);
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
  };
}

/**
 * Очистка очереди
 */
export async function cleanQueue(queueName, grace = 5000) {
  const queue = getQueue(queueName);
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
  await Promise.all([
    generationQueue.close(),
    seoAuditQueue.close(),
    faqGenerationQueue.close(),
    contentRewriteQueue.close(),
    backgroundTasksQueue.close(),
  ]);
}
