import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

/**
 * GET /api/internal-links
 * Получение списка внутренних ссылок
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

    const links = await prisma.internalLinks.findMany({
      where: { userId: user.id },
      orderBy: { priority: 'desc' }
    });

    res.json({ links });
  } catch (error) {
    console.error('Internal links list error:', error);
    res.status(500).json({ error: 'Failed to get links' });
  }
});

/**
 * POST /api/internal-links
 * Добавление внутренней ссылки
 */
router.post('/', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url, anchorText, keywords, priority } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем лимит ссылок (максимум 50)
    const existingLinks = await prisma.internalLinks.count({
      where: { userId: user.id }
    });

    if (existingLinks >= 50) {
      return res.status(400).json({ error: 'Maximum 50 links allowed. Delete some links first.' });
    }

    const link = await prisma.internalLinks.create({
      data: {
        userId: user.id,
        url,
        anchorText: anchorText || null,
        keywords: Array.isArray(keywords) ? keywords : [],
        priority: priority || 0
      }
    });

    res.json({ link });
  } catch (error) {
    console.error('Internal links create error:', error);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

/**
 * POST /api/internal-links/bulk
 * Массовое добавление внутренних ссылок
 */
router.post('/bulk', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { links } = req.body;

    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({ error: 'Links array is required' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем лимит ссылок
    const existingLinks = await prisma.internalLinks.count({
      where: { userId: user.id }
    });

    if (existingLinks + links.length > 50) {
      return res.status(400).json({
        error: `Maximum 50 links allowed. You can add ${50 - existingLinks} more links.`
      });
    }

    const createdLinks = await Promise.all(
      links.map(link =>
        prisma.internalLinks.create({
          data: {
            userId: user.id,
            url: link.url,
            anchorText: link.anchorText || null,
            keywords: Array.isArray(link.keywords) ? link.keywords : [],
            priority: link.priority || 0
          }
        })
      )
    );

    res.json({ links: createdLinks });
  } catch (error) {
    console.error('Internal links bulk create error:', error);
    res.status(500).json({ error: 'Failed to create links' });
  }
});

/**
 * PUT /api/internal-links/:id
 * Обновление внутренней ссылки
 */
router.put('/:id', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url, anchorText, keywords, priority } = req.body;

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем что ссылка принадлежит пользователю
    const existingLink = await prisma.internalLinks.findFirst({
      where: { id: req.params.id, userId: user.id }
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const link = await prisma.internalLinks.update({
      where: { id: req.params.id },
      data: {
        url: url !== undefined ? url : existingLink.url,
        anchorText: anchorText !== undefined ? anchorText : existingLink.anchorText,
        keywords: keywords !== undefined ? keywords : existingLink.keywords,
        priority: priority !== undefined ? priority : existingLink.priority
      }
    });

    res.json({ link });
  } catch (error) {
    console.error('Internal links update error:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

/**
 * DELETE /api/internal-links/:id
 * Удаление внутренней ссылки
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

    await prisma.internalLinks.deleteMany({
      where: { id: req.params.id, userId: user.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Internal links delete error:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

/**
 * DELETE /api/internal-links
 * Удаление всех внутренних ссылок
 */
router.delete('/', async (req, res) => {
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

    await prisma.internalLinks.deleteMany({
      where: { userId: user.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Internal links delete all error:', error);
    res.status(500).json({ error: 'Failed to delete links' });
  }
});

export default router;
