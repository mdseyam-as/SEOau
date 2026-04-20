import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma.js';
import { getPlanStarsPrice, parseAndVerifyStarsPayload } from './starsPayments.js';

let bot;
let botInitPromise = null;

async function handlePreCheckoutQuery(query) {
    try {
        const parsed = parseAndVerifyStarsPayload(query.invoice_payload);
        if (!parsed.ok) {
            await bot.answerPreCheckoutQuery(query.id, false, {
                error_message: 'Не удалось проверить счет. Попробуйте открыть его заново.'
            });
            return;
        }

        const { telegramId, planSlug, amount } = parsed.data;
        if (telegramId !== BigInt(query.from.id)) {
            await bot.answerPreCheckoutQuery(query.id, false, {
                error_message: 'Этот счет создан для другого пользователя.'
            });
            return;
        }

        const plan = await prisma.plan.findUnique({
            where: { slug: planSlug }
        });

        if (!plan || !plan.isActive) {
            await bot.answerPreCheckoutQuery(query.id, false, {
                error_message: 'Тариф больше недоступен.'
            });
            return;
        }

        const currentPrice = getPlanStarsPrice(plan);
        if (!currentPrice || currentPrice !== amount || query.total_amount !== amount || query.currency !== 'XTR') {
            await bot.answerPreCheckoutQuery(query.id, false, {
                error_message: 'Цена тарифа изменилась. Откройте оплату заново.'
            });
            return;
        }

        await bot.answerPreCheckoutQuery(query.id, true);
    } catch (error) {
        console.error('Failed to handle pre_checkout_query:', error);
        try {
            await bot.answerPreCheckoutQuery(query.id, false, {
                error_message: 'Не удалось подтвердить оплату. Попробуйте позже.'
            });
        } catch (answerError) {
            console.error('Failed to answer pre_checkout_query:', answerError);
        }
    }
}

async function handleSuccessfulPaymentMessage(msg) {
    const payment = msg.successful_payment;
    if (!payment) {
        return;
    }

    try {
        const parsed = parseAndVerifyStarsPayload(payment.invoice_payload);
        if (!parsed.ok) {
            console.error('Invalid successful payment payload:', parsed.reason);
            return;
        }

        const { telegramId, planSlug, amount } = parsed.data;
        const chargeId = payment.telegram_payment_charge_id;

        const existingPayment = await prisma.payment.findUnique({
            where: { yookassaId: chargeId }
        });

        if (existingPayment) {
            console.log('Telegram Stars payment already processed:', chargeId);
            return;
        }

        const plan = await prisma.plan.findUnique({
            where: { slug: planSlug }
        });

        if (!plan || !plan.isActive) {
            console.error('Plan not found for Telegram Stars payment:', planSlug);
            return;
        }

        const expectedAmount = getPlanStarsPrice(plan);
        if (!expectedAmount || expectedAmount !== amount || payment.total_amount !== amount || payment.currency !== 'XTR') {
            console.error('Telegram Stars payment amount mismatch:', {
                planSlug,
                expectedAmount,
                payloadAmount: amount,
                paymentAmount: payment.total_amount,
                currency: payment.currency
            });
            return;
        }

        await prisma.payment.create({
            data: {
                telegramId,
                // Legacy field reused to keep Telegram charge id unique without schema migration.
                yookassaId: chargeId,
                planSlug,
                amount,
                currency: payment.currency,
                status: 'succeeded',
                paidAt: new Date()
            }
        });

        const user = await grantSubscription(telegramId, planSlug, plan.durationDays);
        if (!user) {
            console.error('Failed to grant Telegram Stars subscription for user:', telegramId.toString());
            return;
        }

        await notifySubscriptionActivated(telegramId, plan.name, plan.durationDays);
        console.log(`Telegram Stars subscription granted: User ${telegramId.toString()}, Plan ${planSlug}`);
    } catch (error) {
        console.error('Failed to process successful Telegram Stars payment:', error);
    }
}

export function initializeBot(token) {
    if (bot) {
        return bot;
    }

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

    bot.on('pre_checkout_query', (query) => {
        handlePreCheckoutQuery(query);
    });

    bot.on('message', (msg) => {
        if (msg.successful_payment) {
            handleSuccessfulPaymentMessage(msg);
        }
    });

    return bot;
}

export function getBot() {
    return bot;
}

export async function ensureBotInitialized() {
    if (bot) {
        return bot;
    }

    const token = process.env.BOT_TOKEN;
    if (!token) {
        return null;
    }

    if (!botInitPromise) {
        botInitPromise = Promise.resolve()
            .then(() => initializeBot(token))
            .catch((error) => {
                botInitPromise = null;
                throw error;
            });
    }

    try {
        return await botInitPromise;
    } finally {
        if (bot) {
            botInitPromise = null;
        }
    }
}

/**
 * Process incoming webhook update from Telegram
 */
export function processUpdate(update) {
    if (!bot) {
        return false;
    }

    bot.processUpdate(update);
    return true;
}

/**
 * Grant subscription to a user
 */
export async function grantSubscription(telegramId, planId, days) {
    try {
        const tgId = typeof telegramId === 'bigint' ? telegramId : BigInt(telegramId);
        const existingUser = await prisma.user.findUnique({
            where: { telegramId: tgId }
        });

        if (!existingUser) {
            console.error('User not found:', telegramId.toString());
            return null;
        }

        const baseDate = existingUser.subscriptionExpiry && new Date(existingUser.subscriptionExpiry) > new Date()
            ? new Date(existingUser.subscriptionExpiry)
            : new Date();

        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + days);
        newExpiry.setHours(23, 59, 59, 999);

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
