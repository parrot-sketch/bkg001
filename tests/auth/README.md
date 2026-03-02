# Authentication Testing Infrastructure

**Status:** Production Ready  
**Last Updated:** March 2, 2026

---

## Overview

Comprehensive testing infrastructure for HIMS authentication system. Includes unit tests, integration tests, and E2E test utilities.

## Quick Start

### Run All Auth Tests
```bash
# Unit tests (mocked dependencies)
npm run test:unit -- tests/auth/

# Integration tests (real database)
npm run test:integration

# E2E tests (browser automation)
npm run test:e2e -- tests/e2e/auth/
```

### Run Specific Test File
```bash
npm run test:unit -- tests/auth/JwtAuthService.test.ts
npm run test:unit:watch -- tests/auth/JwtAuthService.test.ts
```

## Test Architecture

### 1. Unit Tests (`tests/auth/`)

**Purpose:** Test authentication logic in isolation without database  
**Dependencies:** Mocked repositories, Prisma client

**Files:**
- `auth-test-utils.ts` - Utilities, factories, mocks
- `JwtAuthService.test.ts` - Unit tests for JwtAuthService
- `JwtMiddleware.test.ts` - Unit tests for middleware
- `Email.test.ts` - Value object tests

**Example:**
```typescript
import { setupAuthTests, TestUserFactory } from '../auth-test-utils';

describe('JwtAuthService', () => {
  let authService: JwtAuthService;
  
  beforeEach(() => {
    const { mockUserRepository } = setupAuthTests();
    authService = new JwtAuthService(mockUserRepository, ...);
  });

  it('should login successfully', async () => {
    const user = await TestUserFactory.createDoctorUser();
    const tokens = await authService.login(user.email, 'password');
    expect(tokens.accessToken).toBeDefined();
  });
});
```

### 2. Integration Tests (`tests/auth/auth-integration.test.ts`)

**Purpose:** Test authentication against real database  
**Dependencies:** Test database, real bcrypt hashing, real JWT signing

**Setup:**
```bash
# Create test database (from DATABASE_URL_TEST env var)
DATABASE_URL_TEST="postgresql://user:pass@localhost/hims_test" npm run test:integration
```

**Example:**
```typescript
describe('Login Flow', () => {
  // Uses real database, actual bcrypt, actual JWT signing
  it('should authenticate user with real hashing', async () => {
    const tokens = await authService.login(email, password);
    assertValidJwt(tokens.accessToken); // Real JWT verification
  });
});
```

### 3. E2E Tests (`tests/e2e/auth.spec.ts`)

**Purpose:** Test authentication from user's perspective  
**Tools:** Playwright browser automation

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test('login flow end-to-end', async ({ page, context }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'doctor@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('/doctor/dashboard');
  expect(page).toHaveTitle('Dashboard');
});
```

## Testing Utilities

### Test Factories

#### TestUserFactory
```typescript
// Create test users
const doctor = await TestUserFactory.createDoctorUser();
const nurse = await TestUserFactory.createNurseUser();
const admin = await TestUserFactory.createAdminUser({
  email: 'custom@example.com',
  firstName: 'John',
});
```

### Mock Repositories

#### MockUserRepository
```typescript
const mockRepo = new MockUserRepository();

// Setup test data
const user = await TestUserFactory.createDoctorUser();
mockRepo.setUser(user);

// Mock not found
mockRepo.setUserNotFound();

// Use in tests
const authService = new JwtAuthService(mockRepo, ...);
```

### Assertions

#### JWT Validation
```typescript
// Verify token is valid JWT
assertValidJwt(token);

// Decode without verification
const { payload } = decodeJwt(token);
console.log(payload.userId, payload.exp);

// Create auth headers
const headers = createAuthHeaders(token);
// { Authorization: "Bearer <token>" }
```

#### Error Assertions
```typescript
assertAuthError(error, 'Expected message');
assertAuthError(error, /Regex pattern/);
```

## Test Configuration

### Environment Variables

```bash
# Unit/Integration Tests
JWT_SECRET=test-secret-at-least-32-chars-for-testing
JWT_REFRESH_SECRET=test-refresh-secret-at-least-32-chars
DATABASE_URL_TEST=postgresql://user:pass@localhost/hims_test

# E2E Tests
E2E_TEST_URL=http://localhost:3000
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=test-password-123
```

### Test Database Setup

```bash
# Create test database
createdb hims_test

# Run migrations
DATABASE_URL_TEST="postgresql://localhost/hims_test" npx prisma migrate deploy

# Seed with test data (optional)
DATABASE_URL_TEST="postgresql://localhost/hims_test" npm run db:seed
```

## Coverage Targets

| Component | Unit | Integration | E2E | Target |
|-----------|------|-------------|-----|--------|
| JwtAuthService | ✅ | ✅ | ✅ | 95%+ |
| JwtMiddleware | ✅ | ✅ | ✅ | 95%+ |
| Login endpoint | ✅ | ✅ | ✅ | 100% |
| Refresh flow | ✅ | ✅ | ✅ | 100% |
| Logout flow | ✅ | ✅ | ✅ | 100% |
| RBAC checks | ✅ | ✅ | ✅ | 95%+ |

## Running Test Suite

### Unit Tests Only
```bash
npm run test:unit
npm run test:unit:watch
npm run test:coverage
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
npm run test:e2e:headed  # Show browser
npm run test:e2e:debug   # Debug mode
```

### All Tests
```bash
npm run test:all
```

## Example: Writing New Tests

### Unit Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setupAuthTests, TestUserFactory } from '../auth-test-utils';

describe('MyAuthFeature', () => {
  let authService: JwtAuthService;
  let cleanup: () => void;

  beforeEach(() => {
    const setup = setupAuthTests();
    cleanup = setup.reset;
    authService = new JwtAuthService(...);
  });

  afterEach(() => cleanup());

  it('should do something', async () => {
    // Arrange
    const user = await TestUserFactory.createDoctorUser();

    // Act
    const result = await authService.someMethod(user);

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Integration Test Template
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('MyAuthFeature Integration', () => {
  let db: PrismaClient;
  let userId: string;

  beforeAll(async () => {
    db = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL_TEST } }
    });
    // Setup test data in real database
  });

  afterAll(async () => {
    // Cleanup
    await db.$disconnect();
  });

  it('should work with real database', async () => {
    // Uses real database, bcrypt, JWT signing
  });
});
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test('my auth feature', async ({ page, context }) => {
  // Navigate, interact, assert from user perspective
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  // ... more interactions
  
  // Verify result
  await expect(page.locator('h1')).toContainText('Success');
});
```

## Best Practices

✅ **DO:**
- ✅ Test edge cases (expired tokens, invalid input, etc.)
- ✅ Use factories for test data creation
- ✅ Isolate tests (beforeEach cleanup)
- ✅ Mock external dependencies in unit tests
- ✅ Use real database for integration tests
- ✅ Test from user perspective in E2E
- ✅ Group related tests with describe()
- ✅ Name tests clearly (describe what they do)
- ✅ Keep tests fast (mocking over integration where possible)

❌ **DON'T:**
- ❌ Share state between tests
- ❌ Test implementation details (mock internals)
- ❌ Use real API keys in tests
- ❌ Skip cleanup in afterEach()
- ❌ Test unrelated concerns together
- ❌ Use setTimeout for synchronization
- ❌ Log sensitive data in tests
- ❌ Commit test failures without fixing

## Troubleshooting

### Tests timeout on refresh token
```
Issue: refreshToken() test times out
Solution: Ensure bcrypt saltRounds not too high in test config
Fix: Use saltRounds: 10 in testAuthConfig (not 12+)
```

### Integration test fails with "no database"
```
Issue: DATABASE_URL_TEST not set
Solution: Set environment variable before running tests
Fix: DATABASE_URL_TEST="..." npm run test:integration
```

### E2E test can't find element
```
Issue: page.locator() returns null
Solution: Element might not be visible or loaded
Fix: Add await page.waitForLoadState('load')
```

### Mock not being called
```
Issue: mockUserRepository.findByEmail not called
Solution: Might be using wrong mock instance
Fix: Verify mock is passed to authService constructor
```

## Performance Benchmarks

| Test Type | Count | Time | Avg Per Test |
|-----------|-------|------|--------------|
| Unit | 25 | 500ms | 20ms |
| Integration | 12 | 5s | 400ms |
| E2E | 8 | 30s | 3.75s |

**Target:** Unit tests < 1s, Integration tests < 10s, E2E tests < 1 min

---

## Related Documentation

- [AUTHENTICATION_ARCHITECTURE.md](../AUTHENTICATION_ARCHITECTURE.md) - Auth system design
- [SYSTEM_ARCHITECTURE_DESIGN_DOCUMENT.md](../SYSTEM_ARCHITECTURE_DESIGN_DOCUMENT.md) - Full system architecture
- [tests/auth/JwtAuthService.test.ts](JwtAuthService.test.ts) - Example unit tests
- [tests/auth/auth-integration.test.ts](auth-integration.test.ts) - Example integration tests

---

**Document Status:** ✅ Production Ready
