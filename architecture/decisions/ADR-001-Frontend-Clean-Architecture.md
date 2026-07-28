# ADR-001: Adopt Frontend Clean Architecture with Strict Layer Boundaries
## Status
Proposed
## Context
The Consultation Module currently follows an informal layered architecture. The Domain Layer is pure TypeScript, but the Application Layer logic is embedded in ConsultationContext rather than in dedicated use cases. The Presentation Layer directly accesses infrastructure (apiClient, doctorApi) in some components. There are no enforced boundaries between layers.
This informality has created a 976-line ConsultationContext that mixes data fetching, state management, business logic orchestration, and side effects. The module is functional but difficult to test, extend, or decompose.
## Decision
Adopt Frontend Clean Architecture with strict layer boundaries:
- **Presentation Layer**: Components, pages, layouts, presentation hooks. Depends on Application Layer providers and Shared Kernel only. Forbidden from importing Domain or Infrastructure directly.
- **Frontend Application Layer**: Use cases, application services, providers. Depends on Domain Layer, Infrastructure Layer, and Shared Kernel. Forbidden from importing Presentation Layer components or JSX.
- **Domain Layer (Frontend)**: Entities, value objects, enums, workflows, policies. Depends on Shared Kernel only. Forbidden from any I/O, framework, or mutable global state.
- **Infrastructure Layer**: API adapters, storage adapters, cache adapters, external service adapters. Depends on Domain Layer (interfaces) and Shared Kernel. Forbidden from Presentation Layer, business logic, or UI concerns.
- **Shared Kernel**: Types, constants, validation schemas, error codes. Depends on nothing. All other layers depend on it.
## Alternatives Considered
### Alternative 1: Keep Informal Structure
Maintain current architecture with cosmetic improvements (better comments, some extraction).
**Why rejected**: Does not solve the 976-line monolith problem. Parallel development remains blocked. Testing remains difficult.
### Alternative 2: Feature-Based Slicing Without Layers
Organize by feature (session, documentation, queue) without enforcing layer boundaries within each feature.
**Why rejected**: Features would still duplicate infrastructure concerns. Domain logic would leak into features. Testing would remain harder than Clean Architecture.
### Alternative 3: Strict Clean Architecture with No Pragmatism
Enforce boundaries with no exceptions (no direct Prisma in server components, no db import in use cases).
**Why rejected**: Too rigid for Next.js App Router. Server components need database access. Pragmatic exceptions are acceptable when documented.
## Trade-offs
- **Benefit**: Domain logic stays pure and testable. UI changes never break business rules. Infrastructure can be swapped without touching business logic.
- **Cost**: More boilerplate (interfaces, adapters, mappers). Steeper learning curve for new developers. Some pragmatic exceptions required for Next.js patterns.
- **Benefit**: Clear ownership and boundaries. Teams can work in parallel on different layers without merge conflicts.
- **Cost**: Initial velocity slower during extraction. All 15+ consumers of ConsultationContext must be migrated carefully.
## Consequences
- **Positive**: Domain layer remains pure TypeScript with zero framework dependencies. Use cases become independently testable with mocked repositories. Infrastructure adapters can be swapped (e.g., Prisma → Drizzle) without touching domain or application logic.
- **Positive**: New developers can understand the module by following the dependency rule: Presentation → Application → Domain → Shared Kernel.
- **Negative**: Server components in Next.js naturally need database access. We accept this pragmatic exception with documentation and lint rules to prevent abuse.
- **Negative**: Initial extraction phase (Phases 1-6) requires careful coordination to avoid breaking clinical workflows. Feature flags and rollback plans mitigate this risk.
## Compliance
- All new code must respect layer boundaries
- CI includes layer-boundary lint checks
- Exceptions (e.g., db in server components) must be documented in code comments
- Quarterly architecture review ensures boundaries are maintained
