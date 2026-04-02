import express from 'express';
import { prisma } from '../lib/prisma.js';
import { validateTelegramAuth as auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../schemas/index.js';
import { cacheGet, cacheSet, cacheDel, CACHE_KEYS } from '../utils/cache.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = express.Router();

function normalizeTelegramLink(value) {
    if (!value || typeof value !== 'string') return 'https://t.me/bankkz_admin';

    const trimmed = value.trim();
    if (!trimmed) return 'https://t.me/bankkz_admin';

    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^t\.me\//i.test(trimmed)) return `https://${trimmed}`;
    if (/^@/.test(trimmed)) return `https://t.me/${trimmed.slice(1)}`;
    return `https://t.me/${trimmed}`;
}

/**
 * @route   GET /api/settings
 * @desc    Get global settings (public fields only for regular users)
 * @access  Private (all authenticated users)
 */
router.get('/', auth, async (req, res) => {
    try {
        // Check if user is admin to return full settings
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(req.telegramUser.id) }
        });
        const isAdmin = user && user.role === 'admin';

        // Try to get from cache first
        let settings = await cacheGet(CACHE_KEYS.SETTINGS);

        if (!settings) {
            // Fetch from DB
            let dbSettings = await prisma.systemSetting.findUnique({
                where: { id: 'global' }
            });

            if (!dbSettings) {
                // Create default settings
                dbSettings = await prisma.systemSetting.create({
                    data: {
                        id: 'global',
                        telegramLink: 'https://t.me/bankkz_admin',
                        spamCheckModel: 'x-ai/grok-2-1212'
                    }
                });
            }

            settings = {
                // Decrypt API key when reading
                openRouterApiKey: decrypt(dbSettings.openRouterApiKey) || '',
                seoPrompt: dbSettings.seoPrompt || '',
                geoPrompt: dbSettings.geoPrompt || '',
                telegramLink: normalizeTelegramLink(dbSettings.telegramLink),
                spamCheckModel: dbSettings.spamCheckModel || 'x-ai/grok-2-1212'
            };

            // Cache settings for 5 minutes
            await cacheSet(CACHE_KEYS.SETTINGS, settings);
        } else {
            settings = {
                ...settings,
                telegramLink: normalizeTelegramLink(settings.telegramLink)
            };
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
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(req.telegramUser.id) }
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        const { openRouterApiKey, seoPrompt, geoPrompt, telegramLink, spamCheckModel } = req.body;

        // Build update data (only provided fields)
        const updateData = {};
        // Encrypt API key before storing
        if (openRouterApiKey !== undefined) updateData.openRouterApiKey = encrypt(openRouterApiKey);
        if (seoPrompt !== undefined) updateData.seoPrompt = seoPrompt;
        if (geoPrompt !== undefined) updateData.geoPrompt = geoPrompt;
        if (telegramLink !== undefined) updateData.telegramLink = normalizeTelegramLink(telegramLink);
        if (spamCheckModel !== undefined) updateData.spamCheckModel = spamCheckModel;

        const settings = await prisma.systemSetting.upsert({
            where: { id: 'global' },
            update: updateData,
            create: {
                id: 'global',
                ...updateData
            }
        });

        // Invalidate cache
        await cacheDel(CACHE_KEYS.SETTINGS);

        res.json({
            settings: {
                // Decrypt API key for response
                openRouterApiKey: decrypt(settings.openRouterApiKey) || '',
                seoPrompt: settings.seoPrompt || '',
                geoPrompt: settings.geoPrompt || '',
                telegramLink: normalizeTelegramLink(settings.telegramLink),
                spamCheckModel: settings.spamCheckModel || ''
            }
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
