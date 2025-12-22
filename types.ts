
export interface KeywordRow {
  keyword: string;
  frequency: number;
}

export enum AIModel {
  // Google
  GEMINI_3_FLASH = 'google/gemini-3-flash-preview',
  GEMINI_2_0_PRO_EXP = 'google/gemini-2.0-pro-exp-02-05',
  GEMINI_1_5_PRO = 'google/gemini-pro-1.5',
  GEMINI_3_PRO_PREVIEW = 'google/gemini-3-pro-preview',

  // Anthropic
  CLAUDE_3_5_SONNET = 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_OPUS = 'anthropic/claude-3-opus',
  CLAUDE_3_5_HAIKU = 'anthropic/claude-3.5-haiku',
  CLAUDE_OPUS_4_1 = 'anthropic/claude-opus-4.1',
  CLAUDE_SONNET_4_5 = 'anthropic/claude-sonnet-4.5',

  // OpenAI
  GPT_4O = 'openai/gpt-4o',
  GPT_4O_MINI = 'openai/gpt-4o-mini',
  GPT_O1_MINI = 'openai/o1-mini',

  // xAI (Grok)
  GROK_2_1212 = 'x-ai/grok-2-1212',
  GROK_2_VISION_1212 = 'x-ai/grok-2-vision-1212',
  GROK_BETA = 'x-ai/grok-beta',
  GROK_4_FAST = 'x-ai/grok-4-fast',
  GROK_4_1_FAST = 'x-ai/grok-4.1-fast',
  GROK_4_1_FAST_FREE = 'x-ai/grok-4.1-fast:free',
  GROK_CODE_FAST = 'x-ai/grok-2-1212',

  // Qwen (Alibaba)
  QWEN_MAX = 'qwen/qwen-max',
  QWEN_PLUS = 'qwen/qwen-plus',
  QWEN_TURBO = 'qwen/qwen-turbo',
  QWEN_2_5_72B = 'qwen/qwen-2.5-72b-instruct',
  QWEN_2_5_CODER_32B = 'qwen/qwen-2.5-coder-32b-instruct',
  QWEN_QWQ_32B = 'qwen/qwq-32b-preview',

  // DeepSeek
  DEEPSEEK_R1 = 'deepseek/deepseek-r1',
  DEEPSEEK_V3 = 'deepseek/deepseek-chat',

  // Meta
  LLAMA_3_3_70B = 'meta-llama/llama-3.3-70b-instruct',

  // Mistral
  MISTRAL_LARGE = 'mistralai/mistral-large-2411',
}

export interface ModelConfig {
  id: string; // The API string (e.g. 'google/gemini-3-flash-preview')
  name: string; // Display name
  provider: string; // Grouping (Google, OpenAI, etc.)
}

export enum TextTone {
  PROFESSIONAL = 'Professional & Trustworthy',
  CASUAL = 'Casual & Friendly',
  ENTHUSIASTIC = 'Enthusiastic & Energetic',
  AUTHORITATIVE = 'Authoritative & Expert',
  EMPATHETIC = 'Empathetic & Supportive',
  LUXURY = 'Luxury & Exclusive'
}

export enum TextStyle {
  INFORMATIVE = 'Informative & Educational',
  PERSUASIVE = 'Persuasive (Sales-focused)',
  NARRATIVE = 'Narrative (Storytelling)',
  ANALYTICAL = 'Analytical & Data-driven',
  INSTRUCTIONAL = 'Instructional (How-to guides)'
}

export type GenerationMode = 'seo' | 'geo';

export enum ContentLanguage {
  RUSSIAN = 'Русский',
  ENGLISH = 'English',
  KAZAKH = 'Қазақша',
  UKRAINIAN = 'Українська',
  GERMAN = 'Deutsch',
  FRENCH = 'Français',
  SPANISH = 'Español',
  PORTUGUESE = 'Português',
  ITALIAN = 'Italiano',
  POLISH = 'Polski',
  TURKISH = 'Türkçe',
  CHINESE = '中文',
  JAPANESE = '日本語',
  KOREAN = '한국어',
  ARABIC = 'العربية'
}

export interface GenerationConfig {
  // Brand Context
  websiteName: string;
  targetCountry: string;

  // SEO Details
  targetUrl: string;
  topic: string;
  lsiKeywords: string;
  competitorUrls: string; // Keeps the string format for backward compatibility, but UI handles as list
  competitorFiles?: { name: string; content: string }[]; // New field for uploaded competitor files

  // Style
  tone: TextTone;
  style: TextStyle;
  exampleContent?: string;

  // Technical
  minChars: number;
  maxChars: number;
  minParas: number;
  maxParas: number;
  model: string;

  // Generation Mode
  generationMode: GenerationMode;

  // Content Language
  language: ContentLanguage;
}

export interface SeoMetrics {
  wordCount: number;
  relevanceScore: number;
  keywordAnalysis: {
    keyword: string;
    targetFrequency: number;
    actualCount: number;
  }[];
}

// ==================== STRUCTURED GEO TYPES ====================

export interface ArticleSection {
  h2: string;
  content: string;
  table: string | null;
}

export interface StructuredArticle {
  h1: string;
  intro: string;
  sections: ArticleSection[];
  conclusion: string;
}

export interface StructuredVisuals {
  mermaid: string | null;
  svg: string | null;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface StructuredSeo {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  schemaType: string;
  schemaLD?: object | null;
}

// ==================== SEO RESULT ====================

export interface SeoResult {
  // Legacy fields (for backward compatibility)
  content: string;
  metaTitle: string;
  metaDescription: string;
  usedKeywords: string[];
  metrics?: SeoMetrics;
  spamScore?: number; // 0-100%
  spamAnalysis?: string;

  // NEW: Structured GEO fields
  article?: StructuredArticle | null;
  visuals?: StructuredVisuals | null;
  faq?: FaqItem[];
  seo?: StructuredSeo | null;

  // Meta flags
  _structured?: boolean;
  _strictJsonMode?: boolean;
  _meta?: {
    writerModel?: string;
    visualizerModel?: string;
    jsonMode?: boolean;
    fallback?: boolean;
  };
}

export interface Project {
  id: string;
  userId: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  projectId: string;
  timestamp: string;
  topic: string;
  targetUrl: string;
  config: GenerationConfig;
  result: SeoResult;
}

export interface User {
  _id: string;
  telegramId: number;
  username?: string;
  firstName: string;
  role: 'user' | 'admin';
  planId: string;
  subscriptionExpiry?: string;
  generationsUsed: number;
  lastGenerationMonth?: string;
  generationsUsedToday: number;
  lastGenerationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  maxChars: number;
  allowedModels: string[];
  isDefault: boolean;
  maxGenerationsPerMonth: number;
  maxGenerationsPerDay: number;
  maxKeywords: number;
  canCheckSpam: boolean;
  canOptimizeRelevance: boolean;
  canUseGeoMode: boolean;
  canGenerateFaq: boolean;
  priceRub: number;
  durationDays: number;
}

// ==================== FAQ GENERATION ====================

export interface FaqGenerationRequest {
  topic?: string;
  content?: string;
  language?: string;
  count?: number;
}

export interface FaqGenerationResponse {
  faq: FaqItem[];
  schema: object;
  schemaHtml: string;
}
