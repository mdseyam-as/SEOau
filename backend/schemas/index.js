import { z } from 'zod';

const coerceFiniteNumber = (fallback, schema) =>
    z.preprocess((value) => {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }

        const parsed = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }, schema);

// ==================== Common Schemas ====================

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

// UUID schema for PostgreSQL/Prisma
export const uuidSchema = z.object({
    id: z.string().uuid('Invalid ID format')
});

// ==================== Auth Schemas ====================

export const loginSchema = z.object({
    initData: z.string().min(1, 'initData is required')
});

export const devLoginSchema = z.object({
    telegramId: z.union([z.string(), z.number()]).transform(val => Number(val))
});

// ==================== User Schemas ====================

export const updateUserSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    username: z.string().min(1).max(100).optional()
});

export const adminUpdateUserSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    username: z.string().min(1).max(100).optional(),
    role: z.enum(['user', 'admin']).optional(),
    planId: z.string().min(1).max(50).optional(),
    subscriptionExpiry: z.string().datetime().nullable().optional(),
    generationsUsed: z.number().int().min(0).optional(),
    generationsUsedToday: z.number().int().min(0).optional(),
    lastGenerationMonth: z.string().optional(),
    lastGenerationDate: z.string().optional()
});

// ==================== Project Schemas ====================

export const createProjectSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
    description: z.string().max(1000, 'Description too long').optional().default('')
});

export const updateProjectSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional()
});

// ==================== Generation Schemas ====================

const keywordSchema = z.object({
    keyword: z.string().min(1).max(500),
    // TF-IDF frequencies can be large numbers (document frequency counts)
    frequency: coerceFiniteNumber(1, z.number().min(0))
});

export const competitorFileSchema = z.object({
    name: z.string().min(1).max(200),
    content: z.string().max(20000)
});

export const generateSchema = z.object({
    config: z.object({
        websiteName: z.string().min(1, 'Website name is required').max(200),
        targetCountry: z.string().max(100).optional().default('Казахстан'),
        targetUrl: z.string().max(500).optional().default(''),
        topic: z.string().max(1000).optional().default(''),
        lsiKeywords: z.string().max(5000).optional().default(''),
        competitorUrls: z.string().max(5000).optional().default(''),
        competitorFiles: z.array(competitorFileSchema).optional().default([]),
        exampleContent: z.string().max(50000).optional().default(''),
        // Accept any string for tone/style - frontend uses localized display values
        tone: z.string().max(100).optional().default('Professional & Trustworthy'),
        style: z.string().max(100).optional().default('Informative & Educational'),
        minChars: coerceFiniteNumber(2500, z.number().int().min(100).max(100000)),
        maxChars: coerceFiniteNumber(5000, z.number().int().min(100).max(100000)),
        minParas: coerceFiniteNumber(3, z.number().int().min(1).max(100)),
        maxParas: coerceFiniteNumber(12, z.number().int().min(1).max(100)),
        model: z.string().min(1).max(100).optional().default('google/gemini-3-flash-preview'),
        writerModel: z.string().min(1).max(100).optional(),
        visualizerModel: z.string().min(1).max(100).optional(),
        useMultimodalGeo: z.boolean().optional().default(true),
        // Generation mode: 'seo' for classic SEO, 'geo' for AI search engines
        generationMode: z.enum(['seo', 'geo']).optional().default('seo')
    }),
    // No hard limit here - limit is checked per-plan in generate route
    keywords: z.array(keywordSchema).optional().default([])
});

export const spamCheckSchema = z.object({
    content: z.string().min(1, 'Content is required').max(200000, 'Content too long')
});

export const fixSpamSchema = z.object({
    content: z.string().min(1).max(200000),
    analysis: z.string().min(1).max(10000),
    model: z.string().min(1).max(100).optional().default('google/gemini-3-flash-preview')
});

export const optimizeRelevanceSchema = z.object({
    content: z.string().min(1).max(200000),
    missingKeywords: z.array(z.string().max(500)).max(100),
    config: z.object({
        websiteName: z.string().max(200).optional(),
        targetCountry: z.string().max(100).optional(),
        model: z.string().max(100).optional()
    }).optional().default({})
});

export const seoAuditSchema = z.object({
    url: z.string().url('Invalid URL').max(2000),
    model: z.string().min(1).max(100).optional().default('google/gemini-3-flash-preview')
});

export const rewriteSchema = z.object({
    // Either URL to fetch content from, or direct text
    sourceUrl: z.string().url('Invalid URL').max(2000).optional(),
    sourceText: z.string().max(100000).optional(),
    // Rewrite settings
    targetLanguage: z.string().max(50).optional().default('ru'),
    tone: z.string().max(100).optional().default('Professional'),
    style: z.string().max(100).optional().default('Informative'),
    preserveStructure: z.boolean().optional().default(true),
    model: z.string().min(1).max(100).optional().default('google/gemini-3-flash-preview')
}).refine(data => data.sourceUrl || data.sourceText, {
    message: 'Either sourceUrl or sourceText must be provided'
});

// ==================== Humanizer Schema ====================

export const humanizeSchema = z.object({
    content: z.string().min(1, 'Content is required').max(200000, 'Content too long'),
    language: z.string().max(50).optional().default('ru'),
    intensity: z.enum(['light', 'medium', 'strong']).optional().default('medium'),
    model: z.string().min(1).max(100).optional().default('google/gemini-3-flash-preview')
});

// ==================== Settings Schemas ====================

export const updateSettingsSchema = z.object({
    openRouterApiKey: z.string().max(500).optional(),
    systemPrompt: z.string().max(50000).optional(), // Legacy
    seoPrompt: z.string().max(50000).optional(),
    geoPrompt: z.string().max(50000).optional(),
    // Allow both full URL (https://t.me/user) or just username (@user or user)
    telegramLink: z.string().max(500).optional(),
    spamCheckModel: z.string().max(100).optional()
});

// ==================== Plan Schemas ====================

export const createPlanSchema = z.object({
    id: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    durationDays: z.number().int().min(0).max(3650).optional().default(30), // 0 = permanent/unlimited
    maxGenerationsPerMonth: z.number().int().min(0).optional().default(0),
    maxGenerationsPerDay: z.number().int().min(0).optional().default(0),
    maxKeywords: z.number().int().min(0).max(10000).optional().default(0), // 0 = unlimited
    maxChars: z.number().int().min(0).max(1000000).optional().default(10000), // 0 = unlimited
    allowedModels: z.array(z.string().max(100)).optional().default([]),
    canCheckSpam: z.boolean().optional().default(false),
    canOptimizeRelevance: z.boolean().optional().default(false),
    canUseGeoMode: z.boolean().optional().default(false),
    canGenerateFaq: z.boolean().optional().default(false),
    canUseSocialPack: z.boolean().optional().default(false),
    canAudit: z.boolean().optional().default(false),
    canRewrite: z.boolean().optional().default(false),
    canHumanize: z.boolean().optional().default(false),
    priceRub: z.number().int().min(0).optional().default(0),
    priceStars: z.number().int().min(0).optional().default(0),
    isDefault: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    // Legacy fields - ignored but allowed for backward compatibility
    price: z.number().optional(),
    currency: z.string().optional(),
    features: z.array(z.string()).optional()
});

export const updatePlanSchema = createPlanSchema.partial().omit({ id: true });

export const createStarsInvoiceSchema = z.object({
    planId: z.string().min(1).max(50)
});

// ==================== Webhook Schemas ====================

export const webhookSchema = z.object({
    type: z.string().min(1),
    data: z.record(z.any()).optional()
});

// ==================== History Schemas ====================

export const historyQuerySchema = z.object({
    projectId: z.string().uuid('Invalid project ID'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});


// ==================== SERP Analyzer Schema ====================

export const serpAnalyzerSchema = z.object({
    query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
    searchEngine: z.enum(['google', 'yandex']).optional().default('google'),
    region: z.string().max(50).optional().default('ru'),
    count: z.number().int().min(3).max(20).optional().default(10)
});
