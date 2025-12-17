import express from 'express';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { validateTelegramAuth as auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../schemas/index.js';
import { cacheGet, cacheSet, cacheDel, CACHE_KEYS } from '../utils/cache.js';

const router = express.Router();

/**
 * @route   GET /api/settings
 * @desc    Get global settings (public fields only for regular users)
 * @access  Private (all authenticated users)
 */
router.get('/', auth, async (req, res) => {
    try {
        // Check if user is admin to return full settings
        const user = await User.findOne({ telegramId: req.telegramUser.id });
        const isAdmin = user && user.role === 'admin';

        // Try to get from cache first
        let settings = await cacheGet(CACHE_KEYS.SETTINGS);

        if (!settings) {
            // Fetch from DB
            let dbSettings = await Settings.findById('global');

            if (!dbSettings) {
                dbSettings = new Settings({ _id: 'global' });
                await dbSettings.save();
            }

            settings = {
                openRouterApiKey: dbSettings.openRouterApiKey || '',
                systemPrompt: dbSettings.systemPrompt || '', // Legacy
                seoPrompt: dbSettings.seoPrompt || '',
                geoPrompt: dbSettings.geoPrompt || '',
                telegramLink: dbSettings.telegramLink || 'https://t.me/bankkz_admin',
                spamCheckModel: dbSettings.spamCheckModel || 'x-ai/grok-4.1-fast'
            };

            // Cache settings for 5 minutes
            await cacheSet(CACHE_KEYS.SETTINGS, settings);
        }

        // Regular users only get public settings (NO API keys!)
        if (isAdmin) {
            res.json({ settings });
        } else {
            const { openRouterApiKey, ...publicSettings } = settings;
            res.json({ settings: publicSettings });
        }
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
router.put('/', auth, validate(updateSettingsSchema), async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.telegramUser.id });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        const { openRouterApiKey, systemPrompt, seoPrompt, geoPrompt, telegramLink, spamCheckModel } = req.body;

        let settings = await Settings.findById('global');

        if (!settings) {
            settings = new Settings({ _id: 'global' });
        }

        // Update only provided fields
        if (openRouterApiKey !== undefined) settings.openRouterApiKey = openRouterApiKey;
        if (systemPrompt !== undefined) settings.systemPrompt = systemPrompt;
        if (seoPrompt !== undefined) settings.seoPrompt = seoPrompt;
        if (geoPrompt !== undefined) settings.geoPrompt = geoPrompt;
        if (telegramLink !== undefined) settings.telegramLink = telegramLink;
        if (spamCheckModel !== undefined) settings.spamCheckModel = spamCheckModel;

        await settings.save();

        // Invalidate cache
        await cacheDel(CACHE_KEYS.SETTINGS);

        res.json({
            settings: {
                openRouterApiKey: settings.openRouterApiKey,
                systemPrompt: settings.systemPrompt,
                seoPrompt: settings.seoPrompt,
                geoPrompt: settings.geoPrompt,
                telegramLink: settings.telegramLink,
                spamCheckModel: settings.spamCheckModel
            }
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
