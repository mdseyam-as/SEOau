import express from 'express';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Settings from '../models/Settings.js';
import { validate } from '../middleware/validate.js';
import { generateSchema, spamCheckSchema, fixSpamSchema, optimizeRelevanceSchema } from '../schemas/index.js';

const router = express.Router();

const DEFAULT_SITE_URL = 'https://example.com';
const DEFAULT_SITE_NAME = 'SeoGenerator';

// ==================== MODEL MAPPING ====================
// Маппинг моделей для мультимодальной генерации
const MODEL_MAPPING = {
    // Writer models (для текста)
    'gemini-3.0': 'google/gemini-2.5-flash-preview',
    'gpt-5.2': 'openai/gpt-4.1',
    'grok-4.1': 'x-ai/grok-4.1',

    // Visualizer model (для диаграмм и SVG)
    'claude-sonnet-4.5': 'anthropic/claude-sonnet-4',

    // Fallback/default
    'default-writer': 'google/gemini-2.5-flash-preview',
    'default-visualizer': 'anthropic/claude-sonnet-4'
};

// Получить реальный model ID для OpenRouter
function getModelId(modelKey) {
    return MODEL_MAPPING[modelKey] || modelKey;
}

// ==================== PROMPT TEMPLATES ====================

const DEFAULT_PROMPT_TEMPLATE = `You are a Senior SEO Copywriter and Content Strategist for **{{websiteName}}**.

### OBJECTIVE
Write a high-ranking, authoritative, and useful SEO article for the following page. The text must outperform competitors in terms of utility, structure, and relevance.

### INPUT DATA
- **Target URL:** {{targetUrl}}
- **Main Topic:** {{topic}}
- **Target Country/Region:** {{targetCountry}}
- **Website/Brand:** {{websiteName}}
- **Target Length:** {{minChars}} - {{maxChars}} characters.
- **Paragraphs:** {{minParas}} to {{maxParas}}.
- **Content Language:** {{language}} (CRITICAL: Write the ENTIRE article in this language!)

### TONE & STYLE
- **Tone:** {{tone}}
- **Style:** {{style}}

### CRITICAL ANTI-SPAM & QUALITY RULES
1. **NO KEYWORD STUFFING:** Do not force keywords into sentences where they do not fit naturally.
2. **Natural Flow:** The text must sound 100% human-written. If a specific keyword phrase makes the text robotic, **modify the phrase or omit it**.
3. **Variety:** Do not repeat the exact same keyword phrase multiple times in a single paragraph. Use synonyms and semantic variations.
4. **Value First:** Keywords should support the content, not define it. Prioritize user value over keyword density.

### KEYWORD STRATEGY (Hybrid Relevance Analysis)
We use a TF-IDF approach. The text must have depth and width.
1. **High Priority Keys:** {{mainKeywords}} (Integrate these naturally in H1, H2, or Intro).
2. **LSI & Context:** {{lsiKeywords}} (Use for context width).
3. **Semantics:** {{topKeywords}} (Weave these in ONLY where they fit the context).

### COMPETITOR ANALYSIS INSTRUCTIONS
Analyze the typical structure of the following competitors for this topic:
{{competitors}}

**Your task is to create a structure that is BETTER and more comprehensive than these.**

{{exampleInstruction}}

### WRITING RULES
1. **Formatting:** Use Markdown. Use <h2>, <h3>, bullet points, and numbered lists to break up text.
2. **Regional Context:** Adapt currency, laws, cultural references, and measurements to **{{targetCountry}}**.
3. **Relevance:** Ensure the text answers the user intent behind the keywords with high precision.
4. **Voice:** Adhere strictly to the defined Tone and Style.

### OUTPUT FORMAT
You MUST return a valid JSON object with the following structure (do not wrap in markdown code blocks if possible, just raw JSON):
{
  "content": "The full markdown article text...",
  "metaTitle": "SEO optimized title tag (max 60 chars)",
  "metaDescription": "SEO optimized meta description (max 160 chars)",
  "usedKeywords": ["list", "of", "main", "keywords", "used"]
}`;

// GEO (Generative Engine Optimization) prompt for AI search engines
const GEO_PROMPT_TEMPLATE = `You are a **Generative Engine Optimization (GEO) Specialist** writing content for **{{websiteName}}**.

### ROLE & GOAL
Your goal is to write content specifically designed to be **cited and surfaced by AI Search Engines** (ChatGPT, Perplexity, Google SGE/AI Overviews, Bing Copilot).

### INPUT DATA
- **Target URL:** {{targetUrl}}
- **Main Topic:** {{topic}}
- **Target Country/Region:** {{targetCountry}}
- **Website/Brand:** {{websiteName}}
- **Target Length:** {{minChars}} - {{maxChars}} characters.
- **Paragraphs:** {{minParas}} to {{maxParas}}.
- **Content Language:** {{language}} (CRITICAL: Write the ENTIRE article in this language!)

### TONE & STYLE
- **Tone:** {{tone}}
- **Style:** {{style}}

### GEO STRUCTURE RULES (CRITICAL)
1. **Direct Answers First:** Start each major section with a clear, dictionary-style definition or direct answer (e.g., "{{topic}} is..."). AI models extract these as snippets.

2. **Rich Structured Data:** You MUST use:
   - **Markdown tables** to compare features, pros/cons, prices, or specifications
   - **Numbered lists** for step-by-step processes
   - **Bullet points** for key features or benefits
   AI models prefer structured data over plain paragraphs.

3. **Key Takeaways Section:** End the article with a "## Key Takeaways" section containing 5-7 bullet points summarizing the main insights.

4. **FAQ Section:** Include a "## FAQ" section with 3-5 common questions and concise answers. Use this format:
   **Q: Question here?**
   A: Direct answer here.

5. **Objective & Data-Driven Tone:**
   - AVOID marketing fluff ("best", "amazing", "incredible", "revolutionary")
   - USE data-driven language ("9 out of 10 users...", "Studies show...", "Efficiency increased by 20%")
   - Cite statistics, percentages, and specific metrics when possible

6. **Entity Density:** Explicitly mention:
   - Related technical terms and industry jargon
   - Specific product names, brands, or tools
   - Measurable metrics and specifications
   - Geographic or regulatory context for {{targetCountry}}

### KEYWORD STRATEGY
1. **High Priority Keys:** {{mainKeywords}} (Use naturally in H1, H2, and the opening definition).
2. **LSI & Context:** {{lsiKeywords}} (For semantic depth).
3. **Semantics:** {{topKeywords}} (Only where contextually appropriate).

### COMPETITOR CONTEXT
Reference structure from:
{{competitors}}

**Create content that is MORE comprehensive, MORE structured, and MORE citation-worthy.**

{{exampleInstruction}}

### ANTI-SPAM RULES
1. NO keyword stuffing - every keyword must add value
2. Natural language flow - must read as expert-written content
3. Varied phrasing - use synonyms and semantic variations

### OUTPUT FORMAT
Return a valid JSON object:
{
  "content": "The full markdown article with tables, lists, FAQ, and Key Takeaways...",
  "metaTitle": "SEO title (max 60 chars)",
  "metaDescription": "Meta description (max 160 chars)",
  "usedKeywords": ["list", "of", "keywords", "used"]
}`;

// ==================== VISUALIZER PROMPT (Claude) ====================

const VISUALIZER_SYSTEM_PROMPT = `You are a Data Visualization Expert specializing in Mermaid.js diagrams and SVG infographics.

Your task is to create visual assets that enhance article comprehension and engagement.

OUTPUT RULES:
1. Return ONLY valid Markdown code blocks - no explanations, no comments
2. First block: Mermaid.js diagram
3. Second block: SVG infographic

MERMAID RULES:
- Use \`flowchart TD\` (NOT "graph TD")
- Node IDs: Latin letters only (A, B, C, step1)
- Labels can be in any language
- Use: [] rectangles, (()) circles, {} diamonds
- Arrows: --> or -- label -->

SVG RULES:
- Responsive: use viewBox, no fixed width/height
- Embedded text for labels
- Clean, modern design with gradients or flat colors
- Max complexity: 15-20 elements`;

function getVisualizerUserPrompt(topic, language) {
    return `Generate 2 visual assets for an article about "${topic}":

1. **Mermaid.js Diagram**: Illustrate the main process, flow, or decision tree related to "${topic}".
   - Use flowchart TD format
   - 5-8 nodes maximum
   - Labels in ${language}

2. **SVG Infographic**: Create a responsive infographic (chart, icon composition, or visual summary).
   - Use viewBox for responsiveness
   - Include embedded text labels in ${language}
   - Modern flat design or subtle gradients
   - Visualize key statistics, steps, or comparisons

Return ONLY the two code blocks:
\`\`\`mermaid
flowchart TD
    ...
\`\`\`

\`\`\`svg
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    ...
</svg>
\`\`\``;
}

// ==================== MULTIMODAL GEO ORCHESTRATOR ====================

/**
 * Мультимодальная GEO-генерация
 * Writer (Gemini/GPT) генерирует текст
 * Visualizer (Claude) генерирует Mermaid + SVG
 *
 * @param {object} params - Параметры генерации
 * @param {string} params.topic - Тема статьи
 * @param {string} params.writerModel - Модель для текста (gemini-3.0, gpt-5.2)
 * @param {string} params.visualizerModel - Модель для визуализации (claude-sonnet-4.5)
 * @param {string} params.writerPrompt - Промпт для Writer
 * @param {string} params.systemMessage - System message для Writer
 * @param {string} params.language - Язык контента
 * @param {string} params.apiKey - API ключ OpenRouter
 * @param {string} params.siteName - Название сайта для headers
 * @returns {Promise<{content: string, visuals: object|null, writerRaw: string}>}
 */
async function generateGeoContent({
    topic,
    writerModel,
    visualizerModel = 'claude-sonnet-4.5',
    writerPrompt,
    systemMessage,
    language,
    apiKey,
    siteName
}) {
    const headers = getHeaders(apiKey, siteName);

    // Запрос А: Writer (текст статьи)
    const writerRequest = fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: getModelId(writerModel),
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: writerPrompt }
            ],
            temperature: 0.2
        })
    });

    // Запрос Б: Visualizer (Mermaid + SVG)
    const visualizerRequest = fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: getModelId(visualizerModel),
            messages: [
                { role: "system", content: VISUALIZER_SYSTEM_PROMPT },
                { role: "user", content: getVisualizerUserPrompt(topic, language) }
            ],
            temperature: 0.3
        })
    });

    console.log('>>> MULTIMODAL GEO: Starting parallel requests', {
        writer: getModelId(writerModel),
        visualizer: getModelId(visualizerModel),
        topic
    });

    // Параллельный запуск с Promise.allSettled для soft fallback
    const [writerResult, visualizerResult] = await Promise.allSettled([
        writerRequest,
        visualizerRequest
    ]);

    // Обработка Writer (обязательный)
    let writerContent = '';
    if (writerResult.status === 'fulfilled' && writerResult.value.ok) {
        const writerData = await writerResult.value.json();
        writerContent = writerData.choices?.[0]?.message?.content || '';
        console.log('>>> MULTIMODAL GEO: Writer success, length:', writerContent.length);
    } else {
        const error = writerResult.status === 'rejected'
            ? writerResult.reason
            : await writerResult.value.text();
        console.error('>>> MULTIMODAL GEO: Writer failed:', error);
        throw new Error(`Writer model failed: ${error}`);
    }

    // Обработка Visualizer (soft fallback - необязательный)
    let visuals = null;
    if (visualizerResult.status === 'fulfilled' && visualizerResult.value.ok) {
        try {
            const visualizerData = await visualizerResult.value.json();
            const visualizerContent = visualizerData.choices?.[0]?.message?.content || '';
            visuals = parseVisualizerResponse(visualizerContent);
            console.log('>>> MULTIMODAL GEO: Visualizer success', {
                hasMermaid: !!visuals?.mermaid,
                hasSvg: !!visuals?.svg
            });
        } catch (e) {
            console.warn('>>> MULTIMODAL GEO: Visualizer parse error:', e.message);
        }
    } else {
        const error = visualizerResult.status === 'rejected'
            ? visualizerResult.reason?.message
            : 'Request failed';
        console.warn('>>> MULTIMODAL GEO: Visualizer soft fail:', error);
        // Не бросаем ошибку - soft fallback
    }

    // Склейка: вставляем визуальные элементы в текст
    const mergedContent = mergeContentWithVisuals(writerContent, visuals);

    return {
        content: mergedContent,
        visuals,
        writerRaw: writerContent
    };
}

/**
 * Парсит ответ Visualizer, извлекая Mermaid и SVG блоки
 */
function parseVisualizerResponse(content) {
    if (!content) return null;

    const result = { mermaid: null, svg: null };

    // Извлекаем Mermaid блок
    const mermaidMatch = content.match(/```mermaid\s*([\s\S]*?)```/i);
    if (mermaidMatch) {
        result.mermaid = mermaidMatch[1].trim();
    }

    // Извлекаем SVG блок
    const svgMatch = content.match(/```(?:svg|xml)?\s*(<svg[\s\S]*?<\/svg>)\s*```/i);
    if (svgMatch) {
        result.svg = svgMatch[1].trim();
    } else {
        // Пробуем найти SVG без code block
        const rawSvgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
        if (rawSvgMatch) {
            result.svg = rawSvgMatch[0].trim();
        }
    }

    return (result.mermaid || result.svg) ? result : null;
}

/**
 * Склеивает текст статьи с визуальными элементами
 * Вставляет после первого H2 заголовка
 */
function mergeContentWithVisuals(textContent, visuals) {
    if (!visuals || (!visuals.mermaid && !visuals.svg)) {
        return textContent;
    }

    // Формируем блок визуализации
    let visualBlock = '\n\n---\n\n## 📊 Визуальное представление\n\n';

    if (visuals.mermaid) {
        visualBlock += '### Диаграмма процесса\n\n```mermaid\n' + visuals.mermaid + '\n```\n\n';
    }

    if (visuals.svg) {
        visualBlock += '### Инфографика\n\n' + visuals.svg + '\n\n';
    }

    visualBlock += '---\n\n';

    // Ищем первый H2 заголовок и вставляем после него
    const h2Match = textContent.match(/(##\s+[^\n]+\n)/);
    if (h2Match) {
        const insertPosition = textContent.indexOf(h2Match[0]) + h2Match[0].length;
        // Находим конец следующего параграфа после H2
        const afterH2 = textContent.slice(insertPosition);
        const nextParagraphEnd = afterH2.search(/\n\n/);

        if (nextParagraphEnd > 0) {
            const finalPosition = insertPosition + nextParagraphEnd + 2;
            return textContent.slice(0, finalPosition) + visualBlock + textContent.slice(finalPosition);
        }
    }

    // Fallback: вставляем в конец, перед FAQ если есть
    const faqPosition = textContent.search(/##\s+FAQ/i);
    if (faqPosition > 0) {
        return textContent.slice(0, faqPosition) + visualBlock + textContent.slice(faqPosition);
    }

    // Если ничего не нашли - в конец
    return textContent + visualBlock;
}

// ==================== FALLBACK SINGLE MODEL GENERATION ====================

/**
 * Стандартная генерация одной моделью (fallback для multimodal)
 */
async function fallbackSingleModelGeneration({
    apiKey,
    model,
    systemMessage,
    userMessageContent,
    temperature,
    websiteName,
    topic,
    isGeoMode
}) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: getHeaders(apiKey, websiteName),
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessageContent }
            ],
            temperature: temperature
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API Error: ${errData.error?.message || response.statusText} (${response.status})`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
        console.error('>>> GENERATION ERROR: No content in response', JSON.stringify({
            model,
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length,
            finishReason: data.choices?.[0]?.finish_reason,
            error: data.error,
            usage: data.usage
        }, null, 2));
        throw new Error(`No content received from AI. Model: ${model}, Finish reason: ${data.choices?.[0]?.finish_reason || 'unknown'}`);
    }

    return safeParseAIResponse(rawContent, { topic, isGeoMode });
}

// ==================== SAFE JSON PARSER ====================

/**
 * Надёжный парсер ответа от AI с очисткой markdown и fallback
 * @param {string} rawText - Сырой текст от AI
 * @param {object} fallbackData - Данные для fallback (topic, isGeoMode и т.д.)
 * @returns {object} - Распарсенный объект или fallback структура
 */
function safeParseAIResponse(rawText, fallbackData = {}) {
    if (!rawText || typeof rawText !== 'string') {
        console.warn('safeParseAIResponse: Empty or invalid input');
        return createFallbackResponse(rawText, fallbackData);
    }

    // Шаг 1: Очистка Markdown обёрток
    let cleanText = rawText.trim();
    
    // Удаляем ```json или ``` в начале (с возможными пробелами/переносами)
    cleanText = cleanText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        // Удаляем ``` в конце
        .replace(/\s*```$/g, '')
        // Удаляем возможные BOM и невидимые символы в начале
        .replace(/^\uFEFF/, '')
        .trim();

    // Дополнительная очистка: если текст начинается не с { или [, пробуем найти JSON
    if (!cleanText.startsWith('{') && !cleanText.startsWith('[')) {
        // Пробуем найти JSON объект в тексте
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }
    }

    // Шаг 2: Попытка парсинга
    try {
        const parsed = JSON.parse(cleanText);
        
        // Валидация: проверяем что есть хотя бы content
        if (parsed && typeof parsed === 'object') {
            // Нормализуем структуру
            return {
                content: parsed.content || parsed.text || '',
                metaTitle: parsed.metaTitle || parsed.title || fallbackData.topic || 'Generated Content',
                metaDescription: parsed.metaDescription || parsed.description || '',
                usedKeywords: Array.isArray(parsed.usedKeywords) ? parsed.usedKeywords : 
                              Array.isArray(parsed.keywords) ? parsed.keywords : []
            };
        }
    } catch (parseError) {
        console.warn('safeParseAIResponse: JSON parsing failed:', parseError.message);
        console.warn('safeParseAIResponse: First 200 chars of cleaned text:', cleanText.substring(0, 200));
    }

    // Шаг 3: Fallback - возвращаем валидную структуру с сырым контентом
    return createFallbackResponse(rawText, fallbackData);
}

/**
 * Создаёт fallback объект когда парсинг не удался
 */
function createFallbackResponse(rawText, fallbackData = {}) {
    const { topic, isGeoMode } = fallbackData;
    
    // Пытаемся извлечь заголовок из первой строки текста
    let extractedTitle = '';
    if (rawText) {
        const firstLine = rawText.split('\n')[0]?.trim() || '';
        // Убираем markdown заголовки (#) если есть
        extractedTitle = firstLine.replace(/^#+\s*/, '').substring(0, 60);
    }

    const timestamp = new Date().toISOString();
    const modePrefix = isGeoMode ? 'GEO' : 'SEO';

    console.warn(`safeParseAIResponse: Using fallback for ${modePrefix} mode`);

    return {
        content: rawText || '',
        metaTitle: extractedTitle || `${modePrefix} Draft: ${topic || 'Content'} - ${timestamp.slice(0, 10)}`,
        metaDescription: isGeoMode 
            ? 'Generated via GEO mode - AI search optimized content' 
            : 'Generated via SEO mode',
        usedKeywords: [],
        _fallback: true, // Маркер что это fallback
        _parseError: true
    };
}

// Helper to get API key from settings
async function getApiKey() {
    const settings = await Settings.findOne();
    const key = settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("API ключ не настроен администратором.");
    return key;
}

// Helper to sanitize headers
function getHeaders(apiKey, siteName) {
    const safeSiteName = (siteName || DEFAULT_SITE_NAME).replace(/[^\x20-\x7E]/g, '');
    return {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": DEFAULT_SITE_URL,
        "X-Title": safeSiteName || "SeoGenerator",
        "Content-Type": "application/json"
    };
}

// Calculate SEO metrics
function calculateSeoMetrics(content, keywords) {
    const wordCount = content.split(/\s+/).length;
    const top15 = keywords.slice(0, 15);
    const contentLower = content.toLowerCase();

    const keywordAnalysis = top15.map(k => {
        const escaped = k.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped.toLowerCase(), 'g');
        const matches = contentLower.match(regex);
        return {
            keyword: k.keyword,
            targetFrequency: k.frequency,
            actualCount: matches ? matches.length : 0
        };
    });

    const presentCount = keywordAnalysis.filter(k => k.actualCount > 0).length;
    let score = Math.round((presentCount / Math.max(1, top15.length)) * 100);
    if (score > 100) score = 100;

    return { wordCount, relevanceScore: score, keywordAnalysis };
}

// Check user limits
async function checkUserLimits(telegramId) {
    const user = await User.findOne({ telegramId });
    if (!user) return { allowed: false, reason: 'user_not_found' };

    if (user.role === 'admin') return { allowed: true, user };

    const plan = await Plan.findOne({ id: user.planId });
    if (!plan) return { allowed: false, reason: 'plan_not_found' };

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentDay = new Date().toISOString().slice(0, 10);

    if (plan.maxGenerationsPerMonth && plan.maxGenerationsPerMonth > 0) {
        const monthlyUsage = (user.lastGenerationMonth === currentMonth) ? (user.generationsUsed || 0) : 0;
        if (monthlyUsage >= plan.maxGenerationsPerMonth) {
            return { allowed: false, reason: 'monthly_limit' };
        }
    }

    if (plan.maxGenerationsPerDay && plan.maxGenerationsPerDay > 0) {
        const dailyUsage = (user.lastGenerationDate === currentDay) ? (user.generationsUsedToday || 0) : 0;
        if (dailyUsage >= plan.maxGenerationsPerDay) {
            return { allowed: false, reason: 'daily_limit' };
        }
    }

    return { allowed: true, user, plan };
}

// Increment usage
async function incrementUsage(user) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentDay = new Date().toISOString().slice(0, 10);

    if (user.lastGenerationMonth !== currentMonth) {
        user.generationsUsed = 1;
        user.lastGenerationMonth = currentMonth;
    } else {
        user.generationsUsed = (user.generationsUsed || 0) + 1;
    }

    if (user.lastGenerationDate !== currentDay) {
        user.generationsUsedToday = 1;
        user.lastGenerationDate = currentDay;
    } else {
        user.generationsUsedToday = (user.generationsUsedToday || 0) + 1;
    }

    await user.save();
    return user;
}

/**
 * POST /api/generate
 * Generate SEO content
 */
router.post('/', validate(generateSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;

        // Check limits
        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        const { config, keywords } = req.body;

        // Check keywords limit per plan (0 means unlimited)
        if (limitCheck.plan && limitCheck.plan.maxKeywords > 0) {
            if (keywords.length > limitCheck.plan.maxKeywords) {
                return res.status(403).json({
                    error: `Too many keywords. Your plan allows max ${limitCheck.plan.maxKeywords} keywords.`
                });
            }
        }

        // Validate model is allowed for user's plan
        if (limitCheck.plan && limitCheck.plan.allowedModels && limitCheck.plan.allowedModels.length > 0) {
            if (!limitCheck.plan.allowedModels.includes(config.model)) {
                return res.status(403).json({ error: 'Model not allowed for your plan' });
            }
        }

        const apiKey = await getApiKey();
        const settings = await Settings.findOne();

        // ==================== DEBUG LOG ====================
        const isGeoMode = config.generationMode === 'geo';

        // Check GEO mode permission
        if (isGeoMode && !limitCheck.plan?.canUseGeoMode && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'GEO режим недоступен для вашего тарифа' });
        }

        console.log('>>> GENERATION REQUEST:', {
            topic: config.topic,
            mode: config.generationMode,
            isGeoMode,
            model: config.model
        });

        // Prepare prompt
        const topKeywords = keywords
            .slice(0, 50)
            .map(k => `${k.keyword} (Freq: ${k.frequency})`)
            .join(', ');

        const mainKeywords = keywords
            .slice(0, 5)
            .map(k => k.keyword)
            .join(', ');

        const competitorsList = (config.competitorUrls || '').trim();
        const competitorsFileContent = config.competitorFiles
            ? config.competitorFiles.map(f => `--- CONTENT FROM FILE: ${f.name} ---\n${f.content}`).join('\n\n')
            : '';

        const competitors = [competitorsList, competitorsFileContent].filter(Boolean).join('\n\n') || "Provided context";

        const exampleInstruction = config.exampleContent?.trim()
            ? `
### REFERENCE STYLE & STRUCTURE
The user has provided an example of a high-quality text. Mimic the writing style, paragraph length, tone, and how keywords are naturally woven into the text.

**Example Text:**
"""
${config.exampleContent}
"""`
            : "";

        // ==================== SELECT PROMPT BY MODE ====================
        let prompt;
        if (isGeoMode) {
            // GEO mode: use geoPrompt from settings, or default GEO template
            prompt = settings?.geoPrompt || GEO_PROMPT_TEMPLATE;
        } else {
            // SEO mode: use seoPrompt from settings, or default SEO template
            prompt = settings?.seoPrompt || DEFAULT_PROMPT_TEMPLATE;
        }

        // Language for content generation
        const contentLanguage = config.language || 'Русский';

        const replacements = {
            '{{targetUrl}}': config.targetUrl || '',
            '{{topic}}': config.topic || '',
            '{{websiteName}}': config.websiteName || DEFAULT_SITE_NAME,
            '{{targetCountry}}': config.targetCountry || 'Global',
            '{{language}}': contentLanguage,
            '{{tone}}': config.tone || 'Professional',
            '{{style}}': config.style || 'Informative',
            '{{minChars}}': config.minChars || 2500,
            '{{maxChars}}': config.maxChars || 5000,
            '{{minParas}}': config.minParas || 3,
            '{{maxParas}}': config.maxParas || 12,
            '{{mainKeywords}}': mainKeywords,
            '{{lsiKeywords}}': config.lsiKeywords || '',
            '{{topKeywords}}': topKeywords,
            '{{competitors}}': competitors,
            '{{exampleInstruction}}': exampleInstruction
        };

        for (const [key, value] of Object.entries(replacements)) {
            prompt = prompt.split(key).join(String(value));
        }

        // ==================== BUILD USER MESSAGE CONTENT ====================
        let userMessageContent = prompt;
        let temperature = 0.7; // Default for SEO (creative)

        if (isGeoMode) {
            temperature = 0.2; // Lower for GEO (strict compliance)

            // CRITICAL FIX: Чётко отделяем ТЕМУ от ИНСТРУКЦИЙ
            // Модель должна писать о теме пользователя, а не о GEO как концепции
            const topic = config.topic || 'the requested topic';
            
            userMessageContent = `🔴 MAIN TASK: Write a detailed article about the following topic.

👉 TOPIC: "${topic}"
🌐 LANGUAGE: Write the ENTIRE article in ${contentLanguage}. All text, headings, FAQ questions and answers must be in ${contentLanguage}.

---

🛠 SYSTEM INSTRUCTIONS (HOW TO WRITE):
You act as a Content Engine. You must structure the response about the TOPIC above using GEO (Generative Engine Optimization) standards.

⚠️ CRITICAL: Write about "${topic}", NOT about "what is GEO" or "how GEO works". GEO is your METHOD, not your SUBJECT.
⚠️ LANGUAGE REQUIREMENT: The entire article MUST be written in ${contentLanguage}. Do not mix languages.

MANDATORY FORMATTING FOR "${topic}":
1. **DIRECT DEFINITION FIRST:** START with a specific definition of "${topic}" in the first 40 words (in ${contentLanguage}). DO NOT define what "GEO" is.
2. **MARKDOWN TABLE:** CREATE a comparison table with options/features related to "${topic}".
3. **STATISTICS:** INSERT specific numbers, percentages, or metrics relevant to "${topic}".
4. **FAQ SECTION:** Include "## FAQ" with 3-5 questions about "${topic}" (questions and answers in ${contentLanguage}).
5. **EXPERT QUOTES:** Include 1-2 quotes from industry experts or statistics sources.
6. **PROS/CONS SECTION:** If applicable, add a "## Плюсы и минусы" / "## Advantages and Disadvantages" section.

---

7. 🧠 INTELLIGENT SCHEMA SELECTION (JSON-LD):
Analyze the User Topic and Intent, then generate ONE specific Schema markup at the END of the article.
DO NOT default to FAQPage. Choose the BEST FIT based on topic type:

👉 **Scenario A: "How-To" / Instructions** (e.g., "How to get a loan", "Steps to register", "Как оформить...")
   - Generate: **"HowTo" Schema**.
   - Include: "step" array with "name" and "text" matching your article's headers/steps.
   - Example: {"@type": "HowTo", "name": "...", "step": [{"@type": "HowToStep", "name": "...", "text": "..."}]}

👉 **Scenario B: Commercial / Financial Product** (e.g., "Loan 30000", "Займ на 30 тысяч", "Credit card review")
   - Generate: **"FinancialProduct"** Schema.
   - Include: "name", "description", "annualPercentageRate", "amount" (with "currency"), "provider".
   - Example: {"@type": "FinancialProduct", "name": "Займ 30000", "annualPercentageRate": {"@type": "QuantitativeValue", "value": "0.8", "unitText": "% в день"}}

👉 **Scenario C: Product Review** (e.g., "iPhone 16 Review", "Best laptops 2024")
   - Generate: **"Product"** with "Review" Schema.
   - Include: "name", "brand", "offers", "aggregateRating" if ratings mentioned.

👉 **Scenario D: General Info / Questions** (e.g., "What is SEO?", "Что такое...?")
   - Generate: **"FAQPage" Schema**.
   - Include 3-5 questions from your FAQ section with answers.

👉 **Scenario E: News / Trends / Events**
   - Generate: **"NewsArticle"** or **"Article"** Schema.
   - Include: "headline", "datePublished", "author", "publisher".

⚠️ SCHEMA REQUIREMENTS:
- The JSON-LD MUST be valid JSON inside <script type="application/ld+json">...</script> tags.
- Fill schema fields with REAL DATA from the article (use actual rates, prices, steps you mentioned).
- Always include "@context": "https://schema.org" at the top.
- Place the schema block at the VERY END of the content.

---

8. 📊 VISUAL DIAGRAMS (Mermaid.js) - MANDATORY:
🔴 YOU MUST ALWAYS include a Mermaid.js diagram at the end of the article. This is NOT optional.

The diagram should visualize the main process, steps, or decision flow related to "${topic}".

STRICT SYNTAX RULES:
1. Start with \`flowchart TD\` (NOT "graph TD" - it's deprecated!)
2. Use ONLY: \`[]\` for rectangles, \`(())\` for circles, \`{}\` for diamonds
3. Node IDs must be Latin only: A, B, C, step1, etc.
4. Labels can be in ${contentLanguage}: A[Текст на русском]
5. Use \`-->\` for arrows, \`-- text -->\` for labeled arrows

REQUIRED FORMAT - Use exactly this structure:
\`\`\`mermaid
flowchart TD
    A[First Step] --> B[Second Step]
    B --> C{Decision}
    C -->|Yes| D[Result 1]
    C -->|No| E[Result 2]
\`\`\`

⚠️ CRITICAL: Use "flowchart TD" not "graph TD"!
⚠️ PLACEMENT: The Mermaid diagram MUST be placed AFTER the FAQ section, BEFORE the JSON-LD schema.

---

ADDITIONAL CONTEXT FROM TEMPLATE:
${prompt}

---

### OUTPUT FORMAT
Return a valid JSON object:
{
  "content": "The full markdown article about ${topic}...",
  "metaTitle": "SEO title for ${topic} (max 60 chars)",
  "metaDescription": "Meta description for ${topic} (max 160 chars)",
  "usedKeywords": ["list", "of", "keywords", "used"]
}`;
        }

        // System message also depends on mode
        const systemMessage = isGeoMode
            ? `You are a professional content writer. Your task is to write an article about the USER'S TOPIC using structured formatting. You are NOT writing about GEO methodology - GEO is just your writing style. Focus 100% on the user's topic. IMPORTANT: Write the entire article in ${contentLanguage}. Output strictly valid JSON.`
            : `You are an advanced SEO AI. You write content for ${config.targetCountry || 'Global'}. IMPORTANT: Write the entire article in ${contentLanguage}. You always output strictly valid JSON.`;

        console.log('>>> SENDING TO LLM:', {
            mode: isGeoMode ? 'GEO' : 'SEO',
            temperature,
            systemMessageLength: systemMessage.length,
            userMessageLength: userMessageContent.length
        });

        let parsedResult;

        // ==================== MULTIMODAL GEO GENERATION ====================
        // Используем двухъядерный подход для GEO режима:
        // - Writer (Gemini/GPT) генерирует текст
        // - Visualizer (Claude) генерирует Mermaid + SVG
        const useMultimodal = isGeoMode && config.useMultimodalGeo !== false;

        if (useMultimodal) {
            console.log('>>> MULTIMODAL GEO MODE ACTIVATED');

            // Определяем модели
            const writerModel = config.writerModel || config.model || 'gemini-3.0';
            const visualizerModel = config.visualizerModel || 'claude-sonnet-4.5';

            try {
                const geoResult = await generateGeoContent({
                    topic: config.topic,
                    writerModel,
                    visualizerModel,
                    writerPrompt: userMessageContent,
                    systemMessage,
                    language: contentLanguage,
                    apiKey,
                    siteName: config.websiteName
                });

                // Парсим результат Writer
                parsedResult = safeParseAIResponse(geoResult.writerRaw, {
                    topic: config.topic,
                    isGeoMode: true
                });

                // Заменяем контент на merged версию с визуализациями
                if (geoResult.visuals) {
                    parsedResult.content = geoResult.content;
                    parsedResult._multimodal = true;
                    parsedResult._visuals = {
                        hasMermaid: !!geoResult.visuals?.mermaid,
                        hasSvg: !!geoResult.visuals?.svg
                    };
                }

                console.log('>>> MULTIMODAL GEO: Complete', {
                    contentLength: parsedResult.content?.length,
                    hasVisuals: !!geoResult.visuals
                });

            } catch (multimodalError) {
                console.error('>>> MULTIMODAL GEO: Failed, falling back to single-model', multimodalError.message);
                // Fallback к обычной генерации
                parsedResult = await fallbackSingleModelGeneration({
                    apiKey,
                    model: config.model,
                    systemMessage,
                    userMessageContent,
                    temperature,
                    websiteName: config.websiteName,
                    topic: config.topic,
                    isGeoMode
                });
            }

        } else {
            // ==================== STANDARD SINGLE-MODEL GENERATION ====================
            parsedResult = await fallbackSingleModelGeneration({
                apiKey,
                model: config.model,
                systemMessage,
                userMessageContent,
                temperature,
                websiteName: config.websiteName,
                topic: config.topic,
                isGeoMode
            });
        }

        // Логируем если был использован fallback
        if (parsedResult._fallback) {
            console.warn('>>> GENERATION: Used fallback parsing for', isGeoMode ? 'GEO' : 'SEO', 'mode');
        }

        // Calculate metrics
        try {
            parsedResult.metrics = calculateSeoMetrics(parsedResult.content, keywords);
        } catch (e) {
            console.error("Metrics calculation failed", e);
        }

        // Check spam if plan allows
        if (limitCheck.plan?.canCheckSpam) {
            try {
                const spamResult = await checkSpam(apiKey, parsedResult.content, settings?.spamCheckModel);
                parsedResult.spamScore = spamResult.spamScore;
                parsedResult.spamAnalysis = spamResult.spamAnalysis;
            } catch (e) {
                console.error("Auto spam check failed", e);
            }
        }

        // Increment usage
        const updatedUser = await incrementUsage(limitCheck.user);

        res.json({ result: parsedResult, user: updatedUser });
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ error: error.message || 'Generation failed' });
    }
});

// Spam check helper
async function checkSpam(apiKey, content, model = 'x-ai/grok-4.1-fast') {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: getHeaders(apiKey, DEFAULT_SITE_NAME),
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: "system",
                    content: "You are a Google Algorithms Expert. Analyze texts for SEO Spam and Keyword Stuffing. Output strictly valid JSON."
                },
                {
                    role: "user",
                    content: `Analyze the following text for SEO Spam, Keyword Stuffing, and Unnatural phrasing.

Return a valid JSON object:
{
  "spamPercentage": number (0-100, where 100 is pure spam),
  "reason": "Short explanation of the score"
}

Text:
"""
${content.substring(0, 15000)}
"""`
                }
            ],
            temperature: 0.1
        })
    });

    if (!response.ok) {
        throw new Error("Spam check failed");
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
        return { spamScore: -1, spamAnalysis: "Empty response from API" };
    }

    // Используем надёжную очистку markdown
    let cleanText = rawContent.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/g, '')
        .trim();

    // Пробуем найти JSON если текст не начинается с {
    if (!cleanText.startsWith('{')) {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }
    }

    try {
        const result = JSON.parse(cleanText);
        return {
            spamScore: typeof result.spamPercentage === 'number' ? result.spamPercentage : -1,
            spamAnalysis: result.reason || "No analysis provided"
        };
    } catch (e) {
        console.warn('Spam check JSON parse failed:', e.message);
        return { 
            spamScore: -1, 
            spamAnalysis: "Failed to parse spam analysis response" 
        };
    }
}

/**
 * POST /api/generate/spam-check
 * Check content for spam
 */
router.post('/spam-check', validate(spamCheckSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;

        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        if (!limitCheck.plan?.canCheckSpam && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'Spam check not available for your plan' });
        }

        const { content } = req.body;

        const apiKey = await getApiKey();
        const settings = await Settings.findOne();

        const result = await checkSpam(apiKey, content, settings?.spamCheckModel);
        res.json(result);
    } catch (error) {
        console.error('Spam check error:', error);
        res.status(500).json({ error: error.message || 'Spam check failed' });
    }
});

/**
 * POST /api/generate/fix-spam
 * Fix content spam issues
 */
router.post('/fix-spam', validate(fixSpamSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;

        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        if (!limitCheck.plan?.canCheckSpam && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'Spam fix not available for your plan' });
        }

        const { content, analysis, model } = req.body;

        const apiKey = await getApiKey();

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, DEFAULT_SITE_NAME),
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "You are a professional editor. Your goal is to make text sound natural, human-written, and reduce spam/keyword stuffing while keeping the HTML/Markdown formatting intact."
                    },
                    {
                        role: "user",
                        content: `Rewrite the following text to reduce the spam score and improve readability.

Issues detected: ${analysis || 'High spam score detected'}

Strictly maintain the original structure, headings, and formatting. Just make the tone more natural and remove forced keywords.

Text:
"""
${content}
"""`
                    }
                ],
                temperature: 0.5
            })
        });

        if (!response.ok) throw new Error("Spam fix failed");

        const data = await response.json();
        const newContent = data.choices?.[0]?.message?.content || content;

        // Increment usage
        const updatedUser = await incrementUsage(limitCheck.user);

        res.json({ content: newContent, user: updatedUser });
    } catch (error) {
        console.error('Spam fix error:', error);
        res.status(500).json({ error: error.message || 'Spam fix failed' });
    }
});

/**
 * POST /api/generate/optimize
 * Optimize content relevance
 */
router.post('/optimize', validate(optimizeRelevanceSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;

        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        if (!limitCheck.plan?.canOptimizeRelevance && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'Optimization not available for your plan' });
        }

        const { content, missingKeywords, config } = req.body;

        const apiKey = await getApiKey();
        const missingStr = missingKeywords.join(', ');

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, config.websiteName || DEFAULT_SITE_NAME),
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: "system",
                        content: `You are an expert SEO Editor for ${config.targetCountry || 'Global'}. Your goal is to increase the relevance of the text by naturally integrating specific keywords. You must prioritize readability and natural flow over keyword density.`
                    },
                    {
                        role: "user",
                        content: `The following article is missing important semantic keywords.
Rewrite the article to naturally include these missing keywords: [${missingStr}].

CRITICAL ANTI-SPAM INSTRUCTIONS:
1. **Natural Integration Only:** Only insert keywords where they fit grammatically and logically. If a keyword cannot be added naturally, SKIP IT.
2. **Avoid Stuffing:** Do not force keywords into every paragraph. The text must remain human-like.
3. **Maintenance:** Strictly maintain the original Markdown structure, headings, and length.
4. **Tone:** Keep the ${config.tone || 'Professional'} tone and ${config.style || 'Informative'} style.
5. **Constraint:** Do not increase the overall word count significantly.

Original Text:
"""
${content}
"""`
                    }
                ],
                temperature: 0.4
            })
        });

        if (!response.ok) throw new Error("Optimization failed");

        const data = await response.json();
        const newContent = data.choices?.[0]?.message?.content || content;

        // Increment usage
        const updatedUser = await incrementUsage(limitCheck.user);

        res.json({ content: newContent, user: updatedUser });
    } catch (error) {
        console.error('Optimization error:', error);
        res.status(500).json({ error: error.message || 'Optimization failed' });
    }
});







export default router;
