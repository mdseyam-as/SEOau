import express from 'express';
import { prisma } from '../lib/prisma.js';
import { validateParams, validateQuery } from '../middleware/validate.js';
import { z } from 'zod';

const router = express.Router();

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
                mode: config.generationMode || 'geo',
                config: config, // JSON field
                result: result  // JSON field
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
