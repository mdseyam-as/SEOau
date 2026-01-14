import { prisma } from '../lib/prisma.js';
import { isDatabaseConnected } from '../lib/prisma.js';

class TaskQueueService {
  constructor() {
    this.processing = false;
    this.queue = [];
    this.intervalId = null;
  }

  /**
   * Запуск обработчика очереди
   */
  start() {
    if (this.intervalId) return;

    console.log('[TaskQueue] Starting background task processor...');

    this.intervalId = setInterval(async () => {
      if (this.processing) return;
      
      // Skip if database is not connected
      if (!isDatabaseConnected()) {
        return;
      }

      // Загружаем pending задачи из БД
      try {
        const pendingTasks = await prisma.backgroundTask.findMany({
          where: { status: 'pending' },
          orderBy: { createdAt: 'asc' },
          take: 5
        });

        if (pendingTasks.length > 0) {
          this.processing = true;

          for (const task of pendingTasks) {
            await this.processTask(task.id);
          }

          this.processing = false;
        }
      } catch (error) {
        // Don't spam logs with connection errors
        if (!error.message?.includes("Can't reach database")) {
          console.error('[TaskQueue] Error loading tasks:', error.message);
        }
        this.processing = false;
      }
    }, 10000); // Проверка каждые 10 секунд
  }

  /**
   * Остановка обработчика
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[TaskQueue] Stopped background task processor');
    }
  }

  /**
   * Создание фоновой задачи
   */
  async createTask(userId, type, config) {
    const task = await prisma.backgroundTask.create({
      data: {
        userId,
        type,
        status: 'pending',
        config
      }
    });

    console.log(`[TaskQueue] Created task ${task.id} (${type}) for user ${userId}`);
    return task;
  }

  /**
   * Получение задачи по ID
   */
  async getTask(taskId, userId = null) {
    const where = { id: taskId };
    if (userId) where.userId = userId;

    return await prisma.backgroundTask.findFirst({ where });
  }

  /**
   * Получение списка задач пользователя
   */
  async getUserTasks(userId, limit = 20) {
    return await prisma.backgroundTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Обработка задачи
   */
  async processTask(taskId) {
    const task = await prisma.backgroundTask.findUnique({
      where: { id: taskId }
    });

    if (!task || task.status !== 'pending') {
      return;
    }

    console.log(`[TaskQueue] Processing task ${taskId} (${task.type})`);

    // Обновляем статус на processing
    await prisma.backgroundTask.update({
      where: { id: taskId },
      data: { status: 'processing', startedAt: new Date() }
    });

    try {
      let result;

      switch (task.type) {
        case 'generate':
          result = await this.processGenerateTask(task.config);
          break;
        case 'rewrite':
          result = await this.processRewriteTask(task.config);
          break;
        case 'humanize':
          result = await this.processHumanizeTask(task.config);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Сохраняем результат
      await prisma.backgroundTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          result,
          completedAt: new Date()
        }
      });

      console.log(`[TaskQueue] Task ${taskId} completed successfully`);

      // Отправляем уведомление
      await this.sendCompletionNotification(task.userId, taskId, task.type);

    } catch (error) {
      console.error(`[TaskQueue] Task ${taskId} failed:`, error);

      await prisma.backgroundTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        }
      });

      // Отправляем уведомление об ошибке
      await this.sendErrorNotification(task.userId, taskId, error.message);
    }
  }

  /**
   * Обработка задачи генерации
   */
  async processGenerateTask(config) {
    // Получаем API ключ
    const settings = await prisma.systemSetting.findFirst({ where: { id: 'global' } });
    const apiKey = settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    // Базовая генерация - в реальности здесь будет полная логика из generate.js
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://seogenerator.app'
      },
      body: JSON.stringify({
        model: config.model || 'google/gemini-2.5-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'Ты профессиональный SEO-копирайтер.'
          },
          {
            role: 'user',
            content: `Напиши SEO-статью на тему: "${config.topic}". Язык: ${config.language || 'Русский'}. Минимум ${config.minChars || 3000} символов.`
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    return {
      content,
      model: config.model,
      topic: config.topic
    };
  }

  /**
   * Обработка задачи рерайта
   */
  async processRewriteTask(config) {
    const settings = await prisma.systemSetting.findFirst({ where: { id: 'global' } });
    const apiKey = settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://seogenerator.app'
      },
      body: JSON.stringify({
        model: config.model || 'google/gemini-2.5-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'Ты профессиональный редактор. Перепиши текст, сохраняя смысл, но делая его уникальным.'
          },
          {
            role: 'user',
            content: `Перепиши следующий текст:\n\n${config.content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    return {
      original: config.content,
      rewritten: content
    };
  }

  /**
   * Обработка задачи хьюманизации
   */
  async processHumanizeTask(config) {
    const settings = await prisma.systemSetting.findFirst({ where: { id: 'global' } });
    const apiKey = settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://seogenerator.app'
      },
      body: JSON.stringify({
        model: config.model || 'google/gemini-2.5-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по редактированию AI-текстов. Сделай текст более человечным, убери признаки AI-генерации.'
          },
          {
            role: 'user',
            content: `Хьюманизируй следующий текст, сделай его естественным:\n\n${config.content}`
          }
        ],
        temperature: 0.8,
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    return {
      original: config.content,
      humanized: content
    };
  }

  /**
   * Отправка уведомления о завершении
   */
  async sendCompletionNotification(userId, taskId, type) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.notificationsEnabled) return;

      const typeNames = {
        generate: 'текст',
        rewrite: 'рерайт',
        humanize: 'хьюманизированный текст'
      };

      const message = `Ваш ${typeNames[type] || 'результат'} готов!`;

      // Отправляем через Telegram Bot API
      await this.sendTelegramMessage(user.telegramId, message, {
        reply_markup: {
          inline_keyboard: [[{
            text: 'Открыть результат',
            callback_data: `open_task_${taskId}`
          }]]
        }
      });
    } catch (error) {
      console.error('[TaskQueue] Failed to send completion notification:', error);
    }
  }

  /**
   * Отправка уведомления об ошибке
   */
  async sendErrorNotification(userId, taskId, errorMessage) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.notificationsEnabled) return;

      const message = `Произошла ошибка при обработке: ${errorMessage.substring(0, 100)}`;

      await this.sendTelegramMessage(user.telegramId, message);
    } catch (error) {
      console.error('[TaskQueue] Failed to send error notification:', error);
    }
  }

  /**
   * Отправка сообщения через Telegram
   */
  async sendTelegramMessage(telegramId, text, options = {}) {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.warn('[TaskQueue] BOT_TOKEN not configured, skipping notification');
      return;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId.toString(),
          text,
          parse_mode: 'HTML',
          ...options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[TaskQueue] Telegram API error:', errorData);
      }
    } catch (error) {
      console.error('[TaskQueue] Failed to send Telegram message:', error);
    }
  }
}

export const taskQueue = new TaskQueueService();
