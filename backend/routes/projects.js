import express from 'express';
import Project from '../models/Project.js';

const router = express.Router();

/**
 * GET /api/projects
 * Get all projects for current user
 */
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.telegramUser.id })
            .sort({ createdAt: -1 });

        res.json({ projects });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to get projects' });
    }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

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
 * Delete project
 */
router.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check ownership
        if (project.userId !== req.telegramUser.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await Project.findByIdAndDelete(req.params.id);

        // Note: History cleanup would be done in a separate route or via cascade

        res.json({ success: true });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
