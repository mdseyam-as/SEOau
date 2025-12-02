import express from 'express';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import { validateTelegramAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/plans
 * Get all plans (public)
 */
router.get('/', async (req, res) => {
    try {
        const plans = await Plan.find().sort({ priceRub: 1 });
        res.json({ plans });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

/**
 * GET /api/plans/:id
 * Get plan by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const plan = await Plan.findOne({ id: req.params.id });

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        res.json({ plan });
    } catch (error) {
        console.error('Get plan error:', error);
        res.status(500).json({ error: 'Failed to get plan' });
    }
});

/**
 * Middleware to check admin role from DB
 */
const checkAdminRole = async (req, res, next) => {
    try {
        if (!req.telegramUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findOne({ telegramId: req.telegramUser.id });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        req.user = user; // Attach full user object
        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Admin check failed' });
    }
};

/**
 * POST /api/plans
 * Create new plan (admin only)
 */
router.post('/', validateTelegramAuth, checkAdminRole, async (req, res) => {
    try {
        const plan = new Plan(req.body);
        await plan.save();

        res.json({ success: true, plan });
    } catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({ error: 'Failed to create plan' });
    }
});

/**
 * PUT /api/plans/:id
 * Update plan (admin only)
 */
router.put('/:id', validateTelegramAuth, checkAdminRole, async (req, res) => {
    try {
        const plan = await Plan.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        res.json({ success: true, plan });
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

/**
 * DELETE /api/plans/:id
 * Delete plan (admin only)
 */
router.delete('/:id', validateTelegramAuth, checkAdminRole, async (req, res) => {
    try {
        const plan = await Plan.findOneAndDelete({ id: req.params.id });

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

export default router;
