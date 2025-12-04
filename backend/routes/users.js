import express from 'express';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { updateUserSchema, adminUpdateUserSchema, paginationSchema } from '../schemas/index.js';
import { z } from 'zod';

const router = express.Router();

// Schema for creating user (admin only)
const createUserSchema = z.object({
    telegramId: z.union([z.string(), z.number()]).transform(val => Number(val)),
    firstName: z.string().min(1).max(100),
    username: z.string().max(100).optional(),
    planId: z.string().max(50).optional().default('free')
});

/**
 * Helper: ensure that the requester is an admin based on DB role
 */
async function ensureAdmin(req, res) {
    try {
        const requester = await User.findOne({ telegramId: req.telegramUser.id });
        if (!requester || requester.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return null;
        }
        return requester;
    } catch (e) {
        console.error('Admin check error:', e);
        res.status(500).json({ error: 'Admin check failed' });
        return null;
    }
}

/**
 * GET /api/users
 * Get all users with pagination (Admin only)
 */
router.get('/', validateQuery(paginationSchema), async (req, res) => {
    try {
        const adminUser = await ensureAdmin(req, res);
        if (!adminUser) return;

        const { page, limit } = req.query;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments()
        ]);

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

/**
 * POST /api/users
 * Create new user (Admin only)
 */
router.post('/', validate(createUserSchema), async (req, res) => {
    try {
        const adminUser = await ensureAdmin(req, res);
        if (!adminUser) return;

        const { telegramId, firstName, username, planId } = req.body;

        const existingUser = await User.findOne({ telegramId });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const user = new User({
            telegramId,
            firstName,
            username,
            planId: planId || 'free',
            role: 'user'
        });

        await user.save();
        res.json({ success: true, user });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * GET /api/users/:id
 * Get user by Telegram ID (only own data or admin can access others)
 */
router.get('/:id', async (req, res) => {
    try {
        const telegramId = parseInt(req.params.id);

        // Check if requester is admin
        const requester = await User.findOne({ telegramId: req.telegramUser.id });
        const isAdmin = requester && requester.role === 'admin';

        // Only allow users to get their own data or admins to get anyone's data
        if (!isAdmin && req.telegramUser.id !== telegramId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await User.findOne({ telegramId });

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

        // Check if requester is admin (from DB, not just env)
        const requester = await User.findOne({ telegramId: req.telegramUser.id });
        const isAdmin = requester && requester.role === 'admin';

        // Only allow users to update themselves or admins to update anyone
        if (!isAdmin && req.telegramUser.id !== telegramId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Whitelist allowed fields to prevent mass assignment
        const allowedFieldsForUser = ['firstName', 'username'];
        const allowedFieldsForAdmin = ['firstName', 'username', 'role', 'planId', 'subscriptionExpiry', 'generationsUsed', 'generationsUsedToday', 'lastGenerationMonth', 'lastGenerationDate'];

        const allowedFields = isAdmin ? allowedFieldsForAdmin : allowedFieldsForUser;

        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const user = await User.findOneAndUpdate(
            { telegramId },
            updateData,
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
 * Increment generation usage counters (only own usage or admin)
 */
router.post('/:id/increment-usage', async (req, res) => {
    try {
        const telegramId = parseInt(req.params.id);

        // Check if requester is admin
        const requester = await User.findOne({ telegramId: req.telegramUser.id });
        const isAdmin = requester && requester.role === 'admin';

        // Only allow users to increment their own usage or admins to do it for anyone
        if (!isAdmin && req.telegramUser.id !== telegramId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

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
 * Check if user can generate content (only own limits or admin)
 */
router.post('/:id/check-limits', async (req, res) => {
    try {
        const telegramId = parseInt(req.params.id);

        // Check if requester is admin
        const requester = await User.findOne({ telegramId: req.telegramUser.id });
        const isAdmin = requester && requester.role === 'admin';

        // Only allow users to check their own limits or admins to check anyone's
        if (!isAdmin && req.telegramUser.id !== telegramId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

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
