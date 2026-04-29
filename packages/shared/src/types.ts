
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

export type GenerationMode = 'seo' | 'aio' | 'geo';

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
  useKnowledgeBase?: boolean;
  ragTopK?: number;

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

// ==================== STRUCTURED AIO TYPES ====================

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

export interface AioKnowledgeGraph {
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    sameAs?: string[];
    attributes?: Record<string, unknown>;
  }>;
  locations?: Array<{
    id: string;
    name: string;
    region?: string;
    country?: string;
    coordinates?: {
      latitude?: number | null;
      longitude?: number | null;
    };
    attributes?: Record<string, unknown>;
  }>;
  relations?: Array<{
    source: string;
    target: string;
    relation: string;
    evidence?: string;
  }>;
}

export interface AioRagChunk {
  id: string;
  question: string;
  answer: string;
  facts: string[];
  entities?: string[];
  geoSignals?: string[];
  sourceHint?: string;
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

  // AIO fields
  knowledgeGraph?: AioKnowledgeGraph | null;
  ragChunks?: AioRagChunk[] | null;
  jsonLd?: object | null;
  markdownContent?: string | null;
  article?: StructuredArticle | null;
  visuals?: StructuredVisuals | null;
  faq?: FaqItem[];
  seo?: StructuredSeo | null;
  knowledgeBaseSources?: KnowledgeBaseSearchResult[];
  _rag?: {
    enabled: boolean;
    used: boolean;
    query?: string;
    sourceCount?: number;
    embeddingModel?: string;
    error?: string;
  };

  // Meta flags
  _structured?: boolean;
  _strictJsonMode?: boolean;
  _aio?: boolean;
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

export type MonitoringFrequency = '15m' | '1h' | '1d';
export type MonitoringSeverity = 'critical' | 'warning' | 'info';
export type ProjectSiteStatus = 'healthy' | 'warning' | 'error';

export interface ProjectSitePage {
  id: string;
  projectSiteId: string;
  url: string;
  normalizedUrl: string;
  finalUrl?: string | null;
  statusCode: number;
  title?: string | null;
  h1?: string | null;
  h2List: string[];
  h3List: string[];
  metaDescription?: string | null;
  canonical?: string | null;
  faqQuestions: string[];
  contentText?: string | null;
  wordCount: number;
  ctaText?: string | null;
  internalLinks: string[];
  pageType?: string | null;
  topicKey?: string | null;
  fetchError?: string | null;
  isDeletedPage: boolean;
  scannedAt: string;
}

export interface ProjectSiteTopicCoverage {
  topicKey: string;
  label: string;
  pageType: string;
  count: number;
}

export interface ProjectSite {
  id: string;
  projectId: string;
  name?: string | null;
  domain: string;
  normalizedDomain: string;
  homepageUrl: string;
  scanFrequency: MonitoringFrequency;
  frequencyMinutes: number;
  isActive: boolean;
  lastScannedAt?: string | null;
  nextScanAt: string;
  lastStatus?: ProjectSiteStatus | null;
  lastPageCount: number;
  lastSummary?: string | null;
  lastImportedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  currentPages: ProjectSitePage[];
  topicCoverage: ProjectSiteTopicCoverage[];
}

export interface ProjectSiteImportResult {
  imported: number;
  skipped: number;
  limitReached: boolean;
  totalLinks: number;
}

export interface MonitoringSnapshot {
  id: string;
  monitoredPageId: string;
  url: string;
  finalUrl?: string | null;
  statusCode: number;
  title?: string | null;
  h1?: string | null;
  metaDescription?: string | null;
  canonical?: string | null;
  robotsMeta?: string | null;
  wordCount: number;
  hasFaq: boolean;
  hasSchema: boolean;
  fetchError?: string | null;
  createdAt: string;
}

export interface MonitoringChange {
  type: string;
  severity: MonitoringSeverity;
  before?: string | null;
  after?: string | null;
  changed: string;
  risk: string;
  deltaPercent?: number;
}

export interface MonitoringEvent {
  id: string;
  monitoredPageId: string;
  severity: MonitoringSeverity;
  changeTypes: string[];
  title: string;
  summary: string;
  diff: {
    summary: string;
    changes: MonitoringChange[];
    metrics?: {
      previousWordCount?: number;
      currentWordCount?: number;
      deltaPercent?: number;
    };
  };
  notifiedAt?: string | null;
  createdAt: string;
}

export interface MonitoredPage {
  id: string;
  projectId: string;
  url: string;
  normalizedUrl: string;
  label?: string | null;
  frequency: MonitoringFrequency;
  frequencyMinutes: number;
  isActive: boolean;
  lastCheckedAt?: string | null;
  nextCheckAt: string;
  lastStatusCode?: number | null;
  lastFinalUrl?: string | null;
  lastTitle?: string | null;
  lastSeverity?: MonitoringSeverity | null;
  lastEventAt?: string | null;
  createdAt: string;
  updatedAt: string;
  latestSnapshot?: MonitoringSnapshot | null;
  recentEvents: MonitoringEvent[];
}

export type CompetitorPriority = 'high' | 'medium' | 'low';
export type CompetitorStatus = 'healthy' | 'warning' | 'error';

export interface CompetitorPageChangeDiffChange {
  type: string;
  severity: MonitoringSeverity;
  before?: string | null;
  after?: string | null;
  changed: string;
  risk: string;
  deltaPercent?: number;
}

export interface CompetitorPageChange {
  id: string;
  competitorId: string;
  url: string;
  normalizedUrl: string;
  severity: MonitoringSeverity;
  changeType: string;
  changeTypes: string[];
  pageType?: string | null;
  topicKey?: string | null;
  significanceScore: number;
  impactScore: number;
  isImportant: boolean;
  title: string;
  summary: string;
  diff: {
    summary: string;
    changes: CompetitorPageChangeDiffChange[];
    explainability?: {
      whyImportant?: string;
      recommendation?: string;
      significanceScore?: number;
      impactScore?: number;
      pageType?: string;
      topicKey?: string | null;
      llmModel?: string | null;
    };
    metrics?: {
      previousWordCount?: number;
      currentWordCount?: number;
      deltaPercent?: number;
    };
  };
  notifiedAt?: string | null;
  detectedAt: string;
}

export interface TopicCluster {
  id: string;
  competitorId: string;
  key: string;
  name: string;
  keywords: string[];
  pageCount: number;
  trendScore: number;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorComparison {
  id: string;
  competitorId: string;
  topicKey: string;
  ourTopic: string;
  theirTopic: string;
  ourCoverage: number;
  theirCoverage: number;
  gapSummary: string;
  recommendation: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorWeeklySummary {
  periodDays: number;
  headline: string;
  llmModel?: string;
  metrics: {
    importantChanges: number;
    criticalChanges: number;
    newPages: number;
    newClusters: number;
    topicGaps: number;
  };
  bullets: string[];
  recommendations: string[];
}

export interface Competitor {
  id: string;
  projectId: string;
  name: string;
  domain: string;
  normalizedDomain: string;
  homepageUrl: string;
  priority: CompetitorPriority;
  scanFrequency: MonitoringFrequency;
  frequencyMinutes: number;
  notes?: string | null;
  isActive: boolean;
  lastScannedAt?: string | null;
  nextScanAt: string;
  lastStatus?: CompetitorStatus | string | null;
  lastPageCount: number;
  lastChangeCount: number;
  lastClusterCount: number;
  lastSummary?: string | null;
  lastSeverity?: MonitoringSeverity | null;
  lastImportantChangeAt?: string | null;
  createdAt: string;
  updatedAt: string;
  recentChanges: CompetitorPageChange[];
  topClusters: TopicCluster[];
  comparisonItems: CompetitorComparison[];
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
  isDefault?: boolean;
  maxGenerationsPerMonth?: number;
  maxGenerationsPerDay?: number;
  maxKeywords?: number;
  canCheckSpam?: boolean;
  canOptimizeRelevance?: boolean;
  canUseAioMode?: boolean;
  canGenerateFaq?: boolean;
  canUseSocialPack?: boolean;
  canAudit?: boolean;
  canRewrite?: boolean;
  canHumanize?: boolean;
  priceRub?: number;
  priceStars?: number | null;
  durationDays?: number;
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


// ==================== SERP ANALYSIS ====================

export interface SerpCompetitor {
  position: number;
  domain: string;
  title: string;
  wordCount: number;
  h2Count: number;
  hasTable: boolean;
  hasFaq: boolean;
  strengths: string[];
  weaknesses: string[];
}

export interface SerpAnalysis {
  avgWordCount: number;
  avgCharCount: number;
  avgH2Count: number;
  avgH3Count: number;
  avgImagesCount: number;
  avgTablesCount: number;
  avgListsCount: number;
  avgFaqCount: number;
  keywordDensity: number;
  topDomains: string[];
}

export interface SerpRecommendations {
  targetWordCount: number;
  targetCharCount: number;
  targetH2Count: number;
  targetH3Count: number;
  mustHaveElements: string[];
  suggestedH2Titles: string[];
  keyTopics: string[];
  lsiKeywords: string[];
  contentGaps: string[];
  uniqueAngle: string;
}

export interface SerpAnalysisResult {
  success: boolean;
  query: string;
  searchEngine: 'google' | 'yandex';
  analysis: SerpAnalysis;
  competitors: SerpCompetitor[];
  recommendations: SerpRecommendations;
  summary: string;
}

// ==================== KNOWLEDGE BASE (RAG) ====================

export interface KnowledgeBaseFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  chunkCount?: number;
  hasEmbeddings?: boolean;
  embeddingModel?: string | null;
  embeddingStatus?: string;
}

export interface KnowledgeBaseSearchResult {
  chunkId?: string;
  chunkIndex?: number;
  file: {
    id: string;
    fileName: string;
    fileType?: string;
  };
  similarity: number;
  matchType?: string;
  snippet: string;
}

// ==================== ARTICLE OUTLINE ====================

export interface OutlineSection {
  h2: string;
  h3s: string[];
  description?: string;
}

export interface ArticleOutline {
  h1: string;
  sections: OutlineSection[];
}

// ==================== INTERNAL LINKS ====================

export interface InternalLink {
  id: string;
  url: string;
  anchorText?: string;
  keywords: string[];
  priority: number;
  createdAt?: string;
}

// ==================== BACKGROUND TASKS ====================

export type BackgroundTaskType = 'generate' | 'rewrite' | 'humanize';
export type BackgroundTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface BackgroundTask {
  id: string;
  type: BackgroundTaskType;
  status: BackgroundTaskStatus;
  config: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BackgroundTaskListItem {
  id: string;
  type: BackgroundTaskType;
  status: BackgroundTaskStatus;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  hasResult: boolean;
}

// ==================== CITATIONS (AIO) ====================

export interface Citation {
  id: number;
  url: string;
  title: string;
  snippet?: string;
}

// ==================== HTML EXPORT ====================

export interface HtmlExportOptions {
  wrapKeywords?: boolean;
  keywordTag?: string;
  keywords?: string[];
  fullDocument?: boolean;
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
    lang?: string;
  };
}

export interface KeywordAnalysisItem {
  keyword: string;
  count: number;
  used: boolean;
  density: string;
}

export interface KeywordAnalysisResult {
  analysis: KeywordAnalysisItem[];
  summary: {
    total: number;
    used: number;
    missing: number;
    usagePercent: number;
  };
  usedKeywords: string[];
  missingKeywords: string[];
}
