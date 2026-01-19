# ADR-001: Domain Layer First Approach

**Status:** Accepted  
**Date:** January 2025  
**Deciders:** Senior Staff TypeScript Engineer, Healthcare Systems Architect

## Context

The HIMS system has grown organically with business logic scattered across actions and services. The system lacks clear separation between domain concepts and infrastructure concerns, making it difficult to test, maintain, and extend.

## Decision

We will establish a domain layer that contains pure business logic with zero dependencies on frameworks, databases, or external services.

## Options Considered

### Option 1: Continue with current structure
- **Pros:** No immediate refactoring effort
- **Cons:** Technical debt increases, testing remains difficult, scaling becomes harder

### Option 2: Extract domain layer incrementally (SELECTED)
- **Pros:** Can be done without breaking existing functionality, improves testability, establishes foundation for future improvements
- **Cons:** Requires discipline to maintain separation, gradual migration effort

### Option 3: Full rewrite with Clean Architecture
- **Pros:** Clean slate, optimal architecture from start
- **Cons:** High risk, long timeline, potential for bugs

## Decision Outcome

We selected Option 2: Incremental domain layer extraction.

### Implementation Plan

1. **Phase 1 (Week 1-2):** Create domain layer structure
   - Extract enums from Prisma schema
   - Create value objects (Email, PhoneNumber, Money)
   - Create base domain entities (Patient, Appointment)
   - Define repository and service interfaces

2. **Phase 2 (Week 2-3):** Implement infrastructure
   - Create Prisma repositories
   - Implement service adapters (Clerk, audit, notifications)

3. **Phase 3+:** Extract use cases and application services

### Principles

- **Zero Dependencies:** Domain layer must have no imports from other layers
- **Pure TypeScript:** No Prisma, no Next.js, no external libraries
- **Testable:** All domain logic must be unit testable without infrastructure
- **Immutable:** Value objects and entities are immutable by default

## Consequences

### Positive
- ✅ Business logic becomes testable in isolation
- ✅ Domain concepts are clearly defined
- ✅ Foundation for Clean Architecture refactor
- ✅ Improved code organization and maintainability

### Negative
- ⚠️ Requires discipline to maintain layer boundaries
- ⚠️ Additional abstraction layers may seem like overhead initially
- ⚠️ Gradual migration means dual maintenance during transition

### Risks
- **Risk:** Developers might bypass domain layer and use infrastructure directly
- **Mitigation:** Code reviews, clear documentation, linting rules

- **Risk:** Over-engineering domain models
- **Mitigation:** Start simple, evolve based on needs

## References

- [Clean Architecture Refactoring Plan](../architecture/layering.md)
- [System Overview](../architecture/system-overview.md)
