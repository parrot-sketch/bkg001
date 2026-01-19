# Project Cleanup Checklist

Quick reference for cleanup tasks identified in the audit.

## 🔴 Critical Issues

### 1. Duplicate API Implementations
- [ ] **Decision:** Choose one API pattern (API Routes recommended)
- [ ] Remove `controllers/` directory
- [ ] Update tests that reference controllers
- [ ] Update documentation

**Files to remove:**
- `controllers/AuthController.ts`
- `controllers/PatientController.ts`
- `controllers/AppointmentController.ts`
- `controllers/ConsultationController.ts`
- `controllers/middleware/`
- `controllers/types.ts`

### 2. Business Logic Duplication
- [ ] Refactor `app/actions/patient.ts` → use `CreatePatientUseCase`
- [ ] Refactor `app/actions/appointment.ts` → use `ScheduleAppointmentUseCase`
- [ ] Refactor `app/actions/admin.ts` → use appropriate use cases
- [ ] Refactor `app/actions/medical.ts` → use appropriate use cases
- [ ] Refactor `app/actions/general.ts` → use appropriate use cases
- [ ] Remove all direct Prisma calls from Server Actions

**Pattern to follow:**
```typescript
// ❌ OLD: Direct Prisma
export async function createPatient(data: any) {
  await db.patient.create({ data });
}

// ✅ NEW: Use Case
export async function createPatient(data: any) {
  const useCase = new CreatePatientUseCase(...);
  return await useCase.execute(data);
}
```

## 🟡 Medium Priority

### 3. Utility Consolidation
- [ ] Move `utils/index.ts` → `lib/utils/index.ts`
- [ ] Rename `lib/utils.ts` → `lib/utils/ui.ts` (or keep as is)
- [ ] Update all imports from `@/utils` → `@/lib/utils`
- [ ] Remove `utils/` directory

**Files to move:**
- `utils/index.ts` → `lib/utils/index.ts`
- `utils/roles.ts` → `lib/utils/roles.ts` (or appropriate location)
- `utils/seetings.ts` → Check usage, fix typo, move to appropriate location

### 4. Service Layer Cleanup
- [ ] Audit `utils/services/` usage
- [ ] Migrate `utils/services/patient.ts` logic to use cases
- [ ] Migrate `utils/services/appointment.ts` logic to use cases
- [ ] Migrate `utils/services/doctor.ts` logic to use cases
- [ ] Migrate `utils/services/medical.ts` logic to use cases
- [ ] Migrate `utils/services/payments.ts` logic to use cases
- [ ] Migrate `utils/services/staff.ts` logic to use cases
- [ ] Remove `utils/services/` directory

**Keep:**
- `lib/api/` - API client (frontend → backend) ✅

**Remove:**
- `utils/services/` - Direct DB access (should use use cases) ❌

### 5. Documentation Organization
- [ ] Create `docs/deployment/` directory
- [ ] Create `docs/history/` directory
- [ ] Move `DEPLOYMENT.md` → `docs/deployment/`
- [ ] Move `ENV_VARIABLES_GUIDE.md` → `docs/setup/env-variables.md`
- [ ] Move `PRODUCTION_DB_SETUP.md` → `docs/database/production-setup.md`
- [ ] Move `QUICK_START_AIVEN.md` → `docs/setup/quick-start-aiven.md`
- [ ] Move `IMAGE_SETUP_GUIDE.md` → `docs/setup/image-setup.md`
- [ ] Move `QUICK_IMAGE_SETUP.md` → `docs/setup/quick-image-setup.md`
- [ ] Move historical docs to `docs/history/`:
  - `CLERK_CLEANUP.md`
  - `CLERK_REMOVAL_COMPLETE.md`
  - `REFACTORING_COMPLETE.md`
  - `MODULE_RESOLUTION_FIXES.md`
  - `WORKFLOW_ANALYSIS.md`
- [ ] Move seed docs to `docs/database/`:
  - `PATIENT_SEED_INSTRUCTIONS.md`
  - `PATIENT_SEED_UPDATE.md`
- [ ] Update all references to moved files
- [ ] Keep only `README.md` in root

## 🟢 Low Priority

### 6. Routing Audit
- [ ] List all route groups:
  - `app/(auth)/`
  - `app/(protected)/`
  - `app/admin/`
  - `app/doctor/`
  - `app/patient/`
  - `app/frontdesk/`
  - `app/nurse/`
  - `app/portal/`
- [ ] Identify duplicate routes
- [ ] Document routing strategy
- [ ] Consolidate if needed

### 7. Component Audit
- [ ] Check for unused components
- [ ] Check for duplicate component functionality
- [ ] Document component organization

## 📋 Validation

After cleanup, verify:
- [ ] All tests pass
- [ ] No broken imports
- [ ] API endpoints work
- [ ] Server Actions work
- [ ] Frontend components work
- [ ] Documentation accessible
- [ ] No duplicate functionality
- [ ] Clean Architecture maintained

## 📊 Progress Tracking

**Phase 1: Remove Duplicates**
- [ ] Controllers removed
- [ ] Tests updated

**Phase 2: Refactor Business Logic**
- [ ] Server Actions refactored
- [ ] Direct Prisma calls removed

**Phase 3: Consolidate Utilities**
- [ ] Utilities consolidated
- [ ] Services migrated

**Phase 4: Organize Documentation**
- [ ] Docs moved
- [ ] References updated

---

**Last Updated:** January 2025  
**See:** `PROJECT_AUDIT.md` for detailed analysis
