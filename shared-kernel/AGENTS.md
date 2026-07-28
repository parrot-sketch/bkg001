# Shared Kernel — Architecture Guide

## Purpose

The Shared Kernel contains artifacts genuinely shared across multiple bounded contexts
within the Consultation Module. It is the **leaf dependency**: every other layer
depends on it, but it depends on nothing.

## Dependency Direction (Enforced)

```
Presentation
    ↓
Application
    ↓
Domain
    ↓
Shared Kernel
```

**Forbidden imports:**
- Shared Kernel → Application
- Shared Kernel → Presentation
- Shared Kernel → Infrastructure
- Shared Kernel → Domain (except during Phase 1 bootstrap before domain migration)

Shared Kernel must have zero knowledge of upper architectural layers.

## Folder Reference

| Folder | Belongs | Never Here |
|--------|---------|------------|
| `types/` | Primitive aliases, identity/value objects, temporal types | Coordinates, offsets, time-specific helpers |
| `errors/` | Error enums, shared error type definitions | Error handling logic, logging |
| `constants/` | App-wide constants, brand values, feature flag keys | Feature-specific values, magic numbers in modules |
| `interfaces/` | Adapter contracts, publisher interfaces, empty marker interfaces | Implementations, third-party wrappers |
| `events/` | Domain event payloads, event bus interfaces, event handlers | Event routes, side effects |
| `utils/` | Pure, framework-agnostic helper functions | I/O utilities, React hooks, component helpers |
| `validation/` | Zod schemas, invariant checks, guard functions | Validation middleware, form logic |
| `testing/` | Shared test factories, fixture generators | Test runners, production code |

## Stability Rules

- **High stability requirement**: additions must be justified by ≥2 bounded contexts.
- **Low volatility**: once published, names should not change without a migration period.
- **No business orchestration**: control flow belongs in Application or Domain layers.
- **No UI concerns**: no JSX, styles, or component references.
- **No infrastructure implementations**: no DB queries, HTTP calls, or file I/O.

## Ownership

- Architecture review required for any addition.
- Lint rules enforce dependency direction (CI).
- Quarterly review ensures boundaries are maintained.
