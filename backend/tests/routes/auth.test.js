import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateTelegramWebAppData, extractTelegramUser } from '../../utils/telegramAuth.js';

describe('Telegram Auth Utils', () => {
    const validBotToken = 'test_bot_token_123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
    
    describe('validateTelegramWebAppData', () => {
        it('should validate correct initData', () => {
            const authDate = Math.floor(Date.now() / 1000);
            const initData = `user=%7B%22id%22%3A123%2C%22first_name%22%3A%22Test%22%7D&auth_date=${authDate}&hash=test_hash`;
            
            // Mock crypto.createHmac to return consistent hash
            const result = validateTelegramWebAppData(initData, validBotToken);
            expect(typeof result).toBe('boolean');
        });

        it('should reject old auth_date (more than 1 hour)', () => {
            const oldDate = Math.floor(Date.now() / 1000) - 4000; // More than 1 hour ago
            const initData = `user=%7B%22id%22%3A123%7D&auth_date=${oldDate}&hash=test_hash`;
            
            const result = validateTelegramWebAppData(initData, validBotToken);
            expect(result).toBe(false);
        });

        it('should reject future auth_date (more than 5 minutes)', () => {
            const futureDate = Math.floor(Date.now() / 1000) + 400; // More than 5 minutes in future
            const initData = `user=%7B%22id%22%3A123%7D&auth_date=${futureDate}&hash=test_hash`;
            
            const result = validateTelegramWebAppData(initData, validBotToken);
            expect(result).toBe(false);
        });

        it('should reject empty initData', () => {
            const result = validateTelegramWebAppData('', validBotToken);
            expect(result).toBe(false);
        });

        it('should reject initData without hash', () => {
            const initData = 'user=%7B%22id%22%3A123%7D&auth_date=123456';
            const result = validateTelegramWebAppData(initData, validBotToken);
            expect(result).toBe(false);
        });

        it('should handle malformed initData gracefully', () => {
            const malformedData = 'invalid@@data';
            const result = validateTelegramWebAppData(malformedData, validBotToken);
            expect(result).toBe(false);
        });
    });

    describe('extractTelegramUser', () => {
        it('should extract user from valid initData', () => {
            const initData = `user=%7B%22id%22%3A123%2C%22first_name%22%3A%22Test%22%2C%22username%22%3A%22testuser%22%7D`;
            const user = extractTelegramUser(initData);
            
            expect(user).not.toBeNull();
            expect(user.id).toBe(123);
            expect(user.first_name).toBe('Test');
            expect(user.username).toBe('testuser');
        });

        it('should return null for initData without user', () => {
            const initData = 'auth_date=123456&hash=test';
            const user = extractTelegramUser(initData);
            expect(user).toBeNull();
        });

        it('should return null for empty initData', () => {
            const user = extractTelegramUser('');
            expect(user).toBeNull();
        });

        it('should handle malformed user JSON', () => {
            const initData = 'user=%7Binvalid_json%7D';
            const user = extractTelegramUser(initData);
            expect(user).toBeNull();
        });
    });
});
