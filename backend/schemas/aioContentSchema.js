import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const jsonValue = z.any();
const jsonObject = z.record(z.string(), jsonValue);

export const aioEntitySchema = z.object({
    id: nonEmptyString,
    name: nonEmptyString,
    type: nonEmptyString,
    description: z.string().trim().default(''),
    sameAs: z.array(z.string().trim()).optional().default([]),
    attributes: jsonObject.optional().default({})
});

export const aioLocationSchema = z.object({
    id: nonEmptyString,
    name: nonEmptyString,
    region: z.string().trim().default(''),
    country: z.string().trim().default(''),
    coordinates: z.object({
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional()
    }).optional().default({}),
    attributes: jsonObject.optional().default({})
});

export const aioRelationSchema = z.object({
    source: nonEmptyString,
    target: nonEmptyString,
    relation: nonEmptyString,
    evidence: z.string().trim().default('')
});

export const aioKnowledgeGraphSchema = z.object({
    entities: z.array(aioEntitySchema).min(1),
    locations: z.array(aioLocationSchema).optional().default([]),
    relations: z.array(aioRelationSchema).optional().default([])
});

export const aioRagChunkSchema = z.object({
    id: nonEmptyString,
    question: nonEmptyString,
    answer: nonEmptyString,
    facts: z.array(nonEmptyString).min(1),
    entities: z.array(nonEmptyString).optional().default([]),
    geoSignals: z.array(nonEmptyString).optional().default([]),
    sourceHint: z.string().trim().optional().default('')
});

export const aioArticleSectionSchema = z.object({
    h2: nonEmptyString,
    content: nonEmptyString,
    table: z.string().trim().nullable().optional().default(null)
});

export const aioResponseSchema = z.object({
    knowledgeGraph: aioKnowledgeGraphSchema,
    ragChunks: z.array(aioRagChunkSchema).min(4),
    jsonLd: jsonObject.refine((value) => value['@context'] === 'https://schema.org', {
        message: 'jsonLd must include @context=https://schema.org'
    }),
    markdownContent: nonEmptyString,
    article: z.object({
        h1: nonEmptyString,
        intro: nonEmptyString,
        sections: z.array(aioArticleSectionSchema).min(3),
        conclusion: nonEmptyString
    }),
    faq: z.array(z.object({
        question: nonEmptyString,
        answer: nonEmptyString
    })).min(3),
    visuals: z.object({
        mermaid: z.string().trim().nullable().optional().default(null),
        svg: z.string().trim().nullable().optional().default(null)
    }).optional().default({ mermaid: null, svg: null }),
    seo: z.object({
        metaTitle: nonEmptyString.max(80),
        metaDescription: nonEmptyString.max(220),
        keywords: z.array(nonEmptyString).default([]),
        schemaType: nonEmptyString
    })
});

export function parseAioResponse(value) {
    return aioResponseSchema.parse(value);
}

export function toAioIssueList(error) {
    return error?.issues?.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') || error?.message || 'Invalid AIO payload';
}
