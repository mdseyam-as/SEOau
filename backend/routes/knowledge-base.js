import express from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { knowledgeBaseService } from '../services/knowledgeBaseService.js';

const router = express.Router();

// Настройка multer для загрузки файлов в память
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are allowed.'));
    }
  }
});

/**
 * POST /api/knowledge-base/upload
 * Загрузка файла в базу знаний
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем лимит файлов (максимум 10)
    const existingFiles = await prisma.knowledgeBase.count({
      where: { userId: user.id }
    });

    if (existingFiles >= 10) {
      return res.status(400).json({ error: 'Maximum 10 files allowed. Delete some files first.' });
    }

    // Загружаем файл
    const result = await knowledgeBaseService.uploadFile(user.id, req.file);

    res.json({
      id: result.id,
      fileName: result.fileName,
      fileType: result.fileType,
      fileSize: result.fileSize,
      createdAt: result.createdAt
    });
  } catch (error) {
    console.error('Knowledge base upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

/**
 * GET /api/knowledge-base
 * Получение списка файлов базы знаний
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

    const files = await knowledgeBaseService.getFiles(user.id);

    res.json({ files });
  } catch (error) {
    console.error('Knowledge base list error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

/**
 * DELETE /api/knowledge-base/:id
 * Удаление файла из базы знаний
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

    await knowledgeBaseService.deleteFile(user.id, req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Knowledge base delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * POST /api/knowledge-base/search
 * Поиск релевантных фрагментов
 */
router.post('/search', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { query, topK = 3 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const results = await knowledgeBaseService.search(user.id, query, topK);

    res.json({ results });
  } catch (error) {
    console.error('Knowledge base search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

export default router;
