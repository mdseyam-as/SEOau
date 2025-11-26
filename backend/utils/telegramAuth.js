import crypto from 'crypto';

/**
 * Validates Telegram WebApp initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function validateTelegramWebAppData(initData, botToken) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

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
