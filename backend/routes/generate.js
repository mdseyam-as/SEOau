import express from 'express';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { generateSchema, spamCheckSchema, fixSpamSchema, optimizeRelevanceSchema, seoAuditSchema, rewriteSchema, humanizeSchema, serpAnalyzerSchema } from '../schemas/index.js';
import { sanitizePromptInput } from '../utils/promptSanitizer.js';

const router = express.Router();

const DEFAULT_SITE_URL = 'https://example.com';
const DEFAULT_SITE_NAME = 'SeoGenerator';

// ==================== MODEL MAPPING ====================
// Маппинг моделей для мультимодальной генерации
const MODEL_MAPPING = {
    // Writer models (для текста)
    'gemini-3.0': 'google/gemini-3-flash-preview',
    'gemini-3-pro': 'google/gemini-3-flash-preview',
    'google/gemini-3-pro-preview': 'google/gemini-3-flash-preview', // Redirect to working model
    'google/gemini-2.0-flash-001': 'google/gemini-3-flash-preview', // Old model redirect
    'google/gemini-2.0-flash-exp': 'google/gemini-3-flash-preview', // Old model redirect
    'gemini-2.0-flash-exp': 'google/gemini-3-flash-preview', // Old model redirect
    'gpt-5.2': 'openai/gpt-4o',
    'gpt-4.1': 'openai/gpt-4o',
    'openai/gpt-4.1': 'openai/gpt-4o', // Redirect to working model
    'grok-4.1': 'x-ai/grok-2-1212',

    // Visualizer model (для диаграмм и SVG) - Claude Sonnet 4 (latest)
    'claude-sonnet-4.5': 'anthropic/claude-sonnet-4',
    'anthropic/claude-sonnet-4': 'anthropic/claude-sonnet-4',

    // Fallback/default
    'default-writer': 'google/gemini-3-flash-preview',
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
   - "faq": MANDATORY! Generate exactly 4-5 relevant Q&A pairs about "${topic}". Each item MUST have "question" and "answer" fields.
   - "seo.schemaType": Choose the most appropriate Schema.org type (FAQPage, HowTo, Article, FinancialProduct, etc.)
   - "seo.schemaLD": Generate valid JSON-LD structured data object for Schema.org (NOT as string, as actual JSON object)

5. MERMAID SYNTAX (CRITICAL):
   - Start with: flowchart TD
   - Node format: A[Label] --> B[Label]
   - Decision: C{Question} -->|Yes| D[Result]
   - NO backticks, NO code blocks - just raw mermaid code

6. FAQ IS REQUIRED! The "faq" array MUST contain 4-5 items. Example:
   "faq": [
     {"question": "What is ${topic}?", "answer": "Detailed answer..."},
     {"question": "How does ${topic} work?", "answer": "Explanation..."},
     {"question": "Why is ${topic} important?", "answer": "Reasons..."},
     {"question": "What are the benefits of ${topic}?", "answer": "Benefits..."}
   ]

7. DO NOT include any explanations, comments, or text outside the JSON object.`;
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

// ==================== VISUALIZER PROMPT (Claude Sonnet 4.5) - STRICT JSON ====================

/**
 * System Prompt для Visualizer (Claude Sonnet 4) в Strict JSON Mode
 * Создаёт профессиональные инфографики и диаграммы
 */
function getVisualizerSystemPrompt(topic, language) {
    return `ROLE: You are a world-class Infographic Designer creating visuals for "${topic}".

OUTPUT: Return ONLY valid JSON (no markdown, no backticks):
{
  "mermaid": "flowchart TD\\n    A[Step 1] --> B[Step 2]...",
  "svg": "<svg viewBox=\\"0 0 800 600\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"
}

═══════════════════════════════════════════════════════════════
MERMAID RULES:
═══════════════════════════════════════════════════════════════
- Start: "flowchart TD" (NOT graph)
- Node IDs: Latin (A, B, C)
- Labels: ${language}
- 6-10 nodes with decision points {Question}
- NO backticks

═══════════════════════════════════════════════════════════════
SVG INFOGRAPHIC - MANDATORY REQUIREMENTS:
═══════════════════════════════════════════════════════════════

YOU MUST CREATE A COMPLETE, PROFESSIONAL INFOGRAPHIC WITH ALL THESE ELEMENTS:

1. HEADER SECTION (y: 0-80):
   - Dark gradient background (#1E293B to #334155)
   - Large white title (font-size 28-32)
   - Subtitle with topic context

2. STATISTICS CARDS (y: 100-280) - CREATE 4 CARDS IN A ROW:
   - Each card: 170x140px with rounded corners (rx=12)
   - Gradient backgrounds (blue→purple, green→teal, etc.)
   - Large number/stat (font-size 36-42, bold, white)
   - Label below (font-size 13-14, white/light)
   - Icon or visual element in each card

3. PROCESS/STEPS SECTION (y: 300-420):
   - 3-4 connected steps with arrows
   - Numbered circles (1, 2, 3, 4)
   - Step descriptions
   - Connecting arrows or lines

4. KEY FACTS SECTION (y: 440-580):
   - 2-3 horizontal bars or bullet points
   - Important facts about "${topic}"
   - Icons or checkmarks

COLORS TO USE:
- Blues: #3B82F6, #2563EB, #1D4ED8
- Greens: #10B981, #059669
- Purples: #8B5CF6, #7C3AED
- Amber: #F59E0B, #D97706
- Background: #F8FAFC, #F1F5F9
- Dark text: #1E293B, #334155
- Light text: #FFFFFF, #F8FAFC

REQUIRED SVG STRUCTURE:
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="600" fill="#F1F5F9" rx="16"/>
  
  <!-- Header -->
  <rect width="800" height="80" fill="url(#headerGrad)" rx="16 16 0 0"/>
  <text x="400" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">[TITLE IN ${language}]</text>
  <text x="400" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#94A3B8">[Subtitle]</text>
  
  <!-- Stats Cards Row -->
  <g filter="url(#shadow)">
    <rect x="30" y="100" width="170" height="140" rx="12" fill="url(#blueGrad)"/>
    <text x="115" y="155" text-anchor="middle" font-family="Arial" font-size="42" font-weight="bold" fill="white">[STAT]</text>
    <text x="115" y="185" text-anchor="middle" font-family="Arial" font-size="13" fill="#E0E7FF">[Label]</text>
  </g>
  <!-- Add 3 more cards at x=210, x=390, x=570 -->
  
  <!-- Process Steps -->
  <text x="400" y="280" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#1E293B">[Process Title]</text>
  <!-- Add numbered circles and connecting arrows -->
  
  <!-- Key Facts -->
  <text x="50" y="460" font-family="Arial" font-size="16" font-weight="bold" fill="#1E293B">[Key Facts]</text>
  <!-- Add fact items with icons -->
</svg>

CRITICAL: 
- Fill ALL placeholders with REAL data about "${topic}"
- Include ACTUAL statistics and facts (research or estimate realistic numbers)
- All text in ${language}
- Escape quotes as \\"
- DO NOT create primitive 2-circle graphics - create FULL infographic!`;
}

function getVisualizerUserPrompt(topic, language) {
    return `Create a COMPLETE, PROFESSIONAL infographic for: "${topic}"

CRITICAL REQUIREMENTS:

1. "mermaid": Detailed flowchart (6-10 nodes) showing the process/decision flow for "${topic}"

2. "svg": A FULL INFOGRAPHIC (NOT just 2 circles!) with:

   SECTION 1 - HEADER (dark gradient):
   - Title: "${topic}" in ${language}
   - Subtitle explaining the context
   
   SECTION 2 - STATISTICS ROW (4 gradient cards):
   - Card 1: Key number/percentage about "${topic}"
   - Card 2: Another important statistic
   - Card 3: Comparison or growth metric
   - Card 4: User/market data
   
   SECTION 3 - PROCESS STEPS:
   - 3-4 numbered steps showing how "${topic}" works
   - Connected with arrows
   
   SECTION 4 - KEY FACTS:
   - 2-3 important facts with checkmark icons

FILL IN REAL DATA - research or estimate realistic statistics for "${topic}".
All text must be in ${language}.

Output: Raw JSON only, no markdown code blocks.`;
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

    // ==================== FAQ FALLBACK ====================
    // Если FAQ пустой, генерируем его отдельно
    let finalFaq = parsedWriter.faq;
    if (!finalFaq || finalFaq.length === 0) {
        console.log('>>> STRICT JSON GEO: FAQ empty, generating fallback...');
        try {
            finalFaq = await generateFallbackFaq(topic, language, apiKey, siteName);
            console.log('>>> STRICT JSON GEO: Fallback FAQ generated:', finalFaq.length, 'items');
        } catch (e) {
            console.warn('>>> STRICT JSON GEO: Fallback FAQ failed:', e.message);
            finalFaq = [];
        }
    }

    // ==================== РЕЗУЛЬТАТ ====================
    return {
        article: parsedWriter.article,
        visuals: finalVisuals,
        faq: finalFaq,
        seo: parsedWriter.seo,
        _meta: {
            writerModel: modelId,
            visualizerModel: getModelId(visualizerModel),
            jsonMode: supportsJsonMode,
            writerVisualsUsed: !!(parsedWriter.visuals.mermaid || parsedWriter.visuals.svg),
            visualizerVisualsUsed: !!(visualizerVisuals.mermaid || visualizerVisuals.svg),
            fallback: !parsedWriter._parsed,
            faqFallback: !parsedWriter.faq || parsedWriter.faq.length === 0
        }
    };
}

/**
 * Генерирует FAQ отдельным запросом (fallback)
 */
async function generateFallbackFaq(topic, language, apiKey, siteName) {
    const headers = getHeaders(apiKey, siteName);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
                {
                    role: "system",
                    content: `You are an FAQ generator. Generate exactly 5 FAQ items about the given topic.
Output ONLY a JSON array, no markdown:
[{"question": "...", "answer": "..."}, ...]
Write in ${language}.`
                },
                {
                    role: "user",
                    content: `Generate 5 FAQ items about: "${topic}"`
                }
            ],
            temperature: 0.3,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        throw new Error('FAQ fallback request failed');
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON array
    let cleanJson = rawContent.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/g, '')
        .trim();

    if (!cleanJson.startsWith('[')) {
        const match = cleanJson.match(/\[[\s\S]*\]/);
        if (match) cleanJson = match[0];
    }

    const parsed = JSON.parse(cleanJson);
    return Array.isArray(parsed) ? parsed.map(f => ({
        question: f.question || f.q || '',
        answer: f.answer || f.a || ''
    })).filter(f => f.question && f.answer) : [];
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
    // Apply model mapping to redirect old models to new ones
    const mappedModel = getModelId(model);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: getHeaders(apiKey, websiteName),
        body: JSON.stringify({
            model: mappedModel,
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
            model: mappedModel,
            originalModel: model,
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length,
            finishReason: data.choices?.[0]?.finish_reason,
            error: data.error,
            usage: data.usage
        }, null, 2));
        throw new Error(`No content received from AI. Model: ${mappedModel}, Finish reason: ${data.choices?.[0]?.finish_reason || 'unknown'}`);
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

// Increment usage with transaction to prevent race conditions
async function incrementUsage(user) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentDay = new Date().toISOString().slice(0, 10);

    // Use transaction for atomic update
    const updatedUser = await prisma.$transaction(async (tx) => {
        // Re-fetch user within transaction for consistency
        const freshUser = await tx.user.findUnique({
            where: { id: user.id }
        });

        if (!freshUser) {
            throw new Error('User not found');
        }

        const updateData = {};

        if (freshUser.lastGenerationMonth !== currentMonth) {
            updateData.generationsUsed = 1;
            updateData.lastGenerationMonth = currentMonth;
        } else {
            updateData.generationsUsed = (freshUser.generationsUsed || 0) + 1;
        }

        if (freshUser.lastGenerationDate !== currentDay) {
            updateData.generationsUsedToday = 1;
            updateData.lastGenerationDate = currentDay;
        } else {
            updateData.generationsUsedToday = (freshUser.generationsUsedToday || 0) + 1;
        }

        return tx.user.update({
            where: { id: user.id },
            data: updateData
        });
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

        // ==================== SECURITY: Sanitize user inputs ====================
        const sanitizedConfig = {
            ...config,
            topic: sanitizePromptInput(config.topic, { maxLength: 500 }),
            exampleContent: config.exampleContent ? sanitizePromptInput(config.exampleContent, { maxLength: 50000 }) : '',
            competitorUrls: config.competitorUrls ? sanitizePromptInput(config.competitorUrls, { maxLength: 5000 }) : '',
            targetUrl: config.targetUrl ? sanitizePromptInput(config.targetUrl, { maxLength: 500, removeInjection: false }) : '',
            websiteName: config.websiteName ? sanitizePromptInput(config.websiteName, { maxLength: 200 }) : ''
        };

        // Sanitize keywords
        const sanitizedKeywords = keywords.map(k => ({
            ...k,
            keyword: sanitizePromptInput(k.keyword, { maxLength: 200 })
        }));

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
            if (!limitCheck.plan.allowedModels.includes(sanitizedConfig.model)) {
                return res.status(403).json({ error: 'Model not allowed for your plan' });
            }
        }

        const apiKey = await getApiKey();
        const settings = await prisma.systemSetting.findUnique({
            where: { id: 'global' }
        });

        // ==================== DEBUG LOG ====================
        const isGeoMode = sanitizedConfig.generationMode === 'geo';

        // Check GEO mode permission
        if (isGeoMode && !limitCheck.plan?.canUseGeoMode && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'GEO режим недоступен для вашего тарифа' });
        }

        console.log('>>> GENERATION REQUEST:', {
            topic: sanitizedConfig.topic,
            mode: sanitizedConfig.generationMode,
            isGeoMode,
            model: sanitizedConfig.model
        });

        // Prepare prompt using sanitized inputs
        const topKeywords = sanitizedKeywords
            .slice(0, 50)
            .map(k => `${k.keyword} (Freq: ${k.frequency})`)
            .join(', ');

        const mainKeywords = sanitizedKeywords
            .slice(0, 5)
            .map(k => k.keyword)
            .join(', ');

        const competitorsList = (sanitizedConfig.competitorUrls || '').trim();
        const competitorsFileContent = sanitizedConfig.competitorFiles
            ? sanitizedConfig.competitorFiles.map(f => `--- CONTENT FROM FILE: ${f.name} ---\n${sanitizePromptInput(f.content, { maxLength: 20000 })}`).join('\n\n')
            : '';

        const competitors = [competitorsList, competitorsFileContent].filter(Boolean).join('\n\n') || "Provided context";

        const exampleInstruction = sanitizedConfig.exampleContent?.trim()
            ? `
### REFERENCE STYLE & STRUCTURE
The user has provided an example of a high-quality text. Mimic the writing style, paragraph length, tone, and how keywords are naturally woven into the text.

**Example Text:**
"""
${sanitizedConfig.exampleContent}
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
        const contentLanguage = sanitizedConfig.language || 'Русский';

        const replacements = {
            '{{targetUrl}}': sanitizedConfig.targetUrl || '',
            '{{topic}}': sanitizedConfig.topic || '',
            '{{websiteName}}': sanitizedConfig.websiteName || DEFAULT_SITE_NAME,
            '{{targetCountry}}': sanitizedConfig.targetCountry || 'Global',
            '{{language}}': contentLanguage,
            '{{tone}}': sanitizedConfig.tone || 'Professional',
            '{{style}}': sanitizedConfig.style || 'Informative',
            '{{minChars}}': sanitizedConfig.minChars || 2500,
            '{{maxChars}}': sanitizedConfig.maxChars || 5000,
            '{{minParas}}': sanitizedConfig.minParas || 3,
            '{{maxParas}}': sanitizedConfig.maxParas || 12,
            '{{mainKeywords}}': mainKeywords,
            '{{lsiKeywords}}': sanitizedConfig.lsiKeywords || '',
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
            const topic = sanitizedConfig.topic || 'the requested topic';
            
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
            : `You are an advanced SEO AI. You write content for ${sanitizedConfig.targetCountry || 'Global'}. IMPORTANT: Write the entire article in ${contentLanguage}. You always output strictly valid JSON.`;

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
        const useMultimodal = isGeoMode && sanitizedConfig.useMultimodalGeo !== false;

        if (useMultimodal) {
            console.log('>>> STRICT JSON GEO MODE ACTIVATED');

            // Определяем модели
            const writerModel = sanitizedConfig.writerModel || sanitizedConfig.model || 'gemini-3.0';
            const visualizerModel = sanitizedConfig.visualizerModel || 'claude-sonnet-4.5';

            // Формируем контекст для Writer
            const writerContext = `
Keywords: ${mainKeywords}
LSI Keywords: ${sanitizedConfig.lsiKeywords || 'N/A'}
Top Keywords: ${topKeywords}
Target Country: ${sanitizedConfig.targetCountry || 'Global'}
Tone: ${sanitizedConfig.tone || 'Professional'}
Style: ${sanitizedConfig.style || 'Informative'}
Min/Max Chars: ${sanitizedConfig.minChars || 2500} - ${sanitizedConfig.maxChars || 5000}
Competitors Context: ${competitors}
${exampleInstruction}
            `.trim();

            try {
                const geoResult = await generateGeoContent({
                    topic: sanitizedConfig.topic,
                    writerModel,
                    visualizerModel,
                    writerContext,
                    language: contentLanguage,
                    apiKey,
                    siteName: sanitizedConfig.websiteName
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
                    model: sanitizedConfig.model,
                    systemMessage,
                    userMessageContent,
                    temperature,
                    websiteName: sanitizedConfig.websiteName,
                    topic: sanitizedConfig.topic,
                    isGeoMode
                });
                // Конвертируем legacy в новый structured формат
                result = convertLegacyToNewStructure(legacyResult, sanitizedConfig.topic);
            }

        } else {
            // ==================== STANDARD SINGLE-MODEL GENERATION ====================
            const legacyResult = await fallbackSingleModelGeneration({
                apiKey,
                model: sanitizedConfig.model,
                systemMessage,
                userMessageContent,
                temperature,
                websiteName: sanitizedConfig.websiteName,
                topic: sanitizedConfig.topic,
                isGeoMode
            });

            // Для GEO режима конвертируем в новый формат
            if (isGeoMode) {
                result = convertLegacyToNewStructure(legacyResult, sanitizedConfig.topic);
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

        // Sanitize inputs for this route
        const sanitizedContent = sanitizePromptInput(content, { maxLength: 50000 });
        const sanitizedMissingKeywords = missingKeywords.map(k => sanitizePromptInput(k, { maxLength: 200 }));
        const sanitizedOptConfig = {
            ...config,
            websiteName: config.websiteName ? sanitizePromptInput(config.websiteName, { maxLength: 200 }) : DEFAULT_SITE_NAME,
            targetCountry: config.targetCountry ? sanitizePromptInput(config.targetCountry, { maxLength: 100 }) : 'Global',
            tone: config.tone ? sanitizePromptInput(config.tone, { maxLength: 50 }) : 'Professional',
            style: config.style ? sanitizePromptInput(config.style, { maxLength: 50 }) : 'Informative'
        };

        const apiKey = await getApiKey();
        const missingStr = sanitizedMissingKeywords.join(', ');

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, sanitizedOptConfig.websiteName),
            body: JSON.stringify({
                model: config.model, // Model ID doesn't need sanitization
                messages: [
                    {
                        role: "system",
                        content: `You are an expert SEO Editor for ${sanitizedOptConfig.targetCountry}. Your goal is to increase the relevance of the text by naturally integrating specific keywords. You must prioritize readability and natural flow over keyword density.`
                    },
                    {
                        role: "user",
                        content: `The following article is missing important semantic keywords.
Rewrite the article to naturally include these missing keywords: [${missingStr}].

CRITICAL ANTI-SPAM INSTRUCTIONS:
1. **Natural Integration Only:** Only insert keywords where they fit grammatically and logically. If a keyword cannot be added naturally, SKIP IT.
2. **Avoid Stuffing:** Do not force keywords into every paragraph. The text must remain human-like.
3. **Maintenance:** Strictly maintain the original Markdown structure, headings, and length.
4. **Tone:** Keep the ${sanitizedOptConfig.tone} tone and ${sanitizedOptConfig.style} style.
5. **Constraint:** Do not increase the overall word count significantly.

Original Text:
"""
${sanitizedContent}
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


/**
 * POST /api/generate/seo-audit
 * Analyze a URL for SEO issues and provide recommendations
 */
router.post('/seo-audit', validate(seoAuditSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;
        const { url, model } = req.body;

        // Check user limits
        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        // Check canAudit permission
        if (!limitCheck.plan?.canAudit && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'SEO Аудит недоступен для вашего тарифа' });
        }

        // Fetch the page HTML
        let pageHtml = '';
        let fetchError = null;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const pageResponse = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'ru,en;q=0.9'
                }
            });

            clearTimeout(timeout);

            if (!pageResponse.ok) {
                fetchError = `HTTP ${pageResponse.status}`;
            } else {
                pageHtml = await pageResponse.text();
            }
        } catch (e) {
            fetchError = e.message || 'Failed to fetch page';
        }

        if (fetchError) {
            return res.status(400).json({ error: `Не удалось загрузить страницу: ${fetchError}` });
        }

        // Extract key SEO elements from HTML
        const extractedData = extractSeoData(pageHtml, url);

        // Get API key
        const apiKey = await getApiKey();
        const settings = await prisma.systemSetting.findUnique({
            where: { id: 'global' }
        });

        // Prepare AI analysis prompt
        const analysisPrompt = buildSeoAuditPrompt(extractedData, url);

        // Call OpenRouter for analysis
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, 'SEO Audit'),
            body: JSON.stringify({
                model: model || 'google/gemini-3-flash-preview',
                messages: [
                    {
                        role: "system",
                        content: `Ты опытный SEO-специалист и технический аудитор. Анализируй страницы на соответствие лучшим практикам SEO.
Отвечай ТОЛЬКО на русском языке. Давай конкретные, практичные рекомендации.
Используй следующий JSON формат для ответа:
{
  "score": число от 0 до 100,
  "summary": "краткое резюме аудита",
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "meta" | "content" | "technical" | "schema" | "mobile" | "performance",
      "title": "название проблемы",
      "description": "описание проблемы",
      "recommendation": "как исправить"
    }
  ],
  "positives": ["список положительных моментов"]
}`
                    },
                    {
                        role: "user",
                        content: analysisPrompt
                    }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'AI analysis failed');
        }

        const aiData = await response.json();
        const analysisText = aiData.choices?.[0]?.message?.content || '{}';

        let analysis;
        try {
            analysis = JSON.parse(analysisText);
        } catch (e) {
            analysis = {
                score: 50,
                summary: 'Не удалось распарсить анализ',
                issues: [],
                positives: []
            };
        }

        // Increment usage
        const updatedUser = await incrementUsage(limitCheck.user);

        res.json({
            url,
            extracted: extractedData,
            analysis,
            user: updatedUser
        });

    } catch (error) {
        console.error('SEO Audit error:', error);
        res.status(500).json({ error: error.message || 'Audit failed' });
    }
});

/**
 * Extract SEO data from HTML
 */
function extractSeoData(html, url) {
    const data = {
        title: '',
        titleLength: 0,
        metaDescription: '',
        metaDescriptionLength: 0,
        h1: [],
        h2: [],
        h3: [],
        images: { total: 0, withoutAlt: 0 },
        links: { internal: 0, external: 0, nofollow: 0 },
        canonical: '',
        robots: '',
        ogTags: {},
        schemaOrg: false,
        viewport: false,
        contentLength: 0
    };

    try {
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch) {
            data.title = titleMatch[1].trim();
            data.titleLength = data.title.length;
        }

        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        if (descMatch) {
            data.metaDescription = descMatch[1].trim();
            data.metaDescriptionLength = data.metaDescription.length;
        }

        // Extract headings
        const h1Matches = html.matchAll(/<h1[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/h1>/gi);
        for (const match of h1Matches) {
            data.h1.push(match[1].replace(/<[^>]+>/g, '').trim());
        }

        const h2Matches = html.matchAll(/<h2[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/h2>/gi);
        for (const match of h2Matches) {
            data.h2.push(match[1].replace(/<[^>]+>/g, '').trim());
        }

        const h3Matches = html.matchAll(/<h3[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/h3>/gi);
        for (const match of h3Matches) {
            data.h3.push(match[1].replace(/<[^>]+>/g, '').trim());
        }

        // Extract images
        const imgMatches = html.matchAll(/<img[^>]*>/gi);
        for (const match of imgMatches) {
            data.images.total++;
            if (!match[0].includes('alt=') || /alt=["']\s*["']/i.test(match[0])) {
                data.images.withoutAlt++;
            }
        }

        // Extract links
        const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi);
        const urlObj = new URL(url);
        for (const match of linkMatches) {
            const href = match[1];
            if (href.startsWith('#') || href.startsWith('javascript:')) continue;

            try {
                const linkUrl = new URL(href, url);
                if (linkUrl.hostname === urlObj.hostname) {
                    data.links.internal++;
                } else {
                    data.links.external++;
                }
            } catch {
                data.links.internal++;
            }

            if (match[0].includes('rel=') && match[0].includes('nofollow')) {
                data.links.nofollow++;
            }
        }

        // Extract canonical
        const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
        if (canonicalMatch) {
            data.canonical = canonicalMatch[1];
        }

        // Extract robots
        const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
        if (robotsMatch) {
            data.robots = robotsMatch[1];
        }

        // Check for Open Graph tags
        const ogMatches = html.matchAll(/<meta[^>]*property=["'](og:[^"']*)["'][^>]*content=["']([^"']*)["']/gi);
        for (const match of ogMatches) {
            data.ogTags[match[1]] = match[2];
        }

        // Check for Schema.org
        data.schemaOrg = html.includes('application/ld+json') || html.includes('itemtype="http://schema.org');

        // Check for viewport
        data.viewport = html.includes('name="viewport"') || html.includes("name='viewport'");

        // Estimate content length (text only)
        const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                               .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                               .replace(/<[^>]+>/g, ' ')
                               .replace(/\s+/g, ' ')
                               .trim();
        data.contentLength = textContent.length;

    } catch (e) {
        console.error('HTML parsing error:', e);
    }

    return data;
}

/**
 * Build SEO audit prompt for AI
 */
function buildSeoAuditPrompt(data, url) {
    return `Проанализируй SEO-оптимизацию страницы: ${url}

## Извлеченные данные:

### Meta-теги:
- Title: "${data.title}" (${data.titleLength} символов)
- Meta Description: "${data.metaDescription}" (${data.metaDescriptionLength} символов)
- Canonical: ${data.canonical || 'не указан'}
- Robots: ${data.robots || 'не указан'}

### Заголовки:
- H1 (${data.h1.length}): ${data.h1.slice(0, 3).join(', ') || 'не найден'}
- H2 (${data.h2.length}): ${data.h2.slice(0, 5).join(', ') || 'не найдены'}
- H3 (${data.h3.length}): ${data.h3.slice(0, 5).join(', ') || 'не найдены'}

### Изображения:
- Всего: ${data.images.total}
- Без alt-атрибута: ${data.images.withoutAlt}

### Ссылки:
- Внутренние: ${data.links.internal}
- Внешние: ${data.links.external}
- С nofollow: ${data.links.nofollow}

### Технические аспекты:
- Schema.org разметка: ${data.schemaOrg ? 'присутствует' : 'отсутствует'}
- Viewport meta: ${data.viewport ? 'есть' : 'нет'}
- Open Graph теги: ${Object.keys(data.ogTags).length > 0 ? Object.keys(data.ogTags).join(', ') : 'не найдены'}
- Примерная длина контента: ${data.contentLength} символов

## Задача:
Проведи полный SEO-аудит этой страницы. Оцени по шкале 0-100.
Выяви все проблемы (critical, warning, info) по категориям:
- meta: мета-теги, заголовки
- content: качество и структура контента
- technical: технические аспекты
- schema: структурированные данные
- mobile: мобильная оптимизация
- performance: производительность

Дай конкретные рекомендации по исправлению каждой проблемы.`;
}

// ==================== FAQ GENERATION ENDPOINT ====================

/**
 * POST /api/generate/faq
 * Генерация FAQ на основе темы или существующего контента
 */
router.post('/faq', async (req, res) => {
    try {
        const user = req.telegramUser;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user's plan
        const dbUser = await prisma.user.findUnique({
            where: { telegramId: BigInt(user.id) }
        });

        if (!dbUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const plan = await prisma.plan.findUnique({
            where: { slug: dbUser.planId }
        });

        // Check if user can generate FAQ
        if (!plan?.canGenerateFaq && dbUser.role !== 'admin') {
            return res.status(403).json({ error: 'Генерация FAQ недоступна для вашего тарифа' });
        }

        const { topic, content, language = 'Russian', count = 5 } = req.body;

        if (!topic && !content) {
            return res.status(400).json({ error: 'Укажите тему (topic) или контент (content)' });
        }

        // Sanitize inputs
        const sanitizedTopic = topic ? sanitizePromptInput(topic) : '';
        const sanitizedContent = content ? sanitizePromptInput(content.substring(0, 5000)) : '';

        // Get API key
        const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
        const apiKey = settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Build FAQ generation prompt
        const systemPrompt = `You are an SEO expert specializing in FAQ schema generation.
Your task is to generate ${count} high-quality FAQ items that:
1. Are relevant to the topic/content
2. Answer real user questions
3. Are optimized for Google's FAQ rich snippets
4. Use natural, conversational language
5. Provide valuable, accurate information

CRITICAL: Write ALL questions and answers in ${language}.

Output ONLY valid JSON array, no markdown:
[
  {"question": "Question text?", "answer": "Detailed answer text."},
  ...
]`;

        const userPrompt = sanitizedContent 
            ? `Generate ${count} FAQ items based on this content:\n\n${sanitizedContent}`
            : `Generate ${count} FAQ items about: "${sanitizedTopic}"`;

        console.log('>>> FAQ Generation:', { topic: sanitizedTopic?.substring(0, 50), hasContent: !!sanitizedContent, count });

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, DEFAULT_SITE_NAME),
            body: JSON.stringify({
                model: getModelId('gemini-3.0'),
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '';

        // Parse FAQ response
        let faqItems = [];
        try {
            // Clean markdown wrappers
            let cleanJson = rawContent.trim()
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/g, '')
                .trim();

            // Try to find JSON array
            if (!cleanJson.startsWith('[')) {
                const match = cleanJson.match(/\[[\s\S]*\]/);
                if (match) cleanJson = match[0];
            }

            const parsed = JSON.parse(cleanJson);
            faqItems = Array.isArray(parsed) ? parsed : (parsed.faq || parsed.items || []);
        } catch (e) {
            console.error('FAQ parse error:', e.message);
            return res.status(500).json({ error: 'Failed to parse FAQ response' });
        }

        // Validate and normalize FAQ items
        faqItems = faqItems
            .filter(item => item.question && item.answer)
            .map(item => ({
                question: String(item.question).trim(),
                answer: String(item.answer).trim()
            }))
            .slice(0, count);

        if (faqItems.length === 0) {
            return res.status(500).json({ error: 'No valid FAQ items generated' });
        }

        // Generate JSON-LD schema
        const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqItems.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.answer
                }
            }))
        };

        res.json({
            faq: faqItems,
            schema: faqSchema,
            schemaHtml: `<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>`
        });

    } catch (error) {
        console.error('FAQ generation error:', error);
        res.status(500).json({ error: error.message || 'FAQ generation failed' });
    }
});


// ==================== REWRITE (PARAPHRASER) ENDPOINT ====================

/**
 * POST /api/generate/rewrite
 * Rewrite/paraphrase content from URL or text while preserving meaning
 */
router.post('/rewrite', validate(rewriteSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;
        const { sourceUrl, sourceText, targetLanguage, tone, style, preserveStructure, model } = req.body;

        // Check user limits
        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        // Check canRewrite permission
        if (!limitCheck.plan?.canRewrite && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'Рерайт недоступен для вашего тарифа' });
        }

        let contentToRewrite = sourceText || '';

        // If URL provided, fetch the content
        if (sourceUrl && !sourceText) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);

                const pageResponse = await fetch(sourceUrl, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; SEORewriteBot/1.0)',
                        'Accept': 'text/html,application/xhtml+xml',
                        'Accept-Language': 'ru,en;q=0.9'
                    }
                });

                clearTimeout(timeout);

                if (!pageResponse.ok) {
                    return res.status(400).json({ error: `Не удалось загрузить страницу: HTTP ${pageResponse.status}` });
                }

                const html = await pageResponse.text();
                contentToRewrite = extractTextFromHtml(html);

                if (!contentToRewrite || contentToRewrite.length < 100) {
                    return res.status(400).json({ error: 'Не удалось извлечь достаточно текста со страницы' });
                }
            } catch (e) {
                return res.status(400).json({ error: `Ошибка загрузки страницы: ${e.message}` });
            }
        }

        if (!contentToRewrite || contentToRewrite.trim().length < 50) {
            return res.status(400).json({ error: 'Текст слишком короткий для рерайта (минимум 50 символов)' });
        }

        // Limit content length
        const maxLength = 50000;
        if (contentToRewrite.length > maxLength) {
            contentToRewrite = contentToRewrite.substring(0, maxLength);
        }

        // Get API key
        const apiKey = await getApiKey();

        // Build rewrite prompt
        const rewritePrompt = buildRewritePrompt(contentToRewrite, {
            targetLanguage,
            tone,
            style,
            preserveStructure
        });

        // Call OpenRouter for rewriting
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, 'SEO Rewriter'),
            body: JSON.stringify({
                model: model || 'google/gemini-3-flash-preview',
                messages: [
                    {
                        role: "system",
                        content: `Ты профессиональный копирайтер и рерайтер. Твоя задача — переписать текст так, чтобы он был полностью уникальным, но сохранял исходный смысл и ключевую информацию.

ПРАВИЛА:
1. Полностью перефразируй каждое предложение
2. Используй синонимы и альтернативные конструкции
3. Меняй порядок аргументов где это уместно
4. Сохраняй все факты и цифры
5. ${preserveStructure ? 'Сохраняй структуру заголовков (H1, H2, H3)' : 'Можешь изменить структуру для лучшей читаемости'}
6. Избегай плагиата — текст должен быть 100% уникальным
7. Используй Markdown для форматирования
8. Тон: ${tone}
9. Стиль: ${style}
10. Язык результата: ${targetLanguage === 'ru' ? 'Русский' : targetLanguage === 'en' ? 'English' : targetLanguage}`
                    },
                    {
                        role: "user",
                        content: rewritePrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 8000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'Rewrite API failed');
        }

        const aiData = await response.json();
        const rewrittenContent = aiData.choices?.[0]?.message?.content || '';

        if (!rewrittenContent || rewrittenContent.length < 50) {
            throw new Error('Не удалось переписать текст');
        }

        // Increment usage
        const updatedUser = await incrementUsage(limitCheck.user);

        // Calculate basic stats
        const originalWords = contentToRewrite.split(/\s+/).length;
        const rewrittenWords = rewrittenContent.split(/\s+/).length;

        res.json({
            original: {
                text: contentToRewrite.substring(0, 500) + (contentToRewrite.length > 500 ? '...' : ''),
                length: contentToRewrite.length,
                words: originalWords
            },
            rewritten: {
                text: rewrittenContent,
                length: rewrittenContent.length,
                words: rewrittenWords
            },
            sourceUrl: sourceUrl || null,
            user: updatedUser
        });

    } catch (error) {
        console.error('Rewrite error:', error);
        res.status(500).json({ error: error.message || 'Rewrite failed' });
    }
});

/**
 * Extract main text content from HTML
 */
function extractTextFromHtml(html) {
    // Remove scripts, styles, and other non-content elements
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

    // Try to find main content area
    const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                      text.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                      text.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    if (mainMatch) {
        text = mainMatch[1];
    }

    // Convert headings to markdown
    text = text
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
        .replace(/<br\s*\/?>/gi, '\n');

    // Remove remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Clean up whitespace
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

    return text;
}

/**
 * Build rewrite prompt
 */
function buildRewritePrompt(content, options) {
    const { targetLanguage, tone, style, preserveStructure } = options;

    return `Перепиши следующий текст, сделав его полностью уникальным:

## Исходный текст:
${content}

## Требования:
- Язык результата: ${targetLanguage === 'ru' ? 'Русский' : targetLanguage === 'en' ? 'English' : targetLanguage}
- Тон: ${tone}
- Стиль: ${style}
- Структура: ${preserveStructure ? 'Сохранить заголовки и разделы' : 'Можно изменить'}

## Важно:
1. Каждое предложение должно быть переформулировано
2. Сохрани все ключевые факты и данные
3. Используй Markdown форматирование
4. Результат должен быть готов к публикации

Перепиши текст:`;
}


// ==================== SOCIAL MEDIA PACK ENDPOINT ====================

/**
 * POST /api/generate/social-pack
 * Репакинг контента для соцсетей
 */
router.post('/social-pack', async (req, res) => {
    try {
        const user = req.telegramUser;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { content, topic } = req.body;

        if (!content || content.length < 100) {
            return res.status(400).json({ error: 'Контент слишком короткий (минимум 100 символов)' });
        }

        // Get API key
        const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
        const apiKey = settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Truncate content if too long
        const truncatedContent = content.substring(0, 10000);

        console.log('>>> Social Pack Generation:', { topic: topic?.substring(0, 50), contentLength: truncatedContent.length });

        const systemPrompt = `Ты эксперт по SMM и контент-маркетингу. Твоя задача — превратить статью в готовые посты для разных соцсетей.

ВАЖНО: Пиши на том же языке, что и исходный контент.

Верни ТОЛЬКО валидный JSON объект (без markdown блоков):
{
  "twitter": ["твит 1 (до 280 символов)", "твит 2", "твит 3", "твит 4", "твит 5"],
  "telegram": "Пост для Telegram канала с эмодзи, форматированием и призывом к действию (500-800 символов)",
  "linkedin": "Профессиональный пост для LinkedIn с деловым тоном (600-1000 символов)",
  "videoScript": "Сценарий для YouTube Shorts / TikTok на 60 секунд с таймкодами"
}

ПРАВИЛА:
1. Twitter: 5 связанных твитов для треда, каждый до 280 символов, с хештегами в последнем
2. Telegram: Используй эмодзи, жирный текст (**текст**), призыв подписаться/поставить реакцию
3. LinkedIn: Деловой тон, начни с хука, добавь личный опыт/мнение, призыв к дискуссии
4. Video Script: Формат "[0:00-0:05] Хук\\n[0:05-0:15] Проблема\\n..." с конкретным текстом для озвучки`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, 'Social Media Pack'),
            body: JSON.stringify({
                model: 'google/gemini-3-flash-preview',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Тема: ${topic || 'Не указана'}\n\nСтатья:\n${truncatedContent}` }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '';

        // Parse JSON response
        let pack;
        try {
            let cleanJson = rawContent.trim()
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/g, '')
                .trim();

            if (!cleanJson.startsWith('{')) {
                const match = cleanJson.match(/\{[\s\S]*\}/);
                if (match) cleanJson = match[0];
            }

            pack = JSON.parse(cleanJson);
        } catch (e) {
            console.error('Social pack parse error:', e.message);
            return res.status(500).json({ error: 'Failed to parse social pack response' });
        }

        // Validate and normalize
        const normalizedPack = {
            twitter: Array.isArray(pack.twitter) ? pack.twitter.slice(0, 5) : [],
            telegram: pack.telegram || '',
            linkedin: pack.linkedin || '',
            videoScript: pack.videoScript || pack.video_script || pack.tiktok || ''
        };

        if (normalizedPack.twitter.length === 0 && !normalizedPack.telegram) {
            return res.status(500).json({ error: 'Failed to generate social pack content' });
        }

        // Get updated user
        const dbUser = await prisma.user.findUnique({
            where: { telegramId: BigInt(user.id) }
        });

        res.json({
            pack: normalizedPack,
            user: dbUser ? {
                ...dbUser,
                telegramId: dbUser.telegramId.toString()
            } : null
        });

    } catch (error) {
        console.error('Social pack error:', error);
        res.status(500).json({ error: error.message || 'Social pack generation failed' });
    }
});

// ==================== HUMANIZER PROMPTS ====================

/**
 * Промпт для "очеловечивания" AI-текста
 * Цель: обход детекторов AI (ZeroGPT, Originality.ai и т.д.)
 */
function getHumanizerPrompt(intensity, language) {
    const intensityRules = {
        light: `
- Make subtle adjustments only
- Keep 90% of original structure
- Add minor sentence length variation
- Insert 1-2 conversational phrases`,
        medium: `
- Vary sentence length significantly (mix 5-word and 25-word sentences)
- Add 3-5 idiomatic expressions or colloquialisms
- Include 1-2 rhetorical questions
- Add occasional parenthetical asides (like this one)
- Use contractions where natural`,
        strong: `
- Completely restructure paragraphs
- Heavy sentence length variation (some very short. Others much, much longer with multiple clauses)
- Add 5-7 idioms, slang, or regional expressions
- Include personal anecdotes or hypotheticals ("Imagine you're...")
- Add em-dashes—like this—for emphasis
- Use fragmented sentences occasionally. For effect.
- Include filler words sparingly (well, actually, honestly)
- Add rhetorical questions throughout`
    };

    return `You are a HUMANIZER - your job is to make AI-generated text undetectable by AI detection tools (ZeroGPT, Originality.ai, GPTZero, etc.).

LANGUAGE: Write in ${language}. All output must be in ${language}.

YOUR MISSION:
Transform the text to pass as 100% human-written while preserving the original meaning and SEO value.

HUMANIZATION TECHNIQUES (${intensity.toUpperCase()} intensity):
${intensityRules[intensity] || intensityRules.medium}

CRITICAL "BURSTINESS" RULES:
AI text has uniform sentence length. Human text is "bursty" - highly variable.
- Mix very short sentences (3-7 words) with long complex ones (20-35 words)
- Never have 3+ sentences of similar length in a row
- Start some sentences with "And" or "But" (human writers do this)
- Use occasional one-word sentences. Seriously.

NATURALNESS RULES:
1. Add subtle imperfections humans make:
   - Occasional informal transitions ("Now, here's the thing...")
   - Minor redundancies humans use ("completely eliminate" vs just "eliminate")
   - Emphatic expressions ("This is huge", "Here's the kicker")

2. Vary paragraph lengths dramatically:
   - Some very short (1-2 sentences)
   - Some medium (3-4 sentences)
   - Some longer (5-6 sentences)

3. Add human "fingerprints":
   - Personal opinions or slight bias
   - Hedging language ("It seems like...", "Arguably...")
   - Occasional tangents that circle back

PRESERVE:
- All factual information
- SEO keywords (but vary their forms)
- Markdown formatting (headers, lists, bold, links)
- Overall structure and flow

DO NOT:
- Add false information
- Remove important content
- Make grammatical errors
- Change the core message

OUTPUT:
Return ONLY the humanized text. No explanations, no "Here's the humanized version:", just the pure humanized content.`;
}

/**
 * POST /api/generate/humanize
 * Humanize AI-generated content to bypass detection
 */
router.post('/humanize', validate(humanizeSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;

        // Check user limits
        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        // Check canHumanize permission
        if (!limitCheck.plan?.canHumanize && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'Humanizer недоступен для вашего тарифа' });
        }

        const { content, language, intensity, model } = req.body;

        // Sanitize content
        const sanitizedContent = sanitizePromptInput(content, { maxLength: 100000 });

        // Get API key
        const apiKey = await getApiKey();

        // Map language codes to full names
        const languageMap = {
            'ru': 'Russian (Русский)',
            'en': 'English',
            'kk': 'Kazakh (Қазақша)',
            'uk': 'Ukrainian (Українська)',
            'de': 'German (Deutsch)',
            'fr': 'French (Français)',
            'es': 'Spanish (Español)',
            'pt': 'Portuguese (Português)',
            'it': 'Italian (Italiano)',
            'pl': 'Polish (Polski)',
            'tr': 'Turkish (Türkçe)',
            'zh': 'Chinese (中文)',
            'ja': 'Japanese (日本語)',
            'ko': 'Korean (한국어)',
            'ar': 'Arabic (العربية)'
        };

        const fullLanguage = languageMap[language] || language || 'Russian (Русский)';
        const systemPrompt = getHumanizerPrompt(intensity || 'medium', fullLanguage);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, DEFAULT_SITE_NAME),
            body: JSON.stringify({
                model: model || 'google/gemini-3-flash-preview',
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `Humanize this text (${intensity || 'medium'} intensity):\n\n${sanitizedContent}`
                    }
                ],
                temperature: intensity === 'strong' ? 0.9 : intensity === 'light' ? 0.5 : 0.7
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Humanization failed: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const humanizedContent = data.choices?.[0]?.message?.content;

        if (!humanizedContent) {
            throw new Error('No content received from AI');
        }

        // Increment usage
        const updatedUser = await incrementUsage(limitCheck.user);

        res.json({
            content: humanizedContent,
            intensity,
            user: updatedUser
        });

    } catch (error) {
        console.error('Humanize error:', error);
        res.status(500).json({ error: error.message || 'Humanization failed' });
    }
});


// ==================== SERP ANALYZER ====================
/**
 * POST /api/generate/serp-analyze
 * Анализ топ-10 выдачи Google/Yandex для заданного запроса
 * Возвращает рекомендации по длине, структуре и ключевым словам
 */
router.post('/serp-analyze', validate(serpAnalyzerSchema), async (req, res) => {
    try {
        const { query, searchEngine, region, count } = req.body;

        // Get API key from settings
        const settings = await prisma.systemSetting.findUnique({
            where: { id: 'global' }
        });

        const apiKey = settings?.openRouterApiKey;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`>>> SERP ANALYZE: "${query}" via ${searchEngine}, region: ${region}, count: ${count}`);

        // Создаем промпт для AI анализа SERP
        const serpAnalysisPrompt = `Ты — эксперт по SEO-анализу конкурентов уровня SurferSEO и Ahrefs.

### ЗАДАЧА
Проанализируй топ-${count} результатов поисковой выдачи ${searchEngine === 'google' ? 'Google' : 'Яндекс'} по запросу: "${query}"
Регион: ${region === 'ru' ? 'Россия' : region === 'kz' ? 'Казахстан' : region}

### ЧТО НУЖНО СДЕЛАТЬ
1. Представь, что ты видишь реальную выдачу по этому запросу
2. На основе своих знаний о типичных сайтах в топе по подобным запросам, смоделируй анализ
3. Дай конкретные рекомендации для создания контента, который обойдет конкурентов

### ФОРМАТ ОТВЕТА (строго JSON)
{
  "query": "${query}",
  "searchEngine": "${searchEngine}",
  "analysis": {
    "avgWordCount": <среднее количество слов в статьях топ-10>,
    "avgCharCount": <среднее количество символов>,
    "avgH2Count": <среднее количество заголовков H2>,
    "avgH3Count": <среднее количество заголовков H3>,
    "avgImagesCount": <среднее количество изображений>,
    "avgTablesCount": <среднее количество таблиц>,
    "avgListsCount": <среднее количество списков>,
    "avgFaqCount": <среднее количество FAQ блоков>,
    "keywordDensity": <средняя плотность ключевых слов в %>,
    "topDomains": ["домен1.ru", "домен2.ru", "домен3.ru"]
  },
  "competitors": [
    {
      "position": 1,
      "domain": "example.ru",
      "title": "Заголовок страницы",
      "wordCount": 5000,
      "h2Count": 8,
      "hasTable": true,
      "hasFaq": true,
      "strengths": ["Подробный контент", "Хорошая структура"],
      "weaknesses": ["Устаревшая информация"]
    }
  ],
  "recommendations": {
    "targetWordCount": <рекомендуемое количество слов (на 20-30% больше среднего)>,
    "targetCharCount": <рекомендуемое количество символов>,
    "targetH2Count": <рекомендуемое количество H2>,
    "targetH3Count": <рекомендуемое количество H3>,
    "mustHaveElements": ["таблица сравнения", "FAQ блок", "инфографика"],
    "suggestedH2Titles": [
      "Предлагаемый заголовок H2 #1",
      "Предлагаемый заголовок H2 #2",
      "Предлагаемый заголовок H2 #3"
    ],
    "keyTopics": ["тема 1", "тема 2", "тема 3"],
    "lsiKeywords": ["LSI ключ 1", "LSI ключ 2", "LSI ключ 3"],
    "contentGaps": ["Что упускают конкуренты #1", "Что упускают конкуренты #2"],
    "uniqueAngle": "Уникальный угол подачи материала для выделения среди конкурентов"
  },
  "summary": "Краткое резюме: чтобы обойти конкурентов по запросу '${query}', нужно написать статью на X слов с Y заголовками H2, добавить таблицу сравнения и FAQ блок. Ключевой фокус на..."
}

ВАЖНО:
- Верни ТОЛЬКО валидный JSON без markdown-обертки
- Все числа должны быть реалистичными для данной ниши
- Рекомендации должны быть конкретными и actionable
- Учитывай специфику региона и языка`;

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://seo-generator.app',
            'X-Title': 'SEO Generator - SERP Analyzer'
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: 'google/gemini-3-flash-preview',
                messages: [
                    {
                        role: 'user',
                        content: serpAnalysisPrompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SERP Analysis API error:', errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        let analysisText = data.choices?.[0]?.message?.content || '';

        // Clean up response
        analysisText = analysisText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .trim();

        // Parse JSON
        let analysis;
        try {
            analysis = JSON.parse(analysisText);
        } catch (parseError) {
            console.error('Failed to parse SERP analysis:', parseError);
            // Try to extract JSON from response
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Invalid response format from AI');
            }
        }

        console.log(`>>> SERP ANALYZE complete for "${query}"`);

        res.json({
            success: true,
            ...analysis
        });

    } catch (error) {
        console.error('SERP Analyze error:', error);
        res.status(500).json({ error: error.message || 'SERP analysis failed' });
    }
});


export default router;
