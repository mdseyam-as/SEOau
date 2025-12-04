import express from 'express';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import { validateTelegramAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPlanSchema, updatePlanSchema } from '../schemas/index.js';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern, CACHE_KEYS } from '../utils/cache.js';

const router = express.Router();

/**
 * GET /api/plans
 * Get all plans (public) - cached
 */
router.get('/', async (req, res) => {
    try {
        // Try cache first
        let plans = await cacheGet(CACHE_KEYS.PLANS_ALL);

        if (!plans) {
            plans = await Plan.find().sort({ priceRub: 1 }).lean();
            // Cache for 10 minutes
            await cacheSet(CACHE_KEYS.PLANS_ALL, plans);
        }

        res.json({ plans });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

/**
 * GET /api/plans/:id
 * Get plan by ID - cached
 */
router.get('/:id', async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.PLAN(req.params.id);

        // Try cache first
        let plan = await cacheGet(cacheKey);

        if (!plan) {
            plan = await Plan.findOne({ id: req.params.id }).lean();

            if (!plan) {
                return res.status(404).json({ error: 'Plan not found' });
            }

            // Cache for 10 minutes
            await cacheSet(cacheKey, plan);
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
router.post('/', validateTelegramAuth, checkAdminRole, validate(createPlanSchema), async (req, res) => {
    try {
        const plan = new Plan(req.body);
        await plan.save();

        // Invalidate plans cache
        await cacheDel(CACHE_KEYS.PLANS_ALL);

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
router.put('/:id', validateTelegramAuth, checkAdminRole, validate(updatePlanSchema), async (req, res) => {
    try {
        const plan = await Plan.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        // Invalidate caches
        await Promise.all([
            cacheDel(CACHE_KEYS.PLANS_ALL),
            cacheDel(CACHE_KEYS.PLAN(req.params.id))
        ]);

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

        // Invalidate caches
        await Promise.all([
            cacheDel(CACHE_KEYS.PLANS_ALL),
            cacheDel(CACHE_KEYS.PLAN(req.params.id))
        ]);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

export default router;
