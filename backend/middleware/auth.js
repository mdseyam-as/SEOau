import { validateTelegramWebAppData, extractTelegramUser } from '../utils/telegramAuth.js';

/**
 * Middleware to validate Telegram WebApp requests
 */
export function validateTelegramAuth(req, res, next) {
    try {
        const initData = req.headers['x-telegram-init-data'] || req.body.initData;

        if (!initData) {
            return res.status(401).json({ error: 'Missing Telegram init data' });
        }

        const botToken = process.env.BOT_TOKEN;

        if (!validateTelegramWebAppData(initData, botToken)) {
            return res.status(401).json({ error: 'Invalid Telegram data' });
        }

        const telegramUser = extractTelegramUser(initData);

        if (!telegramUser) {
            return res.status(401).json({ error: 'Cannot extract user data' });
        }

        // Attach user info to request
        req.telegramUser = telegramUser;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(req, res, next) {
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => parseInt(id.trim()));

    if (!req.telegramUser || !adminIds.includes(req.telegramUser.id)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
}
