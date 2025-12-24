import { vi } from 'node:test';

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DEV_BYPASS_TELEGRAM = 'true';

// Mock Telegram WebApp
global.window = {
    Telegram: {
        WebApp: {
            initData: 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%20User%22%7D',
            initDataUnsafe: {
                user: {
                    id: 123456789,
                    first_name: 'Test User',
                    username: 'testuser'
                }
            },
            expand: vi.fn(),
            ready: vi.fn()
        }
    }
};

// Set timezone for consistent tests
process.env.TZ = 'UTC';
