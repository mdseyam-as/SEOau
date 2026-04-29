# Frontend Tests

This directory contains unit tests for SEO Generator frontend (React + TypeScript).

## Test Structure

```
apps/frontend/tests/
├── components/
│   ├── AuthScreen.test.tsx      # Authentication component tests
│   ├── ProjectList.test.tsx      # Project list component tests
│   └── ...
├── services/
│   ├── apiService.test.ts        # API service tests
│   ├── authService.test.ts        # Auth service tests
│   └── ...
└── utils/
    └── ...
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Coverage

- Component rendering and behavior
- Service layer (API calls, data management)
- Type safety and TypeScript interfaces
- User interactions and state management

## Writing New Tests

1. Create a new test file in `apps/frontend/tests/components/` or `apps/frontend/tests/services/`
2. Import necessary dependencies from `@testing-library/react` and `vitest`
3. Use `describe()` to group related tests
4. Use `it()` for individual test cases
5. Use `beforeEach()` and `afterEach()` for setup/cleanup

## Example Test Template

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AuthScreen from '../components/AuthScreen';

// Mock dependencies
vi.mock('../services/apiService', () => ({
    apiService: {
        login: vi.fn(),
        setInitData: vi.fn()
    }
}));

describe('AuthScreen Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render login form', () => {
        render(<AuthScreen onLogin={vi.fn()} />);
        
        expect(screen.getByText('Вход в систему')).toBeInTheDocument();
    });

    it('should handle dev login', async () => {
        const mockOnLogin = vi.fn();
        render(<AuthScreen onLogin={mockOnLogin} />);
        
        const input = screen.getByPlaceholderText('Например: 123456789');
        fireEvent.change(input, { target: { value: '123456789' } });
        
        const button = screen.getByText('Войти (Dev Mode)');
        fireEvent.click(button);
        
        await waitFor(() => {
            expect(mockOnLogin).toHaveBeenCalled();
        });
    });
});
```

## Mocking External Dependencies

For tests that require API calls, use mocks:

```typescript
import { vi } from 'vitest';

vi.mock('../services/apiService', () => ({
    apiService: {
        login: vi.fn().mockResolvedValue({ user: mockUser }),
        getProjects: vi.fn().mockResolvedValue({ projects: [] })
    }
}));
```

## Testing with React Testing Library

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// User interactions
const user = userEvent.setup();

await user.click(button);
await user.type(input, 'test value');
```

## Snapshot Testing

For components that should not change unexpectedly:

```typescript
it('should match snapshot', () => {
    const { container } = render(<Component />);
    expect(container.firstChild).toMatchSnapshot();
});
```
