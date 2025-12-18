import express from 'express';
import { prisma } from '../lib/prisma.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { createProjectSchema, paginationSchema } from '../schemas/index.js';
import { z } from 'zod';

const router = express.Router();

// Schema for UUID param
const uuidParamSchema = z.object({
    id: z.string().uuid('Invalid project ID')
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
 * GET /api/projects
 * Get all projects for current user with pagination
 */
router.get('/', validateQuery(paginationSchema), async (req, res) => {
    try {
        const userId = await getUserId(req.telegramUser.id);

        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { page, limit } = req.validatedQuery;
        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.project.count({ where: { userId } })
        ]);

        res.json({
            projects,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to get projects' });
    }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', validate(createProjectSchema), async (req, res) => {
    try {
        const userId = await getUserId(req.telegramUser.id);

        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { name, description } = req.body;

        const project = await prisma.project.create({
            data: {
                userId,
                name,
                description: description || null
            }
        });

        res.json({ success: true, project });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

/**
 * DELETE /api/projects/:id
 * Delete project and its history (cascade)
 */
router.delete('/:id', validateParams(uuidParamSchema), async (req, res) => {
    try {
        const userId = await getUserId(req.telegramUser.id);

        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        const project = await prisma.project.findUnique({
            where: { id: req.params.id }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check ownership
        if (project.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Delete project (history will be cascade deleted due to onDelete: Cascade)
        await prisma.project.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
