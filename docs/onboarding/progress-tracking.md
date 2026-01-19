# Doctor Onboarding Progress Tracking

**Last Updated:** 2025-01-18

## Progress Overview

| Task ID | Description | Status | Owner | Blockers | Notes |
|---------|-------------|--------|-------|----------|-------|
| DOC-ONBOARD-0.1 | Enforce Doctor Identity Integrity | ✅ COMPLETE | Cursor | — | Schema updated, migration created, runtime assertions added |
| DOC-ONBOARD-1.1 | Onboarding State Machine | ⏸️ NOT_STARTED | Cursor | 0.1 | Waiting for Phase 0 completion |
| DOC-ONBOARD-1.2 | Invite Flow | ⏸️ NOT_STARTED | Cursor | 1.1 | Depends on state machine |
| DOC-ONBOARD-2.1 | Notification Service | ⏸️ NOT_STARTED | Cursor | 1.2 | Critical blocker |
| DOC-ONBOARD-2.2 | Event System | ⏸️ NOT_STARTED | Cursor | 2.1 | Depends on notification service |
| DOC-ONBOARD-3.1 | Communication Module | ⏸️ NOT_STARTED | Cursor | 2.2 | Depends on event system |
| DOC-ONBOARD-4.1 | Doctor Dashboard Hardening | ⏸️ NOT_STARTED | Cursor | 3.1 | Final hardening phase |

---

## Phase 0: Safety & Invariants ✅

### DOC-ONBOARD-0.1: Enforce Doctor Identity Integrity

**Status:** ✅ COMPLETE

**Completed:**
- ✅ Schema: `Doctor.user_id` is now required (NOT NULL)
- ✅ Foreign key: Changed to CASCADE on delete
- ✅ Migration: Handles orphaned doctors safely
- ✅ Runtime assertion: Authentication checks for Doctor profile

**Files Changed:**
- `prisma/schema.prisma` - Made user_id required
- `prisma/migrations/20260118212535_enforce_doctor_user_id_required/migration.sql` - Safe migration
- `infrastructure/auth/JwtAuthService.ts` - Added Doctor profile existence check

**Next:** Ready for Phase 1

---

## Phase 1: Doctor Onboarding Foundation

### DOC-ONBOARD-1.1: Onboarding State Machine

**Status:** ⏸️ NOT_STARTED  
**Dependencies:** DOC-ONBOARD-0.1 ✅

**Required:**
- Add `onboarding_status` enum to Doctor model
- Add timestamp fields (invited_at, activated_at, profile_completed_at)
- Implement state transition guards
- Prevent authentication if status !== ACTIVE

### DOC-ONBOARD-1.2: Secure Doctor Invite Flow

**Status:** ⏸️ NOT_STARTED  
**Dependencies:** DOC-ONBOARD-1.1

**Required:**
- Create InviteToken model
- Admin action to generate invites
- Activation endpoint with token validation
- Force password setup on activation

---

## Phase 2: Notifications (Non-Negotiable)

### DOC-ONBOARD-2.1: Replace MockNotificationService

**Status:** ⏸️ NOT_STARTED  
**Dependencies:** DOC-ONBOARD-1.2

**Required:**
- Implement real email service (SendGrid/AWS SES)
- Persist notification records
- Implement retry strategy
- Environment configuration

### DOC-ONBOARD-2.2: Event-Driven Notification Triggers

**Status:** ⏸️ NOT_STARTED  
**Dependencies:** DOC-ONBOARD-2.1

**Required:**
- DomainEvent abstraction
- Event dispatcher
- Notification handlers
- Idempotency guarantees

---

## Phase 3: Communication Module

### DOC-ONBOARD-3.1: Mediated Doctor Communication

**Status:** ⏸️ NOT_STARTED  
**Dependencies:** DOC-ONBOARD-2.2

**Required:**
- Message model
- Communication APIs
- RBAC enforcement
- Audit logging

---

## Phase 4: Doctor Experience Lockdown

### DOC-ONBOARD-4.1: Doctor Dashboard Hardening

**Status:** ⏸️ NOT_STARTED  
**Dependencies:** DOC-ONBOARD-3.1

**Required:**
- Query audit
- Assert consultation_request_status filters
- Test coverage
- Remove unused endpoints

---

## Critical Path

```
0.1 (COMPLETE) → 1.1 → 1.2 → 2.1 → 2.2 → 3.1 → 4.1
```

**Current Position:** Phase 0 complete, ready for Phase 1

**Blockers:** None (Phase 0 complete)

**Estimated Time to Production:** 4-6 weeks (all phases)

---

## Notes

- **Never skip phases** - Each phase builds on the previous
- **Never bypass invariants** - All checks must be enforced
- **Never onboard doctors before Phase 2** - Notifications are critical
