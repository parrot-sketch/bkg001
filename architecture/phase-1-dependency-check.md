# Phase 1 — Dependency Verification
## 1. Overview
This document verifies all dependencies required by Phase 1 tasks. It checks for circular dependencies, hidden coupling, shared mutable state, and other risks before implementation begins.
## 2. Dependency Graph
```
External Libraries
├── react (18+)
├── @tanstack/react-query (v5)
├── next (14+)
├── vitest
├── lodash (debounce)
└── sonner (toast)

Project Internal
├── domain/
│   ├── enums/ (ConsultationState, ConsultationOutcomeType, PatientDecision, AppointmentStatus, Role)
│   ├── entities/ (Consultation)
│   ├── workflows/ (ConsultationWorkflowState)
│   └── interfaces/ (repositories)
├── application/
│   ├── dtos/ (AppointmentResponseDto, PatientResponseDto, ConsultationResponseDto, etc.)
│   └── use-cases/ (StartConsultationUseCase, CompleteConsultationUseCase)
├── infrastructure/
│   ├── api/ (consultationApi, doctorApi, apiClient)
│   ├── database/ (PrismaConsultationRepository)
│   └── services/ (ConsoleAuditService)
├── lib/
│   ├── api/client.ts (apiClient singleton)
│   ├── api/consultation.ts (consultationApi)
│   ├── api/doctor.ts (doctorApi)
│   └── db.ts (Prisma)
├── contexts/
│   ├── ConsultationContext.tsx (monolith)
│   └── AuthContext.tsx (global auth)
├── hooks/
│   ├── consultation/ (useConsultation, useSaveConsultationDraft, etc.)
│   ├── doctor/ (useDoctorTodayAppointments)
│   └── patient/ (useAuth)
└── components/
    ├── consultation/ (6 lazy components)
    └── ui/ (shadcn components)
```
## 3. Circular Dependency Check
### 3.1 Within Phase 1 Deliverables
| Dependency | Circular? | Risk |
|-----------|-----------|------|
| shared-kernel → nothing | No | None |
| infrastructure/api → shared-kernel | No | None |
| lib/query-config → nothing | No | None |
| lib/feature-flags → nothing | No | None |
| contexts/ConsultationContext.shim → shared-kernel | No | None |
**Result**: No circular dependencies within Phase 1 deliverables.
### 3.2 Between Phase 1 and Existing Code
| New Dependency | Existing Dependency | Circular? | Risk |
|---------------|---------------------|-----------|------|
| shared-kernel ← domain/enums | domain/enums ← shared-kernel | No | None — domain already depends on nothing |
| infrastructure/api ← application/dtos | application/dtos ← nothing | No | None — dtos are leaf types |
**Result**: No circular dependencies introduced.
## 4. Hidden Coupling Analysis
### 4.1 Shared Mutable State
| State | Current Owner | New Code Access | Risk | Mitigation |
|-------|--------------|-----------------|------|------------|
| localStorage (`consultation-draft-*`) | ConsultationContext | DraftStorage reads/writes | Low | Preserve exact key format; test thoroughly |
| React Query cache | ConsultationContext + hooks | QUERY_CONFIG defines keys | Low | QUERY_CONFIG matches existing keys exactly |
| apiClient singleton | Multiple files | API adapters wrap it | Low | Adapter is facade; singleton unchanged |
| AuthContext | Global | Feature flags use NEXT_PUBLIC_ vars | None | No coupling |
### 4.2 Provider Coupling
**Finding**: No providers exist yet in the target architecture. Phase 1 does not create providers. All Phase 1 code is infrastructure-only (adapters, config, utilities).
**Risk**: None.
### 4.3 Context Assumptions
| Context | Assumption | Verified? | Risk |
|---------|-----------|-----------|------|
| ConsultationContext | Uses `useReducer` with specific action types | Yes — verified in source | Low — Phase 1 does not modify context |
| AuthContext | Provides `user` object with `id` | Yes — verified in source | Low — Phase 1 does not use AuthContext |
### 4.4 Reducer Assumptions
| Reducer | Assumption | Verified? | Risk |
|---------|-----------|-----------|------|
| consultationReducer | Action types are string literals | Yes — verified | Low — Phase 1 does not modify reducer |
| consultationReducer | State shape is ConsultationProviderState | Yes — verified | Low |
### 4.5 React Query Dependencies
| Query Key | Used By | Phase 1 Impact | Risk |
|-----------|---------|----------------|------|
| `['consultation', appointmentId]` | useConsultation, useSaveConsultationDraft | QUERY_CONFIG defines same key | Low |
| `['patient-consultations', patientId]` | usePatientConsultationHistory | QUERY_CONFIG defines same key | Low |
| `['doctor', doctorId, 'appointments']` | useDoctorTodayAppointments | QUERY_CONFIG defines same key | Low |
**Result**: QUERY_CONFIG is additive; existing hooks continue using ad-hoc keys until Phase 2 migration.
## 5. Build and Configuration Prerequisites
### 5.1 Required
| Prerequisite | Status | Action |
|--------------|--------|--------|
| Vitest jsdom environment | Not configured | P1-001 adds it |
| Test directory for frontend | Not exists | P1-001 creates `tests/frontend/` |
| Shared kernel directory | Not exists | P1-002 creates it |
| TypeScript path alias for @/ | Exists | No action needed |
### 5.2 Not Required
| Item | Reason |
|------|--------|
| Feature flag service | Env vars sufficient for Phase 1 |
| Database migration | No backend changes |
| API versioning | No API contract changes |
| CI pipeline changes | Vitest config extends existing |
## 6. API Contract Dependencies
### 6.1 Current API Surface
| Endpoint | Method | Consumer | Phase 1 Impact |
|----------|--------|----------|----------------|
| `/appointments/:id` | GET | ConsultationContext | None — adapter wraps existing client |
| `/appointments/:id/consultation` | GET | useConsultation | None |
| `/appointments/:id/consultation/draft` | PUT | useSaveConsultationDraft | None |
| `/patients/:id` | GET | ConsultationContext | None — PatientApi adapter |
| `/patients/:id/vitals` | GET | ConsultationContext (direct apiClient) | None — PatientApi adapter |
| `/patients/:id/consultations` | GET | usePatientConsultationHistory | None |
| `/doctors/:id/appointments/today` | GET | useDoctorTodayAppointments | None — QueueApi adapter |
| `/doctors/by-user/:userId` | GET | ConsultationContext | None |
| `/consultations/:id/start` | POST | doctorApi | None |
| `/consultations/:id/complete` | POST | doctorApi | None |
| `/consultations/:id/heartbeat` | POST | ConsultationContext | None |
### 6.2 Contract Stability
**Result**: All API contracts remain stable during Phase 1. Adapters are wrappers; no endpoint signatures change.
## 7. Routing Dependencies
| Route | File | Phase 1 Impact |
|-------|------|----------------|
| `/doctor/consultations/session/[appointmentId]` | Session page | None — Phase 1 does not modify page |
| `/doctor/consultations/[consultationId]` | Detail page | None |
| `/doctor/consultations` | Hub page | None |
**Result**: No routing changes in Phase 1.
## 8. Risk Register for Dependencies
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DraftStorage key format mismatch | Low | Medium | Unit tests verify exact key format; staging validation with production data snapshot |
| QUERY_CONFIG key mismatch | Low | Low | Unit tests verify keys match current ad-hoc keys |
| Feature flag default incorrect | Low | High | Default to `false` (old path) in all flags; CI validates defaults |
| Test environment not compatible | Low | Medium | Run P1-001 first; fail fast if jsdom incompatible |
| Shared kernel types conflict with existing types | Low | Medium | Use distinct names; review all existing type definitions before settling shared kernel names |
## 9. Verification Checklist
- [ ] No circular dependencies in new code (`madge` or manual review)
- [ ] No new code imports from `contexts/ConsultationContext.tsx`
- [ ] No new code imports from `components/consultation/*`
- [ ] All new interfaces compile without errors
- [ ] All new implementations pass contract tests against existing clients
- [ ] DraftStorage preserves exact localStorage behavior
- [ ] QUERY_CONFIG keys match existing query keys exactly
- [ ] Feature flags default to safe (old path) values
- [ ] No production code modified in Phase 1
