import express from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { grantSubscription, notifySubscriptionActivated, processUpdate } from '../utils/subscriptionManager.js';

const router = express.Router();

/**
 * POST /api/webhook/telegram
 * Handle Telegram Bot webhook updates
 */
router.post('/telegram', (req, res) => {
    try {
        // Process the update through the bot
        processUpdate(req.body);
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Telegram webhook error:', error);
        res.status(500).json({ error: 'Failed to process update' });
    }
});

/**
 * Validates ЮKassa webhook signature
 */
function validateYukassaSignature(body, signature) {
    const secret = process.env.YUKASSA_WEBHOOK_SECRET;

    if (!secret) {
        console.error('YUKASSA_WEBHOOK_SECRET not configured');
        return false;
    }

    const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');

    return hash === signature;
}

/**
 * POST /api/webhook/payment
 * Handle ЮKassa payment notifications
 * https://yookassa.ru/developers/using-api/webhooks
 */
router.post('/payment', async (req, res) => {
    try {
        // Validate signature
        const signature = req.headers['x-yookassa-signature'];

        if (!validateYukassaSignature(req.body, signature)) {
            console.error('Invalid ЮKassa signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { event, object } = req.body;

        // Only process successful payments
        if (event !== 'payment.succeeded') {
            return res.status(200).json({ received: true });
        }

        // Extract metadata
        const { metadata } = object;

        if (!metadata || !metadata.telegramId || !metadata.planId) {
            console.error('Missing metadata in payment:', object.id);
            return res.status(400).json({ error: 'Missing metadata' });
        }

        const telegramId = BigInt(metadata.telegramId);
        const planId = metadata.planId;

        // Get plan details
        const plan = await prisma.plan.findUnique({
            where: { slug: planId }
        });

        if (!plan) {
            console.error('Plan not found:', planId);
            return res.status(404).json({ error: 'Plan not found' });
        }

        // Record payment
        await prisma.payment.create({
            data: {
                telegramId,
                yookassaId: object.id,
                planSlug: planId,
                amount: Math.round(parseFloat(object.amount.value) * 100), // Convert to kopeks
                currency: object.amount.currency,
                status: 'succeeded',
                paidAt: new Date()
            }
        });

        // Grant subscription
        const user = await grantSubscription(telegramId, planId, plan.durationDays);

        if (!user) {
            console.error('Failed to grant subscription for user:', telegramId.toString());
            return res.status(500).json({ error: 'Failed to grant subscription' });
        }

        // Send notification to user
        await notifySubscriptionActivated(telegramId, plan.name, plan.durationDays);

        console.log(`Subscription granted: User ${telegramId.toString()}, Plan ${planId}`);

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * GET /api/webhook/test
 * Test endpoint to verify webhook is reachable
 */
router.get('/test', (req, res) => {
    res.json({ status: 'ok', message: 'Webhook endpoint is reachable' });
});

export default router;
