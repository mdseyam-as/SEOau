import express from 'express';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { createStarsInvoiceSchema } from '../schemas/index.js';
import { getBot } from '../utils/subscriptionManager.js';
import {
    createStarsInvoicePayload,
    getPlanStarsPrice,
    getStarsInvoiceDescription,
    getStarsInvoiceTitle,
    getStarsPriceLabel,
    getTelegramStarsCurrency
} from '../utils/starsPayments.js';

const router = express.Router();

/**
 * POST /api/payments/stars/create
 * Create Telegram Stars invoice link for a subscription plan
 */
router.post('/stars/create', validate(createStarsInvoiceSchema), async (req, res) => {
    try {
        const bot = getBot();
        if (!bot) {
            return res.status(503).json({ error: 'Telegram bot is not initialized yet' });
        }

        const telegramId = BigInt(req.telegramUser.id);
        const { planId } = req.body;

        const plan = await prisma.plan.findUnique({
            where: { slug: planId }
        });

        if (!plan || !plan.isActive) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (plan.slug === 'free' || plan.priceRub <= 0) {
            return res.status(400).json({ error: 'Free plans cannot be purchased via Telegram Stars' });
        }

        const starsAmount = getPlanStarsPrice(plan);
        if (!starsAmount) {
            return res.status(400).json({
                error: 'Telegram Stars price is not configured for this plan'
            });
        }

        const payload = createStarsInvoicePayload({
            telegramId: telegramId.toString(),
            planSlug: plan.slug,
            amount: starsAmount
        });

        const invoiceLink = await bot.createInvoiceLink(
            getStarsInvoiceTitle(plan),
            getStarsInvoiceDescription(plan),
            payload,
            '',
            getTelegramStarsCurrency(),
            [{ label: getStarsPriceLabel(plan), amount: starsAmount }]
        );

        res.json({
            ok: true,
            invoiceLink,
            starsAmount,
            currency: getTelegramStarsCurrency(),
            plan: {
                id: plan.slug,
                name: plan.name,
                durationDays: plan.durationDays
            }
        });
    } catch (error) {
        console.error('Create Telegram Stars invoice error:', error);
        res.status(500).json({ error: 'Failed to create Telegram Stars invoice' });
    }
});

export default router;
