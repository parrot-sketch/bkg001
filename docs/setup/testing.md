# Testing Guide

**Last Updated:** January 2025

## Overview

This project uses Vitest as the primary testing framework. Tests are organized by layer (domain, application, infrastructure) following Clean Architecture principles.

## Test Structure

```
tests/
├── unit/
│   └── domain/
│       ├── entities/
│       │   └── Patient.test.ts
│       ├── value-objects/
│       │   ├── Email.test.ts
│       │   ├── PhoneNumber.test.ts
│       │   └── Money.test.ts
│       ├── enums/
│       └── interfaces/
│           ├── repositories/
│           └── services/
├── integration/        # Future
└── e2e/                # Future
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

### Specific Test File

```bash
npm test tests/unit/domain/entities/Patient.test.ts
```

### Tests Matching Pattern

```bash
npm test Email
```

## Writing Tests

### Domain Entity Tests

```typescript
import { describe, it, expect } from 'vitest';
import { Patient } from '@domain/entities/Patient';

describe('Patient Entity', () => {
  it('should create a valid patient', () => {
    // Test implementation
  });
});
```

### Value Object Tests

```typescript
import { describe, it, expect } from 'vitest';
import { Email } from '@domain/value-objects/Email';

describe('Email Value Object', () => {
  it('should reject invalid email format', () => {
    expect(() => Email.create('invalid')).toThrow();
  });
});
```

### Interface Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { IPatientRepository } from '@domain/interfaces/repositories/IPatientRepository';

describe('IPatientRepository Interface', () => {
  it('should be mockable', () => {
    const mockRepo: IPatientRepository = {
      findById: vi.fn().mockResolvedValue(null),
      // ... other methods
    };
  });
});
```

## Testing Principles

### 1. Test Isolation
- Each test should be independent
- No shared state between tests
- Use `beforeEach` and `afterEach` for setup/teardown

### 2. Deterministic Tests
- Use fixed dates, not `new Date()`
- Mock random data
- Avoid side effects

### 3. Clear Test Names
- Describe what is being tested
- Include expected behavior
- Example: `should reject invalid email format`

### 4. Arrange-Act-Assert Pattern
```typescript
it('should calculate patient age correctly', () => {
  // Arrange
  const dob = new Date('1990-01-01');
  const patient = Patient.create({ /* ... */ });
  
  // Act
  const age = patient.getAge();
  
  // Assert
  expect(age).toBeGreaterThan(30);
});
```

## Test Coverage

### Current Coverage

- Domain Layer: Tests for entities, value objects, and interfaces
- Application Layer: (In progress)
- Infrastructure Layer: (Future)

### Coverage Goals

- Domain Layer: 90%+
- Application Layer: 80%+
- Overall: 80%+

### Viewing Coverage

After running `npm run test:coverage`:

1. Open `coverage/index.html` in a browser
2. Review per-file coverage
3. Identify untested code paths

## Mocking Strategy

### Domain Layer
- **No mocks needed** - Domain objects are pure
- Use real instances for testing

### Application Layer
- **Mock repositories** - Use Vitest mocks
- **Mock services** - Use interface mocks

### Infrastructure Layer
- **Test against real test database** - Use separate test DB
- **Mock external APIs** - Use Vitest mocks for HTTP calls

## Test Data

### Fixtures
- Create test data factories for common entities
- Use builders for complex test scenarios

### Example Fixture

```typescript
export function createTestPatient(overrides?: Partial<PatientData>): Patient {
  return Patient.create({
    id: 'test-patient-1',
    firstName: 'John',
    lastName: 'Doe',
    // ... defaults
    ...overrides,
  });
}
```

## Continuous Integration

Tests should run automatically on:
- Pull requests
- Before merging to main
- On commit (pre-commit hook - future)

## Troubleshooting

### Tests Failing Due to Time

If tests use dates/times:

```typescript
// Use fixed dates
const fixedDate = new Date('2025-01-15T10:00:00Z');
```

### Module Resolution Issues

If imports fail:

```typescript
// Use path aliases
import { Patient } from '@domain/entities/Patient';

// Not relative paths (avoid if possible)
// import { Patient } from '../../../domain/entities/Patient';
```

## Best Practices

1. **Test behavior, not implementation** - Test what the code does, not how
2. **Keep tests simple** - One assertion per test when possible
3. **Use descriptive names** - Test names should explain what is tested
4. **Test edge cases** - Invalid inputs, boundary conditions
5. **Maintain test quality** - Treat test code with same standards as production code

## References

- [Testing Strategy ADR](../decisions/adr-002-testing-strategy.md)
- [Vitest Documentation](https://vitest.dev)
