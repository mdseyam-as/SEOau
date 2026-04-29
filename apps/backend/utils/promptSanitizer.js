/**
 * Prompt Sanitization Utility
 * Protects against prompt injection attacks
 */

// Patterns that could indicate prompt injection attempts
const INJECTION_PATTERNS = [
    // English patterns
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi,
    /disregard\s+(all\s+)?(previous|above|prior|the)\s+(instructions?|prompts?|rules?|above)/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|context)/gi,
    /new\s+instructions?:/gi,
    /system\s*prompt:/gi,
    /override\s+(system|instructions?|rules?)/gi,
    /you\s+are\s+now\s+(?:a\s+)?(?:new|different)/gi,
    /act\s+as\s+(?:if|though)\s+you/gi,
    /pretend\s+(?:you|that|the)/gi,
    /\[\s*SYSTEM\s*\]/gi,
    /\[\s*INST\s*\]/gi,
    /<\s*system\s*>/gi,
    /```\s*system/gi,
    /reveal\s+(your|the)\s+(system|secret|hidden)/gi,
    /what\s+(is|are)\s+your\s+(system|secret|hidden)\s+(prompt|instructions?)/gi,

    // Russian patterns
    /игнорир(уй|овать)\s+(все\s+)?(предыдущ|выше|ранее)/gi,
    /забудь\s+(все\s+)?(предыдущ|выше)/gi,
    /новые\s+инструкции:/gi,
    /системн(ый|ая|ое)\s+промпт/gi,
    /ты\s+теперь/gi,
    /притвор(ись|яйся)/gi,
];

// Characters/patterns that should be escaped or removed
const DANGEROUS_CHARS = [
    { pattern: /```/g, replacement: '`​`​`' }, // Add zero-width spaces
    { pattern: /<script/gi, replacement: '&lt;script' },
    { pattern: /<\/script/gi, replacement: '&lt;/script' },
];

/**
 * Sanitizes user input before including in AI prompts
 * @param {string} text - User input text
 * @param {Object} options - Sanitization options
 * @param {number} options.maxLength - Maximum allowed length (default: 10000)
 * @param {boolean} options.removeInjection - Remove detected injection patterns (default: true)
 * @param {boolean} options.logWarnings - Log warnings for suspicious content (default: true)
 * @returns {string} - Sanitized text
 */
export function sanitizePromptInput(text, options = {}) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    const {
        maxLength = 10000,
        removeInjection = true,
        logWarnings = true
    } = options;

    let sanitized = text;
    let warningsFound = [];

    // 1. Trim and limit length
    sanitized = sanitized.trim().substring(0, maxLength);

    // 2. Check for and handle injection patterns
    if (removeInjection) {
        for (const pattern of INJECTION_PATTERNS) {
            if (pattern.test(sanitized)) {
                warningsFound.push(`Potential injection pattern detected: ${pattern.source}`);
                sanitized = sanitized.replace(pattern, '[filtered]');
            }
        }
    }

    // 3. Escape dangerous characters
    for (const { pattern, replacement } of DANGEROUS_CHARS) {
        sanitized = sanitized.replace(pattern, replacement);
    }

    // 4. Remove null bytes and other control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 5. Log warnings if suspicious content found
    if (logWarnings && warningsFound.length > 0) {
        console.warn('[PromptSanitizer] Suspicious content detected:', warningsFound);
    }

    return sanitized;
}

/**
 * Sanitizes an object's string fields recursively
 * @param {Object} obj - Object to sanitize
 * @param {string[]} fieldsToSanitize - Array of field names to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} - Object with sanitized fields
 */
export function sanitizeObjectFields(obj, fieldsToSanitize, options = {}) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const result = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(result)) {
        if (fieldsToSanitize.includes(key) && typeof result[key] === 'string') {
            result[key] = sanitizePromptInput(result[key], options);
        } else if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = sanitizeObjectFields(result[key], fieldsToSanitize, options);
        }
    }

    return result;
}

/**
 * Wraps user content in clear delimiters to prevent injection
 * @param {string} content - User content
 * @param {string} label - Label for the content (e.g., "Topic", "Keywords")
 * @returns {string}
 */
export function wrapUserContent(content, label = 'User Content') {
    const sanitized = sanitizePromptInput(content);
    return `--- BEGIN ${label.toUpperCase()} ---\n${sanitized}\n--- END ${label.toUpperCase()} ---`;
}

export default {
    sanitizePromptInput,
    sanitizeObjectFields,
    wrapUserContent
};
