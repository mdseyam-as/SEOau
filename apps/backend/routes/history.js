import express from 'express';
import { prisma } from '../lib/prisma.js';
import { validateParams, validateQuery } from '../middleware/validate.js';
import { z } from 'zod';
import { processLock } from '../utils/processLock.js';

const router = express.Router();

// History retention period in days
const HISTORY_RETENTION_DAYS = 7;
const CLEANUP_LOCK_NAME = 'history-cleanup';

// Schema for projectId param (UUID)
const projectIdParamSchema = z.object({
    projectId: z.string().uuid('Invalid project ID')
});

// Schema for history item ID param (UUID)
const historyIdParamSchema = z.object({
    id: z.string().uuid('Invalid history ID')
});

// Schema for history query with pagination
const historyPaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

function extractAioFields(result = {}) {
    return {
        knowledgeGraph: result.knowledgeGraph || null,
        ragChunks: result.ragChunks || null,
        jsonLd: result.jsonLd || result.seo?.schemaLD || null,
        markdownContent: result.markdownContent || result.content || null
    };
}

/**
 * Helper: Get user ID from telegram ID
 */
async function getUserId(telegramId) {
    const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        select: { id: true }
    });
    return user?.id;
}

/**
 * Helper: Clean up old history entries (older than HISTORY_RETENTION_DAYS)
 * Only runs on leader instance to prevent duplicate cleanup
 */
async function cleanupOldHistory() {
    // Only run if this instance is the leader
    if (!processLock.isProcessLeader(CLEANUP_LOCK_NAME)) {
        return;
    }
    
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - HISTORY_RETENTION_DAYS);

        const result = await prisma.history.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate
                }
            }
        });

        if (result.count > 0) {
            console.log(`[History Cleanup] Deleted ${result.count} old history entries`);
        }
    } catch (error) {
        if (!error.message?.includes("Can't reach database")) {
            console.error('[History Cleanup] Error:', error.message);
        }
    }
}

// Try to acquire lock and run cleanup
async function initCleanup() {
    const isLeader = await processLock.acquireLock(CLEANUP_LOCK_NAME);
    if (isLeader) {
        cleanupOldHistory();
        setInterval(cleanupOldHistory, 6 * 60 * 60 * 1000);
    } else {
        console.log('[History Cleanup] Another instance is handling cleanup');
    }
}

// Initialize cleanup with delay to allow DB connection
setTimeout(initCleanup, 5000);

/**
 * GET /api/history/:projectId
 * Get history for a project with pagination
 */
router.get('/:projectId', validateParams(projectIdParamSchema), validateQuery(historyPaginationSchema), async (req, res) => {
    try {
        const { projectId } = req.validatedParams || req.params;
        const userId = await getUserId(req.telegramUser.id);

        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify project ownership
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { page, limit } = req.validatedQuery;
        const skip = (page - 1) * limit;

        const [history, total] = await Promise.all([
            prisma.history.findMany({
                where: { projectId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.history.count({ where: { projectId } })
        ]);

        // Transform for backward compatibility
        const transformedHistory = history.map(h => ({
            ...h,
            id: h.id,
            timestamp: h.createdAt // backward compatibility
        }));

        res.json({
            history: transformedHistory,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

/**
 * POST /api/history
 * Add item to history
 */
router.post('/', async (req, res) => {
    try {
        const { projectId, config, result } = req.body;

        if (!projectId || !config || !result) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const userId = await getUserId(req.telegramUser.id);

        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify project ownership
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const historyItem = await prisma.history.create({
            data: {
                projectId,
                topic: config.topic || '',
                targetUrl: config.targetUrl || null,
                mode: config.generationMode === 'geo' ? 'aio' : (config.generationMode || 'aio'),
                config: config, // JSON field
                result: result, // JSON field
                ...((config.generationMode === 'aio' || config.generationMode === 'geo' || result._aio) ? extractAioFields(result) : {})
            }
        });

        res.json({
            success: true,
            historyItem: {
                ...historyItem,
                timestamp: historyItem.createdAt
            }
        });
    } catch (error) {
        console.error('Add history error:', error);
        res.status(500).json({ error: 'Failed to add history' });
    }
});

/**
 * GET /api/history/:id/raw
 * Return crawler-friendly Markdown for AIO content.
 */
router.get('/:id/raw', validateParams(historyIdParamSchema), async (req, res) => {
    try {
        const userId = await getUserId(req.telegramUser.id);

        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        const historyItem = await prisma.history.findUnique({
            where: { id: req.params.id },
            include: { project: true }
        });

        if (!historyItem) {
            return res.status(404).json({ error: 'History item not found' });
        }

        if (!historyItem.project || historyItem.project.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (historyItem.mode !== 'geo' && historyItem.mode !== 'aio' && !historyItem.markdownContent) {
            return res.status(404).json({ error: 'Raw AIO Markdown is available only for AIO content' });
        }

        const markdown = historyItem.markdownContent || historyItem.result?.markdownContent || historyItem.result?.content || '';

        res
            .type('text/markdown; charset=utf-8')
            .set({
                'Cache-Control': 'public, max-age=300',
                'X-Robots-Tag': 'index, follow',
                'Content-Disposition': `inline; filename="${historyItem.id}.md"`
            })
            .send(markdown);
    } catch (error) {
        console.error('Get raw AIO content error:', error);
        res.status(500).json({ error: 'Failed to get raw AIO content' });
    }
});

/**
 * DELETE /api/history/:id
 * Delete history item
 */
router.delete('/:id', validateParams(historyIdParamSchema), async (req, res) => {
    try {
        const userId = await getUserId(req.telegramUser.id);

        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        const historyItem = await prisma.history.findUnique({
            where: { id: req.params.id },
            include: { project: true }
        });

        if (!historyItem) {
            return res.status(404).json({ error: 'History item not found' });
        }

        // Verify ownership via project
        if (!historyItem.project || historyItem.project.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.history.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete history error:', error);
        res.status(500).json({ error: 'Failed to delete history' });
    }
});

export default router;
