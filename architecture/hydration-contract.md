# Hydration Contract

## Purpose
Define the exact serialized object transferred from server to client, including DTOs, validation, payload limits, and intentional exclusions.

---

## 1. Hydration Flow

```
Server Component (page.tsx)
  │
  ▼
Serialization layer
  │
  ├─ Converts Date → ISO string
  ├─ Converts Enums → string values
  ├─ Converts BigInt → string (if any)
  ├─ Removes undefined fields
  ├─ Removes circular references
  └─ Produces plain JSON-serializable object
  │
  ▼
Next.js RSC Payload
  │
  ├─ RSC Server Reference (functions)
  ├─ Props (JSON-serializable)
  └─ Server Component boundary
  │
  ▼
Client (ConsultationRoomClient)
  │
  ├─ Receives props
  ├─ Deserializes (parse dates, restore enums if needed)
  └─ Initializes provider state
```

---

## 2. SerializedSessionData DTO

### Full Shape

```typescript
interface SerializedSessionData {
  readonly appointment: SerializedAppointment;
  readonly patient: SerializedPatient;
  readonly vitals: SerializedVitals | null;
  readonly consultation: SerializedConsultation | null;
  readonly doctorId: string;
  readonly workflowState: ConsultationWorkflowState;
  readonly isDirty: boolean;
  readonly draftAvailable: boolean;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
}
```

### SerializedAppointment

```typescript
interface SerializedAppointment {
  readonly id: number;
  readonly patientId: string;
  readonly doctorId: string;
  readonly appointmentDate: string; // ISO date: "2026-07-26"
  readonly time: string; // "14:30"
  readonly status: string; // "CHECKED_IN" | "READY_FOR_CONSULTATION" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED"
  readonly type: string;
  readonly note?: string;
  readonly reason?: string;
  readonly createdAt?: string; // ISO datetime
  readonly updatedAt?: string; // ISO datetime
  readonly checkedInAt?: string; // ISO datetime
  readonly checkedInBy?: string;
  readonly consultationStartedAt?: string; // ISO datetime
  readonly consultationEndedAt?: string; // ISO datetime
  readonly consultationDuration?: number; // minutes
  
  // Inline patient snapshot (denormalized for session)
  readonly patient?: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly fullName: string;
    readonly fileNumber: string;
    readonly dateOfBirth: string;
    readonly gender: string;
    readonly phone?: string;
    readonly profileImage?: string | null;
  };
  
  // Inline doctor snapshot (denormalized for session)
  readonly doctor?: {
    readonly id: string;
    readonly name: string;
    readonly specialization?: string;
  };
}
```

### SerializedPatient

```typescript
interface SerializedPatient {
  readonly id: string;
  readonly fileNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly dateOfBirth: string;
  readonly age: number;
  readonly gender: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappPhone?: string;
  readonly address?: string;
  readonly occupation?: string;
  readonly maritalStatus?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactNumber?: string;
  readonly relation?: string;
  readonly hasPrivacyConsent: boolean;
  readonly hasServiceConsent: boolean;
  readonly hasMedicalConsent: boolean;
  readonly bloodGroup?: string;
  readonly allergies?: string;
  readonly medicalConditions?: string;
  readonly medicalHistory?: string;
  readonly insuranceProvider?: string;
  readonly insuranceNumber?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly profileImage?: string | null;
}
```

### SerializedVitals

```typescript
interface SerializedVitals {
  readonly bodyTemperature: number | null;
  readonly systolic: number | null;
  readonly diastolic: number | null;
  readonly heartRate: string | null;
  readonly respiratoryRate: number | null;
  readonly oxygenSaturation: number | null;
  readonly weight: number | null;
  readonly height: number | null;
  readonly recordedAt: string; // ISO datetime
  readonly recordedBy: string | null;
}
```

### SerializedConsultation

```typescript
interface SerializedConsultation {
  readonly id: number;
  readonly appointmentId: number;
  readonly doctorId: string;
  readonly userId?: string;
  readonly state: string;
  readonly startedAt?: string; // ISO datetime
  readonly completedAt?: string; // ISO datetime
  readonly durationMinutes?: number;
  readonly notes?: {
    readonly fullText: string;
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };
  readonly outcomeType?: ConsultationOutcomeType;
  readonly patientDecision?: PatientDecision;
  readonly createdAt: string; // ISO datetime
  readonly updatedAt: string; // ISO datetime
}
```

---

## 3. SerializedUser DTO

```typescript
interface SerializedUser {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: string;
}
```

---

## 4. Nullable Fields

Every field that can be null in the database is explicitly nullable in the serialized DTO:

| Field | Nullable | Reason |
|-------|----------|--------|
| `appointment.note` | ✅ | Optional appointment note |
| `appointment.reason` | ✅ | Optional reason for visit |
| `appointment.consultationStartedAt` | ✅ | Not started yet |
| `appointment.consultationEndedAt` | ✅ | Not completed yet |
| `appointment.patient` | ✅ | Should always exist, but defensive |
| `appointment.doctor` | ✅ | Should always exist, but defensive |
| `patient.whatsappPhone` | ✅ | Optional contact |
| `patient.address` | ✅ | Optional |
| `patient.bloodGroup` | ✅ | Optional medical data |
| `patient.allergies` | ✅ | Optional medical data |
| `vitals` (entire object) | ✅ | No vitals taken yet |
| `vitals.bodyTemperature` | ✅ | Not measured |
| `consultation` (entire object) | ✅ | No consultation created yet |
| `consultation.notes` | ✅ | No notes yet |
| `consultation.outcomeType` | ✅ | Not decided yet |
| `consultation.patientDecision` | ✅ | Not decided yet |
| `outcomeType` | ✅ | Not decided yet |
| `patientDecision` | ✅ | Not decided yet |

---

## 5. Versioning

### Payload Versioning

The serialized payload has an implicit version: the shape of `SerializedSessionData`. If the shape changes, new fields are added with optional/nullable defaults.

**No explicit version field is needed** because:
- Server and client are deployed together
- Server Component and Client Shell are in the same deployment
- If the shape changes, both sides update simultaneously

### Clinical Data Versioning

Clinical data (notes, outcomes) uses the existing versioning in the database (timestamps, ETags). The serialized payload does not need additional clinical versioning.

---

## 6. Validation

### Server-Side Validation (Before Serialization)

```typescript
function serializeSessionData(session: SessionData): SerializedSessionData {
  // Validate required fields
  if (!session.appointment?.id) throw new Error('Missing appointment.id');
  if (!session.patient?.id) throw new Error('Missing patient.id');
  if (!session.doctorId) throw new Error('Missing doctorId');
  if (!session.workflowState) throw new Error('Missing workflowState');
  
  // Serialize
  return {
    appointment: serializeAppointment(session.appointment),
    patient: serializePatient(session.patient),
    vitals: session.vitals ? serializeVitals(session.vitals) : null,
    consultation: session.consultation ? serializeConsultation(session.consultation) : null,
    doctorId: session.doctorId,
    workflowState: session.workflowState,
    isDirty: session.isDirty,
    draftAvailable: session.draftAvailable,
    notes: session.notes,
    outcomeType: session.outcomeType,
    patientDecision: session.patientDecision,
  };
}
```

### Client-Side Validation (After Deserialization)

```typescript
function deserializeSessionData(data: unknown): SerializedSessionData {
  // Type guard
  if (!isSerializedSessionData(data)) {
    throw new Error('Invalid session data');
  }
  return data;
}
```

### Type Guards

```typescript
function isSerializedSessionData(data: unknown): data is SerializedSessionData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  
  return (
    typeof obj.appointment === 'object' &&
    typeof obj.patient === 'object' &&
    typeof obj.doctorId === 'string' &&
    typeof obj.workflowState === 'string' &&
    typeof obj.isDirty === 'boolean' &&
    typeof obj.notes === 'object' &&
    Array.isArray(obj.notes?.subjective || []) || typeof obj.notes === 'object'
  );
}
```

---

## 7. Maximum Payload

### Estimated Payload Size

| Data Category | Estimated Size | Count |
|---------------|----------------|-------|
| Appointment data | ~800 bytes | 1 |
| Patient demographics | ~1,200 bytes | 1 |
| Vitals | ~300 bytes | 1 or null |
| Consultation | ~600 bytes | 1 or null |
| Notes (SOAP) | ~2,000 bytes | 1 |
| Workflow state | ~50 bytes | 1 |
| **Total** | **~5-7 KB** | |

### Comparison

| Architecture | Initial Payload | Notes |
|--------------|-----------------|-------|
| Current (client fetches) | N/A (fetches after mount) | Multiple API calls |
| New (server serializes) | ~5-7 KB | Single RSC payload |

**The serialized payload is small enough to embed in the initial HTML response.**

### Payload Optimization

If needed, we can:
1. Omit `consultation` if null (saves 600 bytes)
2. Omit `vitals` if null (saves 300 bytes)
3. Omit `patient` denormalized fields if already in `patient` object
4. Truncate `notes.fullText` to first 1000 chars if very long
5. Use `JSON.stringify` with compression (Next.js does this automatically)

---

## 8. Intentionally Excluded

The following data is NOT included in the hydration payload:

| Excluded Data | Reason | How Obtained |
|---------------|--------|--------------|
| `AppointmentResponseDto` full shape | Provider reconstructs it | Server sends denormalized appointment in SerializedSessionData |
| `PatientResponseDto` full shape | Provider reconstructs it | Server sends SerializedPatient |
| `ConsultationResponseDto` full shape | Provider reconstructs it | Server sends SerializedConsultation |
| `VitalsData` full shape | Provider reconstructs it | Server sends SerializedVitals |
| `WorkflowEngine` instance | Cannot serialize | Recreated server-side per request |
| `WorkflowCoordinator` instance | Cannot serialize | Recreated server-side per request |
| `SessionService` instance | Cannot serialize | Never sent to client |
| `DraftService` instance | Cannot serialize | Never sent to client |
| HTTP adapter instances | Cannot serialize | Never sent to client |
| `DefaultGuardRegistry` | Cannot serialize | Never sent to client |
| `InProcessWorkflowEventBus` | Cannot serialize | Never sent to client |
| Server Action implementations | Serialized as references | Client calls by name, executes server-side |
| Query cache | Client-side only | Client manages its own cache |

---

## 9. Deserialization Strategy

### Date Fields

All Date fields are serialized as ISO 8601 strings. Client reconstructs Date objects:

```typescript
function deserializeAppointment(data: SerializedAppointment): AppointmentResponse {
  return {
    ...data,
    appointmentDate: new Date(data.appointmentDate),
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
    checkedInAt: data.checkedInAt ? new Date(data.checkedInAt) : undefined,
    consultationStartedAt: data.consultationStartedAt ? new Date(data.consultationStartedAt) : undefined,
    consultationEndedAt: data.consultationEndedAt ? new Date(data.consultationEndedAt) : undefined,
  };
}
```

### Enum Fields

Enums are serialized as their string values:

```typescript
// Server
workflowState: ConsultationWorkflowState.ACTIVE  →  "ACTIVE"

// Client
const state = ConsultationWorkflowState[data.workflowState as keyof typeof ConsultationWorkflowState];
```

### Null Handling

All explicitly nullable fields use standard `null`:

```typescript
// Server
vitals: null

// Client
vitals: null  // No reconstruction needed
```

### Nested Objects

Nested objects are serialized recursively:

```typescript
// Server
notes: { subjective: "string", objective: "string", ... }

// Client
notes: { subjective: "string", objective: "string", ... }  // Plain object, no reconstruction needed
```

---

## 10. Hydration Mismatch Prevention

### Mismatch Sources

| Source | Risk | Prevention |
|--------|------|------------|
| Server renders different state than client initializes | High | Server and client use same initial props |
| Server Date → client Date conversion mismatch | Medium | Standard ISO string parsing, no timezone conversion |
| Enum value mismatch | Low | Enum strings are stable |
| Null vs undefined | Low | Standardize on null in serialized DTOs |
| Additional props added to providers | Medium | Providers use default values for new props |

### Prevention Strategy

1. **Single source of truth:** Server Component owns initial state. Client never re-fetches on mount.
2. **Deterministic serialization:** Same input always produces same output.
3. **Type-safe deserialization:** Client validates payload shape before use.
4. **Default props:** Providers have fallback values for optional props.

---

## 11. Payload Structure in RSC

Next.js Server Components serialize payloads as RSC (React Server Components) format. The `SerializedSessionData` becomes part of the RSC props payload:

```javascript
// Simplified RSC payload structure
{
  "serverComponents": [
    "C" + hashedId + JSON.stringify({
      "props": {
        "initialSession": { /* SerializedSessionData */ },
        "user": { /* SerializedUser */ },
        "restoredDraft": false,
        "children": [...]
      },
      "name": "ConsultationRoomClient",
      "chunks": []
    })
  ],
  "clientReferences": [...]
}
```

The `SerializedSessionData` is embedded as JSON within the RSC payload. Next.js handles transport and hydration automatically.

---

## 12. Security Considerations

### What Can Leak to Client

| Data | Leaks? | Mitigation |
|------|--------|------------|
| Patient demographics | ✅ Intended | Clinical data, doctor authorized |
| Appointment details | ✅ Intended | Clinical data, doctor authorized |
| Consultation notes | ✅ Intended | Clinical data, doctor authorized |
| Doctor name/ID | ✅ Intended | Session context needed |
| User email | ⚠️ Contains PII | Encrypted in transit, TLS only |
| Medical conditions | ✅ Intended | Clinical data, doctor authorized |

### What Must NOT Leak

| Data | Protection |
|------|------------|
| Server-side API keys | Never serialized |
| Database connection strings | Never serialized |
| Other patients' data | Scoped queries by appointmentId |
| Unauthorized appointments | Auth check in Server Component |
| Draft from other consultations | Scoped by appointmentId |

### Auth in Hydration

The Server Component verifies authentication before creating the Composition Root:

```typescript
const user = await requireAuth();
if (!user || user.role !== 'DOCTOR') {
  return <UnauthorizedPage />;
}
```

If auth fails, the client never receives `ConsultationRoomClient` props.

---

## 13. Conclusion

The hydration contract is a small, explicit, versioned JSON object (~5-7 KB) that contains the complete initial session state. It is produced server-side by the Server Component and consumed client-side by `ConsultationRoomClient`.

The contract intentionally excludes all Application, Domain, and Infrastructure service instances. It includes only the data structures needed to hydrate the Presentation layer.

This contract is:
- **Minimal:** Only essential data
- **Explicit:** Every field is declared in the DTO
- **Validated:** Server validates before sending, client validates on receipt
- **Secure:** Auth checked before serialization
- **Stable:** Enums and shapes are versioned with the deployment
