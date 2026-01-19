# Phase 0, Task 0.1: Enforce Doctor Identity Integrity

## Task ID: DOC-ONBOARD-0.1
## Status: IN_PROGRESS
## Dependencies: None
## Invariants:
- Every Doctor MUST have a User account
- No Doctor may authenticate without a linked User
- If User with role DOCTOR exists, Doctor profile MUST exist
## Acceptance Criteria:
- Database enforces NOT NULL doctor.user_id
- Migration handles existing data safely
- Runtime assertion prevents authentication if Doctor profile missing
- All code paths updated to assume user_id is required

---

## Current State Analysis

### Schema Issues Found:
1. `Doctor.user_id` is optional (`String?`)
2. `onDelete: SetNull` allows Doctor to exist without User
3. No constraint ensuring User with role DOCTOR has Doctor profile

### Code Paths Requiring Updates:
1. Authentication flow - no check for Doctor profile existence
2. Any queries that filter by `user_id` (may need null checks removed)
3. Seed script (already creates both, but should validate)

---

## Implementation Plan

### Step 1: Schema Update
- Change `user_id String?` → `user_id String` (required)
- Change `onDelete: SetNull` → `onDelete: Cascade` (if User deleted, Doctor deleted)
- Add comment explaining invariant

### Step 2: Migration Strategy
- Detect orphaned Doctors (`user_id IS NULL`)
- For each orphan:
  - Create User record with role DOCTOR
  - Link Doctor to new User
  - OR fail migration with detailed report

### Step 3: Runtime Assertions
- In `JwtAuthService.login()`: If role === DOCTOR, verify Doctor profile exists
- In `LoginUseCase`: Add Doctor profile existence check
- Throw 403 if Doctor role but no profile

### Step 4: Code Updates
- Remove null checks for `doctor.user_id`
- Update TypeScript types to reflect required field
- Update any queries that assume optional user_id

---

## Migration Safety

**Pre-Migration Check:**
```sql
SELECT id, email, user_id 
FROM "Doctor" 
WHERE user_id IS NULL;
```

**If orphans found:**
- Migration will create User records automatically
- OR fail with report listing orphaned doctors

**Post-Migration Validation:**
```sql
-- Should return 0 rows
SELECT COUNT(*) FROM "Doctor" WHERE user_id IS NULL;
```
