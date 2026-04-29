import express from 'express';
import { HtmlExportService } from '../services/htmlExportService.js';

const router = express.Router();

/**
 * POST /api/export/html
 * Конвертация Markdown в HTML
 */
router.post('/html', async (req, res) => {
  try {
    const { markdown, options = {} } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' });
    }

    const {
      wrapKeywords = false,
      keywordTag = 'strong',
      keywords = [],
      fullDocument = false,
      meta = {}
    } = options;

    let html = HtmlExportService.markdownToHtml(markdown, {
      wrapKeywords,
      keywordTag,
      keywords
    });

    if (fullDocument) {
      html = HtmlExportService.generateFullHtml(html, meta);
    }

    res.json({ html });
  } catch (error) {
    console.error('HTML export error:', error);
    res.status(500).json({ error: 'Failed to export HTML' });
  }
});

/**
 * POST /api/export/plain-text
 * Конвертация Markdown в чистый текст
 */
router.post('/plain-text', async (req, res) => {
  try {
    const { markdown } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' });
    }

    const text = HtmlExportService.markdownToPlainText(markdown);
    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    res.json({
      text,
      stats: {
        characters: charCount,
        words: wordCount
      }
    });
  } catch (error) {
    console.error('Plain text export error:', error);
    res.status(500).json({ error: 'Failed to export plain text' });
  }
});

/**
 * POST /api/export/analyze-keywords
 * Анализ использования ключевых слов в тексте
 */
router.post('/analyze-keywords', async (req, res) => {
  try {
    const { markdown, keywords = [] } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' });
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }

    const text = HtmlExportService.markdownToPlainText(markdown).toLowerCase();

    const analysis = keywords.map(keyword => {
      const kw = (typeof keyword === 'string' ? keyword : keyword.keyword || '').toLowerCase();
      if (!kw) return null;

      // Подсчёт вхождений
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      const count = matches ? matches.length : 0;

      return {
        keyword: kw,
        count,
        used: count > 0,
        density: text.length > 0 ? ((kw.length * count) / text.length * 100).toFixed(2) : 0
      };
    }).filter(Boolean);

    const usedKeywords = analysis.filter(k => k.used);
    const missingKeywords = analysis.filter(k => !k.used);

    res.json({
      analysis,
      summary: {
        total: analysis.length,
        used: usedKeywords.length,
        missing: missingKeywords.length,
        usagePercent: analysis.length > 0
          ? Math.round((usedKeywords.length / analysis.length) * 100)
          : 0
      },
      usedKeywords: usedKeywords.map(k => k.keyword),
      missingKeywords: missingKeywords.map(k => k.keyword)
    });
  } catch (error) {
    console.error('Keyword analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze keywords' });
  }
});

export default router;
