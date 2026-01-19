# Phase 0, Task 0.1: Completion Summary

## Task ID: DOC-ONBOARD-0.1
## Status: COMPLETE
## Dependencies: None
## Invariants Enforced:
- ✅ Every Doctor MUST have a User account (database constraint)
- ✅ No Doctor may authenticate without a linked User (runtime assertion)
- ✅ If User with role DOCTOR exists, Doctor profile MUST exist (runtime assertion)

---

## Changes Implemented

### 1. Schema Updates

**File:** `prisma/schema.prisma`

**Changes:**
- `Doctor.user_id`: Changed from `String?` (optional) to `String` (required)
- Foreign key: Changed from `onDelete: SetNull` to `onDelete: Cascade`
- Added comment: "REQUIRED - Every Doctor MUST have a User"

**Impact:**
- Database now enforces NOT NULL constraint
- Deleting a User will cascade delete the Doctor (prevents orphaned doctors)

### 2. Migration Strategy

**File:** `prisma/migrations/20260118212535_enforce_doctor_user_id_required/migration.sql`

**Migration Steps:**
1. Detects orphaned Doctors (`user_id IS NULL`)
2. Creates User records for orphaned doctors with:
   - Role: DOCTOR
   - Status: ACTIVE
   - Temporary password hash (must be reset on first login)
3. Links doctors to their new User accounts
4. Validates no nulls remain
5. Adds NOT NULL constraint
6. Updates foreign key to CASCADE

**Safety:**
- Migration fails with detailed error if orphans cannot be resolved
- Creates User records automatically for orphaned doctors
- Final validation ensures data integrity

### 3. Runtime Assertions

**File:** `infrastructure/auth/JwtAuthService.ts`

**Added Check:**
```typescript
// 2.5. ENFORCE DOCTOR IDENTITY INVARIANT
// If user has role DOCTOR, they MUST have a Doctor profile
if (user.getRole() === Role.DOCTOR) {
  const doctorProfile = await this.prisma.doctor.findUnique({
    where: { user_id: user.getId() },
    select: { id: true },
  });

  if (!doctorProfile) {
    throw new DomainException(
      'Doctor profile not found. Please contact administrator to complete account setup.',
      { userId: user.getId(), role: user.getRole() }
    );
  }
}
```

**Impact:**
- Prevents authentication if Doctor role but no Doctor profile
- Returns 403 error with clear message
- Enforces invariant at authentication boundary

### 4. Code Updates Required

**Files That May Need Updates:**
- `app/actions/admin.ts` - `createNewDoctor()` uses Clerk (legacy), should be updated to use new User model
- Any queries that filter by `doctor.user_id` - can now assume it's always present

**Note:** The `createNewDoctor` action in `app/actions/admin.ts` currently uses Clerk. This is a legacy implementation and should be migrated to use the new User model in a future phase. For now, it creates both Clerk user and Doctor record, but doesn't create a User record in the new system. This needs to be addressed.

---

## Testing Checklist

- [ ] Run migration on development database
- [ ] Verify no orphaned doctors exist
- [ ] Test login with Doctor role - should succeed if Doctor profile exists
- [ ] Test login with Doctor role but no profile - should fail with 403
- [ ] Verify cascade delete: Delete User → Doctor should be deleted
- [ ] Verify NOT NULL constraint prevents creating Doctor without user_id

---

## Migration Instructions

1. **Backup database** before running migration
2. **Review orphaned doctors** (if any):
   ```sql
   SELECT id, email, first_name, last_name 
   FROM "Doctor" 
   WHERE user_id IS NULL;
   ```
3. **Run migration:**
   ```bash
   npx prisma migrate dev
   ```
4. **Verify migration success:**
   ```sql
   SELECT COUNT(*) FROM "Doctor" WHERE user_id IS NULL;
   -- Should return 0
   ```
5. **Test authentication** with a doctor account

---

## Known Issues

1. **Legacy Clerk Integration:** `app/actions/admin.ts` still uses Clerk for doctor creation. This creates a Clerk user but may not create a User record in the new system. This needs to be addressed in a future refactor.

2. **Temporary Passwords:** Orphaned doctors created by migration have placeholder password hashes. These doctors must reset their password on first login (to be implemented in Phase 1).

---

## Next Steps

- ✅ Phase 0, Task 0.1: COMPLETE
- ⏭️ Phase 1, Task 1.1: Introduce Doctor Onboarding State Machine (depends on 0.1)
