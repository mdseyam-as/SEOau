import crypto from 'crypto';

const STARS_CURRENCY = 'XTR';
const PAYLOAD_PREFIX = 'stars';
const MAX_PAYLOAD_AGE_SECONDS = 60 * 60 * 24;

function getPayloadSecret() {
    return process.env.TELEGRAM_STARS_PAYLOAD_SECRET || process.env.ENCRYPTION_KEY || process.env.BOT_TOKEN || '';
}

function normalizePositiveInteger(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

export function getTelegramStarsPrices() {
    const raw = process.env.TELEGRAM_STARS_PRICES;

    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw);

        return Object.fromEntries(
            Object.entries(parsed)
                .map(([planSlug, amount]) => [planSlug, normalizePositiveInteger(amount)])
                .filter(([, amount]) => amount !== null)
        );
    } catch (error) {
        console.error('Failed to parse TELEGRAM_STARS_PRICES:', error.message);
        return {};
    }
}

export function getPlanStarsPrice(plan) {
    if (!plan) {
        return null;
    }

    const prices = getTelegramStarsPrices();
    return prices[plan.slug] ?? prices[plan.id] ?? null;
}

function signPayload(data) {
    const secret = getPayloadSecret();

    if (!secret) {
        throw new Error('TELEGRAM_STARS_PAYLOAD_SECRET or ENCRYPTION_KEY must be configured');
    }

    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex')
        .slice(0, 16);
}

export function createStarsInvoicePayload({ telegramId, planSlug, amount }) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadData = `${telegramId}:${planSlug}:${amount}:${timestamp}`;
    const signature = signPayload(payloadData);

    return `${PAYLOAD_PREFIX}:${telegramId}:${planSlug}:${amount}:${timestamp}:${signature}`;
}

export function parseAndVerifyStarsPayload(payload) {
    if (!payload || typeof payload !== 'string') {
        return { ok: false, reason: 'empty_payload' };
    }

    const parts = payload.split(':');
    if (parts.length !== 6 || parts[0] !== PAYLOAD_PREFIX) {
        return { ok: false, reason: 'invalid_format' };
    }

    const [, telegramIdRaw, planSlug, amountRaw, timestampRaw, signature] = parts;
    const amount = normalizePositiveInteger(amountRaw);
    const timestamp = normalizePositiveInteger(timestampRaw);

    if (!telegramIdRaw || !planSlug || !amount || !timestamp || !signature) {
        return { ok: false, reason: 'invalid_payload_data' };
    }

    const expectedSignature = signPayload(`${telegramIdRaw}:${planSlug}:${amount}:${timestamp}`);
    if (signature !== expectedSignature) {
        return { ok: false, reason: 'invalid_signature' };
    }

    const age = Math.floor(Date.now() / 1000) - timestamp;
    if (age > MAX_PAYLOAD_AGE_SECONDS) {
        return { ok: false, reason: 'payload_expired' };
    }

    return {
        ok: true,
        data: {
            telegramId: BigInt(telegramIdRaw),
            planSlug,
            amount,
            timestamp
        }
    };
}

export function getStarsInvoiceTitle(plan) {
    return `${plan.name}`.slice(0, 32);
}

export function getStarsInvoiceDescription(plan) {
    const features = [];

    if (plan.canUseGeoMode) features.push('GEO');
    if (plan.canGenerateFaq) features.push('FAQ');
    if (plan.canAudit) features.push('Audit');
    if (plan.canRewrite) features.push('Rewrite');

    const durationLabel = plan.durationDays > 0 ? `${plan.durationDays} дней` : 'постоянный доступ';
    const suffix = features.length > 0 ? ` • ${features.join(', ')}` : '';
    return `Подписка ${plan.name} на ${durationLabel}${suffix}`.slice(0, 255);
}

export function getStarsPriceLabel(plan) {
    const durationLabel = plan.durationDays > 0 ? `${plan.durationDays} дней` : 'доступ';
    return `${plan.name} • ${durationLabel}`.slice(0, 32);
}

export function getTelegramStarsCurrency() {
    return STARS_CURRENCY;
}
