import express from 'express';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Settings from '../models/Settings.js';
import { validate } from '../middleware/validate.js';
import { generateSchema, spamCheckSchema, fixSpamSchema, optimizeRelevanceSchema, generateCoverSchema, generateInfographicSchema } from '../schemas/index.js';

const router = express.Router();

const DEFAULT_SITE_URL = 'https://example.com';
const DEFAULT_SITE_NAME = 'SeoGenerator';

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

/**
 * Sanitize Mermaid code to fix common LLM issues
 * - Replaces non-Latin node IDs with Latin equivalents
 * - Preserves text labels inside brackets
 */
function sanitizeMermaidCode(code) {
    if (!code || typeof code !== 'string') return code;

    // Split into lines for processing
    const lines = code.split('\n');
    const nodeIdMap = new Map();
    let nodeCounter = 1;

    // Function to get or create a Latin ID for a non-Latin node name
    const getLatinId = (nonLatinId) => {
        if (!nodeIdMap.has(nonLatinId)) {
            nodeIdMap.set(nonLatinId, `N${nodeCounter++}`);
        }
        return nodeIdMap.get(nonLatinId);
    };

    // Check if string contains non-Latin characters (excluding common symbols)
    const hasNonLatin = (str) => /[^\x00-\x7F]/.test(str);

    const sanitizedLines = lines.map(line => {
        // Skip diagram type declarations and empty lines
        if (/^\s*(flowchart|sequenceDiagram|mindmap|timeline|pie|graph|subgraph|end)/.test(line) || !line.trim()) {
            return line;
        }

        // Pattern to match node definitions and connections
        // Matches: NodeID, NodeID[Label], NodeID{Label}, NodeID(Label), etc.
        // Also matches arrows: -->, --->, -.->, ==>, etc.

        // Replace standalone non-Latin node IDs (not inside brackets)
        // This regex finds potential node IDs that are not inside [] {} () 
        let result = line;

        // Find all potential node IDs (words before arrows or brackets)
        const nodePattern = /(?:^|\s|-->|--\>|==>|-.->|---|\|[^|]*\|)\s*([^\s\[\]\{\}\(\)\-\=\>\<\|]+)(?=\s*(?:\[|\{|\(|-->|--\>|==>|-.->|---|$|\s))/g;
        
        let match;
        const replacements = [];
        
        while ((match = nodePattern.exec(line)) !== null) {
            const potentialId = match[1];
            if (potentialId && hasNonLatin(potentialId) && potentialId.length > 0) {
                replacements.push({
                    original: potentialId,
                    replacement: getLatinId(potentialId)
                });
            }
        }

        // Apply replacements (from longest to shortest to avoid partial replacements)
        replacements.sort((a, b) => b.original.length - a.original.length);
        for (const { original, replacement } of replacements) {
            // Only replace when it's a standalone ID, not inside brackets
            const safePattern = new RegExp(`(?<![\\[\\{\\(])${escapeRegex(original)}(?![\\]\\}\\)])`, 'g');
            result = result.replace(safePattern, replacement);
        }

        return result;
    });

    return sanitizedLines.join('\n');
}

// Helper to escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
5. **JSON-LD SCHEMA:** End with a valid JSON-LD script block for "${topic}".

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

        // Call OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, config.websiteName),
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: userMessageContent
                    }
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
            // Log full response for debugging
            console.error('>>> GENERATION ERROR: No content in response', JSON.stringify({
                model: config.model,
                hasChoices: !!data.choices,
                choicesLength: data.choices?.length,
                finishReason: data.choices?.[0]?.finish_reason,
                error: data.error,
                usage: data.usage
            }, null, 2));
            throw new Error(`No content received from AI. Model: ${config.model}, Finish reason: ${data.choices?.[0]?.finish_reason || 'unknown'}`);
        }

        // Используем надёжный парсер с очисткой и fallback
        const parsedResult = safeParseAIResponse(rawContent, {
            topic: config.topic,
            isGeoMode: isGeoMode
        });

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

/**
 * Helper: Call Gemini API with retry logic for rate limits
 * @param {string} googleApiKey - Google AI API key
 * @param {string} imagePrompt - Prompt for image generation
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<{imageBase64: string|null, error: string|null}>}
 */
async function callGeminiWithRetry(googleApiKey, imagePrompt, maxRetries = 3) {
    let lastError = null;
    let imageBase64 = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`>>> Gemini attempt ${attempt}/${maxRetries}...`);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: imagePrompt }]
                        }],
                        generationConfig: {
                            responseModalities: ["TEXT", "IMAGE"]
                        }
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('>>> Google AI response received');

                // Extract image from response
                const candidates = data.candidates || [];
                for (const candidate of candidates) {
                    const parts = candidate.content?.parts || [];
                    for (const part of parts) {
                        if (part.inlineData?.mimeType?.startsWith('image/')) {
                            imageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            console.log('>>> Image generated successfully with Gemini');
                            return { imageBase64, error: null };
                        }
                    }
                }

                // No image in response
                lastError = 'Gemini не вернул изображение. Попробуйте ещё раз.';
                console.warn('>>> Gemini response did not contain image:', JSON.stringify(data).substring(0, 500));
                // Don't retry for this case - it's not a rate limit
                break;
            } else {
                const errData = await response.json().catch(() => ({}));
                const errorMessage = errData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                console.warn(`>>> Google AI error (attempt ${attempt}):`, errorMessage);

                // Check if it's a rate limit error (429 or quota exceeded)
                const isRateLimit = response.status === 429 || 
                    errorMessage.toLowerCase().includes('quota') ||
                    errorMessage.toLowerCase().includes('rate') ||
                    errorMessage.toLowerCase().includes('resource_exhausted');

                if (isRateLimit && attempt < maxRetries) {
                    // Try to extract retry delay from error message
                    // Example: "Please retry in 12.562397264s"
                    const retryMatch = errorMessage.match(/retry\s+in\s+([\d.]+)s/i);
                    let waitTime = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : (attempt * 5000);
                    
                    // Cap wait time at 30 seconds
                    waitTime = Math.min(waitTime, 30000);
                    
                    console.log(`>>> Rate limited. Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }

                // Format user-friendly error message
                if (isRateLimit) {
                    const retryMatch = errorMessage.match(/retry\s+in\s+([\d.]+)s/i);
                    if (retryMatch) {
                        const seconds = Math.ceil(parseFloat(retryMatch[1]));
                        lastError = `Превышен лимит запросов. Попробуйте через ${seconds} сек.`;
                    } else {
                        lastError = 'Превышен лимит запросов Google AI. Попробуйте позже.';
                    }
                } else {
                    lastError = errorMessage;
                }
                break;
            }
        } catch (googleError) {
            lastError = googleError.message;
            console.warn(`>>> Google AI exception (attempt ${attempt}):`, googleError.message);
            
            // Retry on network errors
            if (attempt < maxRetries) {
                const waitTime = attempt * 2000;
                console.log(`>>> Network error. Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
        }
    }

    return { imageBase64: null, error: lastError };
}

/**
 * POST /api/generate/cover
 * Generate cover image using Google AI Studio (Gemini 2.0 Flash with image generation)
 * Requires Google AI API key to be configured in admin settings
 */
router.post('/cover', validate(generateCoverSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;

        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        if (!limitCheck.plan?.canGenerateCover && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'Cover generation not available for your plan' });
        }

        const { title, topic, keywords, style } = req.body;

        const settings = await Settings.findOne();
        const openRouterKey = await getApiKey();

        // Check if Google AI API key is configured
        const googleApiKey = settings?.googleAiApiKey;
        if (!googleApiKey) {
            // Generate SEO alt text anyway
            const altText = await generateAltText(openRouterKey, title, keywords || []);
            
            const styleDescriptions = {
                modern: 'modern clean design with gradient backgrounds, bold geometric shapes',
                minimalist: 'minimalist design with white space, simple geometric shapes',
                corporate: 'professional corporate style with blue and gray tones',
                creative: 'creative artistic style with vibrant colors',
                tech: 'futuristic tech style with dark background, neon accents'
            };
            const styleDesc = styleDescriptions[style] || styleDescriptions.modern;

            return res.json({
                cover: {
                    imageUrl: null,
                    model: null,
                    alt: altText,
                    style,
                    prompt: `Professional blog cover image about "${title}". ${styleDesc}. High quality, 16:9 aspect ratio, no text on image.`,
                    prompts: {
                        dallePrompt: `Professional blog cover image about "${title}". ${styleDesc}. High quality, 16:9 aspect ratio, no text on image.`,
                        midjourneyPrompt: `Professional blog cover, ${title}, ${styleDesc}, high quality, photorealistic --ar 16:9 --v 6 --style raw`,
                    },
                    error: 'Google AI API ключ не настроен. Настройте его в админ-панели для генерации изображений.'
                }
            });
        }

        // Style descriptions for image generation
        const styleDescriptions = {
            modern: 'modern clean design with gradient backgrounds, bold geometric shapes, professional photography aesthetic, vibrant colors',
            minimalist: 'minimalist design with lots of white space, simple geometric shapes, elegant composition, subtle pastel colors, clean lines',
            corporate: 'professional corporate style with blue and gray tones, business-oriented imagery, trustworthy and clean aesthetic',
            creative: 'creative artistic style with vibrant saturated colors, unique abstract composition, dynamic lighting effects',
            tech: 'futuristic tech style with dark background, neon cyan and purple accents, digital elements, cyber aesthetic, glowing effects'
        };

        const styleDesc = styleDescriptions[style] || styleDescriptions.modern;
        const keywordList = keywords && keywords.length > 0 ? keywords.slice(0, 3).join(', ') : '';

        // Build optimized prompt for Gemini image generation
        const imagePrompt = `Create a professional blog article cover image about "${title}". ${keywordList ? `Related to: ${keywordList}.` : ''} Style: ${styleDesc}. Requirements: high quality, 16:9 aspect ratio, NO TEXT or words on the image, suitable for web article header, visually appealing.`;

        console.log('>>> COVER GENERATION (Gemini):', { title, style });

        // Call Gemini with retry logic
        const { imageBase64, error: geminiError } = await callGeminiWithRetry(googleApiKey, imagePrompt, 3);

        // Generate SEO alt text
        const altText = await generateAltText(openRouterKey, title, keywords || []);

        // Prepare fallback prompts for manual use
        const prompts = {
            dallePrompt: `Professional blog cover image about "${title}". ${styleDesc}. High quality, 16:9 aspect ratio, no text on image.`,
            midjourneyPrompt: `Professional blog cover, ${title}, ${styleDesc}, high quality, photorealistic --ar 16:9 --v 6 --style raw`,
        };

        return res.json({
            cover: {
                imageUrl: imageBase64,
                model: imageBase64 ? 'gemini-2.0-flash-exp' : null,
                alt: altText,
                style,
                prompt: imagePrompt,
                prompts,
                error: imageBase64 ? null : geminiError
            }
        });
    } catch (error) {
        console.error('Cover generation error:', error);
        res.status(500).json({ error: error.message || 'Cover generation failed' });
    }
});

/**
 * Generate SEO-optimized alt text for an image
 */
async function generateAltText(apiKey, title, keywords) {
    try {
        const keywordStr = keywords.slice(0, 5).join(', ');

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, DEFAULT_SITE_NAME),
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    {
                        role: "system",
                        content: "You are an SEO specialist. Generate alt text for images that is descriptive, keyword-rich, and accessible."
                    },
                    {
                        role: "user",
                        content: `Generate a concise, SEO-optimized alt text (max 125 characters) for a cover image of an article titled: "${title}".
Include these keywords naturally if possible: ${keywordStr}.
The alt text should describe what might be visualized in a professional article cover image about this topic.
Return ONLY the alt text, no quotes or explanation.`
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            return `${title} - обложка статьи`;
        }

        const data = await response.json();
        const altText = data.choices?.[0]?.message?.content?.trim() || `${title} - обложка статьи`;

        // Ensure alt text is not too long
        return altText.substring(0, 125);
    } catch (e) {
        console.error('Alt text generation failed:', e);
        return `${title} - обложка статьи`;
    }
}

/**
 * POST /api/generate/infographic
 * Generate Mermaid diagram code for infographics
 */
router.post('/infographic', validate(generateInfographicSchema), async (req, res) => {
    try {
        const telegramId = req.telegramUser.id;

        const limitCheck = await checkUserLimits(telegramId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: `Limit exceeded: ${limitCheck.reason}` });
        }

        if (!limitCheck.plan?.canGenerateInfographic && limitCheck.user.role !== 'admin') {
            return res.status(403).json({ error: 'Infographic generation not available for your plan' });
        }

        const { topic, content, diagramType } = req.body;

        const apiKey = await getApiKey();

        // Diagram type instructions
        const diagramInstructions = {
            flowchart: `Create a flowchart diagram using Mermaid syntax.
Example format:
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
            sequence: `Create a sequence diagram using Mermaid syntax.
Example format:
sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request
    B-->>A: Response`,
            mindmap: `Create a mindmap diagram using Mermaid syntax.
Example format:
mindmap
    root((Main Topic))
        Branch 1
            Sub-topic 1.1
            Sub-topic 1.2
        Branch 2
            Sub-topic 2.1`,
            timeline: `Create a timeline diagram using Mermaid syntax.
Example format:
timeline
    title Timeline Title
    2020 : Event 1
    2021 : Event 2
    2022 : Event 3`,
            pie: `Create a pie chart using Mermaid syntax.
Example format:
pie showData
    title Distribution
    "Category A" : 40
    "Category B" : 30
    "Category C" : 30`,
            comparison: `Create a comparison flowchart using Mermaid syntax.
Example format:
flowchart LR
    subgraph Option_A[Option A]
        A1[Feature 1]
        A2[Feature 2]
    end
    subgraph Option_B[Option B]
        B1[Feature 1]
        B2[Feature 2]
    end`
        };

        const diagramInstruction = diagramInstructions[diagramType] || diagramInstructions.flowchart;

        const prompt = `You are an expert at creating clear, informative diagrams using Mermaid.js syntax.

Topic: "${topic}"

${content ? `Context/Content to visualize:\n${content.substring(0, 5000)}\n` : ''}

${diagramInstruction}

Create a Mermaid diagram that clearly visualizes the key concepts, process, or structure related to the topic.

CRITICAL SYNTAX RULES:
1. Node IDs MUST be simple Latin letters/numbers only (A, B, C, node1, step2, etc.)
2. Text labels can be in any language but MUST be inside brackets: A[Текст на русском]
3. Use clear, concise labels (max 30 chars per node)
4. Keep the diagram readable (max 15 nodes for flowcharts)
5. Use meaningful connections and groupings
6. The diagram must be valid Mermaid syntax

CORRECT EXAMPLE:
flowchart TD
    A[Начало процесса] --> B{Проверка}
    B -->|Да| C[Действие 1]
    B -->|Нет| D[Действие 2]

WRONG (will cause syntax error):
flowchart TD
    Начало --> Проверка

Return a JSON object:
{
    "mermaidCode": "the complete mermaid diagram code",
    "title": "short descriptive title for the diagram",
    "description": "one sentence explaining what the diagram shows"
}`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: getHeaders(apiKey, DEFAULT_SITE_NAME),
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    {
                        role: "system",
                        content: "You are a diagram expert. Output strictly valid JSON with Mermaid code."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Infographic generation failed: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;

        if (!rawContent) {
            throw new Error("No content received from AI");
        }

        // Parse the response
        const parsed = safeParseAIResponse(rawContent, { topic });

        // Extract mermaid code
        let mermaidCode = parsed.mermaidCode || parsed.content || '';
        let title = parsed.title || `${diagramType}: ${topic}`;
        let description = parsed.description || '';

        // If parsing failed, try to extract mermaid code directly
        if (!mermaidCode && typeof rawContent === 'string') {
            // Look for mermaid code block
            const mermaidMatch = rawContent.match(/```mermaid\n?([\s\S]*?)```/);
            if (mermaidMatch) {
                mermaidCode = mermaidMatch[1].trim();
            } else {
                // Try to find diagram syntax directly
                const diagramMatch = rawContent.match(/(flowchart|sequenceDiagram|mindmap|timeline|pie)[\s\S]*?(?=\n\n|$)/);
                if (diagramMatch) {
                    mermaidCode = diagramMatch[0].trim();
                }
            }
        }

        // Sanitize Mermaid code: fix common issues with non-Latin node IDs
        mermaidCode = sanitizeMermaidCode(mermaidCode);

        // Don't increment usage for infographics (it's a lightweight operation)

        res.json({
            infographic: {
                mermaidCode,
                title,
                description
            }
        });
    } catch (error) {
        console.error('Infographic generation error:', error);
        res.status(500).json({ error: error.message || 'Infographic generation failed' });
    }
});

export default router;
