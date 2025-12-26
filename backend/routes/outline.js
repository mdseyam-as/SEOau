import express from 'express';
import { prisma } from '../lib/prisma.js';
import { sanitizePromptInput } from '../utils/promptSanitizer.js';

const router = express.Router();

// Получение API ключа
async function getApiKey() {
  const settings = await prisma.systemSetting.findFirst({ where: { id: 'global' } });
  return settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;
}

// Headers для OpenRouter
function getHeaders(apiKey, siteName = 'SEO Generator') {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.FRONTEND_URL || 'https://seogenerator.app',
    'X-Title': siteName
  };
}

/**
 * POST /api/outline/generate
 * Генерация структуры статьи (плана)
 */
router.post('/generate', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic, language, keywords = [], sectionsCount = 6, model } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const sanitizedTopic = sanitizePromptInput(topic);
    const keywordsList = keywords.slice(0, 10).map(k => k.keyword || k).join(', ');

    const outlinePrompt = `Создай детальный план статьи по теме: "${sanitizedTopic}"

Требования:
- Язык: ${language || 'Русский'}
- Количество секций: ${sectionsCount} H2 заголовков (от 4 до 10)
- Для каждого H2 добавь 2-4 H3 подзаголовка
${keywordsList ? `- Учитывай ключевые слова: ${keywordsList}` : ''}
- План должен быть логичным и покрывать тему полностью
- Заголовки должны быть информативными и SEO-оптимизированными

Верни ТОЛЬКО JSON:
{
  "h1": "Заголовок статьи (оптимизированный для SEO)",
  "sections": [
    {
      "h2": "Заголовок секции",
      "h3s": ["Подзаголовок 1", "Подзаголовок 2", "Подзаголовок 3"],
      "description": "Краткое описание что будет в секции (1 предложение)"
    }
  ]
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        model: model || 'google/gemini-2.5-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по структуре контента и SEO. Создавай логичные, всеобъемлющие планы статей. Отвечай ТОЛЬКО валидным JSON без markdown.'
          },
          { role: 'user', content: outlinePrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', errorText);
      return res.status(500).json({ error: 'Failed to generate outline' });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    // Парсим JSON ответ
    let outline;
    try {
      // Удаляем возможные markdown обёртки
      const jsonContent = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      outline = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse outline JSON:', content);
      return res.status(500).json({ error: 'Failed to parse outline response' });
    }

    res.json({ outline });
  } catch (error) {
    console.error('Outline generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate outline' });
  }
});

/**
 * POST /api/outline/generate-content
 * Генерация контента по плану
 */
router.post('/generate-content', async (req, res) => {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      outline,
      config,
      keywords = []
    } = req.body;

    if (!outline || !outline.h1 || !outline.sections) {
      return res.status(400).json({ error: 'Valid outline is required' });
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Формируем секции для генерации
    const sectionsPrompt = outline.sections.map(section => `
## ${section.h2}
${section.h3s.map(h3 => `### ${h3}`).join('\n')}
${section.description ? `(Ключевые моменты: ${section.description})` : ''}
`).join('\n');

    const keywordsList = keywords.slice(0, 15).map(k => k.keyword || k).join(', ');

    const contentPrompt = `Напиши полную статью по следующему плану:

# ${outline.h1}

${sectionsPrompt}

Требования:
- Язык: ${config?.language || 'Русский'}
- Тон: ${config?.tone || 'Профессиональный'}
- Стиль: ${config?.style || 'Информативный'}
${keywordsList ? `- Ключевые слова для SEO: ${keywordsList}` : ''}
- Минимум символов: ${config?.minChars || 3000}
- Максимум символов: ${config?.maxChars || 8000}

Правила написания:
1. Следуй ТОЧНО заданной структуре (H1, H2, H3)
2. Каждая секция должна быть полноценной и информативной
3. Используй Markdown форматирование
4. Добавляй списки и таблицы где уместно
5. Не используй keyword stuffing - ключевые слова должны вписываться естественно
6. Пиши экспертный, полезный контент

Напиши статью в формате Markdown.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: getHeaders(apiKey, config?.websiteName || 'SEO Generator'),
      body: JSON.stringify({
        model: config?.model || 'google/gemini-2.5-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'Ты профессиональный SEO-копирайтер. Пиши качественный, уникальный, экспертный контент. Строго следуй заданной структуре.'
          },
          { role: 'user', content: contentPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', errorText);
      return res.status(500).json({ error: 'Failed to generate content' });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    res.json({
      content,
      outline,
      model: config?.model || 'google/gemini-2.5-flash-preview'
    });
  } catch (error) {
    console.error('Content generation from outline error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
});

export default router;
