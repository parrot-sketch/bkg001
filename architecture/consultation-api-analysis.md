# Consultation Module — API Analysis

## 1. API Endpoint Inventory

| Method | Endpoint | Handler File | Purpose |
|--------|----------|--------------|---------|
| POST | `/api/consultations/:id/start` | `app/api/consultations/[id]/start/route.ts` | Start a consultation |
| POST | `/api/consultations/:id/complete` | `app/api/consultations/[id]/complete/route.ts` | Complete a consultation |
| POST | `/consultations/:id/heartbeat` | *(not found in audit)* | Keep session alive |
| GET | `/appointments/:id` | `lib/api/doctor.ts` | Fetch appointment details |
| GET | `/appointments/:id/consultation` | `lib/api/consultation.ts` | Fetch consultation record |
| PUT | `/appointments/:id/consultation/draft` | `lib/api/consultation.ts` | Save draft notes |
| GET | `/patients/:id` | `lib/api/doctor.ts` | Fetch patient details |
| GET | `/patients/:id/vitals` | direct apiClient call | Fetch patient vitals |
| GET | `/patients/:id/consultations` | `lib/api/consultation.ts` | Fetch consultation history |
| POST | `/doctors/:id/appointments/today` | `lib/api/doctor.ts` | Fetch today's appointments |
| GET | `/doctors/by-user/:userId` | `lib/api/doctor.ts` | Fetch doctor by user ID |

*Note: The heartbeat endpoint could not be fully verified in this audit pass.*

---

## 2. Authentication & Authorization

### 2.1 Authentication Layer

All API routes use `JwtMiddleware.authenticate(request)` for authentication.

**Flow:**
```
1. Request arrives with Authorization header
2. JwtMiddleware.authenticate extracts token
3. Verifies JWT signature, expiry, audience, issuer
4. Returns { success, user: { userId, email, role } }
5. Route handler checks user and role
```

**Token Structure (from logs):**
```json
{
  "userId": "a4afb079-1ad1-4fd3-9e8b-1c7a6a1ca5e2",
  "email": "ken@nairobisculpt.com",
  "role": "DOCTOR",
  "iat": 1784646682,
  "exp": 1784647582,
  "aud": "hims-api",
  "iss": "hims"
}
```

### 2.2 Authorization

**Role Check:**
```typescript
const isDoctor = String(userRole).toUpperCase() === Role.DOCTOR;
if (!isDoctor) return 403;
```

**Doctor Assignment Check:**
```typescript
if (appointment.getDoctorId() !== dto.doctorId) {
  // Allow if doctor is in patient queue for this appointment
  const queueEntry = await db.patientQueue.findFirst({
    where: { appointment_id, doctor_id, status: { in: ['WAITING', 'IN_CONSULTATION'] } }
  });
  if (!queueEntry) throw 403;
  // Reconcile appointment doctor_id
}
```

---

## 3. Endpoint 1: POST /api/consultations/:id/start

### 3.1 Overview
Starts a consultation for an appointment. This is the primary entry point from the queue "Begin Consultation" button.

### 3.2 Request

```typescript
POST /api/consultations/10/start
Headers: { Authorization: 'Bearer <jwt>' }
Body: { doctorNotes?: string }
```

### 3.3 Response (Success)
```typescript
{
  success: true,
  data: AppointmentResponseDto,
  message: 'Consultation started successfully'
}
```

### 3.4 Response (Error)
```typescript
{
  success: false,
  error: 'string'
}
```

**Status Codes:**
- 200 — Success (including idempotent resume)
- 400 — Domain validation error (patient hasn't arrived, already completed, etc.)
- 401 — Authentication required
- 403 — Access denied
- 404 — Doctor profile not found
- 500 — Unexpected server error

### 3.5 Use Case Flow
1. Auto-heal stale IN_CONSULTATION appointments (non-blocking)
2. Validate appointment exists
3. Validate doctor assignment
4. Validate state transition (`AppointmentStateTransitionService.onConsultationStart`)
5. Update appointment → IN_CONSULTATION
6. Create consultation if not exists
7. Start consultation → IN_PROGRESS
8. Update PatientQueue → IN_CONSULTATION
9. Ensure DoctorPatientAssignment
10. Audit log
11. Return mapped DTO

### 3.6 Side Effects
- Database mutations (appointment, consultation, queue, assignment)
- Cache revalidation (`revalidateDoctorDashboard`, `revalidateFrontdeskDashboard`)
- Audit logging

### 3.7 Error Handling
- `DomainException` → 400 with friendly message
- Unexpected errors → 500 with dev-mode detail

### 3.8 Caching
No caching on this endpoint. Always fresh.

### 3.9 Retry Strategy
Client-side: React Query does not cache POST requests. Retry handled by `apiClient` connection-closed retry.

### 3.10 Idempotency
**Yes** — If appointment is already IN_CONSULTATION, returns existing data without mutation. This was recently fixed to prevent 400 errors.

---

## 4. Endpoint 2: POST /api/consultations/:id/complete

### 4.1 Overview
Completes a consultation, finalizing all clinical and administrative data.

### 4.2 Request
```typescript
POST /api/consultations/10/complete
Headers: { Authorization: 'Bearer <jwt>' }
Body: {
  appointmentId: number,
  doctorId: string,
  outcomeType: ConsultationOutcomeType,
  patientDecision?: PatientDecision,
  followUp?: { date?: Date, type?: string, notes?: string },
  billingItems?: Array<{ description: string, amount: number }>,
  referralInfo?: { doctorName: string, reason: string }
}
```

### 4.3 Response (Success)
```typescript
{
  success: true,
  data: AppointmentResponseDto,
  message: 'Consultation completed successfully'
}
```

### 4.4 Response (Error)
```typescript
{
  success: false,
  error: 'string'
}
```

**Status Codes:** Same as start endpoint.

### 4.5 Use Case Flow
1. Validate appointment not already completed/cancelled
2. Finalize consultation record (merge notes, set outcome)
3. Update appointment → COMPLETED
4. Set `consultation_ended_at`, `consultation_duration`
5. Optionally schedule follow-up appointment
6. Create billing + payment (UNPAID for frontdesk)
7. If PROCEDURE_RECOMMENDED + YES:
   - Create SurgicalCase
   - Create CasePlan
8. Send email notification to patient
9. Send in-app notifications to frontdesk/nurses
10. Update PatientQueue
11. Update DoctorPatientAssignment
12. Audit log

### 4.6 Side Effects
- Extensive database mutations (7+ tables)
- Email sending
- In-app notifications
- Cache revalidation
- Audit logging

### 4.7 Error Handling
- `DomainException` → 400
- Unexpected errors → 500
- Email/notification failures are non-blocking (caught internally)

### 4.8 Caching
No caching. Always fresh.

### 4.9 Retry Strategy
Single attempt. Client should not retry without user confirmation (duplicate billing/surgical case risk).

---

## 5. Endpoint 3: Heartbeat (Inferred)

### 5.1 Overview
Keeps consultation session alive on proxy/load balancer.

### 5.2 Request
```typescript
POST /consultations/:id/heartbeat
Headers: { Authorization: 'Bearer <jwt>' }
Body: {}
```

### 5.3 Response
Expected: `{ success: true }`

### 5.4 Client Behavior
- Fire-and-forget
- Errors caught silently
- Sent every 30 seconds during active consultation

---

## 6. Endpoint 4: GET /appointments/:id

### 6.1 Overview
Fetch appointment details.

### 6.2 Request
```typescript
GET /appointments/10
Headers: { Authorization: 'Bearer <jwt>' }
```

### 6.3 Response
```typescript
AppointmentResponseDto
```

### 6.4 Client Usage
`doctorApi.getAppointment(appointmentId)` — used in `loadAppointment`

### 6.5 Caching
Cache-busting query param appended: `?_t=${Date.now()}`

---

## 7. Endpoint 5: GET /appointments/:id/consultation

### 7.1 Overview
Fetch consultation record for an appointment.

### 7.2 Request
```typescript
GET /appointments/10/consultation
Headers: { Authorization: 'Bearer <jwt>' }
```

### 7.3 Response
```typescript
ConsultationResponseDto | null
```

**Note:** Returns `null` if consultation doesn't exist yet (not started).

### 7.4 Client Usage
`consultationApi.getConsultation(appointmentId)` — used in `loadAppointment`

### 7.5 Caching
React Query with staleTime 0 (always fresh).

---

## 8. Endpoint 6: PUT /appointments/:id/consultation/draft

### 8.1 Overview
Save draft consultation notes.

### 8.2 Request
```typescript
PUT /appointments/10/consultation/draft
Headers: { Authorization: 'Bearer <jwt>' }
Body: {
  appointmentId: number,
  doctorId: string,
  notes: {
    rawText: string,
    structured: { chiefComplaint?, examination?, assessment?, plan? }
  },
  outcomeType?: ConsultationOutcomeType,
  patientDecision?: PatientDecision,
  versionToken?: string
}
```

### 8.3 Response
```typescript
ConsultationResponseDto
```

### 8.4 Client Usage
`consultationApi.saveDraft(appointmentId, dto)` — used by `useSaveConsultationDraft`

### 8.5 Version Safety
Server supports `versionToken` for optimistic locking. Returns `VERSION_CONFLICT` error if stale.

### 8.6 Caching
Mutation updates React Query cache optimistically.

---

## 9. Endpoint 7: GET /patients/:id

### 9.1 Overview
Fetch patient details.

### 9.2 Client Usage
`doctorApi.getPatient(patientId)` — used in `loadAppointment`

### 9.3 Caching
Cache-busting query param appended.

---

## 10. Endpoint 8: GET /patients/:id/vitals

### 10.1 Overview
Fetch patient vitals for a specific appointment.

### 10.2 Request
```typescript
GET /patients/5/vitals?appointmentId=10
```

### 10.3 Response
```typescript
VitalsData[]
```

### 10.4 Client Usage
Direct `apiClient.get` call in `loadAppointment`

### 10.5 Error Handling
Soft-fail: if vitals fetch fails, `vitals` is set to `null` without erroring.

---

## 11. Endpoint 9: GET /patients/:id/consultations

### 11.1 Overview
Fetch patient's complete consultation history.

### 11.2 Client Usage
`consultationApi.getPatientConsultationHistory(patientId)` — used by `usePatientConsultationHistory`

### 11.3 Caching
React Query with staleTime 5 minutes.

### 11.4 Response Shape
```typescript
{
  patientId: string,
  totalCount: number,
  consultations: PatientConsultationHistoryItemDto[],
  summary: { total, completed, proceduresRecommended, proceduresProceeded, totalPhotos }
}
```

---

## 12. Endpoint 10: GET /doctors/:id/appointments/today

### 12.1 Overview
Fetch doctor's appointments for today (used for queue).

### 12.2 Client Usage
`doctorApi.getTodayAppointments(doctorId)` — used by `useDoctorTodayAppointments`

### 12.3 Caching
React Query with background polling (`refetchInterval`), `offlineFirst` network mode.

---

## 13. API Client Architecture

### 13.1 Global Singleton
All API calls go through `lib/api/client.ts` which provides:
- Base URL configuration
- Token injection from `tokenStorage`
- 401 refresh flow with promise deduplication
- Error normalization
- JSON parsing with clone fallback
- Cache-busting for GET requests

### 13.2 Specialized Clients
- `doctorApi` — Doctor-specific endpoints
- `consultationApi` — Consultation-specific endpoints

Both use the global `apiClient` singleton.

---

## 14. Error Handling Patterns

### 14.1 Client-Side
```typescript
// Pattern 1: Soft fail
const consultationResponse = await consultationApi.getConsultation(id).catch(() => ({
  success: false, data: null
}));

// Pattern 2: Explicit catch
const vitalsResponse = await apiClient.get(...).catch(() => ({
  success: false, data: null
));

// Pattern 3: Mutation error
onError: (error) => {
  toast.error(error.message || 'Failed');
  rollback();
}
```

### 14.2 Server-Side
```typescript
// Pattern 1: Domain exceptions → 400
if (error instanceof DomainException) {
  return NextResponse.json({ success: false, error: error.message }, { status: 400 });
}

// Pattern 2: Unexpected → 500
return NextResponse.json(
  { success: false, error: process.env.NODE_ENV === 'development' ? `Internal: ${errorMessage}` : 'Internal server error' },
  { status: 500 }
);
```

### 14.3 Version Conflict Detection
Client checks for `VERSION_CONFLICT` in error message or code:
```typescript
const isConflict = error.message?.toLowerCase().includes('version conflict');
if (isConflict) refetch();
```

---

## 15. Cache Invalidation Strategy

### 15.1 On Start Consultation
```typescript
queryClient.invalidateQueries({ queryKey: ['doctor', user.id, 'appointments'] });
```
Invalidates doctor's appointment queries so queue reflects new IN_CONSULTATION status.

### 15.2 On Complete Consultation
```typescript
queryClient.invalidateQueries({ queryKey: ['consultation', completedAppointmentId] });
queryClient.invalidateQueries({ queryKey: ['consultation'] });
queryClient.invalidateQueries({ queryKey: ['doctor'] });
queryClient.invalidateQueries({ queryKey: ['appointments'] });
queryClient.invalidateQueries({ queryKey: ['billing'] });
queryClient.invalidateQueries({ queryKey: ['appointment-billing'] });
```
Aggressive invalidation to prevent stale data in next session.

### 15.3 On Draft Save
Mutation cache updated optimistically. No explicit invalidation.

---

## 16. Server Actions (Non-Route)

### 16.1 `updateCompletedConsultationNotes`
**Purpose:** Edit notes after consultation completion  
**Used by:** `ConsultationContext.saveNotes()` when consultation is already COMPLETED  
**Side Effects:** Database update, `revalidatePath`

### 16.2 `getConsultationsForHub`
**Purpose:** Fetch completed consultations for hub page  
**Used by:** Consultation hub pages

### 16.3 `initiateSurgicalCase`
**Purpose:** Create surgical case from completed consultation  
**Used by:** Hub pages

### 16.4 `updateConsultationOutcome`
**Purpose:** Update outcome of completed consultation  
**Used by:** Hub pages

---

## 17. API Security Observations

1. **JWT-only auth** — No session cookies
2. **Role-based access** — DOCTOR role required
3. **Doctor assignment validation** — Doctor must be assigned to appointment or in queue
4. **No input sanitization in routes** — Relies on use case validation
5. **No rate limiting** — Not observed in this module
6. **Audit logging** — Present for start and complete actions
7. **Dev-mode error details** — Server exposes internal error messages in development

---

## 18. API Design Patterns

### 18.1 RESTful Endpoints
- `POST /start` — Action endpoint (not purely RESTful)
- `POST /complete` — Action endpoint
- `PUT /draft` — Update resource
- `GET /consultation` — Read resource

### 18.2 Action Endpoints
Start and complete are action-oriented rather than resource-oriented. This is appropriate for workflow-driven operations.

### 18.3 Soft-Delete Compatible
The API does not handle soft-deleted appointments/consultations explicitly.

### 18.4 Background Polling
Queue data uses `refetchInterval` for real-time updates without WebSockets.

---

## 19. Summary

The consultation module's API layer is minimal (2 primary routes + heartbeat), with most HTTP interactions handled through the client API library. The routes delegate entirely to use cases, maintaining clean separation.

Authentication is JWT-based with role checks. Authorization includes doctor assignment validation with queue reconciliation.

Error handling is consistent: domain exceptions return 400 with friendly messages, unexpected errors return 500 with dev-mode details.

The module does not implement WebSockets or Server-Sent Events; real-time updates rely on React Query polling.

Cache invalidation is manual and aggressive, particularly on completion, to prevent stale data leakage between sessions.
