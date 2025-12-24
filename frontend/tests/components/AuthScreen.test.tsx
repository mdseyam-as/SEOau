import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

    describe('Rendering', () => {
        it('should render login form when not in Telegram', () => {
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            expect(screen.getByText('Вход в систему')).toBeDefined();
            expect(screen.getByPlaceholderText('Например: 123456789')).toBeDefined();
        });

        it('should render dev mode button', () => {
            render(<AuthScreen onLogin={mockOnLogin} />);
            
            expect(screen.getByText('Войти (Dev Mode)')).toBeDefined();
        });
    });

    describe('User Interactions', () => {
        it('should handle dev login when form is submitted', async () => {
            render(<AuthScreen onLogin={mockOnLogin} />);
            
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
        it('should call Telegram.WebApp.expand on mount', () => {
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
            
            expect(expandMock).toHaveBeenCalled();
        });

        it('should auto-login when Telegram initData is present', async () => {
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
