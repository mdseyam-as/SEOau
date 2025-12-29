import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock fetch for server health check
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock apiService - factory must not reference external variables
vi.mock('../../../services/apiService', () => ({
    apiService: {
        setInitData: vi.fn(),
        setDevTelegramId: vi.fn(),
        login: vi.fn().mockResolvedValue({
            user: {
                id: 'test-user-id',
                telegramId: 123456789,
                username: 'testuser',
                firstName: 'Test User',
                role: 'user',
                planId: 'free',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
            }
        })
    }
}));

// Import component after mocks
import { AuthScreen } from '../../../components/AuthScreen';
import { apiService } from '../../../services/apiService';

describe('AuthScreen Component', () => {
    const mockOnLogin = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock successful server health check
        mockFetch.mockResolvedValue({ ok: true });
        // Reset Telegram mock
        (window as any).Telegram = {
            WebApp: {
                initData: '',
                initDataUnsafe: {},
                expand: vi.fn(),
                ready: vi.fn()
            }
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render login form when not in Telegram and server is online', async () => {
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            // Wait for server check to complete
            await waitFor(() => {
                expect(screen.getByText('Вход в систему')).toBeDefined();
            });
            expect(screen.getByPlaceholderText('Например: 123456789')).toBeDefined();
        });

        it('should render dev mode button when server is online', async () => {
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            await waitFor(() => {
                expect(screen.getByText('Войти (Dev Mode)')).toBeDefined();
            });
        });

        it('should show server offline message when server is down', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            await waitFor(() => {
                expect(screen.getByText('Сервер недоступен')).toBeDefined();
            });
        });
    });

    describe('User Interactions', () => {
        it('should handle dev login when form is submitted', async () => {
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            // Wait for server check
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Например: 123456789')).toBeDefined();
            });
            
            const input = screen.getByPlaceholderText('Например: 123456789');
            const button = screen.getByText('Войти (Dev Mode)');
            
            await userEvent.type(input, '123456789');
            await userEvent.click(button);
            
            await waitFor(() => {
                expect(apiService.setDevTelegramId).toHaveBeenCalledWith(123456789);
                expect(apiService.login).toHaveBeenCalled();
            });
        });

        it('should call onLogin after successful login', async () => {
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            // Wait for server check
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Например: 123456789')).toBeDefined();
            });
            
            const input = screen.getByPlaceholderText('Например: 123456789');
            const button = screen.getByText('Войти (Dev Mode)');
            
            await userEvent.type(input, '123456789');
            await userEvent.click(button);
            
            await waitFor(() => {
                expect(mockOnLogin).toHaveBeenCalled();
            });
        });
    });

    describe('Telegram WebApp Integration', () => {
        it('should call Telegram.WebApp.expand after server check', async () => {
            const expandMock = vi.fn();
            (window as any).Telegram = {
                WebApp: {
                    initData: '',
                    initDataUnsafe: {},
                    expand: expandMock,
                    ready: vi.fn()
                }
            };
            
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            await waitFor(() => {
                expect(expandMock).toHaveBeenCalled();
            });
        });

        it('should auto-login when Telegram initData is present and server is online', async () => {
            (window as any).Telegram = {
                WebApp: {
                    initData: 'test_init_data',
                    initDataUnsafe: {
                        user: { id: 123456789, first_name: 'Test' }
                    },
                    expand: vi.fn(),
                    ready: vi.fn()
                }
            };
            
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            await waitFor(() => {
                expect(apiService.setInitData).toHaveBeenCalledWith('test_init_data');
                expect(apiService.login).toHaveBeenCalled();
            });
        });
    });
});
