import { z } from 'zod';

// ==================== Common Schemas ====================

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const mongoIdSchema = z.object({
    id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid MongoDB ObjectId')
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
    frequency: z.number().min(0).default(1)
});

export const generateSchema = z.object({
    config: z.object({
        websiteName: z.string().min(1, 'Website name is required').max(200),
        targetCountry: z.string().max(100).optional().default('Казахстан'),
        targetUrl: z.string().max(500).optional().default(''),
        topic: z.string().max(1000).optional().default(''),
        lsiKeywords: z.string().max(5000).optional().default(''),
        competitorUrls: z.string().max(5000).optional().default(''),
        exampleContent: z.string().max(50000).optional().default(''),
        // Accept any string for tone/style - frontend uses localized display values
        tone: z.string().max(100).optional().default('Professional & Trustworthy'),
        style: z.string().max(100).optional().default('Informative & Educational'),
        minChars: z.number().int().min(100).max(100000).optional().default(2500),
        maxChars: z.number().int().min(100).max(100000).optional().default(5000),
        minParas: z.number().int().min(1).max(100).optional().default(3),
        maxParas: z.number().int().min(1).max(100).optional().default(12),
        model: z.string().min(1).max(100).optional().default('google/gemini-2.0-flash-001'),
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
    model: z.string().min(1).max(100).optional().default('google/gemini-2.0-flash-001')
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

export const generateCoverSchema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
    topic: z.string().max(1000).optional().default(''),
    keywords: z.array(z.string().max(200)).max(20).optional().default([]),
    style: z.enum(['modern', 'minimalist', 'corporate', 'creative', 'tech']).optional().default('modern')
});

export const generateInfographicSchema = z.object({
    topic: z.string().min(1, 'Topic is required').max(1000),
    content: z.string().max(50000).optional().default(''),
    diagramType: z.enum(['flowchart', 'sequence', 'mindmap', 'timeline', 'pie', 'comparison']).optional().default('flowchart')
});

// ==================== Settings Schemas ====================

export const updateSettingsSchema = z.object({
    openRouterApiKey: z.string().max(500).optional(),
    systemPrompt: z.string().max(50000).optional(), // Legacy
    seoPrompt: z.string().max(50000).optional(),
    geoPrompt: z.string().max(50000).optional(),
    telegramLink: z.string().url().max(500).optional(),
    spamCheckModel: z.string().max(100).optional()
});

// ==================== Plan Schemas ====================

export const createPlanSchema = z.object({
    id: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    price: z.number().min(0),
    currency: z.string().min(1).max(10).default('KZT'),
    durationDays: z.number().int().min(1).max(3650),
    maxGenerationsPerMonth: z.number().int().min(0),
    maxGenerationsPerDay: z.number().int().min(0),
    maxKeywords: z.number().int().min(0).max(10000), // 0 = unlimited
    maxChars: z.number().int().min(0).max(1000000).optional().default(10000), // 0 = unlimited
    allowedModels: z.array(z.string().max(100)).min(1),
    canCheckSpam: z.boolean().default(false),
    canOptimizeRelevance: z.boolean().default(false),
    canGenerateCover: z.boolean().default(false),
    canGenerateInfographic: z.boolean().default(false),
    features: z.array(z.string().max(200)).optional().default([])
});

export const updatePlanSchema = createPlanSchema.partial().omit({ id: true });

// ==================== Webhook Schemas ====================

export const webhookSchema = z.object({
    type: z.string().min(1),
    data: z.record(z.any()).optional()
});

// ==================== History Schemas ====================

export const historyQuerySchema = z.object({
    projectId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid project ID'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});
