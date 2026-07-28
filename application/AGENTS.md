# Application Layer — Architecture Guide

## Purpose

The Application Layer is the coordination boundary between the Presentation Layer
(React components, hooks, contexts) and the Domain/Infrastructure layers.

It contains:
- **Use Cases** — stateless orchestrators for single business operations
- **Application Services** — stateful helpers for cross-cutting concerns
- **Commands / Queries** — CQRS intent types (lightweight, adopted incrementally)
- **Results** — generic outcome types for operation results
- **DTOs** — request/response types owned by the Application Layer
- **Mappers** — translate between Domain types and Application DTOs

## Dependency Direction (Enforced)

```
Presentation
    ↓
Use Cases
    ↓
Services
    ↓
Ports (Domain interfaces)
    ↓
Adapters (Infrastructure implementations)
    ↓
Shared Kernel
```

## Allowed Imports

| Module | May Import From |
|--------|-----------------|
| `application/use-cases/` | services, interfaces, results, domain, shared-kernel |
| `application/services/` | interfaces (ports), domain, shared-kernel, results |
| `application/commands/` | services, interfaces, results, domain, shared-kernel |
| `application/queries/` | services, interfaces, results, domain, shared-kernel |
| `application/dtos/` | domain (enums, VOs), shared-kernel |
| `application/mappers/` | domain, dtos, shared-kernel |
| `application/results/` | shared-kernel only |
| `application/interfaces/` | results, shared-kernel only |
| `application/orchestrators/` | services, use-cases, interfaces, results, domain, shared-kernel |

## Forbidden Imports

| Source | Target | Reason |
|--------|--------|--------|
| Application | Presentation | No JSX, hooks, or component references |
| Application | Infrastructure | No concrete HTTP clients, storage, or adapters |
| `results/` | Anything above Shared Kernel | Pure utility — leaf dependency |
| `interfaces/` | Anything above Shared Kernel | Pure types — leaf dependency |
| `dtos/` | Infrastructure adapters | DTOs are owned by Application Layer |

## Layer Boundaries

| Layer | Owner | Volatility | Stability |
|-------|-------|------------|-----------|
| Use Cases | Application | Medium | Stable once certified |
| Services | Application | Medium | Stable once certified |
| Commands | Application | Low | Very stable |
| Queries | Application | Low | Very stable |
| Results | Application | Low | Very stable |
| Interfaces | Application | Low | Very stable |
| DTOs | Application | Low | Very stable |
| Mappers | Application | Low | Very stable |
| Orchestrators | Application | Medium | Added incrementally |

## Subdirectory Ownership

| Subdirectory | Content | Owner |
|--------------|---------|-------|
| `use-cases/consultation/` | Consultation session use cases | Consultation Module |
| `use-cases/patient/` | Patient data use cases | Consultation Module |
| `use-cases/queue/` | Queue management use cases | Consultation Module |
| `services/` | Application services (DraftService, SessionService, etc.) | Consultation Module |
| `commands/` | Write-intent types | Consultation Module |
| `queries/` | Read-intent types | Consultation Module |
| `results/` | Shared Result<T, E> types | Cross-cutting |
| `interfaces/` | Command, Query base contracts | Cross-cutting |
| `dtos/consultation/` | Consultation request/response DTOs | Consultation Module |
| `dtos/patient/` | Patient request/response DTOs | Consultation Module |
| `dtos/queue/` | Queue request/response DTOs | Consultation Module |
| `mappers/` | Type mappers between layers | Consultation Module |
| `orchestrators/` | Multi-service workflow coordinators | Consultation Module |

## Stability Rules

- **High stability requirement**: interface contracts must not change without a migration period
- **No business orchestration** in results/ or interfaces/ — control flow belongs in Use Cases or Services
- **No infrastructure implementations** in any Application Layer directory
- **No UI concerns** — no JSX, styles, or React hooks in Application Layer
- **No direct HTTP calls** — all I/O flows through ports defined in `interfaces/`

## Extension Rules

- New Use Cases: add to the appropriate `use-cases/<domain>/` subdirectory
- New Services: add to `services/`
- New Commands/Queries: add to `commands/` or `queries/`
- New Result types: use the generic `Result<T, E>` from `results/`
- New DTOs: add to the appropriate `dto/<domain>/` subdirectory
- Barrel exports: update this `AGENTS.md` and `index.ts` when adding public types
