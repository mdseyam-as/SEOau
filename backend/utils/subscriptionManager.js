import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma.js';

let bot;

export function initializeBot(token) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In production, use webhook instead of polling to avoid 409 conflicts during redeploys
    // Polling causes issues when multiple instances try to getUpdates simultaneously
    if (isProduction) {
        // Create bot without polling - will use webhook
        bot = new TelegramBot(token, { polling: false });
        console.log('✅ Telegram Bot initialized (webhook mode - no polling)');
    } else {
        // In development, use polling for convenience
        bot = new TelegramBot(token, { polling: true });
        console.log('✅ Telegram Bot initialized (polling mode)');
    }

    // Log bot info
    bot.getMe().then(me => {
        console.log('✅ Telegram Bot initialized as:', {
            id: me.id,
            username: me.username,
            name: `@${me.username}`
        });
        
        // In production, set up webhook
        if (isProduction && process.env.WEBAPP_URL) {
            const webhookUrl = `${process.env.WEBAPP_URL}/api/webhook/telegram`;
            bot.setWebHook(webhookUrl)
                .then(() => console.log(`✅ Webhook set to: ${webhookUrl}`))
                .catch(err => console.error('❌ Failed to set webhook:', err.message));
        }
    }).catch(err => {
        console.error('❌ Failed to get bot info:', err.message);
    });

    // Log all incoming messages for debugging (only in dev with polling)
    if (!isProduction) {
        bot.on('message', (msg) => {
            console.log('📩 Incoming message:', {
                from: msg.from?.username,
                chatId: msg.chat.id,
                text: msg.text
            });
        });
    }

    return bot;
}

/**
 * Process incoming webhook update from Telegram
 */
export function processUpdate(update) {
    if (bot) {
        bot.processUpdate(update);
    }
}

/**
 * Grant subscription to a user
 */
export async function grantSubscription(telegramId, planId, days) {
    try {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + days);
        newExpiry.setHours(23, 59, 59, 999);

        // Ensure telegramId is BigInt
        const tgId = typeof telegramId === 'bigint' ? telegramId : BigInt(telegramId);

        const user = await prisma.user.update({
            where: { telegramId: tgId },
            data: {
                planId,
                subscriptionExpiry: newExpiry
            }
        });

        return user;
    } catch (error) {
        if (error.code === 'P2025') {
            console.error('User not found:', telegramId.toString());
            return null;
        }
        console.error('Error granting subscription:', error);
        throw error;
    }
}

/**
 * Check subscription status
 */
export async function checkSubscriptionStatus(telegramId) {
    try {
        const tgId = typeof telegramId === 'bigint' ? telegramId : BigInt(telegramId);

        const user = await prisma.user.findUnique({
            where: { telegramId: tgId }
        });

        if (!user) {
            return { active: false, reason: 'user_not_found' };
        }

        if (user.role === 'admin') {
            return { active: true, reason: 'admin' };
        }

        if (user.planId === 'free') {
            return { active: true, reason: 'free_plan' };
        }

        if (!user.subscriptionExpiry) {
            return { active: false, reason: 'no_subscription' };
        }

        const isActive = new Date(user.subscriptionExpiry) > new Date();
        return {
            active: isActive,
            reason: isActive ? 'valid' : 'expired',
            expiryDate: user.subscriptionExpiry
        };
    } catch (error) {
        console.error('Error checking subscription:', error);
        return { active: false, reason: 'error' };
    }
}

/**
 * Send notification to user via Telegram
 */
export async function notifyUser(telegramId, message) {
    try {
        if (!bot) {
            console.error('Bot not initialized');
            return false;
        }

        // Convert BigInt to number for Telegram API
        const chatId = typeof telegramId === 'bigint' ? Number(telegramId) : telegramId;

        await bot.sendMessage(chatId, message, {
            parse_mode: 'HTML'
        });

        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
}

/**
 * Send subscription activation notification
 */
export async function notifySubscriptionActivated(telegramId, planName, days) {
    const message = `🎉 <b>Подписка активирована!</b>\n\n` +
        `План: <b>${planName}</b>\n` +
        `Срок действия: <b>${days} дней</b>\n\n` +
        `Теперь вы можете пользоваться всеми функциями SEO Generator!`;

    return await notifyUser(telegramId, message);
}
