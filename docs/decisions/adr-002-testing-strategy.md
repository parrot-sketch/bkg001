# ADR-002: Testing Strategy

**Status:** Accepted  
**Date:** January 2025  
**Deciders:** Senior Staff TypeScript Engineer, Healthcare Systems Architect

## Context

The HIMS system currently has minimal testing. As we refactor to Clean Architecture, we need a clear testing strategy to ensure reliability and maintainability.

## Decision

We will implement a comprehensive testing strategy with Vitest, prioritizing unit tests for domain logic and integration tests for infrastructure.

## Testing Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  (Few, critical user flows)
        └─────────────┘
       ┌─────────────────┐
       │ Integration     │  (Medium, key workflows)
       │ Tests           │
       └─────────────────┘
     ┌─────────────────────┐
     │  Unit Tests         │  (Many, all domain logic)
     └─────────────────────┘
```

## Test Types

### Unit Tests
- **Scope:** Domain entities, value objects, business rules
- **Tool:** Vitest
- **Location:** `tests/unit/domain/`
- **Requirements:**
  - Fast execution (< 100ms per test)
  - No external dependencies (mocks/stubs only)
  - Deterministic (no random data, fixed dates)
  - High coverage (target: 90%+ for domain layer)

### Integration Tests
- **Scope:** Repositories, use cases with real database
- **Tool:** Vitest + test database
- **Location:** `tests/integration/`
- **Requirements:**
  - Use isolated test database
  - Clean up after each test
  - Test real workflows end-to-end

### E2E Tests
- **Scope:** Critical user journeys
- **Tool:** Playwright or Cypress (future)
- **Location:** `tests/e2e/`
- **Requirements:**
  - Test full user flows
  - Use test environment
  - Minimal set (only critical paths)

## Testing Rules

### Domain Layer Tests
- ✅ Test all business rules
- ✅ Test validation logic
- ✅ Test edge cases
- ✅ No mocks of domain objects (they're pure)

### Application Layer Tests
- ✅ Mock repositories
- ✅ Mock external services
- ✅ Test use case orchestration
- ✅ Test error handling

### Infrastructure Layer Tests
- ✅ Use real test database for repositories
- ✅ Test Prisma-specific implementations
- ✅ Test adapters (Clerk, etc.)

## Test Coverage Goals

- **Domain Layer:** 90%+
- **Application Layer:** 80%+
- **Infrastructure Layer:** 70%+
- **Overall:** 80%+

## Test Organization

```
tests/
├── unit/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── enums/
│   │   └── interfaces/
│   ├── application/
│   └── infrastructure/
├── integration/
│   ├── repositories/
│   ├── use-cases/
│   └── services/
└── e2e/
    └── workflows/
```

## Consequences

### Positive
- ✅ High confidence in refactoring
- ✅ Documentation through tests
- ✅ Prevents regressions
- ✅ Enables safe refactoring

### Negative
- ⚠️ Requires time investment
- ⚠️ Maintenance overhead
- ⚠️ May slow initial development

## Tools

- **Vitest:** Test runner (fast, Vite-based)
- **@vitest/coverage-v8:** Coverage reporting
- **Test Database:** Isolated PostgreSQL instance for integration tests

## References

- [Local Development Guide](../setup/local-development.md)
- [Testing Guide](../setup/testing.md)
