import crypto from 'crypto';

// Maximum age for initData in seconds (default: 3 hours)
const MAX_AUTH_AGE_SECONDS = parseInt(process.env.TELEGRAM_AUTH_MAX_AGE || '10800', 10);

/**
 * Validates Telegram WebApp initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function validateTelegramWebAppData(initData, botToken) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        // Validate auth_date is not too old
        const authDate = urlParams.get('auth_date');
        if (authDate) {
            const authTimestamp = parseInt(authDate, 10);
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const age = currentTimestamp - authTimestamp;

            if (age > MAX_AUTH_AGE_SECONDS) {
                console.warn(`Telegram auth_date too old: ${age} seconds (max: ${MAX_AUTH_AGE_SECONDS})`);
                return false;
            }

            // Reject future timestamps (clock skew protection, allow 5 min)
            if (authTimestamp > currentTimestamp + 300) {
                console.warn('Telegram auth_date is in the future');
                return false;
            }
        }

        // Sort parameters alphabetically
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Create secret key
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        // Calculate hash
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        return calculatedHash === hash;
    } catch (error) {
        console.error('Telegram validation error:', error);
        return false;
    }
}

/**
 * Extracts user data from Telegram WebApp initData
 */
export function extractTelegramUser(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const userParam = urlParams.get('user');

        if (!userParam) {
            return null;
        }

        return JSON.parse(decodeURIComponent(userParam));
    } catch (error) {
        console.error('Error extracting user:', error);
        return null;
    }
}
