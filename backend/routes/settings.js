import express from 'express';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { validateTelegramAuth as auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/settings
 * @desc    Get global settings
 * @access  Private (all authenticated users)
 */
router.get('/', auth, async (req, res) => {
    try {
        let settings = await Settings.findById('global');

        // If settings don't exist, create default ones
        if (!settings) {
            settings = new Settings({ _id: 'global' });
            await settings.save();
        }

        // Return settings (API key included for all users - they need it for generation)
        res.json({
            settings: {
                openRouterApiKey: settings.openRouterApiKey || '',
                systemPrompt: settings.systemPrompt || '',
                telegramLink: settings.telegramLink || 'https://t.me/bankkz_admin'
            }
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * @route   PUT /api/settings
 * @desc    Update global settings
 * @access  Private (admin only)
 */
router.put('/', auth, async (req, res) => {
    try {
        // Fetch user from DB to check role
        // req.telegramUser is set by auth middleware
        const user = await User.findOne({ telegramId: req.telegramUser.id });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        const { openRouterApiKey, systemPrompt, telegramLink } = req.body;

        let settings = await Settings.findById('global');

        if (!settings) {
            settings = new Settings({ _id: 'global' });
        }

        // Update only provided fields
        if (openRouterApiKey !== undefined) settings.openRouterApiKey = openRouterApiKey;
        if (systemPrompt !== undefined) settings.systemPrompt = systemPrompt;
        if (telegramLink !== undefined) settings.telegramLink = telegramLink;

        await settings.save();

        res.json({
            settings: {
                openRouterApiKey: settings.openRouterApiKey,
                systemPrompt: settings.systemPrompt,
                telegramLink: settings.telegramLink
            }
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
