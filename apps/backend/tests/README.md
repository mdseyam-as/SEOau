# Backend Tests

This directory contains unit tests for the SEO Generator backend.

## Test Structure

```
apps/backend/tests/
├── routes/
│   ├── auth.test.js       # Telegram authentication utilities tests
│   ├── projects.test.js    # Projects API routes tests
│   └── ...
└── utils/
    └── cache.test.js       # Cache utilities tests
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

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Coverage

- Telegram WebApp authentication validation
- User data extraction
- Project CRUD operations
- Cache operations (get, set, delete, pattern delete)

## Writing New Tests

1. Create a new test file in `apps/backend/tests/routes/` or `apps/backend/tests/utils/`
2. Import necessary dependencies from `node:test`
3. Use `describe()` to group related tests
4. Use `it()` for individual test cases
5. Use `beforeEach()` and `afterEach()` for setup/cleanup

## Example Test Template

```javascript
import { describe, it, expect, beforeEach } from 'node:test';

describe('Feature Name', () => {
    beforeEach(() => {
        // Setup before each test
    });

    it('should do something', () => {
        // Arrange
        const input = 'test';
        
        // Act
        const result = someFunction(input);
        
        // Assert
        expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
        // Test edge cases
        expect(() => someFunction(null)).toThrow();
    });
});
```

## Mocking External Dependencies

For tests that require database or external services, use mocks:

```javascript
vi.mock('../lib/prisma.js', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn()
        }
    }
}));
```
