import express from 'express';
import History from '../models/History.js';
import Project from '../models/Project.js';
import { validateParams, validateQuery } from '../middleware/validate.js';
import { mongoIdSchema, historyQuerySchema } from '../schemas/index.js';
import { z } from 'zod';

const router = express.Router();

// Schema for projectId param
const projectIdParamSchema = z.object({
    projectId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid project ID')
});

// Schema for history query with pagination
const historyPaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * GET /api/history/:projectId
 * Get history for a project with pagination
 */
router.get('/:projectId', validateParams(projectIdParamSchema), validateQuery(historyPaginationSchema), async (req, res) => {
    try {
        // Verify project ownership
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.userId !== req.telegramUser.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { page, limit } = req.query;
        const skip = (page - 1) * limit;

        const [history, total] = await Promise.all([
            History.find({ projectId: req.params.projectId })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            History.countDocuments({ projectId: req.params.projectId })
        ]);

        res.json({
            history,
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

        // Verify project ownership
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.userId !== req.telegramUser.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const historyItem = new History({
            projectId,
            topic: config.topic || '',
            targetUrl: config.targetUrl || '',
            config,
            result
        });

        await historyItem.save();

        res.json({ success: true, historyItem });
    } catch (error) {
        console.error('Add history error:', error);
        res.status(500).json({ error: 'Failed to add history' });
    }
});

/**
 * DELETE /api/history/:id
 * Delete history item
 */
router.delete('/:id', async (req, res) => {
    try {
        const historyItem = await History.findById(req.params.id);

        if (!historyItem) {
            return res.status(404).json({ error: 'History item not found' });
        }

        // Verify ownership via project
        const project = await Project.findById(historyItem.projectId);

        if (!project || project.userId !== req.telegramUser.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await History.findByIdAndDelete(req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete history error:', error);
        res.status(500).json({ error: 'Failed to delete history' });
    }
});

export default router;
