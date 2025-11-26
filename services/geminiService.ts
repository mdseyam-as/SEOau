
import { GenerationConfig, KeywordRow, SeoResult, AIModel, SeoMetrics } from '../types';
import { authService } from './authService';

const DEFAULT_SITE_URL = 'https://example.com';
const DEFAULT_SITE_NAME = 'SeoGenerator';

// Use this model specifically for spam checking and fixing
const SPAM_CHECK_MODEL = AIModel.GROK_4_1_FAST;

export const DEFAULT_PROMPT_TEMPLATE = `You are a Senior SEO Copywriter and Content Strategist for **{{websiteName}}**.

### OBJECTIVE
Write a high-ranking, authoritative, and useful SEO article for the following page. The text must outperform competitors in terms of utility, structure, and relevance.

### INPUT DATA
- **Target URL:** {{targetUrl}}
- **Main Topic:** {{topic}}
- **Target Country/Region:** {{targetCountry}}
- **Website/Brand:** {{websiteName}}
- **Target Length:** {{minChars}} - {{maxChars}} characters.
- **Paragraphs:** {{minParas}} to {{maxParas}}.

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

const getApiKey = () => {
  const globalSettings = authService.getGlobalSettings();
  const key = globalSettings.openRouterApiKey || process.env.API_KEY;
  if (!key) throw new Error("API ключ не настроен администратором.");
  return key;
};

// Helper to sanitize headers (Browsers throw 'Failed to fetch' if headers contain non-ASCII chars)
const getHeaders = (apiKey: string, siteName: string) => {
  // Strip characters that are not in the printable ASCII range (0x20-0x7E)
  const safeSiteName = (siteName || DEFAULT_SITE_NAME).replace(/[^\x20-\x7E]/g, ''); 
  return {
    "Authorization": `Bearer ${apiKey.trim()}`,
    "HTTP-Referer": DEFAULT_SITE_URL,
    "X-Title": safeSiteName || "SeoGenerator",
    "Content-Type": "application/json"
  };
};

// --- SPAM CHECK FUNCTIONS ---

export const checkContentForSpam = async (content: string): Promise<{ spamScore: number; spamAnalysis: string }> => {
  const apiKey = getApiKey();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(apiKey, DEFAULT_SITE_NAME),
      body: JSON.stringify({
        "model": SPAM_CHECK_MODEL,
        "messages": [
          {
            "role": "system",
            "content": "You are a Google Algorithms Expert. Analyze texts for SEO Spam and Keyword Stuffing. Output strictly valid JSON."
          },
          {
            "role": "user",
            "content": `Analyze the following text for SEO Spam, Keyword Stuffing, and Unnatural phrasing.
            
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
        "temperature": 0.1,
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter Spam Check Error:", errText);
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    
    if (!rawContent) return { spamScore: -1, spamAnalysis: "Could not analyze" };

    const jsonString = rawContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    let result;
    try {
        result = JSON.parse(jsonString);
    } catch {
        // Fallback if not valid JSON
        return { spamScore: -1, spamAnalysis: "Ошибка парсинга ответа модели. " + rawContent.substring(0, 100) + "..." };
    }

    return {
      spamScore: typeof result.spamPercentage === 'number' ? result.spamPercentage : -1,
      spamAnalysis: result.reason || "No analysis provided"
    };

  } catch (e: any) {
    console.error("Spam Check Error:", e);
    return { spamScore: -1, spamAnalysis: `Ошибка при анализе: ${e.message || "Unknown error"}` };
  }
};

export const fixContentSpam = async (content: string, analysis: string, model: string): Promise<string> => {
  const apiKey = getApiKey();

  try {
     const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(apiKey, DEFAULT_SITE_NAME),
      body: JSON.stringify({
        "model": model, // User selected model
        "messages": [
          {
            "role": "system",
            "content": "You are a professional editor. Your goal is to make text sound natural, human-written, and reduce spam/keyword stuffing while keeping the HTML/Markdown formatting intact."
          },
          {
            "role": "user",
            "content": `Rewrite the following text to reduce the spam score and improve readability.
            
            Issues detected: ${analysis}
            
            Strictly maintain the original structure, headings, and formatting. Just make the tone more natural and remove forced keywords.
            
            Text:
            """
            ${content}
            """`
          }
        ],
        "temperature": 0.5,
      })
    });

    if (!response.ok) throw new Error("Spam fix failed");

    const data = await response.json();
    return data.choices?.[0]?.message?.content || content;
  } catch (e) {
    console.error("Spam Fix Error:", e);
    throw e;
  }
};

// --- OPTIMIZATION (INCREASE RELEVANCE) ---

export const optimizeContentRelevance = async (content: string, missingKeywords: string[], config: GenerationConfig): Promise<string> => {
   const apiKey = getApiKey();
   const missingStr = missingKeywords.join(', ');

   try {
     const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(apiKey, config.websiteName || DEFAULT_SITE_NAME),
      body: JSON.stringify({
        "model": config.model, // Use the same model as generation for consistency, or we could force a high-end one
        "messages": [
          {
            "role": "system",
            "content": `You are an expert SEO Editor for ${config.targetCountry}. Your goal is to increase the relevance of the text by naturally integrating specific keywords. You must prioritize readability and natural flow over keyword density.`
          },
          {
            "role": "user",
            "content": `The following article is missing important semantic keywords. 
            Rewrite the article to naturally include these missing keywords: [${missingStr}].
            
            CRITICAL ANTI-SPAM INSTRUCTIONS:
            1. **Natural Integration Only:** Only insert keywords where they fit grammatically and logically. If a keyword cannot be added naturally, SKIP IT.
            2. **Avoid Stuffing:** Do not force keywords into every paragraph. The text must remain human-like.
            3. **Maintenance:** Strictly maintain the original Markdown structure, headings, and length.
            4. **Tone:** Keep the ${config.tone} tone and ${config.style} style.
            5. **Constraint:** Do not increase the overall word count significantly.
            
            Original Text:
            """
            ${content}
            """`
          }
        ],
        "temperature": 0.4,
      })
    });

    if (!response.ok) throw new Error("Optimization failed");

    const data = await response.json();
    return data.choices?.[0]?.message?.content || content;

   } catch (e) {
     console.error("Optimization Error", e);
     throw e;
   }
};

// --- METRICS CALCULATION (EXPORTED HELPER) ---

export const calculateSeoMetrics = (content: string, keywords: KeywordRow[]): SeoMetrics => {
    // 1. Word Count
    const wordCount = content.split(/\s+/).length;

    // 2. Keyword Analysis (Top 15)
    const top15 = keywords.slice(0, 15);
    const contentLower = content.toLowerCase();

    const keywordAnalysis = top15.map(k => {
      // Escape special regex chars
      const escaped = k.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Simple regex to count occurrences
      const regex = new RegExp(escaped.toLowerCase(), 'g');
      const matches = contentLower.match(regex);
      return {
        keyword: k.keyword,
        targetFrequency: k.frequency,
        actualCount: matches ? matches.length : 0
      };
    });

    // 3. Relevance Score
    // Logic: Percentage of top 15 keywords that appear at least once + bonus for multiple occurrences
    const presentCount = keywordAnalysis.filter(k => k.actualCount > 0).length;
    let score = Math.round((presentCount / Math.max(1, top15.length)) * 100);
    
    // Cap at 100
    if (score > 100) score = 100;

    return {
      wordCount,
      relevanceScore: score,
      keywordAnalysis
    };
};


// --- MAIN GENERATION ---

export const generateSeoContent = async (
  config: GenerationConfig,
  keywords: KeywordRow[]
): Promise<SeoResult> => {
  
  const globalSettings = authService.getGlobalSettings();
  const apiKey = globalSettings.openRouterApiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API ключ не настроен администратором. Пожалуйста, свяжитесь с поддержкой.");
  }

  // Prepare variables for replacement
  const topKeywords = keywords
    .slice(0, 50)
    .map(k => `${k.keyword} (Freq: ${k.frequency})`)
    .join(', ');

  const mainKeywords = keywords
    .slice(0, 5)
    .map(k => k.keyword)
    .join(', ');

  const competitorsList = config.competitorUrls.trim();
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
    """
    `
    : "";

  // Use global system prompt from settings, or default if not set
  let prompt = globalSettings.systemPrompt || DEFAULT_PROMPT_TEMPLATE;

  // Replace placeholders
  const replacements: Record<string, string | number> = {
    '{{targetUrl}}': config.targetUrl,
    '{{topic}}': config.topic,
    '{{websiteName}}': config.websiteName || DEFAULT_SITE_NAME,
    '{{targetCountry}}': config.targetCountry || 'Global',
    '{{tone}}': config.tone,
    '{{style}}': config.style,
    '{{minChars}}': config.minChars,
    '{{maxChars}}': config.maxChars,
    '{{minParas}}': config.minParas,
    '{{maxParas}}': config.maxParas,
    '{{mainKeywords}}': mainKeywords,
    '{{lsiKeywords}}': config.lsiKeywords,
    '{{topKeywords}}': topKeywords,
    '{{competitors}}': competitors,
    '{{exampleInstruction}}': exampleInstruction
  };

  for (const [key, value] of Object.entries(replacements)) {
    prompt = prompt.split(key).join(String(value));
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: getHeaders(apiKey, config.websiteName || DEFAULT_SITE_NAME),
      body: JSON.stringify({
        "model": config.model,
        "messages": [
          {
            "role": "system",
            "content": `You are an advanced SEO AI. You write content for ${config.targetCountry}. You always output strictly valid JSON.`
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
        "temperature": 0.7,
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API Error: ${errData.error?.message || response.statusText} (${response.status})`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) throw new Error("No content received from AI");

    // Attempt to clean markdown code blocks if the AI wraps the JSON
    const jsonString = rawContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");

    let parsedResult: SeoResult;
    try {
      parsedResult = JSON.parse(jsonString) as SeoResult;
    } catch (e) {
      console.error("JSON Parse Error", e);
      console.log("Raw Content:", rawContent);
      throw new Error("Не удалось обработать ответ AI. Возможно, модель вернула простой текст вместо JSON.");
    }

    // --- Calculate Metrics (Post-Processing) ---
    try {
      parsedResult.metrics = calculateSeoMetrics(parsedResult.content, keywords);
    } catch (e) {
      console.error("Metrics calculation failed", e);
    }

    return parsedResult;

  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
};
