# Project Structure Audit Report

**Date:** January 2025  
**Purpose:** Critical audit of project structure to identify duplicates, inconsistencies, and cleanup opportunities

---

## Executive Summary

This audit identifies **multiple overlapping implementations** and **structural inconsistencies** that need cleanup. The project is in the middle of a Clean Architecture refactoring, which has resulted in:

1. **Duplicate API implementations** (Controllers vs Next.js API Routes)
2. **Mixed business logic layers** (Server Actions vs Use Cases)
3. **Utility organization confusion** (lib/ vs utils/)
4. **Service layer duplication** (lib/api/ vs utils/services/)
5. **Documentation scattered** across root and docs/
6. **Inconsistent routing patterns**

---

## 1. CRITICAL ISSUES: Duplicate Implementations

### 1.1 API Layer Duplication ⚠️ **HIGH PRIORITY**

**Problem:** Two separate API implementations exist:

1. **`controllers/`** - Class-based controllers (Clean Architecture style)
   - `AuthController.ts`
   - `PatientController.ts`
   - `AppointmentController.ts`
   - `ConsultationController.ts`
   - Uses use cases from `application/use-cases/`

2. **`app/api/`** - Next.js API Route Handlers (Next.js style)
   - `app/api/auth/login/route.ts`
   - `app/api/auth/register/route.ts`
   - `app/api/patients/route.ts`
   - `app/api/appointments/route.ts`
   - Directly instantiates use cases

**Evidence:**
- Both implement the same endpoints (login, register, etc.)
- Controllers are only imported in tests and some API routes
- API routes are the active implementation (used by frontend)
- Controllers appear to be legacy or unused

**Recommendation:**
- **Option A (Recommended):** Remove `controllers/` directory entirely, keep Next.js API routes
  - Next.js API routes are the standard pattern for Next.js apps
  - Already integrated with Next.js middleware
  - Simpler and more maintainable
  
- **Option B:** Migrate all API routes to use controllers
  - More consistent with Clean Architecture
  - Requires refactoring all API routes
  - Adds abstraction layer

**Action Items:**
- [ ] Audit which implementation is actually used
- [ ] Remove unused implementation
- [ ] Update documentation

---

### 1.2 Business Logic Duplication ⚠️ **HIGH PRIORITY**

**Problem:** Business logic exists in two places:

1. **`app/actions/`** - Server Actions (Next.js pattern)
   - `app/actions/patient.ts` - Direct Prisma queries
   - `app/actions/appointment.ts` - Direct Prisma queries
   - `app/actions/admin.ts`
   - `app/actions/medical.ts`
   - `app/actions/general.ts`

2. **`application/use-cases/`** - Clean Architecture Use Cases
   - `CreatePatientUseCase.ts`
   - `ScheduleAppointmentUseCase.ts`
   - `LoginUseCase.ts`
   - Uses domain entities and repositories

**Evidence:**
- Server Actions directly use Prisma (`db.patient.create()`)
- Use Cases use repository pattern (`patientRepository.save()`)
- Server Actions are actively used by frontend components
- Use Cases are used by API routes but not by Server Actions

**Example Duplication:**
```typescript
// app/actions/patient.ts - Direct Prisma
await db.patient.create({ data: {...} });

// application/use-cases/CreatePatientUseCase.ts - Repository pattern
await this.patientRepository.save(patient);
```

**Recommendation:**
- **Refactor Server Actions to call Use Cases**
  - Server Actions should be thin wrappers around use cases
  - Maintains Clean Architecture principles
  - Single source of truth for business logic

**Action Items:**
- [ ] Refactor `app/actions/patient.ts` to use `CreatePatientUseCase`
- [ ] Refactor `app/actions/appointment.ts` to use `ScheduleAppointmentUseCase`
- [ ] Refactor all Server Actions to delegate to use cases
- [ ] Remove direct Prisma calls from Server Actions

---

## 2. UTILITY ORGANIZATION CONFUSION

### 2.1 `lib/` vs `utils/` Overlap

**Current State:**

1. **`lib/utils.ts`** - UI utilities
   - `cn()` - Tailwind class merging
   - Framework-specific utilities

2. **`utils/index.ts`** - Business logic utilities
   - `formatNumber()` - Number formatting
   - `calculateAge()` - Age calculation
   - `calculateBMI()` - BMI calculation
   - `formatDateTime()` - Date formatting

3. **`lib/utils/patient.ts`** - Patient-specific utilities
   - Patient-related helper functions

**Problem:**
- Unclear separation of concerns
- `lib/` typically contains shared libraries
- `utils/` typically contains pure utility functions
- Both contain utility functions

**Recommendation:**
- **Consolidate into `lib/utils/`**
  - Move `utils/index.ts` → `lib/utils/index.ts`
  - Keep `lib/utils.ts` for UI-specific utilities (or rename to `lib/utils/ui.ts`)
  - Remove `utils/` directory
  - Update all imports

**Action Items:**
- [ ] Move `utils/index.ts` to `lib/utils/index.ts`
- [ ] Rename `lib/utils.ts` to `lib/utils/ui.ts` (or keep as is)
- [ ] Update all imports across codebase
- [ ] Remove `utils/` directory

---

### 2.2 Service Layer Confusion

**Current State:**

1. **`lib/api/`** - API Client (Frontend → Backend)
   - `lib/api/auth.ts` - Auth API client
   - `lib/api/patient.ts` - Patient API client
   - `lib/api/client.ts` - HTTP client wrapper
   - Used by frontend components to call API routes

2. **`utils/services/`** - Service Functions (Direct DB Access)
   - `utils/services/patient.ts` - Direct Prisma queries
   - `utils/services/appointment.ts` - Direct Prisma queries
   - `utils/services/doctor.ts` - Direct Prisma queries
   - Used by Server Actions and some components

**Problem:**
- `lib/api/` is for frontend API calls (correct)
- `utils/services/` contains business logic that should be in use cases
- Naming is confusing (both called "services")

**Recommendation:**
- **Keep `lib/api/`** - This is correct for API clients
- **Refactor `utils/services/`** - Move logic to use cases or repositories
  - `utils/services/patient.ts` → Use `CreatePatientUseCase`, `GetPatientUseCase`, etc.
  - Remove `utils/services/` after migration
  - Server Actions should call use cases, not service functions

**Action Items:**
- [ ] Audit `utils/services/` usage
- [ ] Migrate logic to use cases where appropriate
- [ ] Update Server Actions to use use cases instead of service functions
- [ ] Remove `utils/services/` directory

---

## 3. DOCUMENTATION ORGANIZATION

### 3.1 Scattered Documentation

**Current State:**

**Root Directory (14 markdown files):**
- `CLERK_CLEANUP.md`
- `CLERK_REMOVAL_COMPLETE.md`
- `DEPLOYMENT.md`
- `ENV_VARIABLES_GUIDE.md`
- `IMAGE_SETUP_GUIDE.md`
- `MODULE_RESOLUTION_FIXES.md`
- `PATIENT_SEED_INSTRUCTIONS.md`
- `PATIENT_SEED_UPDATE.md`
- `PRODUCTION_DB_SETUP.md`
- `QUICK_IMAGE_SETUP.md`
- `QUICK_START_AIVEN.md`
- `REFACTORING_COMPLETE.md`
- `WORKFLOW_ANALYSIS.md`
- `README.md` (main)

**`docs/` Directory (55+ markdown files):**
- Well-organized by category (architecture, auth, database, etc.)

**Problem:**
- Important documentation scattered in root
- Hard to find relevant docs
- Some root docs are historical (e.g., `CLERK_REMOVAL_COMPLETE.md`)

**Recommendation:**
- **Move root docs to `docs/`**
  - `DEPLOYMENT.md` → `docs/deployment/`
  - `ENV_VARIABLES_GUIDE.md` → `docs/setup/env-variables.md`
  - `PRODUCTION_DB_SETUP.md` → `docs/database/production-setup.md`
  - Historical docs → `docs/history/` or archive
  - Keep only `README.md` in root

**Action Items:**
- [ ] Create `docs/deployment/` directory
- [ ] Create `docs/history/` directory for historical docs
- [ ] Move root markdown files to appropriate `docs/` subdirectories
- [ ] Update any references to moved files
- [ ] Keep only `README.md` in root

---

## 4. ROUTING STRUCTURE INCONSISTENCIES

### 4.1 Multiple Route Patterns

**Current State:**

1. **`app/(auth)/`** - Authentication routes
   - `sign-in/`, `sign-up/`, `patient/`

2. **`app/(protected)/`** - Protected routes
   - `admin/`, `doctor/`, `patient/`, `record/`

3. **`app/admin/`** - Admin routes (duplicate?)
   - Separate from `app/(protected)/admin/`

4. **`app/doctor/`** - Doctor routes
   - Separate from `app/(protected)/doctor/`

5. **`app/patient/`** - Patient routes
   - Separate from `app/(protected)/patient/`

6. **`app/frontdesk/`** - Frontdesk routes

7. **`app/nurse/`** - Nurse routes

8. **`app/portal/`** - Portal routes

**Problem:**
- Unclear routing hierarchy
- Potential duplicate routes (`app/admin/` vs `app/(protected)/admin/`)
- Inconsistent protection patterns

**Recommendation:**
- **Audit route usage**
  - Check if `app/admin/` and `app/(protected)/admin/` both exist and serve different purposes
  - Consolidate duplicate routes
  - Document routing strategy

**Action Items:**
- [ ] List all route groups and their purposes
- [ ] Identify duplicate routes
- [ ] Consolidate or document why duplicates exist
- [ ] Create routing documentation

---

## 5. COMPONENT ORGANIZATION

### 5.1 Component Structure

**Current State:**
- `components/` - Well-organized by feature
- `components/ui/` - Base UI components
- `components/appointment/` - Appointment components
- `components/patient/` - Patient components
- etc.

**Status:** ✅ **GOOD** - Component organization appears clean

**Minor Issues:**
- Some components might have duplicate functionality
- Need to audit for unused components

**Action Items:**
- [ ] Audit for unused components
- [ ] Check for duplicate component functionality
- [ ] Document component organization patterns

---

## 6. TYPE DEFINITIONS

### 6.1 Type Organization

**Current State:**
- `types/` - TypeScript type definitions
- Types also defined in `lib/schema.ts` (Zod schemas)
- Types in domain entities

**Status:** ✅ **ACCEPTABLE** - Types are reasonably organized

**Recommendation:**
- Keep current structure
- Ensure types are exported from domain layer when needed

---

## 7. CLEANUP PRIORITY MATRIX

### High Priority (Do First)
1. ✅ **Remove duplicate API implementation** (Controllers vs API Routes)
2. ✅ **Refactor Server Actions to use Use Cases**
3. ✅ **Consolidate utility directories** (`lib/` vs `utils/`)

### Medium Priority (Do Next)
4. ✅ **Migrate `utils/services/` to use cases**
5. ✅ **Organize documentation** (move root docs to `docs/`)

### Low Priority (Nice to Have)
6. ✅ **Audit routing structure**
7. ✅ **Audit component organization**

---

## 8. RECOMMENDED CLEANUP PLAN

### Phase 1: Remove Duplicates (Week 1)
1. Decide on API implementation (keep API routes, remove controllers)
2. Remove `controllers/` directory
3. Update tests that reference controllers

### Phase 2: Refactor Business Logic (Week 2)
1. Refactor `app/actions/patient.ts` to use `CreatePatientUseCase`
2. Refactor `app/actions/appointment.ts` to use `ScheduleAppointmentUseCase`
3. Refactor all Server Actions to delegate to use cases
4. Remove direct Prisma calls from Server Actions

### Phase 3: Consolidate Utilities (Week 3)
1. Move `utils/index.ts` → `lib/utils/index.ts`
2. Update all imports
3. Remove `utils/` directory
4. Migrate `utils/services/` logic to use cases
5. Remove `utils/services/` directory

### Phase 4: Organize Documentation (Week 4)
1. Create `docs/deployment/` and `docs/history/`
2. Move root markdown files to appropriate locations
3. Update references
4. Archive historical docs

---

## 9. FILES TO DELETE (After Migration)

### Controllers (if removing)
- `controllers/AuthController.ts`
- `controllers/PatientController.ts`
- `controllers/AppointmentController.ts`
- `controllers/ConsultationController.ts`
- `controllers/middleware/` (if not used elsewhere)
- `controllers/types.ts`

### Utilities (after consolidation)
- `utils/index.ts` (move to `lib/utils/index.ts`)
- `utils/services/` (migrate to use cases)
- `utils/roles.ts` (check if used, move to appropriate location)
- `utils/seetings.ts` (typo? check usage)

### Documentation (after moving)
- Root markdown files (move to `docs/`)

---

## 10. METRICS

### Before Cleanup
- **API Implementations:** 2 (Controllers + API Routes)
- **Business Logic Layers:** 2 (Server Actions + Use Cases)
- **Utility Directories:** 2 (`lib/` + `utils/`)
- **Service Layers:** 2 (`lib/api/` + `utils/services/`)
- **Root Documentation Files:** 14

### After Cleanup (Target)
- **API Implementations:** 1 (API Routes only)
- **Business Logic Layers:** 1 (Use Cases, Server Actions as thin wrappers)
- **Utility Directories:** 1 (`lib/utils/`)
- **Service Layers:** 1 (`lib/api/` for API clients only)
- **Root Documentation Files:** 1 (`README.md`)

---

## 11. VALIDATION CHECKLIST

After cleanup, verify:
- [ ] All tests pass
- [ ] No broken imports
- [ ] API endpoints work correctly
- [ ] Server Actions work correctly
- [ ] Frontend components work correctly
- [ ] Documentation is accessible
- [ ] No duplicate functionality
- [ ] Clean Architecture principles maintained

---

## 12. NOTES

- This audit is based on static code analysis
- Some files may be used in ways not immediately obvious
- Always test thoroughly after making changes
- Consider creating a migration branch for cleanup work
- Update this document as cleanup progresses

---

**Next Steps:**
1. Review this audit with the team
2. Prioritize cleanup tasks
3. Create cleanup tickets/issues
4. Execute cleanup in phases
5. Update documentation as you go
