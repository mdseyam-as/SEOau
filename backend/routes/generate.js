import express from 'express';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { generateSchema, spamCheckSchema, fixSpamSchema, optimizeRelevanceSchema } from '../schemas/index.js';

const router = express.Router();

const DEFAULT_SITE_URL = 'https://example.com';
const DEFAULT_SITE_NAME = 'SeoGenerator';

// ==================== MODEL MAPPING ====================
// Маппинг моделей для мультимодальной генерации
const MODEL_MAPPING = {
    // Writer models (для текста)
    'gemini-3.0': 'google/gemini-2.0-flash-001',
    'gemini-3-pro': 'google/gemini-2.0-flash-001',
    'google/gemini-3-pro-preview': 'google/gemini-2.0-flash-001', // Redirect to working model
    'gpt-5.2': 'openai/gpt-4o',
    'gpt-4.1': 'openai/gpt-4o',
    'openai/gpt-4.1': 'openai/gpt-4o', // Redirect to working model
    'grok-4.1': 'x-ai/grok-2-1212',

    // Visualizer model (для диаграмм и SVG)
    'claude-sonnet-4.5': 'anthropic/claude-3.5-sonnet',
    'anthropic/claude-sonnet-4': 'anthropic/claude-3.5-sonnet', // Redirect to working model

    // Fallback/default
    'default-writer': 'google/gemini-2.0-flash-001',
    'default-visualizer': 'anthropic/claude-3.5-sonnet'
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

// ==================== STRICT JSON MODE - EXPECTED STRUCTURE ====================

/**
 * JSON Schema для GEO генерации
 * Эта структура передаётся модели для строгого следования
 */
const EXPECTED_GEO_STRUCTURE = {
    article: {
        h1: "String (Заголовок статьи)",
        intro: "String (Вступление, 50-80 слов)",
        sections: [
            {
                h2: "String (Подзаголовок секции)",
                content: "String (Markdown текст секции)",
                table: "String | null (Markdown таблица, если нужна)"
            }
        ],
        conclusion: "String (Заключение, 30-50 слов)"
    },
    visuals: {
        mermaid: "String (Raw Mermaid code: flowchart TD... БЕЗ обратных кавычек)",
        svg: "String (Raw SVG code: <svg>...</svg>)"
    },
    faq: [
        { question: "String (Вопрос)", answer: "String (Ответ)" }
    ],
    seo: {
        metaTitle: "String (max 60 символов)",
        metaDescription: "String (max 160 символов)",
        keywords: ["String"],
        schemaType: "String (FAQPage, HowTo, FinancialProduct, Article, etc.)",
        schemaLD: "Object (JSON-LD structured data for Schema.org)"
    }
};

/**
 * Генерирует System Prompt для Strict JSON Mode
 */
function getStrictJsonSystemPrompt(topic, language) {
    const schemaString = JSON.stringify(EXPECTED_GEO_STRUCTURE, null, 2);

    return `ROLE: You are a headless CMS generator specialized in GEO (Generative Engine Optimization).
TASK: Generate a structured article about "${topic}".

CRITICAL OUTPUT RULES:
1. OUTPUT FORMAT: JSON ONLY. Do not output markdown code blocks (\`\`\`json). Just the raw JSON object.
2. LANGUAGE: ${language}. Write ALL content (h1, intro, sections, faq, etc.) in ${language}.
3. STRUCTURE: You MUST follow this EXACT JSON structure:

${schemaString}

4. CONTENT REQUIREMENTS:
   - "article.intro": Start with a direct definition of "${topic}" (50-80 words)
   - "article.sections": Create 3-5 sections with h2 headings, each section should have substantial content
   - "article.sections[].table": Include comparison tables where relevant (Markdown format), set to null if not needed
   - "visuals.mermaid": Create a valid Mermaid.js flowchart (flowchart TD, NOT graph TD). Use Latin node IDs (A, B, C), labels in ${language}
   - "visuals.svg": Create a simple, valid SVG infographic (viewBox, no fixed dimensions, standard colors)
   - "faq": Generate 4-5 relevant Q&A pairs about "${topic}"
   - "seo.schemaType": Choose the most appropriate Schema.org type (FAQPage, HowTo, Article, FinancialProduct, etc.)
   - "seo.schemaLD": Generate valid JSON-LD structured data object for Schema.org (NOT as string, as actual JSON object)

5. MERMAID SYNTAX (CRITICAL):
   - Start with: flowchart TD
   - Node format: A[Label] --> B[Label]
   - Decision: C{Question} -->|Yes| D[Result]
   - NO backticks, NO code blocks - just raw mermaid code

6. DO NOT include any explanations, comments, or text outside the JSON object.`;
}

/**
 * Генерирует User Prompt с контекстом
 */
function getStrictJsonUserPrompt(topic, language, context) {
    return `Generate a comprehensive GEO-optimized article about: "${topic}"

CONTEXT & KEYWORDS:
${context}

Remember:
- Output ONLY valid JSON matching the schema
- Write in ${language}
- Include mermaid flowchart (raw code, no backticks)
- Include SVG infographic (raw code)
- Generate 4-5 FAQ items
- Choose appropriate schemaType for SEO
- Generate seo.schemaLD as JSON-LD object (Schema.org structured data)`;
}

// ==================== VISUALIZER PROMPT (Claude) - STRICT JSON ====================

/**
 * System Prompt для Visualizer (Claude) в Strict JSON Mode
 */
function getVisualizerSystemPrompt(topic, language) {
    return `ROLE: You are a Data Visualization Expert.
TASK: Create visual assets for an article about "${topic}".

OUTPUT FORMAT: JSON ONLY. No markdown, no code blocks, no explanations.

You MUST return this EXACT structure:
{
  "mermaid": "flowchart TD\\n    A[Label] --> B[Label]\\n    B --> C{Decision}\\n    C -->|Yes| D[Result]\\n    C -->|No| E[Other]",
  "svg": "<svg viewBox=\\"0 0 400 300\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"
}

MERMAID RULES:
- Start with "flowchart TD" (NOT "graph TD")
- Node IDs: Latin only (A, B, C, step1, step2)
- Labels in ${language}
- Use \\n for newlines
- 5-8 nodes maximum
- NO backticks, NO code blocks

SVG RULES:
- viewBox for responsiveness (no width/height attributes)
- Modern flat design
- Text labels in ${language}
- Escape quotes as \\"
- Keep it simple (10-15 elements max)`;
}

function getVisualizerUserPrompt(topic, language) {
    return `Create visuals for: "${topic}"

Return JSON with:
1. "mermaid": flowchart showing the main process/decision flow
2. "svg": simple infographic/chart

Language for labels: ${language}
Output: Raw JSON only, no markdown.`;
}

// ==================== STRUCTURED RESPONSE PARSER ====================

/**
 * Парсит структурированный ответ Writer с fallback через regex
 * @param {string} rawText - Сырой ответ от AI
 * @param {string} topic - Тема для fallback
 * @returns {object} - Структурированный объект {article, seo}
 */
function parseStructuredWriterResponse(rawText, topic) {
    if (!rawText || typeof rawText !== 'string') {
        console.warn('parseStructuredWriterResponse: Empty input');
        return createEmptyStructuredResponse(topic);
    }

    // Очистка markdown обёрток
    let cleanText = rawText.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/g, '')
        .replace(/^\uFEFF/, '')
        .trim();

    // Если не начинается с {, ищем JSON
    if (!cleanText.startsWith('{')) {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanText = jsonMatch[0];
    }

    // Попытка парсинга JSON
    try {
        const parsed = JSON.parse(cleanText);
        console.log('>>> JSON parsed successfully, keys:', Object.keys(parsed));

        if (parsed.article && typeof parsed.article === 'object') {
            // Успешный парсинг структурированного ответа
            console.log('>>> STRICT JSON GEO: Complete');
            return {
                article: {
                    h1: parsed.article.h1 || topic,
                    intro: parsed.article.intro || parsed.article.introduction || '',
                    sections: Array.isArray(parsed.article.sections) ? parsed.article.sections : [],
                    conclusion: parsed.article.conclusion || ''
                },
                visuals: {
                    mermaid: parsed.visuals?.mermaid || null,
                    svg: parsed.visuals?.svg || null
                },
                faq: Array.isArray(parsed.faq) ? parsed.faq : [],
                seo: {
                    metaTitle: parsed.seo?.metaTitle || parsed.seo?.title || parsed.article.h1 || topic,
                    metaDescription: parsed.seo?.metaDescription || parsed.seo?.description || '',
                    keywords: Array.isArray(parsed.seo?.keywords) ? parsed.seo.keywords : [],
                    schemaType: parsed.seo?.schemaType || 'Article',
                    schemaLD: parsed.seo?.schemaLD || null
                },
                _parsed: true
            };
        }

        // Fallback: старый формат с content
        if (parsed.content) {
            console.log('>>> Using legacy format conversion');
            return convertLegacyToStructured(parsed, topic);
        }

        // JSON есть, но нет ни article ни content - пробуем извлечь что можем
        console.log('>>> JSON parsed but no article/content field, trying to extract');
    } catch (e) {
        console.warn('parseStructuredWriterResponse: JSON parse failed:', e.message);
    }

    // Regex fallback: извлекаем данные из сырого текста
    console.log('parseStructuredWriterResponse: Using regex fallback');
    return extractStructuredFromRawText(rawText, topic);
}

/**
 * Удаляет Mermaid и SVG из body (на случай если модель всё равно добавила)
 */
function cleanBodyFromVisuals(body) {
    if (!body) return '';

    return body
        // Удаляем mermaid блоки
        .replace(/```mermaid[\s\S]*?```/gi, '')
        // Удаляем SVG
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        // Удаляем пустые секции визуализации
        .replace(/##\s*📊[^\n]*\n+---\s*\n*/gi, '')
        .replace(/###\s*(Диаграмма|Инфографика)[^\n]*\n*/gi, '')
        // Чистим лишние переносы
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Конвертирует старый формат {content, metaTitle, ...} в новый структурированный
 */
function convertLegacyToStructured(legacy, topic) {
    const content = legacy.content || '';

    // Извлекаем H1
    const h1Match = content.match(/^#\s+([^\n]+)/m);
    const h1 = h1Match ? h1Match[1].trim() : topic;

    // Извлекаем введение (первый параграф после H1)
    const introMatch = content.match(/^#[^\n]+\n+([^#]+?)(?=\n##|\n$)/m);
    const intro = introMatch ? introMatch[1].trim() : '';

    // Извлекаем заключение (последний параграф или Key Takeaways)
    const conclusionMatch = content.match(/##\s*(?:Заключение|Conclusion|Key Takeaways|Ключевые выводы)[^\n]*\n+([\s\S]+?)(?=\n##|```|<script|$)/i);
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';

    // Извлекаем секции
    const sections = [];
    const sectionRegex = /##\s+([^\n]+)\n+([\s\S]*?)(?=\n##|```mermaid|<script|$)/gi;
    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
        const sectionTitle = match[1].trim();
        if (sectionTitle.toLowerCase().includes('faq') || 
            sectionTitle.toLowerCase().includes('заключение') ||
            sectionTitle.toLowerCase().includes('conclusion')) continue;
        sections.push({
            h2: sectionTitle,
            content: match[2].trim(),
            table: null
        });
    }

    // Извлекаем визуалы
    const mermaidMatch = content.match(/```mermaid\s*([\s\S]*?)```/i);
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);

    return {
        article: { 
            h1, 
            intro, 
            sections: sections.length > 0 ? sections : [{ h2: 'Содержание', content: cleanBodyFromVisuals(content), table: null }],
            conclusion 
        },
        visuals: {
            mermaid: mermaidMatch ? mermaidMatch[1].trim() : null,
            svg: svgMatch ? svgMatch[0].trim() : null
        },
        faq: [],
        seo: {
            metaTitle: legacy.metaTitle || h1.substring(0, 60),
            metaDescription: legacy.metaDescription || intro.substring(0, 160),
            keywords: legacy.usedKeywords || [],
            schemaType: 'Article',
            schemaLD: extractSchemaLD(content)
        },
        _converted: true
    };
}

/**
 * Извлекает JSON-LD schema из текста
 */
function extractSchemaLD(content) {
    const scriptMatch = content.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
        try {
            return JSON.parse(scriptMatch[1].trim());
        } catch (e) {
            console.warn('extractSchemaLD: Failed to parse JSON-LD');
        }
    }
    return null;
}

/**
 * Regex fallback: извлекает структуру из неструктурированного текста
 */
function extractStructuredFromRawText(rawText, topic) {
    // Извлекаем H1
    const h1Match = rawText.match(/^#\s+([^\n]+)/m);
    const h1 = h1Match ? h1Match[1].trim() : topic;

    // Извлекаем введение
    const introMatch = rawText.match(/^#[^\n]+\n+([^#]+?)(?=\n##)/m);
    const intro = introMatch ? introMatch[1].trim().substring(0, 500) : '';

    // Извлекаем секции
    const sections = [];
    const sectionRegex = /##\s+([^\n]+)\n+([\s\S]*?)(?=\n##|```mermaid|<script|$)/gi;
    let match;
    while ((match = sectionRegex.exec(rawText)) !== null) {
        const sectionTitle = match[1].trim();
        if (sectionTitle.toLowerCase().includes('faq')) continue;
        sections.push({
            h2: sectionTitle,
            content: match[2].trim(),
            table: null
        });
    }

    // Извлекаем заключение
    const conclusionMatch = rawText.match(/##\s*(?:Заключение|Conclusion|Итог|Summary)[^\n]*\n+([\s\S]+?)(?=\n##|```|<script|$)/i);
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';

    // Извлекаем визуалы
    const mermaidMatch = rawText.match(/```mermaid\s*([\s\S]*?)```/i);
    const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);

    return {
        article: { 
            h1, 
            intro, 
            sections: sections.length > 0 ? sections : [{ h2: 'Содержание', content: cleanBodyFromVisuals(rawText), table: null }],
            conclusion 
        },
        visuals: {
            mermaid: mermaidMatch ? mermaidMatch[1].trim() : null,
            svg: svgMatch ? svgMatch[0].trim() : null
        },
        faq: [],
        seo: {
            metaTitle: h1.substring(0, 60),
            metaDescription: intro.substring(0, 160),
            keywords: [],
            schemaType: 'Article',
            schemaLD: extractSchemaLD(rawText)
        },
        _fallback: true
    };
}

/**
 * Создаёт пустую структуру при ошибке
 */
function createEmptyStructuredResponse(topic) {
    return {
        article: {
            h1: topic || 'Untitled',
            intro: '',
            sections: [],
            conclusion: ''
        },
        visuals: {
            mermaid: null,
            svg: null
        },
        faq: [],
        seo: {
            metaTitle: topic || 'Untitled',
            metaDescription: '',
            keywords: [],
            schemaType: 'Article',
            schemaLD: null
        },
        _empty: true
    };
}

/**
 * Парсит ответ Visualizer (JSON формат)
 */
function parseVisualizerResponse(content) {
    if (!content) return null;

    // Очистка markdown обёрток
    let cleanText = content.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/g, '')
        .trim();

    // Попытка парсинга JSON
    try {
        const parsed = JSON.parse(cleanText);
        return {
            mermaidDiagram: parsed.mermaidDiagram || null,
            svgGraph: parsed.svgGraph || null
        };
    } catch (e) {
        console.warn('parseVisualizerResponse: JSON parse failed, using regex fallback');
    }

    // Regex fallback
    const result = { mermaidDiagram: null, svgGraph: null };

    // Извлекаем Mermaid
    const mermaidMatch = content.match(/```mermaid\s*([\s\S]*?)```/i);
    if (mermaidMatch) {
        result.mermaidDiagram = mermaidMatch[1].trim();
    } else {
        // Пробуем найти flowchart напрямую
        const flowMatch = content.match(/(flowchart\s+TD[\s\S]*?)(?=```|$)/i);
        if (flowMatch) result.mermaidDiagram = flowMatch[1].trim();
    }

    // Извлекаем SVG
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
        result.svgGraph = svgMatch[0].trim();
    }

    return (result.mermaidDiagram || result.svgGraph) ? result : null;
}

// ==================== STRICT JSON PARSER ====================

/**
 * Надёжный парсер JSON с очисткой markdown-обёрток
 * @param {string} rawText - Сырой текст от AI
 * @returns {object|null} - Распарсенный объект или null
 */
function parseStrictJson(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return null;
    }

    // Шаг 1: Удаляем markdown обёртки
    let cleanText = rawText.trim()
        .replace(/^```json\s*/gi, '')
        .replace(/^```\s*/gi, '')
        .replace(/\s*```$/g, '')
        .replace(/^\uFEFF/, '') // BOM
        .trim();

    // Шаг 2: Если не начинается с {, пробуем найти JSON объект
    if (!cleanText.startsWith('{')) {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }
    }

    // Шаг 3: Парсинг
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        console.warn('parseStrictJson: Parse failed:', e.message);
        console.warn('parseStrictJson: First 300 chars:', cleanText.substring(0, 300));
        return null;
    }
}

/**
 * Валидирует и нормализует структуру GEO ответа
 */
function validateGeoStructure(parsed, topic) {
    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    // Проверяем наличие основных полей
    const hasArticle = parsed.article && typeof parsed.article === 'object';
    const hasSeo = parsed.seo && typeof parsed.seo === 'object';

    if (!hasArticle) {
        console.warn('validateGeoStructure: Missing article field');
        return null;
    }

    // Нормализуем структуру
    return {
        article: {
            h1: parsed.article.h1 || topic,
            intro: parsed.article.intro || parsed.article.introduction || '',
            sections: Array.isArray(parsed.article.sections) ? parsed.article.sections.map(s => ({
                h2: s.h2 || s.heading || '',
                content: s.content || s.text || '',
                table: s.table || null
            })) : [],
            conclusion: parsed.article.conclusion || ''
        },
        visuals: {
            mermaid: parsed.visuals?.mermaid || parsed.visuals?.mermaidDiagram || null,
            svg: parsed.visuals?.svg || parsed.visuals?.svgGraph || null
        },
        faq: Array.isArray(parsed.faq) ? parsed.faq.map(f => ({
            question: f.question || f.q || '',
            answer: f.answer || f.a || ''
        })) : [],
        seo: {
            metaTitle: parsed.seo?.metaTitle || parsed.seo?.title || topic,
            metaDescription: parsed.seo?.metaDescription || parsed.seo?.description || '',
            keywords: Array.isArray(parsed.seo?.keywords) ? parsed.seo.keywords : [],
            schemaType: parsed.seo?.schemaType || 'Article',
            schemaLD: parsed.seo?.schemaLD || null
        },
        // CRITICAL: Mark as successfully parsed to prevent fallback warning
        _parsed: true
    };
}

// ==================== MULTIMODAL GEO ORCHESTRATOR (STRICT JSON MODE) ====================

/**
 * Мультимодальная GEO-генерация в Strict JSON Mode
 *
 * Writer (Gemini/GPT) генерирует: article, visuals, faq, seo
 * Visualizer (Claude) генерирует: mermaid, svg (fallback/enhancement)
 *
 * @returns {Promise<{article, visuals, faq, seo, _meta}>} - Структурированный результат
 */
async function generateGeoContent({
    topic,
    writerModel,
    visualizerModel = 'claude-sonnet-4.5',
    writerContext,
    language,
    apiKey,
    siteName
}) {
    const headers = getHeaders(apiKey, siteName);
    const modelId = getModelId(writerModel);

    // Определяем, поддерживает ли модель response_format
    // OpenRouter: только GPT и Claude надёжно поддерживают json_object
    const supportsJsonMode = modelId.includes('gpt') || modelId.includes('claude');

    console.log('>>> STRICT JSON GEO: Starting generation', {
        writer: modelId,
        visualizer: getModelId(visualizerModel),
        supportsJsonMode,
        topic: topic.substring(0, 50)
    });

    // ==================== ЗАПРОС А: WRITER (Strict JSON Mode) ====================
    const writerBody = {
        model: modelId,
        messages: [
            { role: "system", content: getStrictJsonSystemPrompt(topic, language) },
            { role: "user", content: getStrictJsonUserPrompt(topic, language, writerContext) }
        ],
        temperature: 0.2,
        max_tokens: 8000
    };

    // Добавляем response_format для моделей, которые его поддерживают
    if (supportsJsonMode) {
        writerBody.response_format = { type: "json_object" };
    }

    const writerRequest = fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(writerBody)
    });

    // ==================== ЗАПРОС Б: VISUALIZER (Strict JSON Mode) ====================
    const visualizerBody = {
        model: getModelId(visualizerModel),
        messages: [
            { role: "system", content: getVisualizerSystemPrompt(topic, language) },
            { role: "user", content: getVisualizerUserPrompt(topic, language) }
        ],
        temperature: 0.3,
        max_tokens: 4000
    };

    // Claude поддерживает JSON mode
    if (getModelId(visualizerModel).includes('claude')) {
        visualizerBody.response_format = { type: "json_object" };
    }

    const visualizerRequest = fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(visualizerBody)
    });

    // ==================== ПАРАЛЛЕЛЬНЫЙ ЗАПУСК ====================
    const [writerResult, visualizerResult] = await Promise.allSettled([
        writerRequest,
        visualizerRequest
    ]);

    // ==================== ОБРАБОТКА WRITER (обязательный) ====================
    let parsedWriter = null;
    let writerRaw = '';

    if (writerResult.status === 'fulfilled' && writerResult.value.ok) {
        const writerData = await writerResult.value.json();
        writerRaw = writerData.choices?.[0]?.message?.content || '';

        console.log('>>> STRICT JSON GEO: Writer response received, length:', writerRaw.length);
        
        // Логируем если ответ пустой
        if (!writerRaw || writerRaw.length === 0) {
            console.error('>>> STRICT JSON GEO: Writer returned EMPTY response!', {
                hasChoices: !!writerData.choices,
                choicesLength: writerData.choices?.length,
                finishReason: writerData.choices?.[0]?.finish_reason,
                error: writerData.error,
                usage: writerData.usage
            });
        }

        // Парсим JSON
        const rawParsed = parseStrictJson(writerRaw);
        parsedWriter = validateGeoStructure(rawParsed, topic);

        if (parsedWriter) {
            console.log('>>> STRICT JSON GEO: Writer parsed successfully', {
                h1: parsedWriter.article.h1?.substring(0, 40),
                sectionsCount: parsedWriter.article.sections?.length,
                faqCount: parsedWriter.faq?.length,
                hasMermaid: !!parsedWriter.visuals.mermaid,
                hasSvg: !!parsedWriter.visuals.svg
            });
        } else {
            console.error('>>> STRICT JSON GEO: Writer parse/validation failed');
        }
    } else {
        const error = writerResult.status === 'rejected'
            ? writerResult.reason?.message || writerResult.reason
            : await writerResult.value.text().catch(() => 'Unknown error');
        console.error('>>> STRICT JSON GEO: Writer request failed:', error);
        throw new Error(`Writer model failed: ${error}`);
    }

    // Если парсинг не удался, создаём fallback структуру
    if (!parsedWriter) {
        console.warn('>>> STRICT JSON GEO: Using fallback structure');
        parsedWriter = createFallbackGeoStructure(writerRaw, topic);
    }

    // ==================== ОБРАБОТКА VISUALIZER (soft fallback) ====================
    let visualizerVisuals = { mermaid: null, svg: null };

    if (visualizerResult.status === 'fulfilled' && visualizerResult.value.ok) {
        try {
            const visualizerData = await visualizerResult.value.json();
            const visualizerRaw = visualizerData.choices?.[0]?.message?.content || '';
            const parsedVisuals = parseStrictJson(visualizerRaw);

            if (parsedVisuals) {
                visualizerVisuals = {
                    mermaid: parsedVisuals.mermaid || parsedVisuals.mermaidDiagram || null,
                    svg: parsedVisuals.svg || parsedVisuals.svgGraph || null
                };
                console.log('>>> STRICT JSON GEO: Visualizer parsed', {
                    hasMermaid: !!visualizerVisuals.mermaid,
                    hasSvg: !!visualizerVisuals.svg
                });
            }
        } catch (e) {
            console.warn('>>> STRICT JSON GEO: Visualizer parse error:', e.message);
        }
    } else {
        console.warn('>>> STRICT JSON GEO: Visualizer request failed (soft fallback)');
    }

    // ==================== MERGE VISUALS ====================
    // Приоритет: Writer visuals > Visualizer visuals
    const finalVisuals = {
        mermaid: parsedWriter.visuals.mermaid || visualizerVisuals.mermaid,
        svg: parsedWriter.visuals.svg || visualizerVisuals.svg
    };

    // ==================== РЕЗУЛЬТАТ ====================
    return {
        article: parsedWriter.article,
        visuals: finalVisuals,
        faq: parsedWriter.faq,
        seo: parsedWriter.seo,
        _meta: {
            writerModel: modelId,
            visualizerModel: getModelId(visualizerModel),
            jsonMode: supportsJsonMode,
            writerVisualsUsed: !!(parsedWriter.visuals.mermaid || parsedWriter.visuals.svg),
            visualizerVisualsUsed: !!(visualizerVisuals.mermaid || visualizerVisuals.svg),
            fallback: !parsedWriter._parsed
        }
    };
}

/**
 * Создаёт fallback структуру из сырого текста
 */
function createFallbackGeoStructure(rawText, topic) {
    // Пробуем извлечь хоть что-то из текста
    const h1Match = rawText.match(/^#\s+([^\n]+)/m);
    const mermaidMatch = rawText.match(/```mermaid\s*([\s\S]*?)```/i) ||
                         rawText.match(/(flowchart\s+TD[\s\S]*?)(?=\n\n|```|$)/i);
    const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);

    return {
        article: {
            h1: h1Match ? h1Match[1].trim() : topic,
            intro: '',
            sections: [{
                h2: 'Содержание',
                content: cleanBodyFromVisuals(rawText),
                table: null
            }],
            conclusion: ''
        },
        visuals: {
            mermaid: mermaidMatch ? mermaidMatch[1]?.trim() || mermaidMatch[0]?.trim() : null,
            svg: svgMatch ? svgMatch[0].trim() : null
        },
        faq: [],
        seo: {
            metaTitle: topic.substring(0, 60),
            metaDescription: '',
            keywords: [],
            schemaType: 'Article'
        },
        _fallback: true
    };
}

// ==================== LEGACY TO NEW STRUCTURE CONVERTER ====================

/**
 * Конвертирует legacy результат {content, metaTitle, ...} в НОВЫЙ структурированный формат
 * с article.sections[], faq[], visuals{mermaid, svg}
 */
function convertLegacyToNewStructure(legacy, topic) {
    const content = legacy.content || '';

    // Извлекаем H1
    const h1Match = content.match(/^#\s+([^\n]+)/m);
    const h1 = h1Match ? h1Match[1].trim() : topic;

    // Извлекаем intro (первый параграф после H1)
    const introMatch = content.match(/^#[^\n]+\n+([^#]+?)(?=\n##)/m);
    const intro = introMatch ? introMatch[1].trim() : '';

    // Извлекаем sections (все H2)
    const sections = [];
    const sectionRegex = /##\s+([^\n]+)\n+([\s\S]*?)(?=\n##|\n```mermaid|<script|$)/gi;
    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
        const sectionTitle = match[1].trim();
        const sectionContent = match[2].trim();

        // Пропускаем FAQ - обрабатываем отдельно
        if (sectionTitle.toLowerCase().includes('faq')) continue;

        // Извлекаем таблицу из секции (если есть)
        const tableMatch = sectionContent.match(/(\|[^\n]+\|\n)+/);

        sections.push({
            h2: sectionTitle,
            content: tableMatch ? sectionContent.replace(tableMatch[0], '').trim() : sectionContent,
            table: tableMatch ? tableMatch[0].trim() : null
        });
    }

    // Извлекаем FAQ
    const faq = [];
    const faqMatch = content.match(/##\s*FAQ[\s\S]*?(?=\n##|```mermaid|<script|$)/i);
    if (faqMatch) {
        // Ищем Q&A паттерны
        const qaRegex = /\*\*Q:\s*([^*]+)\*\*\s*\n\s*A:\s*([^\n]+)/gi;
        let qaMatch;
        while ((qaMatch = qaRegex.exec(faqMatch[0])) !== null) {
            faq.push({
                question: qaMatch[1].trim(),
                answer: qaMatch[2].trim()
            });
        }
    }

    // Извлекаем conclusion
    const conclusionMatch = content.match(/##\s*(?:Заключение|Conclusion|Итог|Key Takeaways)[^\n]*\n+([\s\S]+?)(?=\n##|```|<script|$)/i);
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';

    // Извлекаем визуалы
    const mermaidMatch = content.match(/```mermaid\s*([\s\S]*?)```/i);
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);

    // Извлекаем schema type из JSON-LD
    const schemaMatch = content.match(/"@type"\s*:\s*"([^"]+)"/);
    const schemaType = schemaMatch ? schemaMatch[1] : 'Article';

    return {
        article: {
            h1,
            intro,
            sections: sections.length > 0 ? sections : [{
                h2: 'Содержание',
                content: cleanBodyFromVisuals(content),
                table: null
            }],
            conclusion
        },
        visuals: {
            mermaid: mermaidMatch ? mermaidMatch[1].trim() : null,
            svg: svgMatch ? svgMatch[0].trim() : null
        },
        faq,
        seo: {
            metaTitle: legacy.metaTitle || h1.substring(0, 60),
            metaDescription: legacy.metaDescription || intro.substring(0, 160),
            keywords: legacy.usedKeywords || [],
            schemaType,
            schemaLD: extractSchemaLD(content)
        },
        // Legacy поля
        content,
        metaTitle: legacy.metaTitle,
        metaDescription: legacy.metaDescription,
        usedKeywords: legacy.usedKeywords || [],
        _structured: true,
        _converted: true,
        _fallback: legacy._fallback
    };
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
    const settings = await prisma.systemSetting.findUnique({
        where: { id: 'global' }
    });
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
    const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) }
    });
    if (!user) return { allowed: false, reason: 'user_not_found' };

    if (user.role === 'admin') return { allowed: true, user };

    const plan = await prisma.plan.findUnique({
        where: { slug: user.planId }
    });
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

    const updateData = {};

    if (user.lastGenerationMonth !== currentMonth) {
        updateData.generationsUsed = 1;
        updateData.lastGenerationMonth = currentMonth;
    } else {
        updateData.generationsUsed = (user.generationsUsed || 0) + 1;
    }

    if (user.lastGenerationDate !== currentDay) {
        updateData.generationsUsedToday = 1;
        updateData.lastGenerationDate = currentDay;
    } else {
        updateData.generationsUsedToday = (user.generationsUsedToday || 0) + 1;
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData
    });

    // Convert BigInt for JSON response
    return {
        ...updatedUser,
        telegramId: updatedUser.telegramId.toString(),
        _id: updatedUser.id
    };
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
        const settings = await prisma.systemSetting.findUnique({
            where: { id: 'global' }
        });

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

        let result;

        // ==================== MULTIMODAL GEO GENERATION ====================
        // Используем двухъядерный подход для GEO режима:
        // - Writer (Gemini/GPT) генерирует article + seo
        // - Visualizer (Claude) генерирует visuals (mermaid + svg)
        const useMultimodal = isGeoMode && config.useMultimodalGeo !== false;

        if (useMultimodal) {
            console.log('>>> STRICT JSON GEO MODE ACTIVATED');

            // Определяем модели
            const writerModel = config.writerModel || config.model || 'gemini-3.0';
            const visualizerModel = config.visualizerModel || 'claude-sonnet-4.5';

            // Формируем контекст для Writer
            const writerContext = `
Keywords: ${mainKeywords}
LSI Keywords: ${config.lsiKeywords || 'N/A'}
Top Keywords: ${topKeywords}
Target Country: ${config.targetCountry || 'Global'}
Tone: ${config.tone || 'Professional'}
Style: ${config.style || 'Informative'}
Min/Max Chars: ${config.minChars || 2500} - ${config.maxChars || 5000}
Competitors Context: ${competitors}
${exampleInstruction}
            `.trim();

            try {
                const geoResult = await generateGeoContent({
                    topic: config.topic,
                    writerModel,
                    visualizerModel,
                    writerContext,
                    language: contentLanguage,
                    apiKey,
                    siteName: config.websiteName
                });

                // Собираем body из sections для legacy поля content
                const sectionsMarkdown = (geoResult.article.sections || [])
                    .map(s => {
                        let sectionContent = `## ${s.h2}\n\n${s.content}`;
                        if (s.table) sectionContent += `\n\n${s.table}`;
                        return sectionContent;
                    })
                    .join('\n\n');

                const faqMarkdown = (geoResult.faq || [])
                    .map(f => `**Q: ${f.question}**\nA: ${f.answer}`)
                    .join('\n\n');

                // Структурированный результат (НОВАЯ СТРУКТУРА)
                result = {
                    // Новая структура
                    article: geoResult.article,       // {h1, intro, sections[], conclusion}
                    visuals: geoResult.visuals,       // {mermaid, svg}
                    faq: geoResult.faq,               // [{question, answer}]
                    seo: geoResult.seo,               // {metaTitle, metaDescription, keywords, schemaType}

                    // Legacy поля для обратной совместимости
                    content: `# ${geoResult.article.h1}\n\n${geoResult.article.intro}\n\n${sectionsMarkdown}\n\n## FAQ\n\n${faqMarkdown}\n\n${geoResult.article.conclusion}`,
                    metaTitle: geoResult.seo.metaTitle,
                    metaDescription: geoResult.seo.metaDescription,
                    usedKeywords: geoResult.seo.keywords,

                    // Meta
                    _structured: true,
                    _strictJsonMode: true,
                    _meta: geoResult._meta
                };

                console.log('>>> STRICT JSON GEO: Complete', {
                    h1: result.article.h1?.substring(0, 50),
                    sectionsCount: result.article.sections?.length,
                    faqCount: result.faq?.length,
                    hasMermaid: !!result.visuals.mermaid,
                    hasSvg: !!result.visuals.svg
                });

            } catch (multimodalError) {
                console.error('>>> STRICT JSON GEO: Failed, falling back to single-model', multimodalError.message);
                // Fallback к обычной генерации
                const legacyResult = await fallbackSingleModelGeneration({
                    apiKey,
                    model: config.model,
                    systemMessage,
                    userMessageContent,
                    temperature,
                    websiteName: config.websiteName,
                    topic: config.topic,
                    isGeoMode
                });
                // Конвертируем legacy в новый structured формат
                result = convertLegacyToNewStructure(legacyResult, config.topic);
            }

        } else {
            // ==================== STANDARD SINGLE-MODEL GENERATION ====================
            const legacyResult = await fallbackSingleModelGeneration({
                apiKey,
                model: config.model,
                systemMessage,
                userMessageContent,
                temperature,
                websiteName: config.websiteName,
                topic: config.topic,
                isGeoMode
            });

            // Для GEO режима конвертируем в новый формат
            if (isGeoMode) {
                result = convertLegacyToNewStructure(legacyResult, config.topic);
            } else {
                // SEO режим - возвращаем legacy формат + добавляем пустые структурные поля
                result = {
                    ...legacyResult,
                    article: null,
                    visuals: { mermaid: null, svg: null },
                    faq: [],
                    seo: {
                        metaTitle: legacyResult.metaTitle,
                        metaDescription: legacyResult.metaDescription,
                        keywords: legacyResult.usedKeywords || [],
                        schemaType: 'Article',
                        schemaLD: extractSchemaLD(legacyResult.content || '')
                    }
                };
            }
        }

        // Логируем если был использован fallback
        if (result._fallback || result._meta?.fallback) {
            console.warn('>>> GENERATION: Used fallback parsing for', isGeoMode ? 'GEO' : 'SEO', 'mode');
        }

        // Calculate metrics (используем sections content или legacy content)
        const sectionsContent = result.article?.sections?.map(s => s.content).join('\n') || '';
        const contentForMetrics = sectionsContent || result.content || '';
        try {
            result.metrics = calculateSeoMetrics(contentForMetrics, keywords);
        } catch (e) {
            console.error("Metrics calculation failed", e);
        }

        // Check spam if plan allows
        if (limitCheck.plan?.canCheckSpam) {
            try {
                const spamResult = await checkSpam(apiKey, contentForMetrics, settings?.spamCheckModel);
                result.spamScore = spamResult.spamScore;
                result.spamAnalysis = spamResult.spamAnalysis;
            } catch (e) {
                console.error("Auto spam check failed", e);
            }
        }

        // Increment usage
        const updatedUser = await incrementUsage(limitCheck.user);

        res.json({ result, user: updatedUser });
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
        const settings = await prisma.systemSetting.findUnique({
            where: { id: 'global' }
        });

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
