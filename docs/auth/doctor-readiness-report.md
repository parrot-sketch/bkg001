# Doctor Onboarding Readiness Report
**System:** Nairobi Sculpt Aesthetic Surgery Clinic Management System  
**Audit Date:** January 2025  
**Purpose:** Enterprise-grade doctor onboarding assessment

---

## Executive Summary

**RECOMMENDATION: ⚠️ NOT READY - Conditional Approval Required**

The system has a solid identity and authorization foundation, but **critical gaps exist in onboarding, notifications, and communication architecture** that prevent safe enterprise doctor onboarding at scale.

**Critical Blocker Count:** 4  
**High-Risk Gaps:** 3  
**Ready Components:** 3

---

## 1️⃣ Identity & Authentication Architecture

### Current State

**✅ STRENGTH: Doctors Have User Identities**
- Schema: `Doctor.user_id` → `User.id` (1:1 optional relationship)
- Doctors are seeded with both `User` and `Doctor` records
- `Role.DOCTOR` exists in enum and is used throughout system
- Authentication: Email + password via JWT (`JwtAuthService`)
- Token management: Access tokens + refresh tokens stored in database

**Schema Evidence:**
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password_hash String
  role          Role      // DOCTOR is valid enum value
  status        Status    @default(ACTIVE)
  doctor_profile Doctor?  @relation("DoctorUser")
  // ...
}

model Doctor {
  id      String  @id @default(uuid())
  user_id String? @unique // Optional - RED FLAG
  email   String  @unique
  // ...
}
```

**🚨 RED FLAG: Optional User Relationship**
- `Doctor.user_id` is nullable (`String?`)
- Doctors CAN exist without User accounts
- Seed script creates both, but no enforcement

**Finding:**
- ✅ Doctors CAN have user identities
- ⚠️ Identity is OPTIONAL, not enforced
- ✅ Authentication system supports DOCTOR role
- ✅ JWT-based auth is production-ready

**Verdict:** Identity architecture is **sound but permissive** — needs enforcement.

---

## 2️⃣ Doctor Onboarding Model

### Current State

**❌ CRITICAL GAP: No Onboarding State Machine**

**What Exists:**
- `RegisterUserUseCase` — generic user registration
- Admin actions create doctors manually (`createNewDoctor` in `app/actions/admin.ts`)
- Seed script creates doctors with User + Doctor records synchronously
- No first-login tracking beyond `last_login_at` (for all users)

**What's Missing:**
- ❌ No `onboarding_status` field on Doctor or User
- ❌ No invite token/invitation system
- ❌ No first-login forced password reset flow
- ❌ No profile completion tracking
- ❌ No onboarding completion milestone

**Current Doctor Creation Flow (from seed):**
```typescript
// prisma/seed.ts
const doctorUser = await prisma.user.create({
  data: { email, password_hash, role: Role.DOCTOR, status: Status.ACTIVE }
});

const doctor = await prisma.doctor.create({
  data: { user_id: doctorUser.id, email, ... }
});
```

**Problems:**
1. **Immediate Activation:** Doctors are created as `Status.ACTIVE` immediately
2. **No Invitation:** No invite link/token sent to doctor email
3. **No First-Login Hook:** No forced password change on first login
4. **No Profile Completion:** No tracking of whether doctor completed profile fields

**Required Enterprise Onboarding States:**
```
INVITED → ACTIVATED → PROFILE_COMPLETED → ACTIVE
```

**Verdict:** Onboarding model is **non-existent** — doctors are activated immediately without controlled flow.

---

## 3️⃣ Authorization & Access Control

### Current State

**✅ STRENGTH: Server-Side RBAC Enforcement**

**What Exists:**
- `RbacMiddleware` with role-based permission checks
- API route-level authorization (`JwtMiddleware.authenticate()`)
- Doctor-specific endpoint filtering (`/api/appointments/doctor/:doctorId`)

**Doctor Permissions (from RbacMiddleware):**
```typescript
// DEFAULT_PERMISSIONS includes:
{ resource: 'appointment', action: 'read', allowedRoles: [Role.ADMIN, Role.DOCTOR] }
{ resource: 'appointment', action: 'update', allowedRoles: [Role.ADMIN, Role.DOCTOR] }
{ resource: 'consultation', action: 'start', allowedRoles: [Role.DOCTOR] }
{ resource: 'consultation', action: 'complete', allowedRoles: [Role.DOCTOR] }
```

**✅ Consultation Request Filtering (Recently Implemented):**
- `GET /api/appointments/doctor/:doctorId` defaults to `SCHEDULED,CONFIRMED` only
- Doctors **never see** `SUBMITTED`, `PENDING_REVIEW`, or `NEEDS_MORE_INFO` requests
- Server-side enforcement, not just frontend filtering

**Evidence:**
```typescript
// app/api/appointments/doctor/[doctorId]/route.ts
let consultationRequestStatuses: ConsultationRequestStatus[] = [
  ConsultationRequestStatus.SCHEDULED,
  ConsultationRequestStatus.CONFIRMED,
]; // Hardcoded default
```

**Doctor Access Validation:**
- ✅ Can query own appointments only (userId check)
- ✅ Cannot access raw consultation requests
- ✅ Only sees approved consultations
- ✅ Authorization enforced in API routes, not just frontend

**Verdict:** Authorization is **production-ready** — doctors cannot access unreviewed data.

---

## 4️⃣ Notification & Communication Layer

### Current State

**⚠️ CRITICAL GAP: Notifications Are Mock Only**

**What Exists:**
- `Notification` entity in database (EMAIL, SMS, PUSH, IN_APP types)
- `INotificationService` domain interface
- `MockNotificationService` implementation (console.log only)
- Notification relationships: User → Notification (sender/recipient)

**What's Missing:**
- ❌ No real email/SMS service implementation
- ❌ No event-driven notification system
- ❌ No notification preferences (email vs in-app)
- ❌ No role-specific notification routing
- ❌ Notifications logged but never sent

**Current Implementation:**
```typescript
// infrastructure/services/MockNotificationService.ts
async sendEmail(to: Email, subject: string, body: string): Promise<void> {
  console.log(`[NOTIFICATION] Email to ${to.getValue()}: ${subject}`);
  // NO ACTUAL SENDING
}
```

**Notification Usage in Use Cases:**
- `ScheduleAppointmentUseCase` attempts to send email (but it's mock)
- `ReviewConsultationRequestUseCase` should notify doctors (likely not implemented)
- No doctor-specific notification triggers found

**What Doctors Need:**
- Email when consultation is SCHEDULED → CONFIRMED
- In-app notification for new appointments
- Notification preferences (email vs SMS vs in-app)

**Verdict:** Notification infrastructure is **placeholder only** — doctors will not receive notifications.

---

## 5️⃣ Communication Module

### Current State

**❌ CRITICAL GAP: No Messaging/Communication Module**

**What Exists:**
- ❌ No messaging/chat entity in schema
- ❌ No communication logs
- ❌ No doctor ↔ frontdesk messaging
- ❌ No doctor ↔ patient messaging (correctly absent for privacy)

**What's Needed for Enterprise:**
- ✅ Mediated communication (frontdesk ↔ doctor)
- ❌ Audit trail for communications
- ❌ Tone control (no direct patient contact)
- ❌ Communication logging

**Search Results:**
- No `Message`, `Communication`, or `Chat` models in schema
- No messaging API endpoints
- No communication components in frontend

**Aesthetic Clinic Requirements:**
- Doctors should **NOT** message patients directly (privacy, tone control)
- Frontdesk mediates patient ↔ doctor communication
- All communications must be auditable

**Verdict:** Communication module is **non-existent** — this is a blocker for controlled clinic communication.

---

## 6️⃣ Doctor UX Philosophy

### Current State

**✅ STRENGTH: Clean Doctor Dashboard**

**Doctor Dashboard Analysis:**
- **`/doctor/appointments`**: Shows only SCHEDULED/CONFIRMED consultations
- **`/doctor/consultations`**: View consultation history
- No raw intake forms visible
- No unreviewed patient data
- Professional, clinical tone

**Doctor View Filters:**
```typescript
// app/api/appointments/doctor/[doctorId]/route.ts
// Default filter: SCHEDULED, CONFIRMED only
// No SUBMITTED/PENDING_REVIEW visible
```

**UX Assessment:**
- ✅ Doctor never sees raw consultation requests
- ✅ Dashboard answers "Who am I seeing today?"
- ✅ No sales language
- ✅ Minimal, authority-respecting UI

**Verdict:** Doctor UX is **intentional and clean** — follows enterprise clinic principles.

---

## 7️⃣ Readiness Checklist (Binary)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| **Doctors have user identities** | ✅ YES | `Doctor.user_id` → `User.id` relationship exists |
| **Auth supports non-self-registration users** | ⚠️ PARTIAL | `RegisterUserUseCase` exists but no invite flow |
| **First-login onboarding is modeled** | ❌ NO | No onboarding state, no first-login hooks |
| **Role-based access is enforced server-side** | ✅ YES | `RbacMiddleware` + API route checks |
| **Notifications exist beyond console logs** | ❌ NO | `MockNotificationService` only |
| **Doctor never sees raw consultation requests** | ✅ YES | API filters to SCHEDULED/CONFIRMED only |
| **Communication is mediated & auditable** | ❌ NO | No messaging module exists |

**Score: 3/7 Ready** (43%)

---

## Gap Analysis & Risks

### 🔴 Critical Blockers (Must Fix Before Onboarding)

1. **No Onboarding State Machine**
   - **Risk:** Doctors activated immediately, no controlled first-login flow
   - **Impact:** Cannot track onboarding completion, no forced password reset
   - **Fix Required:** Add `onboarding_status` enum, first-login hook, invite system

2. **Notifications Are Mock Only**
   - **Risk:** Doctors will not receive consultation notifications
   - **Impact:** Manual communication required, poor UX
   - **Fix Required:** Implement real email/SMS service (SendGrid, AWS SES, Twilio)

3. **No Communication Module**
   - **Risk:** No controlled doctor ↔ frontdesk communication
   - **Impact:** Unmediated communication, no audit trail
   - **Fix Required:** Messaging entity, API endpoints, UI components

4. **Optional User Identity**
   - **Risk:** Doctors can exist without authentication
   - **Impact:** Inconsistent state, security gaps
   - **Fix Required:** Make `Doctor.user_id` required, migration to link existing doctors

### 🟠 High-Risk Gaps (Should Fix Soon)

5. **No Invite System**
   - **Risk:** Manual doctor creation, no secure invitation flow
   - **Impact:** Poor onboarding UX, security concerns
   - **Fix Required:** Invite token system, email templates

6. **No First-Login Password Reset**
   - **Risk:** Default passwords or weak passwords persist
   - **Impact:** Security vulnerability
   - **Fix Required:** First-login detection, forced password change

7. **No Notification Preferences**
   - **Risk:** Doctors cannot control notification channels
   - **Impact:** Notification fatigue, missed important alerts
   - **Fix Required:** User notification preferences model

---

## Required Architectural Changes

### Phase 1: Identity & Onboarding (Critical)

```prisma
// Add to Doctor model
enum OnboardingStatus {
  INVITED
  ACTIVATED
  PROFILE_COMPLETED
  ACTIVE
}

model Doctor {
  // ... existing fields
  onboarding_status OnboardingStatus @default(INVITED)
  invited_at       DateTime?
  invited_by       String? // User ID
  activated_at     DateTime?
  profile_completed_at DateTime?
}
```

**Required Components:**
1. Invite system: Generate secure invite tokens, email templates
2. First-login hook: Detect `last_login_at === null`, force password reset
3. Profile completion: Track required fields completion
4. Onboarding state machine: Enforce valid transitions

### Phase 2: Notifications (Critical)

**Replace `MockNotificationService` with:**
```typescript
// infrastructure/services/EmailNotificationService.ts
export class EmailNotificationService implements INotificationService {
  async sendEmail(to: Email, subject: string, body: string): Promise<void> {
    // Real implementation: SendGrid, AWS SES, etc.
    // Store notification in database
    // Handle failures gracefully
  }
}
```

**Event-Driven Notification Triggers:**
- `ConsultationScheduled` → Notify doctor
- `ConsultationConfirmed` → Notify doctor
- `ConsultationCancelled` → Notify doctor

### Phase 3: Communication Module (Critical)

```prisma
model Message {
  id          Int       @id @default(autoincrement())
  sender_id   String    // User ID (frontdesk/admin)
  recipient_id String   // User ID (doctor)
  subject     String?
  body        String    @db.Text
  message_type String   // "APPOINTMENT_NOTIFICATION", "PATIENT_INQUIRY", etc.
  read_at     DateTime?
  created_at  DateTime  @default(now())
  
  sender      User      @relation("MessageSender")
  recipient   User      @relation("MessageRecipient")
}
```

**Required Components:**
1. Message API endpoints (`POST /api/messages`, `GET /api/messages`)
2. Message UI components (doctor inbox, frontdesk compose)
3. Audit logging for all doctor communications

### Phase 4: Enforcement (High Priority)

```prisma
// Make user_id required
model Doctor {
  user_id String @unique // Remove ?, add NOT NULL constraint
}
```

**Migration Required:**
- Link existing doctors without User accounts
- Create User records for orphaned Doctor records

---

## Final Recommendation

### ⚠️ NOT READY - Conditional Approval

**Recommendation:** **DO NOT onboard doctors until Phase 1 & 2 are complete.**

**Rationale:**
- Identity and authorization are sound ✅
- Doctor UX is clean and intentional ✅
- **But:** No onboarding control, no notifications, no communication module ❌

**Onboarding doctors now would require:**
- Manual account creation (no invite flow)
- Manual password communication (security risk)
- No automated notifications (manual follow-up required)
- No controlled communication channel

### Conditional Approval Path

**If onboarding is business-critical, minimum viable setup:**

1. ✅ **Immediate:** Enforce `Doctor.user_id` required (migration)
2. ✅ **Immediate:** Implement real email notifications (SendGrid/AWS SES)
3. ⚠️ **Week 1:** Add basic onboarding status tracking (no state machine yet)
4. ⚠️ **Week 2:** Build invite system (secure tokens, email templates)

**Then:** Safe to onboard 1-2 doctors for pilot, with manual notification support.

### Production-Ready Path

**Complete all 4 phases above, then onboard doctors with:**
- ✅ Controlled invite flow
- ✅ Automated notifications
- ✅ Mediated communication
- ✅ Full audit trail

**Timeline Estimate:** 4-6 weeks for full implementation

---

## Conclusion

The system has **strong identity and authorization foundations**, but **critical gaps in onboarding, notifications, and communication** prevent safe enterprise doctor onboarding at scale.

**Do not onboard doctors until notifications and basic onboarding are implemented.** The UX is ready, but the operational infrastructure is not.

---

**Next Steps:**
1. Prioritize notification service implementation (Phase 2)
2. Design onboarding state machine (Phase 1)
3. Create communication module specification (Phase 3)
4. Schedule architecture review after Phase 1 & 2 completion
