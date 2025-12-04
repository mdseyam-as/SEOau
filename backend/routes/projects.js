import express from 'express';
import Project from '../models/Project.js';
import History from '../models/History.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { createProjectSchema, mongoIdSchema, paginationSchema } from '../schemas/index.js';

const router = express.Router();

/**
 * GET /api/projects
 * Get all projects for current user with pagination
 */
router.get('/', validateQuery(paginationSchema), async (req, res) => {
    try {
        const { page, limit } = req.query;
        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            Project.find({ userId: req.telegramUser.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Project.countDocuments({ userId: req.telegramUser.id })
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
        const { name, description } = req.body;

        const project = new Project({
            userId: req.telegramUser.id,
            name,
            description: description || ''
        });

        await project.save();

        res.json({ success: true, project });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

/**
 * DELETE /api/projects/:id
 * Delete project and its history
 */
router.delete('/:id', validateParams(mongoIdSchema), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check ownership
        if (project.userId !== req.telegramUser.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Delete project and associated history (cascade delete)
        await Promise.all([
            Project.findByIdAndDelete(req.params.id),
            History.deleteMany({ projectId: req.params.id })
        ]);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
