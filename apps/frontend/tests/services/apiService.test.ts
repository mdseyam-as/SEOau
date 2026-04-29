import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiService } from '../../services/apiService';

// Mock fetch globally
global.fetch = vi.fn();

describe('ApiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset apiService state
        (apiService as any).initData = '';
        (apiService as any).devTelegramId = null;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Authentication', () => {
        it('should call login endpoint', async () => {
            const mockResponse = { user: { id: 'test-user-1', telegramId: 123456789 } };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.login();

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/login'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-Telegram-Init-Data': ''
                    })
                })
            );
            expect(result).toEqual(mockResponse);
        });

        it('should set initData', () => {
            const initData = 'test_init_data';
            apiService.setInitData(initData);
            expect((apiService as any).initData).toBe(initData);
        });

        it('should set devTelegramId', () => {
            const devId = 123456789;
            apiService.setDevTelegramId(devId);
            expect((apiService as any).devTelegramId).toBe(devId);
        });
    });

    describe('Projects', () => {
        it('should get projects', async () => {
            const mockResponse = {
                projects: [
                    { id: '1', name: 'Project 1' },
                    { id: '2', name: 'Project 2' }
                ],
                pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
            };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.getProjects();

            expect(result).toEqual(mockResponse);
        });

        it('should create project', async () => {
            const mockResponse = { project: { id: 'new-project-id', name: 'New Project' } };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.createProject('New Project', 'Description');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/projects'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('New Project')
                })
            );
            expect(result).toEqual(mockResponse);
        });

        it('should delete project', async () => {
            const mockResponse = { success: true };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.deleteProject('project-id');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/projects/project-id'),
                expect.objectContaining({ method: 'DELETE' })
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('History', () => {
        it('should get history', async () => {
            const mockResponse = {
                history: [
                    { id: '1', topic: 'Test Topic', timestamp: '2024-01-01T00:00:00Z' }
                ],
                pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
            };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.getHistory('project-id');

            expect(result).toEqual(mockResponse);
        });

        it('should add to history', async () => {
            const mockConfig = { topic: 'Test', websiteName: 'Test Site' };
            const mockResult = { content: 'Test content', metaTitle: 'Test Title' };
            const mockResponse = { historyItem: { id: 'history-id' } };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.addToHistory('project-id', mockConfig as any, mockResult as any);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/history'),
                expect.objectContaining({ method: 'POST' })
            );
            expect(result).toEqual(mockResponse);
        });

        it('should delete history item', async () => {
            const mockResponse = { success: true };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.deleteHistoryItem('history-id');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/history/history-id'),
                expect.objectContaining({ method: 'DELETE' })
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('Generation', () => {
        it('should generate content', async () => {
            const mockConfig = { topic: 'Test', websiteName: 'Test Site' };
            const mockKeywords = [{ keyword: 'test', frequency: 1 }];
            const mockResult = { result: { content: 'Generated content' }, user: { telegramId: 123456789 } };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResult
            });

            const result = await apiService.generate(mockConfig as any, mockKeywords as any);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/generate'),
                expect.objectContaining({ method: 'POST' })
            );
            expect(result).toEqual(mockResult);
        });

        it('should check spam', async () => {
            const mockResponse = { spamScore: 5, spamAnalysis: 'Low spam' };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.checkSpam('Test content');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/generate/spam-check'),
                expect.objectContaining({ method: 'POST' })
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('Plans', () => {
        it('should get plans', async () => {
            const mockResponse = {
                plans: [
                    { id: 'free', name: 'Free' },
                    { id: 'pro', name: 'PRO' }
                ]
            };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.getPlans();

            expect(result).toEqual(mockResponse);
        });

        it('should get plan by id', async () => {
            const mockResponse = { plan: { id: 'pro', name: 'PRO' } };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await apiService.getPlan('pro');

            expect(global.fetch).toHaveBeenCalled();
            const callArgs = (global.fetch as any).mock.calls[0];
            expect(callArgs[0]).toContain('/plans/pro');
            expect(result).toEqual(mockResponse);
        });
    });

    describe('Error Handling', () => {
        it('should throw error on HTTP failure', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Unauthorized' })
            });

            await expect(apiService.login()).rejects.toThrow('Unauthorized');
        });

        it('should throw error on network failure', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            await expect(apiService.login()).rejects.toThrow('Network error');
        });
    });
});
