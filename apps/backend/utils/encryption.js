import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derives a key from the encryption key using scrypt
 */
function deriveKey(encryptionKey, salt) {
    return crypto.scryptSync(encryptionKey, salt, 32);
}

/**
 * Encrypts a string using AES-256-GCM
 * @param {string} text - The text to encrypt
 * @returns {string|null} - Encrypted string (salt:iv:authTag:encrypted) or null if encryption is disabled
 */
export function encrypt(text) {
    if (!text) return null;

    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY not set or too short. Cannot encrypt data.');
    }

    try {
        const salt = crypto.randomBytes(SALT_LENGTH);
        const key = deriveKey(encryptionKey, salt);
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Format: salt:iv:authTag:encrypted (all in hex)
        return [
            salt.toString('hex'),
            iv.toString('hex'),
            authTag.toString('hex'),
            encrypted
        ].join(':');
    } catch (error) {
        console.error('[Encryption] Error encrypting data:', error.message);
        return text; // Return unencrypted on error
    }
}

/**
 * Decrypts a string that was encrypted with encrypt()
 * @param {string} encryptedText - The encrypted string (salt:iv:authTag:encrypted)
 * @returns {string|null} - Decrypted text or null
 */
export function decrypt(encryptedText) {
    if (!encryptedText) return null;

    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey || encryptionKey.length < 32) {
        // If no encryption key, assume text is unencrypted
        return encryptedText;
    }

    // Check if text is encrypted (has the salt:iv:authTag:encrypted format)
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
        // Not encrypted, return as-is
        return encryptedText;
    }

    try {
        const [saltHex, ivHex, authTagHex, encrypted] = parts;

        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const key = deriveKey(encryptionKey, salt);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[Encryption] Error decrypting data:', error.message);
        // If decryption fails, it might be unencrypted text
        return encryptedText;
    }
}

/**
 * Checks if a string appears to be encrypted
 * @param {string} text - The text to check
 * @returns {boolean}
 */
export function isEncrypted(text) {
    if (!text) return false;
    const parts = text.split(':');
    if (parts.length !== 4) return false;

    // Check if all parts are valid hex
    return parts.every(part => /^[0-9a-f]+$/i.test(part));
}
