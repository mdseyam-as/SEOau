import express from 'express';
import User from '../models/User.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login or register user via Telegram WebApp
 */
router.post('/login', async (req, res) => {
    try {
        const tgUser = req.telegramUser;

        // Check if user exists
        let user = await User.findOne({ telegramId: tgUser.id });

        // Get admin IDs from env
        const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => parseInt(id.trim()));

        if (!user) {
            // Create new user with default plan
            user = new User({
                telegramId: tgUser.id,
                username: tgUser.username,
                firstName: tgUser.first_name,
                role: adminIds.includes(tgUser.id) ? 'admin' : 'user',
                planId: 'free',
                subscriptionExpiry: null,
                generationsUsed: 0,
                lastGenerationMonth: new Date().toISOString().slice(0, 7),
                generationsUsedToday: 0,
                lastGenerationDate: new Date().toISOString().slice(0, 10)
            });

            await user.save();
        } else {
            // Update user info if changed
            let updated = false;

            if (user.username !== tgUser.username) {
                user.username = tgUser.username;
                updated = true;
            }

            if (user.firstName !== tgUser.first_name) {
                user.firstName = tgUser.first_name;
                updated = true;
            }

            if (updated) {
                await user.save();
            }
        }

        res.json({ success: true, user });
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
        const user = await User.findOne({ telegramId: req.telegramUser.id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

export default router;
