import express from 'express';
import { prisma } from '../lib/prisma.js';
import { taskQueue } from '../services/taskQueueService.js';

const router = express.Router();

/**
 * POST /api/tasks
 * Создание фоновой задачи
 */
router.post('/', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, config } = req.body;

    if (!type || !['generate', 'rewrite', 'humanize'].includes(type)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }

    if (!config) {
      return res.status(400).json({ error: 'Config is required' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем лимит активных задач (максимум 5)
    const activeTasks = await prisma.backgroundTask.count({
      where: {
        userId: user.id,
        status: { in: ['pending', 'processing'] }
      }
    });

    if (activeTasks >= 5) {
      return res.status(400).json({
        error: 'Maximum 5 active tasks allowed. Wait for current tasks to complete.'
      });
    }

    const task = await taskQueue.createTask(user.id, type, config);

    res.json({
      taskId: task.id,
      status: 'pending',
      message: 'Задача создана. Вы получите уведомление когда результат будет готов.'
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * GET /api/tasks
 * Получение списка задач пользователя
 */
router.get('/', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tasks = await taskQueue.getUserTasks(user.id, 20);

    // Преобразуем для безопасной передачи (без полных конфигов)
    const safeTasks = tasks.map(task => ({
      id: task.id,
      type: task.type,
      status: task.status,
      error: task.error,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      hasResult: !!task.result
    }));

    res.json({ tasks: safeTasks });
  } catch (error) {
    console.error('Tasks list error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

/**
 * GET /api/tasks/:id
 * Получение задачи по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const task = await taskQueue.getTask(req.params.id, user.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Task get error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Удаление задачи (только completed/failed)
 */
router.delete('/:id', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const task = await prisma.backgroundTask.findFirst({
      where: {
        id: req.params.id,
        userId: user.id
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'pending' || task.status === 'processing') {
      return res.status(400).json({ error: 'Cannot delete active task' });
    }

    await prisma.backgroundTask.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Task delete error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/**
 * PUT /api/tasks/settings/notifications
 * Обновление настроек уведомлений
 */
router.put('/settings/notifications', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be boolean' });
    }

    await prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { notificationsEnabled: enabled }
    });

    res.json({ success: true, notificationsEnabled: enabled });
  } catch (error) {
    console.error('Notifications settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/tasks/settings/notifications
 * Получение настроек уведомлений
 */
router.get('/settings/notifications', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { notificationsEnabled: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ notificationsEnabled: user.notificationsEnabled });
  } catch (error) {
    console.error('Notifications settings get error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

export default router;
