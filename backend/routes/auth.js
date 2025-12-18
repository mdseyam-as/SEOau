import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login or register user via Telegram WebApp
 */
router.post('/login', async (req, res) => {
    try {
        const tgUser = req.telegramUser;
        const telegramId = BigInt(tgUser.id);

        // Get admin IDs from env
        const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
            .split(',')
            .map(id => BigInt(id.trim()))
            .filter(id => id > 0);

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { telegramId }
        });

        if (!user) {
            // Create new user with default plan
            user = await prisma.user.create({
                data: {
                    telegramId,
                    username: tgUser.username || null,
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name || null,
                    role: adminIds.includes(telegramId) ? 'admin' : 'user',
                    planId: 'free',
                    generationsUsed: 0,
                    lastGenerationMonth: new Date().toISOString().slice(0, 7),
                    generationsUsedToday: 0,
                    lastGenerationDate: new Date().toISOString().slice(0, 10)
                }
            });
        } else {
            // Update user info if changed
            const updates = {};

            if (user.username !== tgUser.username) {
                updates.username = tgUser.username || null;
            }

            if (user.firstName !== tgUser.first_name) {
                updates.firstName = tgUser.first_name;
            }

            if (tgUser.last_name && user.lastName !== tgUser.last_name) {
                updates.lastName = tgUser.last_name;
            }

            if (Object.keys(updates).length > 0) {
                user = await prisma.user.update({
                    where: { telegramId },
                    data: updates
                });
            }
        }

        // Convert BigInt to string for JSON serialization
        const userResponse = {
            ...user,
            telegramId: user.telegramId.toString(),
            _id: user.id // For backward compatibility
        };

        res.json({ success: true, user: userResponse });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(req.telegramUser.id) }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Convert BigInt to string for JSON serialization
        const userResponse = {
            ...user,
            telegramId: user.telegramId.toString(),
            _id: user.id
        };

        res.json({ user: userResponse });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

export default router;
