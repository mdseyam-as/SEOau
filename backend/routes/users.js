import express from 'express';
import User from '../models/User.js';
import Plan from '../models/Plan.js';

const router = express.Router();

/**
 * GET /api/users/:id
 * Get user by Telegram ID
 */
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: parseInt(req.params.id) });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', async (req, res) => {
    try {
        const telegramId = parseInt(req.params.id);

        // Only allow users to update themselves or admins to update anyone
        const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => parseInt(id.trim()));
        const isAdmin = adminIds.includes(req.telegramUser.id);

        if (!isAdmin && req.telegramUser.id !== telegramId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await User.findOneAndUpdate(
            { telegramId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * POST /api/users/:id/increment-usage
 * Increment generation usage counters
 */
router.post('/:id/increment-usage', async (req, res) => {
    try {
        const telegramId = parseInt(req.params.id);
        const user = await User.findOne({ telegramId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentMonth = new Date().toISOString().slice(0, 7);
        const currentDay = new Date().toISOString().slice(0, 10);

        // Update monthly
        if (user.lastGenerationMonth !== currentMonth) {
            user.generationsUsed = 1;
            user.lastGenerationMonth = currentMonth;
        } else {
            user.generationsUsed = (user.generationsUsed || 0) + 1;
        }

        // Update daily
        if (user.lastGenerationDate !== currentDay) {
            user.generationsUsedToday = 1;
            user.lastGenerationDate = currentDay;
        } else {
            user.generationsUsedToday = (user.generationsUsedToday || 0) + 1;
        }

        await user.save();

        res.json({ success: true, user });
    } catch (error) {
        console.error('Increment usage error:', error);
        res.status(500).json({ error: 'Failed to increment usage' });
    }
});

/**
 * POST /api/users/:id/check-limits
 * Check if user can generate content
 */
router.post('/:id/check-limits', async (req, res) => {
    try {
        const telegramId = parseInt(req.params.id);
        const user = await User.findOne({ telegramId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Admin always allowed
        if (user.role === 'admin') {
            return res.json({ allowed: true });
        }

        const plan = await Plan.findOne({ id: user.planId });
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        const currentMonth = new Date().toISOString().slice(0, 7);
        const currentDay = new Date().toISOString().slice(0, 10);

        // Check monthly limit
        if (plan.maxGenerationsPerMonth && plan.maxGenerationsPerMonth > 0) {
            const monthlyUsage = (user.lastGenerationMonth === currentMonth) ? (user.generationsUsed || 0) : 0;
            if (monthlyUsage >= plan.maxGenerationsPerMonth) {
                return res.json({ allowed: false, reason: 'monthly_limit' });
            }
        }

        // Check daily limit
        if (plan.maxGenerationsPerDay && plan.maxGenerationsPerDay > 0) {
            const dailyUsage = (user.lastGenerationDate === currentDay) ? (user.generationsUsedToday || 0) : 0;
            if (dailyUsage >= plan.maxGenerationsPerDay) {
                return res.json({ allowed: false, reason: 'daily_limit' });
            }
        }

        res.json({ allowed: true });
    } catch (error) {
        console.error('Check limits error:', error);
        res.status(500).json({ error: 'Failed to check limits' });
    }
});

export default router;
