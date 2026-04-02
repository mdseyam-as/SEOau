import express from 'express';
import { prisma } from '../lib/prisma.js';
import { validateTelegramAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPlanSchema, updatePlanSchema } from '../schemas/index.js';
import { cacheGet, cacheSet, cacheDel, CACHE_KEYS } from '../utils/cache.js';
import { getPlanStarsPrice } from '../utils/starsPayments.js';

const router = express.Router();

const mapPlanForClient = (plan) => ({
    ...plan,
    id: plan.slug,
    priceStars: getPlanStarsPrice(plan)
});

/**
 * GET /api/plans
 * Get all plans (public) - cached
 */
router.get('/', async (req, res) => {
    try {
        // Try cache first
        let plans = await cacheGet(CACHE_KEYS.PLANS_ALL);

        if (!plans) {
            plans = await prisma.plan.findMany({
                where: { isActive: true },
                orderBy: { priceRub: 'asc' }
            });

            // Transform for backward compatibility (slug -> id)
            plans = plans.map(mapPlanForClient);

            // Cache for 10 minutes
            await cacheSet(CACHE_KEYS.PLANS_ALL, plans);
        }

        res.json({ plans });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

/**
 * GET /api/plans/:id
 * Get plan by slug - cached
 */
router.get('/:id', async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.PLAN(req.params.id);

        // Try cache first
        let plan = await cacheGet(cacheKey);

        if (!plan) {
            plan = await prisma.plan.findUnique({
                where: { slug: req.params.id }
            });

            if (!plan) {
                return res.status(404).json({ error: 'Plan not found' });
            }

            // Transform for backward compatibility
            plan = mapPlanForClient(plan);

            // Cache for 10 minutes
            await cacheSet(cacheKey, plan);
        }

        res.json({ plan });
    } catch (error) {
        console.error('Get plan error:', error);
        res.status(500).json({ error: 'Failed to get plan' });
    }
});

/**
 * Middleware to check admin role from DB
 */
const checkAdminRole = async (req, res, next) => {
    try {
        if (!req.telegramUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(req.telegramUser.id) }
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        req.user = user; // Attach full user object
        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Admin check failed' });
    }
};

/**
 * POST /api/plans
 * Create new plan (admin only)
 */
router.post('/', validateTelegramAuth, checkAdminRole, validate(createPlanSchema), async (req, res) => {
    try {
        // Extract only fields that exist in Prisma schema
        const {
            id,
            currency, features, price, // Ignore these - not in schema
            name,
            maxChars,
            maxGenerationsPerMonth,
            maxGenerationsPerDay,
            maxKeywords,
            allowedModels,
            canCheckSpam,
            canOptimizeRelevance,
            canUseGeoMode,
            canGenerateFaq,
            canUseSocialPack,
            canAudit,
            canRewrite,
            canHumanize,
            priceRub,
            priceStars,
            durationDays,
            isDefault,
            isActive
        } = req.body;

        const plan = await prisma.plan.create({
            data: {
                slug: id,
                name: name || id,
                maxChars: maxChars || 5000,
                maxGenerationsPerMonth: maxGenerationsPerMonth || 0,
                maxGenerationsPerDay: maxGenerationsPerDay || 0,
                maxKeywords: maxKeywords || 0,
                allowedModels: allowedModels || [],
                canCheckSpam: canCheckSpam || false,
                canOptimizeRelevance: canOptimizeRelevance || false,
                canUseGeoMode: canUseGeoMode || false,
                canGenerateFaq: canGenerateFaq || false,
                canUseSocialPack: canUseSocialPack || false,
                canAudit: canAudit || false,
                canRewrite: canRewrite || false,
                canHumanize: canHumanize || false,
                priceRub: priceRub || 0,
                priceStars: priceStars || 0,
                durationDays: durationDays || 30,
                isDefault: isDefault || false,
                isActive: isActive !== false
            }
        });

        // Invalidate plans cache
        await cacheDel(CACHE_KEYS.PLANS_ALL);

        res.json({
            success: true,
            plan: mapPlanForClient(plan)
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Plan with this ID already exists' });
        }
        console.error('Create plan error:', error);
        res.status(500).json({ error: 'Failed to create plan' });
    }
});

/**
 * PUT /api/plans/:id
 * Update plan (admin only)
 */
router.put('/:id', validateTelegramAuth, checkAdminRole, validate(updatePlanSchema), async (req, res) => {
    try {
        // Extract only fields that exist in Prisma schema
        const {
            id, slug, currency, features, price, // Ignore these - not in schema
            name,
            maxChars,
            maxGenerationsPerMonth,
            maxGenerationsPerDay,
            maxKeywords,
            allowedModels,
            canCheckSpam,
            canOptimizeRelevance,
            canUseGeoMode,
            canGenerateFaq,
            canUseSocialPack,
            canAudit,
            canRewrite,
            canHumanize,
            priceRub,
            priceStars,
            durationDays,
            isDefault,
            isActive
        } = req.body;

        // Build update data with only valid fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (maxChars !== undefined) updateData.maxChars = maxChars;
        if (maxGenerationsPerMonth !== undefined) updateData.maxGenerationsPerMonth = maxGenerationsPerMonth;
        if (maxGenerationsPerDay !== undefined) updateData.maxGenerationsPerDay = maxGenerationsPerDay;
        if (maxKeywords !== undefined) updateData.maxKeywords = maxKeywords;
        if (allowedModels !== undefined) updateData.allowedModels = allowedModels;
        if (canCheckSpam !== undefined) updateData.canCheckSpam = canCheckSpam;
        if (canOptimizeRelevance !== undefined) updateData.canOptimizeRelevance = canOptimizeRelevance;
        if (canUseGeoMode !== undefined) updateData.canUseGeoMode = canUseGeoMode;
        if (canGenerateFaq !== undefined) updateData.canGenerateFaq = canGenerateFaq;
        if (canUseSocialPack !== undefined) updateData.canUseSocialPack = canUseSocialPack;
        if (canAudit !== undefined) updateData.canAudit = canAudit;
        if (canRewrite !== undefined) updateData.canRewrite = canRewrite;
        if (canHumanize !== undefined) updateData.canHumanize = canHumanize;
        if (priceRub !== undefined) updateData.priceRub = priceRub;
        if (priceStars !== undefined) updateData.priceStars = priceStars;
        if (durationDays !== undefined) updateData.durationDays = durationDays;
        if (isDefault !== undefined) updateData.isDefault = isDefault;
        if (isActive !== undefined) updateData.isActive = isActive;

        const plan = await prisma.plan.update({
            where: { slug: req.params.id },
            data: updateData
        });

        // Invalidate caches
        await Promise.all([
            cacheDel(CACHE_KEYS.PLANS_ALL),
            cacheDel(CACHE_KEYS.PLAN(req.params.id))
        ]);

        res.json({
            success: true,
            plan: mapPlanForClient(plan)
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Plan not found' });
        }
        console.error('Update plan error:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

/**
 * DELETE /api/plans/:id
 * Delete plan (admin only)
 */
router.delete('/:id', validateTelegramAuth, checkAdminRole, async (req, res) => {
    try {
        await prisma.plan.delete({
            where: { slug: req.params.id }
        });

        // Invalidate caches
        await Promise.all([
            cacheDel(CACHE_KEYS.PLANS_ALL),
            cacheDel(CACHE_KEYS.PLAN(req.params.id))
        ]);

        res.json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Plan not found' });
        }
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

export default router;
